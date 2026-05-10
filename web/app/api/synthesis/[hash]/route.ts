import { NextRequest, NextResponse } from "next/server";
import { keccak_256 } from "js-sha3";

// Content-addressed synthesis storage. The on-chain SynthesisLayer1 /
// SynthesisLayer2 PDAs commit only a 32-byte hash + a URI; the actual
// 4-10 KB synthesis text is stored here, indexed by the hash.
//
// Storage backend: Vercel KV (Upstash Redis under the hood). When KV is
// enabled in the Vercel dashboard, the platform auto-injects
//   KV_REST_API_URL
//   KV_REST_API_TOKEN
// into the project env. We talk to it via plain fetch to avoid a new
// runtime dep — works in any Vercel function without
// `pnpm install @vercel/kv`. If those env vars aren't present, the
// route returns 503 with a clear message so the keeper can retry or
// degrade gracefully.

const KV_URL = process.env.KV_REST_API_URL ?? "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? "";
const KEY_PREFIX = "synthesis:";
// 14-day TTL on stored synthesis text. Layer 2 fires every ~5 days, so
// 14 days easily covers the longest gap between hash submission and
// dashboard refetch. Re-up needed only if a synthesis is referenced
// after that window (rare; on-chain PDA stays forever).
const TTL_SECONDS = 14 * 24 * 60 * 60;

function kvConfigured(): boolean {
  return KV_URL.length > 0 && KV_TOKEN.length > 0;
}

async function kvSet(key: string, value: string): Promise<void> {
  // Upstash REST: POST {url}/set/{key}/{value}?EX={seconds}
  // Body POST allows the value to contain any chars including slashes.
  const url = `${KV_URL}/set/${encodeURIComponent(key)}?EX=${TTL_SECONDS}`;
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

async function kvGet(key: string): Promise<string | null> {
  const url = `${KV_URL}/get/${encodeURIComponent(key)}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!resp.ok) {
    if (resp.status === 404) return null;
    const txt = await resp.text();
    throw new Error(`kv get failed: ${resp.status} ${txt}`);
  }
  const body = (await resp.json()) as { result: string | null };
  return body.result ?? null;
}

function normaliseHash(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (s.startsWith("0x")) s = s.slice(2);
  if (!/^[0-9a-f]{64}$/.test(s)) return null;
  return s;
}

function keccakHex(text: string): string {
  return keccak_256(text);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { hash: string } }
) {
  if (!kvConfigured()) {
    return NextResponse.json(
      {
        error: "storage not configured",
        detail:
          "KV_REST_API_URL / KV_REST_API_TOKEN env vars are unset on this deployment. Enable Vercel KV in the project's Storage tab to populate them.",
      },
      { status: 503 }
    );
  }
  const hash = normaliseHash(params.hash);
  if (!hash) {
    return NextResponse.json(
      { error: "hash must be a 64-char hex string" },
      { status: 400 }
    );
  }
  let text: string | null;
  try {
    text = await kvGet(KEY_PREFIX + hash);
  } catch (e: any) {
    return NextResponse.json(
      { error: "kv read failed", detail: String(e?.message ?? e) },
      { status: 502 }
    );
  }
  if (text === null) {
    // Fallback: the Twelfth Axis is stored under its own permanent
    // key (no TTL, distinct from the synthesis-layer keyspace). The
    // page renders /api/synthesis/{hash} in the storage line, so
    // this route serves both. Hash verification below makes the
    // namespace fallback safe — only a body whose keccak matches
    // the requested hash is returned.
    try {
      const candidate = await kvGet("twelfth-axis:body");
      if (candidate && keccakHex(candidate) === hash) {
        text = candidate;
      }
    } catch {
      /* swallow — fall through to 404 */
    }
  }
  if (text === null) {
    return NextResponse.json(
      { error: "not found", hash },
      { status: 404 }
    );
  }
  return NextResponse.json(
    {
      hash,
      text,
      verified: keccakHex(text) === hash,
    },
    {
      headers: {
        // Content-addressed → immutable. Cache aggressively at the
        // edge once written. Cache-Control max-age in seconds.
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, immutable",
      },
    }
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: { hash: string } }
) {
  if (!kvConfigured()) {
    return NextResponse.json(
      {
        error: "storage not configured",
        detail:
          "KV_REST_API_URL / KV_REST_API_TOKEN env vars are unset on this deployment. Enable Vercel KV in the project's Storage tab to populate them.",
      },
      { status: 503 }
    );
  }
  const hash = normaliseHash(params.hash);
  if (!hash) {
    return NextResponse.json(
      { error: "hash must be a 64-char hex string" },
      { status: 400 }
    );
  }
  let body: { text?: string };
  try {
    body = (await req.json()) as { text?: string };
  } catch {
    return NextResponse.json(
      { error: "body must be JSON {text: string}" },
      { status: 400 }
    );
  }
  const text = body.text ?? "";
  if (typeof text !== "string" || text.length === 0) {
    return NextResponse.json(
      { error: "body.text must be a non-empty string" },
      { status: 400 }
    );
  }
  const computed = keccakHex(text);
  if (computed !== hash) {
    return NextResponse.json(
      {
        error: "hash mismatch",
        expected_hash: computed,
        provided_hash: hash,
      },
      { status: 400 }
    );
  }
  // Idempotent: same hash + same text always succeeds. KV's set is
  // last-write-wins which is fine since the hash check guarantees
  // identical content.
  try {
    await kvSet(KEY_PREFIX + hash, text);
  } catch (e: any) {
    return NextResponse.json(
      { error: "kv write failed", detail: String(e?.message ?? e) },
      { status: 502 }
    );
  }
  return NextResponse.json(
    { hash, length: text.length, stored: true },
    { status: 201 }
  );
}
