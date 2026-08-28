"use client";

import * as React from "react";
import { BANDS, RUBRIC } from "@/lib/rubric";

export function bandColor(band: string): string {
  switch (band) {
    case "Strong match":
      return "var(--strong)";
    case "Possible match":
      return "var(--possible)";
    case "Weak match":
      return "var(--weak)";
    case "Not a match":
      return "var(--none)";
    default:
      return "var(--fault)";
  }
}

/** Band names are set lowercase in this design; the data keeps its own casing. */
export function bandLabel(band: string): string {
  return band.toLowerCase();
}

/** A sheet on the desk, with its number in the margin. */
export function Sheet({
  n,
  backdrop,
  children,
}: {
  n?: string;
  /** An optional ThreeUI field printed under the sheet. Decoration only. */
  backdrop?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="sheet relative isolate flex w-full items-start overflow-hidden p-8">
      {backdrop}
      {n !== undefined && (
        <div className="w-11 shrink-0">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[2px] border border-[var(--rule-strong)] font-mono text-[10px] text-[var(--ink-3)]">
            {n}
          </span>
        </div>
      )}
      <div className="flex min-w-0 flex-1 basis-0 flex-col gap-6">
        {children}
      </div>
    </section>
  );
}

export function SheetTitle({
  title,
  note,
  action,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[18px] font-normal tracking-[-0.01em] text-[var(--ink)]">
          {title}
        </h2>
        {note && (
          <p className="text-[14px] leading-[21px] text-[var(--ink-2)]">
            {note}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[12px] text-[var(--ink-3)]">{children}</span>;
}

/**
 * The rubric as one proportional strip. Neutral greys, not the band colours:
 * colour means "which band", and a weight is not a band.
 */
const WEIGHT_SHADES: Record<number, string> = {
  30: "#2E2C28",
  25: "#4F4C46",
  20: "#6E6B64",
  15: "#8E8B83",
  10: "#B3AFA7",
};

export function WeightStrip() {
  return (
    <div className="flex h-1.5 w-full items-stretch gap-[2px]">
      {RUBRIC.map((c) => (
        <div
          key={c.id}
          className="rounded-[1px]"
          style={{
            flexGrow: c.weight,
            flexBasis: 0,
            background: WEIGHT_SHADES[c.weight],
          }}
        />
      ))}
    </div>
  );
}

/** The rubric printed as a document: weight in the margin, then the rule. */
export function RubricTable() {
  return (
    <div className="flex w-full flex-col">
      {RUBRIC.map((c, i) => (
        <div
          key={c.id}
          className="flex flex-wrap items-baseline gap-5 py-3.5"
          style={{
            borderBottom:
              i === RUBRIC.length - 1 ? "none" : "1px solid var(--rule)",
          }}
        >
          <span className="nums w-[34px] shrink-0 font-mono text-[15px] font-medium text-[var(--ink)]">
            {c.weight}
          </span>
          <span className="w-[190px] shrink-0 text-[14px] font-medium text-[var(--ink)]">
            {c.label.toLowerCase()}
          </span>
          <span className="min-w-[240px] flex-1 basis-0 text-[13px] leading-5 text-[var(--ink-2)]">
            {c.definition}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Where a score lands, and what each band advises. */
export function BandLegend() {
  return (
    <div className="flex flex-col gap-3.5 border-t border-[var(--rule-strong)] pt-5">
      <span className="text-[13px] text-[var(--ink-3)]">
        where a score lands
      </span>
      <div className="flex w-full flex-wrap items-start gap-[2px]">
        {BANDS.map((b, i) => (
          <div
            key={b.id}
            className="flex min-w-[150px] flex-1 basis-0 flex-col gap-2"
            style={{ paddingRight: i === BANDS.length - 1 ? 0 : 20 }}
          >
            <div
              className="h-[3px] w-full rounded-[2px]"
              style={{ background: bandColor(b.label) }}
            />
            <div className="flex items-baseline gap-2">
              <span className="nums font-mono text-[13px] font-medium text-[var(--ink)]">
                {b.min}+
              </span>
              <span className="text-[13px] font-medium text-[var(--ink)]">
                {bandLabel(b.label)}
              </span>
            </div>
            <span className="text-[12px] leading-[17px] text-[var(--ink-2)]">
              {b.action.toLowerCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The score: a tabular numeral with the rule that encodes it underneath. */
export function Score({
  score,
  band,
  delay = 0,
}: {
  score: number | null;
  band: string;
  delay?: number;
}) {
  const color = bandColor(band);
  return (
    <div className="flex w-[132px] shrink-0 flex-col gap-1.5">
      <span className="nums font-mono text-[26px] leading-none font-medium tracking-[-0.02em] text-[var(--ink)]">
        {score ?? "—"}
      </span>
      <div className="flex h-[3px] w-full overflow-hidden rounded-[2px] bg-[var(--sheet-inset)]">
        <div
          className="gauge-fill rounded-[2px]"
          style={{
            width: `${score ?? 0}%`,
            background: color,
            animationDelay: `${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * The arrow pill. Structure and motion are ThreeUI's halvorsen-arrow-pill,
 * recoloured to this desk in globals.css. The label sits in its own span and
 * the endcap disc carries the chevron, or the spinner while work is in flight.
 */
export function Button({
  children,
  variant = "primary",
  busy = false,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet";
  /** Puts the spinner in the endcap instead of the chevron. */
  busy?: boolean;
}) {
  return (
    <button
      className={`pill pill--${variant} ${className}`.trim()}
      aria-busy={busy || undefined}
      {...rest}
    >
      <span>{children}</span>
      <span className="pill__disc">
        {busy ? (
          <Spinner />
        ) : (
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 1.5 8 6 3 10.5" />
          </svg>
        )}
      </span>
    </button>
  );
}

export function Spinner() {
  return <span className="pill__spin" aria-hidden />;
}
