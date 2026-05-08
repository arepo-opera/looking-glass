import { SeedResult, digestOf, fallbackDigest } from "./types";

/**
 * DRIFT — novelty signal. Tracks the structural distance between the
 * current seed bundle and a running average of the previous 8 bundles.
 * High drift means the world state at this tick is anomalous relative
 * to recent history; low drift means we're in a steady regime.
 *
 * Implementation is intentionally cheap: we treat each seed bundle as
 * the concatenation of the five other seeds' digests (160 bytes total)
 * and compute a Hamming-distance-style normalised difference score
 * against the running average byte-vector.
 *
 * The maintained ring buffer (capacity 8) lives in module state, so
 * drift survives across fetchAllSeeds calls within the same keeper
 * process. On restart the drift ring resets — the first ~8 ticks
 * after restart will show drift relative to a partially-warmed
 * baseline.
 */

const HISTORY_CAP = 8;
let history: Uint8Array[] = []; // each entry is 160 bytes

function bundleBytes(otherDigests: Uint8Array[]): Uint8Array {
  // Concatenate the 5 input digests into one 160-byte vector.
  const out = new Uint8Array(otherDigests.length * 32);
  for (let i = 0; i < otherDigests.length; i++) {
    out.set(otherDigests[i], i * 32);
  }
  return out;
}

function averageBytes(samples: Uint8Array[]): Uint8Array {
  if (samples.length === 0) return new Uint8Array();
  const len = samples[0].length;
  const sum = new Float64Array(len);
  for (const s of samples) {
    for (let i = 0; i < len; i++) sum[i] += s[i];
  }
  const avg = new Uint8Array(len);
  for (let i = 0; i < len; i++) avg[i] = Math.round(sum[i] / samples.length);
  return avg;
}

function l1Normalised(a: Uint8Array, b: Uint8Array): number {
  // Mean per-byte L1 distance, normalised to [0, 1].
  if (a.length === 0 || a.length !== b.length) return 0;
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
  return total / (a.length * 255);
}

export function fetchDrift(otherDigests: Uint8Array[]): SeedResult {
  try {
    const current = bundleBytes(otherDigests);
    let score = 0;
    let delta = 0;
    if (history.length > 0) {
      const avg = averageBytes(history);
      score = l1Normalised(current, avg);
      // Delta vs the most-recent bundle
      delta = l1Normalised(current, history[history.length - 1]);
    }
    history.push(current);
    if (history.length > HISTORY_CAP) history.shift();

    const digest = digestOf(
      "DRIFT",
      score.toFixed(6),
      delta.toFixed(6),
      String(history.length)
    );

    return {
      digest,
      display: {
        channel: "06",
        category: "DRIFT",
        rows: [
          { label: "SCORE", value: score.toFixed(4) },
          { label: "DELTA", value: delta.toFixed(4) },
          { label: "MEM", value: `${history.length}/${HISTORY_CAP}` },
        ],
      },
    };
  } catch (e) {
    return {
      digest: fallbackDigest("DRIFT"),
      display: {
        channel: "06",
        category: "DRIFT",
        rows: [
          { label: "SCORE", value: "0.0000" },
          { label: "DELTA", value: "0.0000" },
          { label: "MEM", value: "0/8" },
        ],
        fault: String((e as Error)?.message ?? e),
      },
    };
  }
}
