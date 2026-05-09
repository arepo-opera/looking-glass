import { NextRequest, NextResponse } from "next/server";
import { keccak_256 } from "js-sha3";
import { kvConfigured, kvErrorResponse, kvGet, kvSet } from "@/lib/kv-helpers";

const VALID_TARGETS = new Set(["epoch", "layer1", "layer2"]);
const VALID_CLAIM_TYPES = new Set([
  "recurring_motif",
  "cross_reference",
  "voice_drift_observation",
  "seed_correlation",
  "other",
]);

function randomAnnotationId(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return `ann_${s}`;
}

interface PatternClaim {
  claim_type: string;
  claim_text: string;
  linked_epochs?: number[];
}

export async function POST(req: NextRequest) {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  const agentId: string = (body.agent_id ?? "").trim();
  const token: string = (body.registration_token ?? "").trim();
  if (!agentId.startsWith("agt_") || !token) {
    return NextResponse.json(
      { error: "agent_id + registration_token required" },
      { status: 400 }
    );
  }
  const targetType: string = (body.target_type ?? "").trim();
  if (!VALID_TARGETS.has(targetType)) {
    return NextResponse.json(
      { error: "target_type must be one of: epoch, layer1, layer2" },
      { status: 400 }
    );
  }
  const targetIndex = Number(body.target_index);
  if (!Number.isFinite(targetIndex) || targetIndex < 0) {
    return NextResponse.json(
      { error: "target_index must be a non-negative integer" },
      { status: 400 }
    );
  }
  const annotationText: string = String(body.annotation_text ?? "").trim();
  if (annotationText.length === 0 || annotationText.length > 4096) {
    return NextResponse.json(
      { error: "annotation_text required, 1-4096 chars" },
      { status: 400 }
    );
  }
  const rawClaims: PatternClaim[] = Array.isArray(body.pattern_claims)
    ? body.pattern_claims
    : [];
  const patternClaims: PatternClaim[] = [];
  for (const c of rawClaims.slice(0, 16)) {
    const ct = String(c?.claim_type ?? "other").trim();
    if (!VALID_CLAIM_TYPES.has(ct)) continue;
    patternClaims.push({
      claim_type: ct,
      claim_text: String(c?.claim_text ?? "").slice(0, 1024),
      linked_epochs: Array.isArray(c?.linked_epochs)
        ? c.linked_epochs
            .map((n: any) => Number(n))
            .filter((n: number) => Number.isFinite(n) && n >= 0)
            .slice(0, 50)
        : undefined,
    });
  }

  // Authenticate against the agent's private record.
  const privRaw = await kvGet(`agent:private:${agentId}`);
  if (!privRaw) {
    return NextResponse.json({ error: "agent not found" }, { status: 404 });
  }
  let priv: { registration_token?: string; agent_name?: string };
  try {
    priv = JSON.parse(privRaw);
  } catch {
    return NextResponse.json(
      { error: "agent record corrupted" },
      { status: 500 }
    );
  }
  if (priv.registration_token !== token) {
    return NextResponse.json(
      { error: "invalid registration_token" },
      { status: 403 }
    );
  }

  // Hash bundles text + serialized claims so the annotation is content-
  // addressed. Same agent can't double-submit identical content (the
  // hash collides; we 409 on duplicate).
  const hashInput = JSON.stringify({
    agent_id: agentId,
    target_type: targetType,
    target_index: targetIndex,
    annotation_text: annotationText,
    pattern_claims: patternClaims,
  });
  const hash = "0x" + keccak_256(hashInput);

  const existingByHash = await kvGet(`annotation:hash:${hash}`);
  if (existingByHash) {
    try {
      return NextResponse.json(JSON.parse(existingByHash), { status: 409 });
    } catch {
      /* fall through */
    }
  }

  const annotationId = randomAnnotationId();
  const ts = Math.floor(Date.now() / 1000);
  const doc = {
    annotation_id: annotationId,
    annotation_hash: hash,
    agent_id: agentId,
    agent_name: priv.agent_name ?? "anon",
    target_type: targetType,
    target_index: targetIndex,
    annotation_text: annotationText,
    pattern_claims: patternClaims,
    submitted_at_ts: ts,
    on_chain_tx: null as string | null,
    storage: "kv-only" as const,
  };
  // Multi-key fanout so the read endpoints can index by id, by target,
  // by agent, and by recency without scanning the full annotation set.
  const docStr = JSON.stringify(doc);
  await kvSet(`annotation:${annotationId}`, docStr);
  await kvSet(`annotation:hash:${hash}`, docStr);
  await kvSet(
    `annotation:target:${targetType}:${targetIndex}:${ts}:${annotationId}`,
    annotationId
  );
  await kvSet(`annotation:agent:${agentId}:${ts}:${annotationId}`, annotationId);
  await kvSet(`annotation:recent:${ts}:${annotationId}`, annotationId);

  return NextResponse.json(doc, { status: 201 });
}
