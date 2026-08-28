// In-memory sliding window. Resets when the serverless instance recycles,
// which is fine: it exists to stop one person looping the endpoint, not to
// be a distributed quota.

const hits = new Map<string, number[]>();

const WINDOW_MS = 10 * 60 * 1000;
const MAX_BATCHES = 12;
// Fluid Compute reuses an instance across many requests, so this map is not
// scoped to one invocation. Without a sweep, every distinct caller leaves an
// entry behind permanently and the map only grows.
const MAX_TRACKED_KEYS = 10_000;

/** Drop callers whose whole window has aged out. */
function sweep(now: number): void {
  for (const [key, timestamps] of hits) {
    const last = timestamps[timestamps.length - 1];
    if (last === undefined || now - last >= WINDOW_MS) hits.delete(key);
  }
}

export function rateLimited(key: string): boolean {
  const now = Date.now();

  if (hits.size >= MAX_TRACKED_KEYS) {
    sweep(now);
    // Still full after sweeping means genuine concurrent load rather than
    // accumulated junk. Drop the oldest entry so a live caller can be tracked;
    // the worst case is one extra allowed batch, which beats unbounded growth.
    if (hits.size >= MAX_TRACKED_KEYS) {
      const oldest = hits.keys().next();
      if (!oldest.done) hits.delete(oldest.value);
    }
  }

  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_BATCHES) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export const RATE_LIMIT_MESSAGE = `More than ${MAX_BATCHES} screening runs in ${WINDOW_MS / 60000} minutes. Wait a few minutes and try again.`;
