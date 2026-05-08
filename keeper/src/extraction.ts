import Anthropic from "@anthropic-ai/sdk";
import { log } from "./logger";

// Phase 20A — claim extraction. Fires immediately after each atomic
// prophecy lock. The extractor reads the prophecy text and produces a
// structured claims document, stored in Vercel KV under
// `claims:epoch:{N}` (or `claims:layer1:{N}` / `claims:layer2:{N}`).
//
// Pre-committed criteria principle: extraction happens at LOCK TIME,
// before any external event referenced by a claim could be observed.
// A later scoring pass (Phase 20B) compares the pre-extracted claims
// to news archives from the post-lock window. The scorer cannot
// revise the claims; it can only check them.

const EXTRACTOR_MODEL = "claude-haiku-4-5";
const EXTRACTOR_VERSION = "1.0";

const EXTRACTOR_SYSTEM = `You receive an oracular prophecy text. Your task is to extract any testable claims about future events that the prophecy might be making. A testable claim is one where, given a 30-day observation window, an external researcher could verify whether the claim's described event occurred or didn't.

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
      "time_window_days": 30,
      "specificity": "high|medium|low",
      "match_criteria": "..."
    }
  ],
  "untestable_residue": "string describing any aspects of the prophecy that can't be reduced to testable claims, or empty string if everything was either testable or abstract"
}`;

export interface ExtractedClaim {
  claim_id: string;
  category: string;
  claim_text: string;
  time_window_days: number;
  specificity: "high" | "medium" | "low";
  match_criteria: string;
}

export interface ClaimsDocument {
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

export interface ExtractorConfig {
  apiKey: string | undefined;
  enabled: boolean;
  defaultTimeWindowDays: number;
}

export function loadExtractorConfig(): ExtractorConfig {
  const enabled =
    (process.env.EXTRACTION_ENABLED ?? "false").toLowerCase() === "true";
  return {
    apiKey: process.env.ANTHROPIC_API_KEY,
    enabled,
    defaultTimeWindowDays: 30,
  };
}

/**
 * Run the extractor against a single prophecy/synthesis text. Returns
 * a ClaimsDocument. Throws on Claude API failure or invalid JSON
 * response — caller is responsible for catching + logging.
 */
export async function extractClaims(
  cfg: ExtractorConfig,
  type: "epoch" | "layer1" | "layer2",
  index: number,
  prophecyText: string,
  defaultWindowDays?: number
): Promise<ClaimsDocument> {
  if (!cfg.apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey: cfg.apiKey });
  const windowHint =
    defaultWindowDays ?? cfg.defaultTimeWindowDays;
  const userPrompt = `prophecy text:\n\n${prophecyText}\n\nDefault time window for testable claims: ${windowHint} days.`;
  const resp = await client.messages.create({
    model: EXTRACTOR_MODEL,
    max_tokens: 1500,
    system: EXTRACTOR_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const raw = resp.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text as string)
    .join("\n")
    .trim();
  // Tolerate a fenced code block if Claude wraps the JSON
  let jsonStr = raw;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonStr = fence[1].trim();
  let parsed: { extracted_claims?: ExtractedClaim[]; untestable_residue?: string };
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(
      `extractor returned invalid JSON: ${(e as Error).message}\nraw: ${raw.slice(0, 500)}`
    );
  }
  const claims = (parsed.extracted_claims ?? []).map((c, i) => ({
    claim_id: c.claim_id || `c${i + 1}`,
    category: c.category || "structural_pattern",
    claim_text: c.claim_text || "",
    time_window_days:
      typeof c.time_window_days === "number"
        ? c.time_window_days
        : windowHint,
    specificity: (c.specificity || "low") as "high" | "medium" | "low",
    match_criteria: c.match_criteria || "",
  }));
  return {
    type,
    index,
    extracted_at_ts: Math.floor(Date.now() / 1000),
    extractor_model: EXTRACTOR_MODEL,
    extractor_version: EXTRACTOR_VERSION,
    prophecy_text: prophecyText,
    extracted_claims: claims,
    untestable_residue: parsed.untestable_residue ?? "",
    is_abstract_only: claims.length === 0,
  };
}

const KV_URL = process.env.KV_REST_API_URL ?? "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? "";
// Claims documents need to outlive the synthesis-text TTL — they're
// the immutable pre-committed criteria for scoring. 1 year is well
// past any practical scoring window.
const CLAIMS_TTL_SECONDS = 365 * 24 * 60 * 60;

export function kvConfigured(): boolean {
  return KV_URL.length > 0 && KV_TOKEN.length > 0;
}

export async function storeClaims(doc: ClaimsDocument): Promise<void> {
  if (!kvConfigured()) {
    throw new Error(
      "KV not configured (KV_REST_API_URL / KV_REST_API_TOKEN missing)"
    );
  }
  const key = `claims:${doc.type}:${doc.index}`;
  const url = `${KV_URL}/set/${encodeURIComponent(key)}?EX=${CLAIMS_TTL_SECONDS}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "text/plain",
    },
    body: JSON.stringify(doc),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`kv set failed: ${resp.status} ${txt}`);
  }
}

export async function readClaims(
  type: "epoch" | "layer1" | "layer2",
  index: number
): Promise<ClaimsDocument | null> {
  if (!kvConfigured()) return null;
  const key = `claims:${type}:${index}`;
  const url = `${KV_URL}/get/${encodeURIComponent(key)}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!resp.ok) return null;
  const body = (await resp.json()) as { result: string | null };
  if (!body.result) return null;
  try {
    return JSON.parse(body.result) as ClaimsDocument;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget extractor for the keeper's tick path. Catches its
 * own errors so a Claude hiccup never blocks the main loop.
 */
export async function extractAndStoreSafe(
  cfg: ExtractorConfig,
  type: "epoch" | "layer1" | "layer2",
  index: number,
  prophecyText: string
): Promise<void> {
  if (!cfg.enabled) return;
  if (!cfg.apiKey) {
    log.system(`[extract] skipped ${type}.${index}: ANTHROPIC_API_KEY unset`);
    return;
  }
  if (!kvConfigured()) {
    log.system(`[extract] skipped ${type}.${index}: KV unset`);
    return;
  }
  try {
    const existing = await readClaims(type, index);
    if (existing) {
      log.system(`[extract] ${type}.${index} already extracted, skipping`);
      return;
    }
    const doc = await extractClaims(cfg, type, index, prophecyText);
    await storeClaims(doc);
    log.system(
      `[extract] ${type}.${index}: ${doc.extracted_claims.length} claim(s), abstract_only=${doc.is_abstract_only}`
    );
  } catch (e: any) {
    log.system(`[extract] ${type}.${index} FAILED: ${e?.message ?? e}`);
  }
}
