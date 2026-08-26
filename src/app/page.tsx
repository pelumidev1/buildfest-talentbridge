"use client";

import * as React from "react";
import { RUBRIC, TOTAL_WEIGHT } from "@/lib/rubric";
import type { ScreenResult } from "@/lib/types";
import { CandidateCard } from "@/components/CandidateCard";
import { BandLegend, Button, Label, Spinner } from "@/components/ui";

const SAMPLE_CVS = [
  "ada-obieze-CV.pdf",
  "bisi-lawal-CV.pdf",
  "chiamaka-nwosu-CV.pdf",
  "emeka-okafor-CV.pdf",
  "fatima-bello-CV.pdf",
  "ibrahim-sani-CV.pdf",
  "kelechi-eze-CV.pdf",
  "segun-adeyemi-CV.pdf",
  "tunde-bakare-CV.pdf",
  "zainab-yusuf-CV.pdf",
];

export default function Page() {
  const [jobTitle, setJobTitle] = React.useState("");
  const [jobDescription, setJobDescription] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [loadingSample, setLoadingSample] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ScreenResult | null>(null);
  const [shortlist, setShortlist] = React.useState<Set<string>>(new Set());
  const [needsCode, setNeedsCode] = React.useState(false);
  const [code, setCode] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function loadSample() {
    setLoadingSample(true);
    setError(null);
    try {
      const [jd, ...cvs] = await Promise.all([
        fetch("/samples/job-description.txt").then((r) => r.text()),
        ...SAMPLE_CVS.map(async (name) => {
          const blob = await fetch(`/samples/${name}`).then((r) => r.blob());
          return new File([blob], name, { type: "application/pdf" });
        }),
      ]);
      const [titleLine, ...rest] = jd.split("\n");
      setJobTitle(titleLine.trim());
      setJobDescription(rest.join("\n").trim());
      setFiles(cvs as File[]);
    } catch {
      setError("Could not load the sample files.");
    } finally {
      setLoadingSample(false);
    }
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      setNeedsCode(false);
      setError(null);
      void run();
    } else {
      setError("That code is not right.");
    }
  }

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    setShortlist(new Set());

    const body = new FormData();
    body.append("jobTitle", jobTitle);
    body.append("jobDescription", jobDescription);
    for (const f of files) body.append("cvs", f);

    try {
      const res = await fetch("/api/screen", { method: "POST", body });
      const data = await res.json();
      if (res.status === 401) {
        setNeedsCode(true);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResult(data as ScreenResult);
    } catch {
      setError("The request failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const canRun = jobTitle.trim() && jobDescription.trim().length >= 80 && files.length > 0 && !busy;

  const screened = result?.candidates.filter((c) => !c.error) ?? [];
  const shortlisted = screened.filter((c) => shortlist.has(c.id));

  function toggle(id: string) {
    setShortlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportShortlist() {
    const rows = [
      ["Rank", "Candidate", "Score", "Band", "Recommended action", "Gaps"],
      ...shortlisted.map((c) => [
        String(screened.indexOf(c) + 1),
        c.displayName,
        String(c.score),
        c.band,
        c.bandAction,
        c.gaps.join("; "),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `shortlist-${(result?.jobTitle ?? "role").toLowerCase().replace(/\W+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">TalentBridge Screening Assistant</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
          A first pass over a stack of CVs, scored against a rubric that is fixed before any
          candidate is seen and printed on this page. Names and personal details are stripped before
          scoring. Nothing here shortlists anybody. That is still your tick box.
        </p>
      </header>

      {/* The rubric, in the open. A score nobody can recompute is not a score. */}
      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-medium">The rubric every candidate is scored against</h2>
          <span className="nums text-[11px] text-[var(--muted-2)]">
            weights total {TOTAL_WEIGHT}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-5">
          {RUBRIC.map((c) => (
            <div key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
              <div className="nums text-[17px] font-semibold text-[var(--accent)]">{c.weight}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">{c.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <BandLegend />
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[13px] font-medium">The role and the stack of CVs</h2>
          <button
            onClick={loadSample}
            disabled={loadingSample || busy}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-strong)] px-2.5 py-1 text-[11px] text-[var(--muted)] hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            {loadingSample && <Spinner />}
            Load the sample role and 10 CVs
          </button>
        </div>

        <div className="mb-4">
          <Label>Job title</Label>
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Data Analyst, Commercial"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--muted-2)] focus:border-[var(--accent)]"
          />
        </div>

        <div className="mb-4">
          <Label>Job description and requirements</Label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={8}
            placeholder="Paste the full requirements. Everything the model scores against comes from here, so anything you leave out cannot be a gap."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 font-mono text-[12.5px] leading-relaxed outline-none placeholder:text-[var(--muted-2)] focus:border-[var(--accent)]"
          />
          <span className="nums mt-1 block text-[11px] text-[var(--muted-2)]">
            {jobDescription.length} characters
            {jobDescription.length > 0 && jobDescription.length < 80 && " (too short to screen against)"}
          </span>
        </div>

        <div className="mb-5">
          <Label>CVs</Label>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--background)] px-4 py-6 text-center text-[13px] text-[var(--muted)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)]"
          >
            {files.length === 0 ? (
              <>Choose CV files. PDF, or plain text. Up to 20 at a time.</>
            ) : (
              <>
                <span className="font-medium text-[var(--foreground)]">{files.length} CVs ready</span>
                <span className="mt-1 block text-[11px] text-[var(--muted-2)]">
                  {files.map((f) => f.name).join(", ")}
                </span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={!canRun}>
            {busy && <Spinner />}
            {busy ? `Screening ${files.length} CVs` : `Screen ${files.length || ""} CVs`.trim()}
          </Button>
          {busy && (
            <span className="text-[12px] text-[var(--muted-2)]">
              Reading each CV, stripping identity, then scoring against the rubric.
            </span>
          )}
        </div>

        {needsCode && (
          <form onSubmit={unlock} className="mt-4 flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access code"
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <Button variant="ghost" type="submit">Unlock</Button>
          </form>
        )}

        {error && <p className="mt-3 text-[13px] text-[var(--danger)]">{error}</p>}
      </section>

      {result && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-medium">
              {result.candidates.length} CVs screened for {result.jobTitle}
            </h2>
            <span className="nums text-[11px] text-[var(--muted-2)]">
              {result.durationSeconds}s · {result.model}
            </span>
          </div>

          <div className="space-y-2.5">
            {result.candidates.map((c, i) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                rank={i + 1}
                shortlisted={shortlist.has(c.id)}
                onToggle={() => toggle(c.id)}
              />
            ))}
          </div>

          <div className="sticky bottom-4 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)]/95 p-4 backdrop-blur">
            <span className="text-[13px] text-[var(--muted)]">
              {shortlisted.length === 0 ? (
                "Tick the candidates you want to take forward."
              ) : (
                <>
                  <span className="font-medium text-[var(--foreground)]">
                    {shortlisted.length} shortlisted
                  </span>
                  : {shortlisted.map((c) => c.displayName).join(", ")}
                </>
              )}
            </span>
            <Button onClick={exportShortlist} disabled={shortlisted.length === 0}>
              Export shortlist
            </Button>
          </div>
        </section>
      )}

      <footer className="mt-12 border-t border-[var(--border)] pt-5 text-[11px] leading-relaxed text-[var(--muted-2)]">
        Built for AI BuildFest 2026, Track 1, Case Study 3. The assistant produces a first-pass
        assessment with its evidence attached. It does not decide who is hired, and it does not
        reject anyone. Every candidate stays on the list with their score and their working shown.
      </footer>
    </main>
  );
}
