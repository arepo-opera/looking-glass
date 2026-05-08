// Shared KV helpers for the Phase 19 / 20A API routes. We talk to
// Vercel KV (Upstash Redis) via plain fetch against the auto-injected
// REST endpoint so no @vercel/kv runtime dep is needed.

const KV_URL = process.env.KV_REST_API_URL ?? "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? "";

export function kvConfigured(): boolean {
  return KV_URL.length > 0 && KV_TOKEN.length > 0;
}

export async function kvGet(key: string): Promise<string | null> {
  if (!kvConfigured()) return null;
  const url = `${KV_URL}/get/${encodeURIComponent(key)}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!resp.ok) return null;
  const body = (await resp.json()) as { result: string | null };
  return body.result ?? null;
}

export async function kvSet(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> {
  if (!kvConfigured()) {
    throw new Error("KV_REST_API_URL / KV_REST_API_TOKEN unset");
  }
  const ttl = ttlSeconds ? `?EX=${ttlSeconds}` : "";
  const url = `${KV_URL}/set/${encodeURIComponent(key)}${ttl}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "text/plain",
    },
    body: value,
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`kv set failed: ${resp.status} ${txt}`);
  }
}

// SCAN-style key iteration via Upstash REST. Returns up to `limit`
// keys matching pattern. Handles cursor pagination internally — the
// caller gets the full set.
export async function kvKeys(pattern: string, limit = 1000): Promise<string[]> {
  if (!kvConfigured()) return [];
  const out: string[] = [];
  let cursor = "0";
  for (let i = 0; i < 50 && out.length < limit; i++) {
    const url = `${KV_URL}/scan/${cursor}/match/${encodeURIComponent(pattern)}/count/100`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    if (!resp.ok) break;
    const body = (await resp.json()) as {
      result: [string, string[]];
    };
    cursor = body.result?.[0] ?? "0";
    const batch = body.result?.[1] ?? [];
    out.push(...batch);
    if (cursor === "0") break;
  }
  return out.slice(0, limit);
}

export function kvErrorResponse() {
  return {
    error: "storage not configured",
    detail:
      "KV_REST_API_URL / KV_REST_API_TOKEN env vars are unset on this deployment. Enable Vercel KV in the project's Storage tab to populate them.",
  };
}
