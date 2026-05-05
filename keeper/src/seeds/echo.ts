import { ClientCtx, lookingGlassPda } from "../anchor-client";
import { SeedResult, digestOf, fallbackDigest } from "./types";

/**
 * Reads the LookingGlass PDA's prophecy_ring and computes a digest from the
 * recent prophecy hashes. Replaces the placeholder Phase 3 echo seed with
 * an actual on-chain read.
 */
export async function fetchEcho(ctx: ClientCtx): Promise<SeedResult> {
  try {
    const lgPda = lookingGlassPda(ctx.programId);
    const lg: any = await (ctx.program.account as any).lookingGlass.fetch(lgPda);
    const ring: number[][] = (lg.prophecyRing as number[][]).map((row) => Array.from(row));
    const ringHead: number = lg.ringHead;
    const lastHash: number[] = Array.from(lg.lastProphecyHash);

    // ring depth = how many of the 8 slots have any non-zero bytes
    const ringDepth = ring.filter((r) => r.some((b) => b !== 0)).length;

    // drift = average L1 distance between consecutive entries (excluding
    // empty slots), normalised to 0-1.
    let drift = 0;
    let pairs = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (a.every((x) => x === 0) || b.every((x) => x === 0)) continue;
      let d = 0;
      for (let k = 0; k < 32; k++) d += Math.abs(a[k] - b[k]);
      drift += d / (32 * 255);
      pairs += 1;
    }
    drift = pairs === 0 ? 0 : drift / pairs;

    // recurse = how saturated the ring is, ish
    const recurse = ringDepth / 8;

    // Flatten ring + ringHead + last hash for the digest
    const flat = new Uint8Array(8 * 32 + 1 + 32);
    for (let i = 0; i < 8; i++) {
      const slot = ring[i];
      for (let k = 0; k < 32; k++) flat[i * 32 + k] = slot[k];
    }
    flat[8 * 32] = ringHead;
    for (let k = 0; k < 32; k++) flat[8 * 32 + 1 + k] = lastHash[k];

    const digest = digestOf("ECHO", flat);

    return {
      digest,
      display: {
        channel: "05",
        category: "ECHO",
        rows: [
          { label: "RING.D", value: `${ringDepth}/8` },
          { label: "DRIFT.K", value: drift.toFixed(4) },
          { label: "RECURSE", value: recurse.toFixed(2) },
        ],
      },
    };
  } catch (e) {
    return {
      digest: fallbackDigest("ECHO"),
      display: {
        channel: "05",
        category: "ECHO",
        rows: [
          { label: "RING.D", value: "0/8" },
          { label: "DRIFT.K", value: "0.0000" },
          { label: "RECURSE", value: "0.00" },
        ],
        fault: String((e as Error)?.message ?? e),
      },
    };
  }
}
