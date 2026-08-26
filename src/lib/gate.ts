import { cookies } from "next/headers";

// A shared passphrase, not an auth system. The only thing behind this door is
// a demo, but the door spends real Anthropic credit on every request, so it
// does not get to stand open on the public internet.

export const GATE_COOKIE = "screener_gate";

// Only enforced on a deployed instance. Locally the door is open, because
// the thing it protects is an API bill that only exists in production.
function expected(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  const code = process.env.SCREENER_ACCESS_CODE;
  return code && code.length > 0 ? code : null;
}

/** True when no code is configured (local dev) or the cookie matches. */
export async function isUnlocked(): Promise<boolean> {
  const code = expected();
  if (!code) return true;
  const store = await cookies();
  return store.get(GATE_COOKIE)?.value === code;
}

export function gateIsConfigured(): boolean {
  return expected() !== null;
}

export function codeMatches(submitted: string): boolean {
  const code = expected();
  return code !== null && submitted === code;
}
