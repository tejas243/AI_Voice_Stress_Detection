/**
 * Browser-side backend discovery for local FastAPI.
 * Tries 127.0.0.1 first, then localhost (some Windows / network setups differ).
 */

export const BACKEND_URL_CANDIDATES = ["http://127.0.0.1:8000", "http://localhost:8000"] as const;

const HEALTH_TIMEOUT_MS = 4500;

export async function isBackendHealthy(url: string): Promise<boolean> {
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(t);
  }
}

/** First reachable base URL, or null if API is down. */
export async function resolveWorkingBackend(
  candidates: readonly string[] = BACKEND_URL_CANDIDATES
): Promise<string | null> {
  for (const base of candidates) {
    const url = base.replace(/\/$/, "");
    if (await isBackendHealthy(url)) return url;
  }
  return null;
}
