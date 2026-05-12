import { log } from "./logger";
import { SourceFetchResult, SourceValue } from "./sources/types";

// Phase 29: apparatus-driven source selection. For each multi-source
// category, score every available source by variance + resonance and
// pick the top. The selected source's value is what feeds the seed
// compression engine; the others are recorded (in the on-disk seed
// payload) but not used for the constraint engine of this epoch.
//
// Resonance scoring v1 uses token-Jaccard against the apparatus's
// recurring motif vocabulary. The brief proposed Claude embeddings
// for resonance, but Anthropic does not currently expose an
// embeddings API — Claude has only completions. Voyage AI is
// Anthropic's recommended embeddings provider, OpenAI has its own.
// We ship the deterministic token-overlap version now and leave a
// clean integration point at scoreResonance() for swapping in an
// embeddings provider later.

export interface SourceSelection {
  category: string;
  selected_source: string;
  selected_value: SourceValue;
  selection_score: number;
  variance_score: number;
  resonance_score: number;
  available_sources: number;
  candidates: Array<{
    name: string;
    variance: number;
    resonance: number;
    combined: number;
    // Phase 29 integration: include the text_representation on every
    // scored candidate (not just the winner) so the next epoch's
    // variance scorer has prior text for non-selected sources too.
    // Without this, only the prior winner's variance is meaningful;
    // everyone else would be locked at the 0.5 neutral fallback.
    text_representation: string;
  }>;
}

export interface SelectionContext {
  // Map of source name → prior text_representation (used to detect
  // change → variance). Loaded from prior epoch's persisted record.
  priorTextByName: Map<string, string>;
  // Map of source name → last-selected unix timestamp (used to
  // tie-break: older = preferred). Loaded from KV.
  lastSelectedAt: Map<string, number>;
  // Motif vocabulary as a Set of lowercase tokens. Fetched from
  // /api/patterns/motifs. May be empty (e.g. cold start) in which
  // case resonance scoring returns 0.5 (neutral).
  motifTokens: Set<string>;
}

