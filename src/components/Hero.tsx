"use client";

import { FieldBackdrop } from "@/components/FieldBackdrop";

/**
 * The masthead. A topographic field runs behind the title: contour lines drawn
 * in ink on paper, which is the same thing every other sheet on this desk is
 * doing.
 */
export function Hero() {
  return (
    <header className="sheet relative isolate flex flex-col justify-end overflow-hidden">
      <FieldBackdrop field="topo" wash="masthead" />

      <div className="flex flex-col gap-2.5 px-8 pt-[104px] pb-9 sm:pl-[76px]">
        <h1 className="text-[34px] leading-10 font-normal tracking-[-0.02em] text-[var(--ink)]">
          talentbridge
        </h1>
        <p className="max-w-[680px] text-[16px] leading-6 text-[var(--ink-2)]">
          a first pass over a stack of CVs, scored against a rubric fixed before
          anyone is seen
        </p>
      </div>
    </header>
  );
}
