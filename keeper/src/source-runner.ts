import { log } from "./logger";
import { fetchHackerNews } from "./sources/hackernews";
import { fetchPolymarket } from "./sources/polymarket";
import { fetchApod } from "./sources/apod";
import { fetchAstronomy } from "./sources/astronomy";
import { fetchFred } from "./sources/fred";
import { fetchReddit } from "./sources/reddit";
import { fetchCloudflare } from "./sources/cloudflare";
import {
  gatherAndSelect,
  loadMotifVocabulary,
  SourceSelection,
} from "./source-selection";

// Phase 29 wiring: runs all configured source modules in parallel,
// builds the SelectionContext from the prior epoch's seed record on
// web, and returns the per-category selection map ready to be POSTed
// alongside the seed payload.

const ALL_MODULES = [
  fetchHackerNews,
  fetchPolymarket,
  fetchApod,
  fetchAstronomy,
  fetchFred,
  fetchReddit,
  fetchCloudflare,
];

const WEB_BASE =
  process.env.WEB_BASE_URL ?? "https://sator-looking-glass-web.vercel.app";

interface PriorSeedRecord {
  source_selection?: Record<
    string,
    {
      selected_source: string;
      selected_value: { text_representation?: string };
      candidates?: Array<{
        name: string;
        text_representation?: string;
      }>;
    }
  >;
  captured_at_ts?: number;
}

async function fetchPriorRecord(
  currentEpoch: number
): Promise<PriorSeedRecord | null> {
  if (currentEpoch <= 1) return null;
  try {
    const r = await fetch(`${WEB_BASE}/api/seeds/${currentEpoch - 1}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    return (await r.json()) as PriorSeedRecord;
  } catch {
    return null;
  }
}

/** Builds the prior-text + last-selected maps from the previous
 *  epoch's seed record. Includes prior text for ALL candidates that
 *  scored last epoch, not just the winner, so variance is meaningful
 *  for sources that lost the prior round too. */
function buildContextMaps(prior: PriorSeedRecord | null): {
  priorTextByName: Map<string, string>;
  lastSelectedAt: Map<string, number>;
} {
  const priorTextByName = new Map<string, string>();
  const lastSelectedAt = new Map<string, number>();
  const ts = prior?.captured_at_ts ?? 0;
  for (const sel of Object.values(prior?.source_selection ?? {})) {
    if (sel.selected_source && ts > 0) {
      lastSelectedAt.set(sel.selected_source, ts);
    }
    if (sel.selected_value?.text_representation) {
      priorTextByName.set(
        sel.selected_source,
        sel.selected_value.text_representation
      );
    }
    for (const c of sel.candidates ?? []) {
      if (c.text_representation) {
        priorTextByName.set(c.name, c.text_representation);
      }
    }
  }
  return { priorTextByName, lastSelectedAt };
}

export interface RunResult {
  selections: Record<string, SourceSelection>;
  module_faults: string[];
  motif_vocab_size: number;
}

/**
 * Run all source modules in parallel, score and select per category,
 * return the result. Designed to be idempotent and side-effect-free —
 * the caller persists the result via the seed-recorder.
 */
export async function gatherAndSelectAllSources(
  currentEpoch: number
): Promise<RunResult> {
  const [motifTokens, prior] = await Promise.all([
    loadMotifVocabulary(WEB_BASE),
    fetchPriorRecord(currentEpoch),
  ]);
  const { priorTextByName, lastSelectedAt } = buildContextMaps(prior);
  const { selections, faults } = await gatherAndSelect(ALL_MODULES, {
    motifTokens,
    priorTextByName,
    lastSelectedAt,
  });
  if (faults.length > 0) {
    log.system(`[sources] module faults: ${faults.join(" | ")}`);
  }
  const summary = Object.entries(selections)
    .map(
      ([cat, s]) =>
        `${cat}=${s.selected_source.slice(0, 32)}(score ${s.selection_score})`
    )
    .join(", ");
  log.system(
    `[sources] selected: ${summary || "(none)"} | motif vocab: ${motifTokens.size} tokens`
  );
  return {
    selections,
    module_faults: faults,
    motif_vocab_size: motifTokens.size,
  };
}
