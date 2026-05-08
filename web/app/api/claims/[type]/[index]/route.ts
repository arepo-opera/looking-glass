import { NextRequest, NextResponse } from "next/server";
import { keccak_256 } from "js-sha3";
import {
  kvConfigured,
  kvErrorResponse,
  kvGet,
  kvSet,
} from "@/lib/kv-helpers";

const VALID_TYPES = new Set(["epoch", "layer1", "layer2"]);
// Backfill-mode timeouts can run long for syntheses. Vercel's default
// route timeout is 10s; bump for this route specifically.
export const maxDuration = 60;
const CLAIMS_TTL_SECONDS = 365 * 24 * 60 * 60;
const EXTRACTOR_MODEL = "claude-haiku-4-5";
const EXTRACTOR_VERSION = "1.0";

const EXTRACTOR_SYSTEM_BASE = `You receive an oracular prophecy text. Your task is to extract any testable claims about future events that the prophecy might be making. A testable claim is one where, given a {WINDOW}-day observation window, an external researcher could verify whether the claim's described event occurred or didn't.

Most prophecies will contain no testable claims. The voice of this oracle is deliberately abstract and self-referential. If the prophecy makes no concrete claim about future events in the world (markets, geopolitics, science, culture, nature), return an empty claims array and label the prophecy as "abstract_only".

Do NOT stretch to find claims. Do NOT interpret abstract language as concrete prediction. If you have to reach to identify a claim, do not include it.

For each genuine testable claim:
- claim_id: short identifier (c1, c2, ...)
- category: one of geopolitical_event, financial_event, scientific_announcement, natural_event, cultural_event, structural_pattern, abstract_only
- claim_text: a precise description of what observable event would constitute resonance
- time_window_days: typically 30 for atomic prophecies, larger for syntheses
- specificity: high (named entity, named date), medium (general category, broad timeframe), low (vague but testable)
- match_criteria: what external evidence would count as a match

Output strict JSON matching the schema. No commentary outside the JSON.

Schema:
{
  "extracted_claims": [
    {
      "claim_id": "c1",
      "category": "...",
      "claim_text": "...",
      "time_window_days": {WINDOW},
      "specificity": "high|medium|low",
      "match_criteria": "..."
    }
  ],
  "untestable_residue": "string"
}`;

interface ExtractedClaim {
  claim_id: string;
  category: string;
  claim_text: string;
  time_window_days: number;
  specificity: "high" | "medium" | "low";
  match_criteria: string;
}
interface ClaimsDocument {
  type: "epoch" | "layer1" | "layer2";
  index: number;
  extracted_at_ts: number;
  extractor_model: string;
  extractor_version: string;
  prophecy_text: string;
  extracted_claims: ExtractedClaim[];
  untestable_residue: string;
  is_abstract_only: boolean;
}

