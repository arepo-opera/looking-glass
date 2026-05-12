import { NextRequest, NextResponse } from "next/server";
import {
  kvConfigured,
  kvErrorResponse,
  kvGet,
  kvSet,
} from "@/lib/kv-helpers";
import { spineOwnerForEpoch } from "@/lib/oracle-helpers";

const SEEDS_TTL_SECONDS = 365 * 24 * 60 * 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: { N: string } }
) {
  const epoch = Number(params.N);
  if (!Number.isFinite(epoch) || epoch < 0) {
    return NextResponse.json(
      { error: "N must be a non-negative integer epoch number" },
      { status: 400 }
    );
  }
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const raw = await kvGet(`seeds:epoch:${epoch}`);
  if (raw === null) {
    return NextResponse.json(
      {
        error: "not found",
        epoch,
        hint: "seeds were not captured for epochs that locked before the keeper began writing seed records (Phase 20B-final and later).",
      },
      { status: 404 }
    );
  }
  try {
    return NextResponse.json(JSON.parse(raw), {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "stored value is not valid JSON" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/seeds/{N}
 * Body: the structured seed record at lock time.
 *
 * Used by the keeper after each successful submit_prophecy. Idempotent
 * via first-write-wins (409 if seeds:epoch:{N} already exists). The
 * spine_owner field is computed server-side from epoch % 5 so the
 * caller doesn't need to track it.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { N: string } }
) {
  const epoch = Number(params.N);
  if (!Number.isFinite(epoch) || epoch < 0) {
    return NextResponse.json(
      { error: "N must be a non-negative integer epoch number" },
      { status: 400 }
    );
  }
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  const key = `seeds:epoch:${epoch}`;
  const existing = await kvGet(key);
  if (existing !== null) {
    try {
      return NextResponse.json(JSON.parse(existing), { status: 409 });
    } catch {
      return NextResponse.json(
        { error: "stored value is not valid JSON" },
        { status: 500 }
      );
    }
  }
  // models config is optional. Pre-Phase-A seeds don't carry it; treat
  // them as "all-opus" implicitly when reading.
  // Phase 29: source_selection is optional and per-category. When
  // present it records which source the apparatus attended to in each
  // multi-source category for this epoch.
  const doc = {
    captured_at_ts:
      typeof body.captured_at_ts === "number"
        ? body.captured_at_ts
        : Math.floor(Date.now() / 1000),
    markets: body.markets ?? {},
    chain: body.chain ?? {},
    world: body.world ?? {},
    heavens: body.heavens ?? {},
    echo: body.echo ?? {},
    drift: body.drift ?? {},
    spine_owner: spineOwnerForEpoch(epoch),
    ...(body.models &&
    typeof body.models === "object" &&
    typeof body.models.read === "string" &&
    typeof body.models.merge === "string" &&
    typeof body.models.configuration_id === "string"
      ? {
          models: {
            read: body.models.read,
            merge: body.models.merge,
            configuration_id: body.models.configuration_id,
          },
        }
      : {}),
    ...(body.source_selection &&
    typeof body.source_selection === "object" &&
    !Array.isArray(body.source_selection)
      ? { source_selection: body.source_selection }
      : {}),
  };
  try {
    await kvSet(key, JSON.stringify(doc), SEEDS_TTL_SECONDS);
  } catch (e: any) {
    return NextResponse.json(
      { error: "kv write failed", detail: String(e?.message ?? e) },
      { status: 502 }
    );
  }
  return NextResponse.json(doc, { status: 201 });
}
