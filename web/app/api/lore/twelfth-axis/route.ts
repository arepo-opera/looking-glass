import { NextRequest, NextResponse } from "next/server";
import { keccak_256 } from "js-sha3";
import {
  kvConfigured,
  kvErrorResponse,
  kvGet,
  kvSet,
} from "@/lib/kv-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const META_KEY = "twelfth-axis:metadata";
const BODY_KEY = "twelfth-axis:body";

interface AxisFragment {
  position: string; // "I", "II", … "XIII"
  label: string; // "deep past", "outside time", etc.
  text: string;
}

export interface TwelfthAxisDoc {
  title: string;
  subtitle: string;
  generated_at_ts: number;
  locked_at: string;
  hash: string;
  uri: string;
  on_chain_tx: string | null;
  fragments: AxisFragment[];
  full_text: string;
  source_documents: string[];
  voice_samples_used: Array<{ kind: string; ref: string }>;
  model: string;
  version: string;
  footer_disclosure: string;
}

const FOOTER =
  "this Reading was produced once. it does not represent ongoing forecasting capability of the apparatus. it is one document, generated at one moment, committed permanently to the chain.";

export async function GET() {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const [metaRaw, bodyRaw] = await Promise.all([
    kvGet(META_KEY),
    kvGet(BODY_KEY),
  ]);
  if (!metaRaw || !bodyRaw) {
    return NextResponse.json(
      {
        error: "twelfth axis not yet generated",
        hint:
          "the apparatus has not produced this Reading yet. when it does, it will be available here. see /the-twelfth-axis for current state.",
      },
      { status: 404 }
    );
  }
  let meta: any;
  try {
    meta = JSON.parse(metaRaw);
  } catch {
    return NextResponse.json(
      { error: "metadata corrupted" },
      { status: 500 }
    );
  }

  const fragments: AxisFragment[] = Array.isArray(meta.fragments)
    ? meta.fragments
    : [];

  const doc: TwelfthAxisDoc = {
    title: meta.title ?? "THE TWELFTH AXIS",
    subtitle:
      meta.subtitle ?? "a reading on the non-linear substrate",
    generated_at_ts: meta.generated_at_ts ?? 0,
    locked_at:
      meta.locked_at ??
      (meta.generated_at_ts
        ? new Date(meta.generated_at_ts * 1000).toISOString()
        : ""),
    hash: meta.hash ?? "",
    uri: meta.uri ?? "",
    on_chain_tx: meta.on_chain_tx ?? null,
    fragments,
    full_text: bodyRaw,
    source_documents: meta.source_documents ?? [],
    voice_samples_used: meta.voice_samples_used ?? [],
    model: meta.model ?? "claude-opus-4-7",
    version: meta.version ?? "1.0",
    footer_disclosure: FOOTER,
  };
  return NextResponse.json(doc, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400, immutable",
    },
  });
}

/**
 * One-shot write. Stores the generated Twelfth Axis body + metadata
 * in KV. Authenticated by content-addressing: the request's
 * `metadata.hash` must equal keccak256(body), and a hash mismatch
 * returns 400. Idempotent on hash collision (same hash + same body =
 * 200 already-exists). Refuses to overwrite an existing artifact
 * unless the `X-Force` header is set to "yes".
 *
 * The script that calls this lives at scripts/generate-twelfth-axis.ts
 * and uses this route so it does not need direct KV credentials.
 */
export async function POST(req: NextRequest) {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "body must be JSON" },
      { status: 400 }
    );
  }
  const text: string = body?.text;
  const metadata: any = body?.metadata;
  if (typeof text !== "string" || text.length < 100) {
    return NextResponse.json(
      { error: "body.text must be a string of at least 100 chars" },
      { status: 400 }
    );
  }
  if (
    !metadata ||
    typeof metadata !== "object" ||
    typeof metadata.hash !== "string"
  ) {
    return NextResponse.json(
      { error: "body.metadata.hash is required" },
      { status: 400 }
    );
  }
  const computedHex = keccak_256(text);
  const provided = metadata.hash.toLowerCase().replace(/^0x/, "");
  if (provided !== computedHex) {
    return NextResponse.json(
      {
        error: "hash mismatch",
        expected_hash: "0x" + computedHex,
        provided_hash: metadata.hash,
      },
      { status: 400 }
    );
  }
  const force = (req.headers.get("x-force") ?? "").toLowerCase() === "yes";
  const existing = await kvGet(META_KEY);
  if (existing && !force) {
    try {
      const existingMeta = JSON.parse(existing);
      // Idempotent on identical hash.
      if (existingMeta.hash === metadata.hash) {
        return NextResponse.json(
          { stored: false, reason: "identical artifact already present", hash: metadata.hash },
          { status: 200 }
        );
      }
    } catch {
      /* fall through */
    }
    return NextResponse.json(
      {
        error: "twelfth axis already generated",
        hint: "send X-Force: yes to overwrite",
      },
      { status: 409 }
    );
  }
  // Store body first so a partial failure doesn't leave metadata
  // pointing at nothing.
  try {
    await kvSet(BODY_KEY, text);
    await kvSet(META_KEY, JSON.stringify(metadata));
  } catch (e: any) {
    return NextResponse.json(
      { error: "kv write failed", detail: String(e?.message ?? e) },
      { status: 502 }
    );
  }
  return NextResponse.json(
    {
      stored: true,
      hash: metadata.hash,
      body_bytes: text.length,
      view_at: "/the-twelfth-axis",
      json_at: "/api/lore/twelfth-axis",
    },
    { status: 201 }
  );
}
