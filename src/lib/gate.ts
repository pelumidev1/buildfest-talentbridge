import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// A shared passphrase, not an auth system. The only thing behind this door is
// a demo, but the door spends real Anthropic credit on every request, so it
// does not get to stand open on the public internet.

export const GATE_COOKIE = "screener_gate";

type GateState =
  // Local dev. There is deliberately no door, because the bill it protects
  // only exists in production.
  | { kind: "open" }
  // Deployed, with a code set. The normal production state.
  | { kind: "locked"; code: string }
  // Deployed, with no code set. Previously this fell through to "open", so a
  // new environment that had not been given SCREENER_ACCESS_CODE yet would let
  // every visitor spend real credit, and nothing about it looked broken. A
  // missing code is a misconfiguration, and the safe reading of a
  // misconfigured lock is shut.
  | { kind: "misconfigured" };

function gateState(): GateState {
  if (process.env.NODE_ENV !== "production") return { kind: "open" };
  const code = process.env.SCREENER_ACCESS_CODE;
  if (!code || code.length === 0) return { kind: "misconfigured" };
  return { kind: "locked", code };
}

/**
 * Compare without leaking the answer in the timing.
 *
 * Hash both sides first: timingSafeEqual throws on a length mismatch, and
 * feeding it raw input would turn "how long is the code" into a free question.
 */
function secretsMatch(a: string, b: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(a), digest(b));
}

/** True when there is no door (local dev) or the cookie carries the right code. */
export async function isUnlocked(): Promise<boolean> {
  const state = gateState();
  if (state.kind === "open") return true;
  if (state.kind === "misconfigured") return false;

  const submitted = (await cookies()).get(GATE_COOKIE)?.value;
  return submitted !== undefined && secretsMatch(submitted, state.code);
}

export function codeMatches(submitted: string): boolean {
  const state = gateState();
  return state.kind === "locked" && secretsMatch(submitted, state.code);
}

/**
 * True when the server is deployed but has no access code, which is the one
 * state that needs saying out loud: the door is shut and no code will open it
 * until the environment gets SCREENER_ACCESS_CODE.
 */
export function gateIsMisconfigured(): boolean {
  return gateState().kind === "misconfigured";
}
