"use client";

import * as React from "react";
import { BANDS } from "@/lib/rubric";

export function bandColor(band: string): string {
  switch (band) {
    case "Strong match":
      return "var(--strong)";
    case "Possible match":
      return "var(--possible)";
    case "Weak match":
      return "var(--weak)";
    case "Not a match":
      return "var(--nomatch)";
    default:
      return "var(--danger)";
  }
}

export function Chip({ band }: { band: string }) {
  const color = bandColor(band);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ borderColor: `${color}44`, color, background: `${color}12` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {band}
    </span>
  );
}

/** The score, as a number and as a length. The length is what makes a list scannable. */
export function ScoreBar({ score, band }: { score: number; band: string }) {
  const color = bandColor(band);
  return (
    <div className="flex items-center gap-3">
      <span className="nums w-9 text-right text-[22px] leading-none font-semibold" style={{ color }}>
        {score}
      </span>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}

/** The band thresholds, shown so nobody has to guess where 79 lands. */
export function BandLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--muted-2)]">
      {BANDS.map((b) => (
        <span key={b.id} className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: bandColor(b.label) }} />
          <span className="nums">{b.min}+</span>
          <span>{b.label}</span>
        </span>
      ))}
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-medium tracking-wide text-[var(--muted-2)] uppercase">
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45";
  const styles =
    variant === "primary"
      ? "bg-[var(--accent)] text-[#08120c] hover:bg-[#95dfb2]"
      : "border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)]";
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}
