import { NextResponse } from "next/server";

import { extractCvText } from "@/lib/extract";
import { redact, aliasFor, nameFromFilename } from "@/lib/redact";
import { screenCandidate, MODEL } from "@/lib/screen";
import { isUnlocked } from "@/lib/gate";
import { rateLimited, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import type { Candidate, ScreenResult } from "@/lib/types";

export const maxDuration = 300;

const MAX_CVS = 20;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_JD_CHARS = 12_000;
// Enough of a CV to screen on. Past this we are paying for boilerplate.
const MAX_CV_CHARS = 18_000;
// Five at a time: fast enough that ten CVs finish inside a demo pause,
// slow enough not to trip the API's per-minute limits on a small account.
const CONCURRENCY = 5;

/** Run tasks with a bounded number in flight, preserving input order in the output. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function POST(request: Request) {
  if (!(await isUnlocked())) {
    return NextResponse.json({ error: "Enter the access code to run a screen." }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  const form = await request.formData();
  const jobTitle = String(form.get("jobTitle") ?? "").trim();
  const jobDescription = String(form.get("jobDescription") ?? "").trim();
  const files = form.getAll("cvs").filter((f): f is File => f instanceof File && f.size > 0);

  if (!jobTitle) return NextResponse.json({ error: "Add a job title." }, { status: 400 });
  if (jobDescription.length < 80) {
    return NextResponse.json(
      { error: "The job description is too short to screen against. Paste the full requirements." },
      { status: 400 }
    );
  }
  if (jobDescription.length > MAX_JD_CHARS) {
    return NextResponse.json({ error: "That job description is very long. Trim it to the requirements." }, { status: 400 });
  }
  if (files.length === 0) return NextResponse.json({ error: "Add at least one CV." }, { status: 400 });
  if (files.length > MAX_CVS) {
    return NextResponse.json({ error: `Screen at most ${MAX_CVS} CVs at a time.` }, { status: 400 });
  }
  const oversized = files.find((f) => f.size > MAX_FILE_BYTES);
  if (oversized) {
    return NextResponse.json({ error: `${oversized.name} is larger than 5MB.` }, { status: 400 });
  }

  const startedAt = Date.now();

  const candidates = await pool(files, CONCURRENCY, async (file, index): Promise<Candidate> => {
    const alias = aliasFor(index);
    const displayName = nameFromFilename(file.name);
    const base = {
      id: `cand-${index}`,
      displayName,
      alias,
      filename: file.name,
      score: 0,
      band: "Not screened",
      bandAction: "Read this CV by hand",
      breakdown: [],
      assessments: [],
      strengths: [],
      gaps: [],
      summary: "",
      redactions: [],
      extractedChars: 0,
    };

    const { text: rawText, error: extractError } = await extractCvText(
      await file.arrayBuffer(),
      file.name
    );
    if (extractError) return { ...base, extractedChars: rawText.length, error: extractError };

    const { text: redacted, redactions } = redact(rawText.slice(0, MAX_CV_CHARS), displayName, alias);

    try {
      const outcome = await screenCandidate(jobTitle, jobDescription, redacted, alias);
      return { ...base, ...outcome, redactions, extractedChars: rawText.length };
    } catch (error) {
      // One bad CV must not lose the other nine. The row still appears, marked.
      const message = error instanceof Error ? error.message : "Unknown error";
      return { ...base, redactions, extractedChars: rawText.length, error: `Screening failed: ${message}` };
    }
  });

  // Rank by score. Failed rows sink to the bottom rather than scoring zero
  // above a real candidate, because "we could not read this" is not "weak".
  candidates.sort((a, b) => {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    return b.score - a.score;
  });

  const result: ScreenResult = {
    jobTitle,
    candidates,
    model: MODEL,
    screenedAt: new Date().toISOString(),
    durationSeconds: Math.round(((Date.now() - startedAt) / 1000) * 10) / 10,
  };

  return NextResponse.json(result);
}
