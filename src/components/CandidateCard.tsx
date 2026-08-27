"use client";

import * as React from "react";
import { MAX_RATING, RUBRIC_BY_ID } from "@/lib/rubric";
import type { Candidate } from "@/lib/types";
import { Score, bandColor, bandLabel } from "./ui";

function RatingDots({ rating }: { rating: number }) {
  return (
    <span
      className="flex w-[44px] shrink-0 items-center gap-1"
      aria-label={`${rating} out of 5`}
    >
      {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background: n <= rating ? "var(--ink)" : "var(--rule-strong)",
          }}
        />
      ))}
    </span>
  );
}

/** One ruled row on the results sheet, with its working folded underneath. */
export function CandidateCard({
  candidate,
  rank,
  shortlisted,
  onToggle,
  last = false,
}: {
  candidate: Candidate;
  rank: number;
  shortlisted: boolean;
  onToggle: () => void;
  last?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const failed = Boolean(candidate.error);
  const band = failed ? "Could not screen" : candidate.band;

  // Rows arrive in rank order; capped so a long stack doesn't leave the last
  // row waiting most of a second.
  const enterDelay = Math.min(rank - 1, 8) * 40;

  return (
    <div
      className="row-enter flex w-full flex-col gap-2.5 py-[18px]"
      style={{
        borderBottom: last ? "none" : "1px solid var(--rule)",
        animationDelay: `${enterDelay}ms`,
      }}
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="nums w-[26px] shrink-0 font-mono text-[13px] text-[var(--ink-3)]">
          {String(rank).padStart(2, "0")}
        </span>

        <label className="flex shrink-0 items-center" title="Add to shortlist">
          <input
            type="checkbox"
            checked={shortlisted}
            onChange={onToggle}
            disabled={failed}
            className="tickbox"
          />
        </label>

        <div className="flex min-w-[180px] flex-1 basis-0 flex-col gap-0.5">
          <span className="text-[15px] font-medium text-[var(--ink)]">
            {candidate.displayName}
          </span>
          <span className="font-mono text-[11px] text-[var(--ink-3)]">
            {candidate.alias} · {candidate.filename}
          </span>
        </div>

        <span
          className="w-[112px] shrink-0 text-[13px] font-medium"
          style={{ color: bandColor(band) }}
        >
          {bandLabel(band)}
        </span>

        <Score
          score={failed ? null : candidate.score}
          band={band}
          delay={enterDelay + 90}
        />

        <button
          onClick={() => setOpen((v) => !v)}
          disabled={failed}
          aria-expanded={open}
          className="w-[92px] shrink-0 text-right text-[12px] whitespace-nowrap text-[var(--ink-2)] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
        >
          {open ? "hide working" : "show working"}
        </button>
      </div>

      <p
        className="pr-[92px] pl-[58px] text-[13px] leading-5"
        style={{ color: failed ? "var(--fault)" : "var(--ink-2)" }}
      >
        {failed ? candidate.error : candidate.summary}
      </p>

      {!failed && (
        <div className="working-collapse" data-open={open} inert={!open}>
          <div>
            <div className="mt-2 ml-[58px] flex flex-col gap-5 border-t border-[var(--rule)] pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-5">
                <span className="text-[13px] text-[var(--ink-3)]">
                  how the {candidate.score} was reached
                </span>
                <span className="text-[12px] text-[var(--ink-3)]">
                  rating ÷ {MAX_RATING} × weight, totalled in code
                </span>
              </div>

              {/* Every number here is recomputable by hand. That is the point. */}
              <div className="flex flex-col">
                {candidate.assessments.map((a, i) => {
                  const criterion = RUBRIC_BY_ID[a.id];
                  const points =
                    candidate.breakdown.find((b) => b.id === a.id)?.points ?? 0;
                  return (
                    <div
                      key={a.id}
                      className="flex flex-col gap-2 py-3.5"
                      style={{
                        borderBottom:
                          i === candidate.assessments.length - 1
                            ? "none"
                            : "1px solid var(--rule)",
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-3.5">
                        <span className="w-[186px] shrink-0 text-[13px] font-medium text-[var(--ink)]">
                          {criterion.label.toLowerCase()}
                        </span>
                        <RatingDots rating={a.rating} />
                        <span className="flex-1 basis-0" />
                        <span className="nums shrink-0 font-mono text-[12px] text-[var(--ink-3)]">
                          {a.rating} ÷ {MAX_RATING} × {criterion.weight} =
                        </span>
                        <span className="nums w-8 shrink-0 text-right font-mono text-[14px] font-medium text-[var(--ink)]">
                          {points}
                        </span>
                      </div>
                      <p className="border-l-2 border-[var(--rule-strong)] pl-3 text-[12px] leading-[19px] text-[var(--ink-2)] italic">
                        “{a.evidence}”
                      </p>
                      <p className="text-[12px] leading-[19px] text-[var(--ink-3)]">
                        {a.reasoning}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3.5 border-t border-[var(--rule-strong)] pt-3.5">
                <span className="nums font-mono text-[12px] text-[var(--ink-3)]">
                  {candidate.breakdown.map((b) => b.points).join(" + ")}
                </span>
                <span className="text-[12px] text-[var(--ink-3)]">total</span>
                <span
                  className="nums font-mono text-[18px] font-semibold"
                  style={{ color: bandColor(candidate.band) }}
                >
                  {candidate.score} / 100
                </span>
              </div>

              <div className="flex flex-wrap items-start gap-8">
                <div className="flex min-w-[260px] flex-1 basis-0 flex-col gap-2.5">
                  <span className="text-[13px] text-[var(--ink-3)]">
                    strengths for this role
                  </span>
                  {candidate.strengths.map((s, i) => (
                    <div key={i} className="flex w-full gap-2.5">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--strong)]" />
                      <span className="text-[12px] leading-[19px] text-[var(--ink-2)]">
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex min-w-[260px] flex-1 basis-0 flex-col gap-2.5">
                  <span className="text-[13px] text-[var(--ink-3)]">
                    gaps against the job description
                  </span>
                  {candidate.gaps.length === 0 ? (
                    <span className="text-[12px] leading-[19px] text-[var(--ink-3)]">
                      Nothing the job description asks for is missing.
                    </span>
                  ) : (
                    candidate.gaps.map((g, i) => (
                      <div key={i} className="flex w-full gap-2.5">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--weak)]" />
                        <span className="text-[12px] leading-[19px] text-[var(--ink-2)]">
                          {g}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {candidate.redactions.length > 0 && (
                <div className="flex flex-col gap-1.5 rounded-[3px] border border-[var(--rule)] bg-[var(--sheet-inset)] px-4 py-3.5">
                  <span className="text-[13px] text-[var(--ink-3)]">
                    removed before scoring
                  </span>
                  <p className="text-[12px] leading-[19px] text-[var(--ink-2)]">
                    The model scored this CV as{" "}
                    <span className="font-mono text-[var(--ink)]">
                      {candidate.alias}
                    </span>{" "}
                    and never saw:{" "}
                    {candidate.redactions
                      .map((r) => `${r.kind} (${r.count})`)
                      .join(", ")}
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
