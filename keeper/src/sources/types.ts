// Phase 29: per-source value returned by each module under
// keeper/src/sources/. Each module fetches one or more source values
// from an external API and returns them. The selection logic at
// keeper/src/source-selection.ts then picks the highest-scoring
// source per category for the current epoch.

export interface SourceValue {
  /**
   * Stable identifier for the source. Format: "{provider}:{key}",
   * lowercase, hyphens for separators within a key. Examples:
   *   pyth:btc-usd
   *   fred:unemployment-rate
   *   polymarket:will-fed-cut-rates-by-eoy
   *   reddit:r-news-top-1
   *   hn:top-1
   */
  name: string;
  /**
   * Coarse category this source belongs to: MARKETS / WORLD / HEAVENS /
   * CHAIN. ECHO and DRIFT are single-source and not selection-eligible.
   */
  category: "MARKETS" | "WORLD" | "HEAVENS" | "CHAIN";
  /** Raw structured value the source emitted. Free-form per source. */
  raw_value: Record<string, unknown>;
  /**
   * One-line plain-text representation. This is what the resonance
   * scorer compares against the motif vocabulary. Keep it short
   * (<240 chars) and content-rich rather than label-rich.
   */
  text_representation: string;
  /** Unix seconds the source value was observed. */
  timestamp: number;
}

export interface SourceFetchResult {
  values: SourceValue[];
  /** Populated if the entire module failed (auth, network, rate-limit). */
  fault?: string;
}

export type SourceModule = (env?: NodeJS.ProcessEnv) => Promise<SourceFetchResult>;

/**
 * Helper: build a SourceFetchResult that's a single "module is
 * unavailable" sentinel. Used by modules whose env vars aren't set —
 * they ship as code but no-op until the operator provides keys.
 */
export function sourceUnavailable(reason: string): SourceFetchResult {
  return { values: [], fault: reason };
}