async function callExtractor(
  apiKey: string,
  prophecyText: string,
  windowDays: number
): Promise<{ claims: ExtractedClaim[]; residue: string }> {
  const sys = EXTRACTOR_SYSTEM_BASE.replace(/\{WINDOW\}/g, String(windowDays));
  const userPrompt = `prophecy text:\n\n${prophecyText}\n\nDefault time window for testable claims: ${windowDays} days.`;
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: EXTRACTOR_MODEL,
      max_tokens: 1500,
      system: sys,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`anthropic ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const body = (await resp.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  const raw = body.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n")
    .trim();
  let jsonStr = raw;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonStr = fence[1].trim();
  let parsed: { extracted_claims?: ExtractedClaim[]; untestable_residue?: string };
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(
      `extractor returned invalid JSON: ${(e as Error).message}; raw=${raw.slice(0, 200)}`
    );
  }
  const claims = (parsed.extracted_claims ?? []).map((c, i) => ({
    claim_id: c.claim_id || `c${i + 1}`,
    category: c.category || "structural_pattern",
    claim_text: c.claim_text || "",
    time_window_days:
      typeof c.time_window_days === "number"
        ? c.time_window_days
        : windowDays,
    specificity: (c.specificity || "low") as "high" | "medium" | "low",
    match_criteria: c.match_criteria || "",
  }));
  return { claims, residue: parsed.untestable_residue ?? "" };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { type: string; index: string } }
) {
  const { type, index } = params;
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      { error: "type must be one of: epoch, layer1, layer2" },
      { status: 400 }
    );
  }
  const idxNum = Number(index);
  if (!Number.isFinite(idxNum) || idxNum < 0) {
    return NextResponse.json(
      { error: "index must be a non-negative integer" },
      { status: 400 }
    );
  }
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const key = `claims:${type}:${idxNum}`;
  const raw = await kvGet(key);
  if (raw === null) {
    return NextResponse.json(
      { error: "not found", key, hint: "claims have not been extracted for this index yet" },
      { status: 404 }
    );
  }
  try {
    const doc = JSON.parse(raw);
    return NextResponse.json(doc, {
      headers: {
        // Claims documents are immutable once written (pre-committed
        // criteria). Cache aggressively at the edge.
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "stored value is not valid JSON", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/claims/{type}/{index}
 * Body: { "prophecy_text": "<full text>" }
 *
 * Triggers server-side extraction against the supplied text and stores
 * the resulting claims document in KV under claims:{type}:{index}.
 * Idempotent — if claims:{type}:{index} already exists, returns 409
 * with the existing document. Used by the Phase 20A backfill script
 * (keeper/src/scripts/backfill-extraction.ts) which doesn't have KV
 * credentials of its own; the API route handles extraction + storage
 * server-side using the ANTHROPIC_API_KEY + KV_REST_API_*
 * env vars on Vercel.
 *
 * No auth gate. The data flowing through is derived from publicly-
 * verifiable on-chain prophecy text and a publicly-documented
 * extraction prompt; first-write-wins prevents tampering with
 * already-extracted indices.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { type: string; index: string } }
) {
  const { type, index } = params;
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      { error: "type must be one of: epoch, layer1, layer2" },
      { status: 400 }
    );
  }
  const idxNum = Number(index);
  if (!Number.isFinite(idxNum) || idxNum < 0) {
    return NextResponse.json(
      { error: "index must be a non-negative integer" },
      { status: 400 }
    );
  }
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "extraction not configured",
        detail: "ANTHROPIC_API_KEY env var is unset on this deployment.",
      },
      { status: 503 }
    );
  }

  let body: { prophecy_text?: string; time_window_days?: number };
  try {
    body = (await req.json()) as { prophecy_text?: string; time_window_days?: number };
  } catch {
    return NextResponse.json(
      { error: "body must be JSON {prophecy_text: string}" },
      { status: 400 }
    );
  }
  const prophecyText = (body.prophecy_text ?? "").trim();
  if (prophecyText.length === 0) {
    return NextResponse.json(
      { error: "body.prophecy_text must be a non-empty string" },
      { status: 400 }
    );
  }

  // Idempotent: 409 with existing doc if already extracted.
  const key = `claims:${type}:${idxNum}`;
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

  // Default windows: 30 / 90 / 180 for epoch / layer1 / layer2.
  const defaultWindow =
    type === "layer2" ? 180 : type === "layer1" ? 90 : 30;
  const windowDays =
    typeof body.time_window_days === "number" && body.time_window_days > 0
      ? body.time_window_days
      : defaultWindow;

  let extracted: { claims: ExtractedClaim[]; residue: string };
  try {
    extracted = await callExtractor(apiKey, prophecyText, windowDays);
  } catch (e: any) {
    return NextResponse.json(
      { error: "extraction failed", detail: String(e?.message ?? e) },
      { status: 502 }
    );
  }
  // Bind the prophecy_text into the stored doc by hashing — content-
  // address the extraction so a downstream verifier can confirm the
  // claims were extracted from this exact text and not a tampered
  // version. The hash is exposed in the response.
  const promptHash = keccak_256(prophecyText);
  const doc: ClaimsDocument & { prophecy_text_hash: string } = {
    type: type as "epoch" | "layer1" | "layer2",
    index: idxNum,
    extracted_at_ts: Math.floor(Date.now() / 1000),
    extractor_model: EXTRACTOR_MODEL,
    extractor_version: EXTRACTOR_VERSION,
    prophecy_text: prophecyText,
    prophecy_text_hash: promptHash,
    extracted_claims: extracted.claims,
    untestable_residue: extracted.residue,
    is_abstract_only: extracted.claims.length === 0,
  };
  try {
    await kvSet(key, JSON.stringify(doc), CLAIMS_TTL_SECONDS);
  } catch (e: any) {
    return NextResponse.json(
      { error: "kv write failed", detail: String(e?.message ?? e) },
      { status: 502 }
    );
  }
  return NextResponse.json(doc, { status: 201 });
}
