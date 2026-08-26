import fs from "node:fs";
import { extractCvText } from "../src/lib/extract";
import { redact, aliasFor, nameFromFilename } from "../src/lib/redact";
import { screenCandidate, MODEL } from "../src/lib/screen";
import { bandFor } from "../src/lib/rubric";

// How much does a score move if you screen the same CV twice?
//
// This matters more than the absolute number. A recruiter needs to know
// whether 73 means "73, give or take a point" or "73, give or take fifteen",
// because the second one means the bands are theatre.

const RUNS = 3;

async function main() {
  const jd = fs.readFileSync("sample-data/job-description.txt", "utf8");
  const [title, ...rest] = jd.split("\n");
  const jobTitle = title.trim();
  const jobDescription = rest.join("\n").trim();
  const files = fs.readdirSync("public/samples").filter((f) => f.endsWith(".pdf")).sort();

  const prepared = await Promise.all(
    files.map(async (f, i) => {
      const buf = fs.readFileSync(`public/samples/${f}`);
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      const { text } = await extractCvText(ab, f);
      const name = nameFromFilename(f);
      return { name, alias: aliasFor(i), text: redact(text, name, aliasFor(i)).text };
    })
  );

  const scores = new Map<string, number[]>();
  for (let run = 1; run <= RUNS; run++) {
    process.stdout.write(`run ${run}... `);
    const results = await Promise.all(
      prepared.map((p) => screenCandidate(jobTitle, jobDescription, p.text, p.alias))
    );
    results.forEach((r, i) => {
      const key = prepared[i].name;
      scores.set(key, [...(scores.get(key) ?? []), r.score]);
    });
    console.log("done");
  }

  console.log(`\n${MODEL}, ${RUNS} runs of the same ${files.length} CVs\n`);
  console.log("CANDIDATE          SCORES        SPREAD  BAND STABLE");

  const rows = [...scores.entries()].sort((a, b) => avg(b[1]) - avg(a[1]));
  let unstable = 0;
  let worstSpread = 0;

  for (const [name, list] of rows) {
    const spread = Math.max(...list) - Math.min(...list);
    worstSpread = Math.max(worstSpread, spread);
    const bands = new Set(list.map((s) => bandFor(s).label));
    if (bands.size > 1) unstable++;
    console.log(
      `${name.padEnd(17)}  ${list.map((s) => String(s).padStart(3)).join(" ")}   ${String(spread).padStart(5)}  ${bands.size === 1 ? "yes" : "NO (" + [...bands].join(" / ") + ")"}`
    );
  }

  console.log(`\nWidest spread on any one CV: ${worstSpread} points.`);
  console.log(`Candidates whose band changed between runs: ${unstable} of ${rows.length}.`);
}

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
main();
