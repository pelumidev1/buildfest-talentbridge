"use client";

import * as React from "react";
import type { ScreenResult } from "@/lib/types";
import { CandidateCard } from "@/components/CandidateCard";
import { Hero } from "@/components/Hero";
import { FieldBackdrop } from "@/components/FieldBackdrop";
import {
  BandLegend,
  Button,
  FieldLabel,
  RubricTable,
  Sheet,
  SheetTitle,
  WeightStrip,
} from "@/components/ui";

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
        setError(data.error ?? "The server rejected the run without saying why.");
        return;
      }
      setResult(data as ScreenResult);
    } catch {
      setError("The request failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const canRun =
    jobTitle.trim() &&
    jobDescription.trim().length >= 80 &&
    files.length > 0 &&
    !busy;

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
    <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col gap-7 px-5 pt-10 pb-16 sm:px-8">
      <Hero />

      {/* The rubric, in the open. A score nobody can recompute is not a score. */}
      <Sheet
        n="1"
        backdrop={<FieldBackdrop field="topo" strength={0.45} speed={0.25} density={1.05} />}
      >
        <SheetTitle
          title="the rubric every candidate is scored against"
          note="fixed before any CV is opened, and printed here so any score can be recomputed by hand"
        />
        <WeightStrip />
        <RubricTable />
        <BandLegend />
      </Sheet>

      <Sheet
        n="2"
        backdrop={
          busy ? (
            <FieldBackdrop field="flow" strength={0.5} speed={0.9} />
          ) : null
        }
      >
        <SheetTitle
          title="the role and the stack of CVs"
          note="anything left out of the description cannot be counted as a gap"
          action={
            <Button
              variant="quiet"
              onClick={loadSample}
              disabled={loadingSample || busy}
              busy={loadingSample}
            >
              load the sample role and 10 CVs
            </Button>
          }
        />

        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-[7px]">
            <FieldLabel>job title</FieldLabel>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Data Analyst, Commercial"
              className="w-full rounded-[3px] border border-[var(--rule-strong)] bg-[var(--sheet-inset)] px-3.5 py-[11px] text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)] focus:border-[var(--ink)]"
            />
          </div>

          <div className="flex flex-col gap-[7px]">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <FieldLabel>job description and requirements</FieldLabel>
              <span className="nums font-mono text-[11px] text-[var(--ink-3)]">
                {jobDescription.length.toLocaleString()} characters
                {jobDescription.length > 0 &&
                  jobDescription.length < 80 &&
                  " (too short)"}
              </span>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={9}
              placeholder="Paste the full requirements."
              className="w-full rounded-[3px] border border-[var(--rule-strong)] bg-[var(--sheet-inset)] p-3.5 font-mono text-[12px] leading-5 text-[var(--ink-2)] outline-none placeholder:text-[var(--ink-3)] focus:border-[var(--ink)]"
            />
          </div>

          <div className="flex flex-col gap-[7px]">
            <FieldLabel>CVs</FieldLabel>
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
              className="flex w-full items-center gap-3.5 rounded-[3px] border border-dashed border-[var(--rule-strong)] bg-[var(--sheet-inset)] p-4 text-left transition-colors hover:border-[var(--ink)]"
            >
              {files.length === 0 ? (
                <span className="text-[13px] text-[var(--ink-2)]">
                  choose CV files. PDF or plain text, up to 20 at a time
                </span>
              ) : (
                <>
                  <span className="nums w-[26px] shrink-0 font-mono text-[15px] font-medium text-[var(--ink)]">
                    {files.length}
                  </span>
                  <span className="flex flex-1 basis-0 flex-col gap-0.5 overflow-hidden">
                    <span className="text-[14px] font-medium text-[var(--ink)]">
                      {files.length} CVs ready
                    </span>
                    <span className="truncate font-mono text-[11px] leading-4 text-[var(--ink-3)]">
                      {files
                        .map((f) => f.name.replace(/-CV\.pdf$/, ""))
                        .join(", ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] text-[var(--ink-2)]">
                    replace
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--rule)] pt-[18px]">
            <Button onClick={run} disabled={!canRun} busy={busy}>
              {busy
                ? `screening ${files.length} CVs`
                : `screen ${files.length || ""} CVs`.trim()}
            </Button>
            <span className="flex-1 basis-0 text-[13px] leading-5 text-[var(--ink-2)]">
              {busy
                ? "reading each CV, stripping identity, then scoring against the rubric."
                : "the assistant reads each CV, strips the identity, then scores what is left against the rubric above. it keeps nothing."}
            </span>
          </div>

          {needsCode && (
            <form
              onSubmit={unlock}
              className="flex flex-wrap gap-2 rounded-[3px] border border-[var(--rule-strong)] bg-[var(--sheet-inset)] p-3"
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Access code"
                className="flex-1 rounded-[3px] border border-[var(--rule-strong)] bg-white px-3 py-2 text-[14px] outline-none focus:border-[var(--ink)]"
              />
              <Button variant="quiet" type="submit">
                unlock
              </Button>
            </form>
          )}

          {error && <p className="text-[13px] text-[var(--fault)]">{error}</p>}
        </div>
      </Sheet>

      {result && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-8 sm:pl-11">
            <div className="flex flex-col gap-2">
              <span className="text-[13px] text-[var(--ink-3)]">
                screened against the rubric
              </span>
              <h2 className="text-[28px] leading-8 font-normal tracking-[-0.02em] text-[var(--ink)]">
                {result.jobTitle}
              </h2>
            </div>
            <span className="nums shrink-0 font-mono text-[12px] text-[var(--ink-3)]">
              {result.candidates.length} CVs · {result.durationSeconds}s ·{" "}
              {result.model}
            </span>
          </div>

          <div className="sheet flex w-full flex-col px-8 pt-3 pb-8">
            {result.candidates.map((c, i) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                rank={i + 1}
                shortlisted={shortlist.has(c.id)}
                onToggle={() => toggle(c.id)}
                last={i === result.candidates.length - 1}
              />
            ))}
          </div>

          <div className="sheet sticky bottom-4 flex flex-wrap items-center justify-between gap-6 px-8 py-[18px]">
            <span className="flex flex-1 basis-0 flex-col gap-1">
              {shortlisted.length === 0 ? (
                <span className="text-[14px] text-[var(--ink-2)]">
                  tick the candidates you want to take forward
                </span>
              ) : (
                <>
                  <span className="text-[14px] font-medium text-[var(--ink)]">
                    {shortlisted.length} shortlisted
                  </span>
                  <span className="text-[12px] leading-[17px] text-[var(--ink-2)]">
                    {shortlisted.map((c) => c.displayName).join(", ")}. The
                    assistant shortlists nobody; the tick box is yours.
                  </span>
                </>
              )}
            </span>
            <Button
              onClick={exportShortlist}
              disabled={shortlisted.length === 0}
            >
              export shortlist
            </Button>
          </div>
        </section>
      )}

      <footer className="max-w-[720px] text-[12px] leading-[19px] text-[var(--ink-3)] sm:pl-11">
        Built for AI BuildFest 2026, Track 1, Case Study 3. The assistant
        produces a first-pass assessment with its evidence attached. It does not
        decide who is hired, and it does not reject anyone. Every candidate
        stays on the list with their score and their working shown.
      </footer>
    </main>
  );
}
