import { NextResponse } from "next/server";
import { kvConfigured, kvErrorResponse, kvGet } from "@/lib/kv-helpers";

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
