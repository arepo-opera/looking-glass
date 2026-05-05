import { keccak_256 } from "js-sha3";

export interface SeedRow {
  label: string;
  value: string;
  spread?: string;
}

export interface SeedDisplay {
  channel: string; // "01" .. "05"
  category: string; // MARKETS / CHAIN / WORLD / HEAVENS / ECHO
  rows: SeedRow[];
  fault?: string; // populated when the fetch failed and we're using a fallback
}

export interface SeedResult {
  digest: Uint8Array; // 32 bytes
  display: SeedDisplay;
}

/**
 * Deterministic 32-byte digest from a list of (UTF-8) byte segments. We use
 * keccak so the off-chain digest is the same primitive as the on-chain
 * `keccak::hashv` calls in the program.
 */
export function digestOf(...parts: (string | Uint8Array | number)[]): Uint8Array {
  const segs: (string | Uint8Array)[] = parts.map((p) =>
    typeof p === "number" ? String(p) : p
  );
  // js-sha3 takes a single string/buffer; concat first
  const buf = Buffer.concat(
    segs.map((s) => (typeof s === "string" ? Buffer.from(s, "utf-8") : Buffer.from(s)))
  );
  return new Uint8Array(keccak_256.arrayBuffer(buf));
}

/** Used by all five fetchers as the recovery path when the upstream is down. */
export function fallbackDigest(name: string): Uint8Array {
  return digestOf(`FALLBACK_${name}`, Math.floor(Date.now() / 1000));
}
