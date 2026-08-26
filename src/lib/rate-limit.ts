// In-memory sliding window. Resets when the serverless instance recycles,
// which is fine: it exists to stop one person looping the endpoint, not to
// be a distributed quota.

const hits = new Map<string, number[]>();

const WINDOW_MS = 10 * 60 * 1000;
const MAX_BATCHES = 12;

export function rateLimited(key: string): boolean {
  const now = Date.now();
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