const TOKENISE_RE = /[a-z][a-z0-9'-]+/g;

function tokenise(s: string): Set<string> {
  const out = new Set<string>();
  const m = s.toLowerCase().matchAll(TOKENISE_RE);
  for (const t of m) out.add(t[0]);
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const uni = a.size + b.size - inter;
  return uni > 0 ? inter / uni : 0;
}

/**
 * Variance score in [0, 1]. Detects "this source's value has changed
 * since the last epoch we saw it" via a coarse text-distance proxy.
 * Soft-bounded: small changes → low score; total replacement → ~1.
 */
function scoreVariance(
  current: SourceValue,
  priorText: string | undefined
): number {
  if (priorText === undefined) return 0.5; // unknown → neutral
  if (priorText === current.text_representation) return 0;
  // Token-set distance. The complement of Jaccard similarity is the
  // Jaccard distance, which is what we want for variance.
  const ta = tokenise(priorText);
  const tb = tokenise(current.text_representation);
  const sim = jaccard(ta, tb);
  // Map similarity to variance: identical = 0, totally different = 1.
  return 1 - sim;
}

function scoreResonance(
  current: SourceValue,
  motifTokens: Set<string>
): number {
  if (motifTokens.size === 0) return 0.5; // no vocabulary yet → neutral
  const tb = tokenise(current.text_representation);
  return jaccard(motifTokens, tb);
}

/**
 * Compute combined score and pick the highest. Tie-break: source
 * with the older lastSelectedAt is preferred (the apparatus rotates
 * rather than fixates).
 */
export function selectForCategory(
  category: string,
  candidates: SourceValue[],
  ctx: SelectionContext
): SourceSelection | null {
  if (candidates.length === 0) return null;
  const scored = candidates.map((c) => {
    const variance = scoreVariance(c, ctx.priorTextByName.get(c.name));
    const resonance = scoreResonance(c, ctx.motifTokens);
    const combined = 0.5 * variance + 0.5 * resonance;
    return { src: c, variance, resonance, combined };
  });
  scored.sort((a, b) => {
    if (b.combined !== a.combined) return b.combined - a.combined;
    const la = ctx.lastSelectedAt.get(a.src.name) ?? 0;
    const lb = ctx.lastSelectedAt.get(b.src.name) ?? 0;
    return la - lb; // older = lower epoch = preferred
  });
  const top = scored[0];
  return {
    category,
    selected_source: top.src.name,
    selected_value: top.src,
    selection_score: Number(top.combined.toFixed(4)),
    variance_score: Number(top.variance.toFixed(4)),
    resonance_score: Number(top.resonance.toFixed(4)),
    available_sources: candidates.length,
    candidates: scored.map((s) => ({
      name: s.src.name,
      variance: Number(s.variance.toFixed(4)),
      resonance: Number(s.resonance.toFixed(4)),
      combined: Number(s.combined.toFixed(4)),
      text_representation: s.src.text_representation,
    })),
  };
}

/**
 * Gather all source-module results, bucket by category, and return
 * the selection per multi-source category. Single-source categories
 * (ECHO, DRIFT) are not handled here — they continue to be computed
 * by their existing fetchers in keeper/src/seeds/.
 */
export async function gatherAndSelect(
  modules: Array<() => Promise<SourceFetchResult>>,
  ctx: SelectionContext
): Promise<{
  selections: Record<string, SourceSelection>;
  faults: string[];
}> {
  const results = await Promise.all(modules.map((m) => m()));
  const faults: string[] = [];
  const byCategory = new Map<string, SourceValue[]>();
  for (const r of results) {
    if (r.fault) faults.push(r.fault);
    for (const v of r.values) {
      const arr = byCategory.get(v.category) ?? [];
      arr.push(v);
      byCategory.set(v.category, arr);
    }
  }
  const selections: Record<string, SourceSelection> = {};
  for (const [category, values] of byCategory) {
    const sel = selectForCategory(category, values, ctx);
    if (sel) selections[category] = sel;
  }
  return { selections, faults };
}

/** Load the motif vocabulary from the web's /api/patterns/motifs. */
export async function loadMotifVocabulary(
  baseUrl: string
): Promise<Set<string>> {
  try {
    const r = await fetch(`${baseUrl}/api/patterns/motifs`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return new Set();
    const body = (await r.json()) as {
      motifs?: Array<{ phrase: string }>;
    };
    const tokens = new Set<string>();
    for (const m of body.motifs ?? []) {
      for (const t of tokenise(m.phrase)) tokens.add(t);
    }
    log.system(
      `[selection] motif vocabulary loaded: ${tokens.size} tokens from ${body.motifs?.length ?? 0} motifs`
    );
    return tokens;
  } catch (e) {
    log.system(`[selection] motif vocabulary load failed: ${String((e as Error)?.message ?? e)}`);
    return new Set();
  }
}

/** Load the per-source prior-text + last-selected map from KV. */
export interface SelectionStateKV {
  loadPriorTexts(): Promise<Map<string, string>>;
  loadLastSelected(): Promise<Map<string, number>>;
  saveAfterEpoch(epoch: number, sels: Record<string, SourceSelection>): Promise<void>;
}

/**
 * Builds a SelectionContext from the current KV state. Implementation
 * is deferred to the keeper layer (where the seed-recorder lives), so
 * this module stays free of direct KV coupling.
 */
export async function buildContext(
  motifBaseUrl: string,
  kv: Pick<SelectionStateKV, "loadPriorTexts" | "loadLastSelected">
): Promise<SelectionContext> {
  const [motifTokens, priorTextByName, lastSelectedAt] = await Promise.all([
    loadMotifVocabulary(motifBaseUrl),
    kv.loadPriorTexts(),
    kv.loadLastSelected(),
  ]);
  return { motifTokens, priorTextByName, lastSelectedAt };
}
