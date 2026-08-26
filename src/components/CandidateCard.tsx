"use client";

import * as React from "react";
import { RUBRIC_BY_ID } from "@/lib/rubric";
import type { Candidate } from "@/lib/types";
import { Chip, ScoreBar, bandColor } from "./ui";

function RatingDots({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: n <= rating ? "var(--accent)" : "var(--border-strong)" }}
        />
      ))}
    </span>
  );
}

export function CandidateCard({
  candidate,
  rank,
  shortlisted,
  onToggle,
}: {
  candidate: Candidate;
  rank: number;
  shortlisted: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const failed = Boolean(candidate.error);

  return (
    <div
      className="overflow-hidden rounded-xl border bg-[var(--surface)] transition-colors"
      style={{ borderColor: shortlisted ? "var(--accent)" : "var(--border)" }}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <span className="nums w-5 shrink-0 text-sm text-[var(--muted-2)]">{rank}</span>

        <label className="flex shrink-0 cursor-pointer items-center" title="Add to shortlist">
          <input
            type="checkbox"
            checked={shortlisted}
            onChange={onToggle}
            disabled={failed}
            className="h-4 w-4 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed"
          />
        </label>

        <div className="min-w-[180px] flex-1">
          <div className="text-[15px] font-medium">{candidate.displayName}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--muted-2)]">
            <span className="font-mono">{candidate.alias}</span>
            <span>·</span>
            <span className="truncate">{candidate.filename}</span>
          </div>
        </div>

        {failed ? (
          <div className="flex items-center gap-3">
            <Chip band="Could not screen" />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Chip band={candidate.band} />
            <ScoreBar score={candidate.score} band={candidate.band} />
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-md border border-[var(--border-strong)] px-2.5 py-1 text-[11px] text-[var(--muted)] hover:bg-[var(--surface-2)]"
          aria-expanded={open}
        >
          {open ? "Hide working" : "Show working"}
        </button>
      </div>

      {failed && (
        <p className="border-t border-[var(--border)] px-4 py-3 text-[13px] text-[var(--danger)]">
          {candidate.error}
        </p>
      )}

      {!failed && (
        <p className="border-t border-[var(--border)] px-4 py-3 text-[13px] leading-relaxed text-[var(--muted)]">
          {candidate.summary}
        </p>
      )}

      {open && !failed && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
          <h4 className="mb-3 text-[11px] font-medium tracking-wide text-[var(--muted-2)] uppercase">
            How the {candidate.score} was reached
          </h4>

          <div className="space-y-3">
            {candidate.assessments.map((a) => {
              const criterion = RUBRIC_BY_ID[a.id];
              const points = candidate.breakdown.find((b) => b.id === a.id)?.points ?? 0;
              return (
                <div key={a.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[13px] font-medium">{criterion.label}</span>
                    <RatingDots rating={a.rating} />
                    <span className="nums ml-auto text-[12px] text-[var(--muted-2)]">
                      {a.rating}/5 of {criterion.weight} ={" "}
                      <span className="font-medium text-[var(--foreground)]">{points}</span>
                    </span>
                  </div>
                  <p className="mb-1.5 border-l-2 border-[var(--border-strong)] pl-3 text-[12px] leading-relaxed text-[var(--muted)] italic">
                    {a.evidence}
                  </p>
                  <p className="text-[12px] leading-relaxed text-[var(--muted-2)]">{a.reasoning}</p>
                </div>
              );
            })}
          </div>

          <div className="nums mt-3 flex justify-end border-t border-[var(--border)] pt-3 text-[13px]">
            <span className="text-[var(--muted-2)]">Total</span>
            <span className="ml-3 font-semibold" style={{ color: bandColor(candidate.band) }}>
              {candidate.score} / 100
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h5 className="mb-2 text-[11px] font-medium tracking-wide text-[var(--muted-2)] uppercase">
                Strengths for this role
              </h5>
              <ul className="space-y-1.5">
                {candidate.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-[var(--muted)]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="mb-2 text-[11px] font-medium tracking-wide text-[var(--muted-2)] uppercase">
                Gaps against the job description
              </h5>
              {candidate.gaps.length === 0 ? (
                <p className="text-[12px] text-[var(--muted-2)]">
                  Nothing the job description asks for is missing.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {candidate.gaps.map((g, i) => (
                    <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-[var(--muted)]">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--weak)]" />
                      {g}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {candidate.redactions.length > 0 && (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <h5 className="mb-1.5 text-[11px] font-medium tracking-wide text-[var(--muted-2)] uppercase">
                Removed before scoring
              </h5>
              <p className="text-[12px] leading-relaxed text-[var(--muted-2)]">
                The model scored this CV as <span className="font-mono">{candidate.alias}</span>. It
                never saw:{" "}
                <span className="text-[var(--muted)]">
                  {candidate.redactions.map((r) => `${r.kind} (${r.count})`).join(", ")}
                </span>
                .
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
