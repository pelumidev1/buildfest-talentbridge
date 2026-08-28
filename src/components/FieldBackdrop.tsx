"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import "@designcodeio/threeui/style.css";

/**
 * A ThreeUI line field printed behind a sheet.
 *
 * Only the light-mode Neuform fields are offered here. The rest of the
 * catalogue is dark neon and would fight the paper. In light mode these draw
 * near-black contours on near-white, which is the palette this design already
 * uses, so a field reads as ink on the sheet rather than as a widget dropped
 * on top of one.
 *
 * Every field is decoration. Nothing on the page depends on one rendering, so
 * they are aria-hidden, they never take pointer events, and they are dropped
 * whole when the reader asks for less motion.
 *
 * Imported by subpath, not from the package root: the root barrel reaches a
 * renderer that imports LinearEncoding, an export three removed in r152, and
 * pulling the whole barrel in at runtime turns that into a build error.
 */
const FIELDS = {
  topo: dynamic(
    () =>
      import("@designcodeio/threeui/components/TopoField").then(
        (m) => m.TopoField,
      ),
    { ssr: false },
  ),
  flow: dynamic(
    () =>
      import("@designcodeio/threeui/components/GatewayFlow").then(
        (m) => m.GatewayFlow,
      ),
    { ssr: false },
  ),
} as const;

/* Two fields are in use. To add another, take any light-mode Neuform field
   exported by the package (DefenseLines, ConstellationField, ParticleNetwork,
   ParticleDrift, AmberHalftone) and give it an entry above. Anything outside
   that set is dark neon and will fight the paper. */

export type FieldName = keyof typeof FIELDS;

/**
 * How hard the field is pushed back toward paper.
 *
 * "masthead" keeps the most contour, because the hero has room and nothing
 * below the title needs reading. "behind-text" is for sheets carrying prose or
 * numbers: the wash is heavy enough that the field survives only at the edges.
 * Both hold a firmer wash under sm, where text runs the full width of the sheet
 * and there is no clear column for a field to occupy.
 */
const WASH = {
  masthead:
    "bg-[linear-gradient(to_top,var(--sheet)_16%,color-mix(in_srgb,var(--sheet)_78%,transparent)_58%,transparent_92%)] sm:bg-[linear-gradient(to_top,var(--sheet)_6%,color-mix(in_srgb,var(--sheet)_58%,transparent)_44%,transparent_80%),linear-gradient(to_right,var(--sheet)_0%,color-mix(in_srgb,var(--sheet)_58%,transparent)_26%,transparent_62%)]",
  "behind-text":
    "bg-[linear-gradient(to_top,var(--sheet)_34%,color-mix(in_srgb,var(--sheet)_88%,transparent)_72%,color-mix(in_srgb,var(--sheet)_60%,transparent)_100%)] sm:bg-[radial-gradient(120%_100%_at_18%_50%,var(--sheet)_28%,color-mix(in_srgb,var(--sheet)_82%,transparent)_62%,transparent_100%)]",
} as const;

export function FieldBackdrop({
  field,
  wash = "behind-text",
  strength = 1,
  speed = 0.6,
  density = 1.35,
  length = 1.05,
}: {
  field: FieldName;
  wash?: keyof typeof WASH;
  /** Opacity of the whole field, before the wash is laid over it. */
  strength?: number;
  speed?: number;
  density?: number;
  length?: number;
}) {
  const Field = FIELDS[field];
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return null;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ opacity: strength }}
      >
        <Field
          mode="light"
          speed={speed}
          density={density}
          length={length}
          opacity={1}
          saturation={0}
          className="h-full w-full border-0"
        />
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-10 ${WASH[wash]}`}
      />
    </>
  );
}

/**
 * Honours prefers-reduced-motion, and keeps honouring it if the reader changes
 * the setting while the page is open. useSyncExternalStore rather than an
 * effect: the query is external state we subscribe to, and the server snapshot
 * says "reduced" so no field is in the HTML before hydration decides.
 */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useReducedMotion() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
}
