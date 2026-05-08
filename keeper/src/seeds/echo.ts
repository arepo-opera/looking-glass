import { ClientCtx, lookingGlassPda } from "../anchor-client";
import { SeedResult, digestOf, fallbackDigest } from "./types";

/**
 * ECHO is the system's recent-memory channel: a deterministic hash of
 * the eight most-recent prophecy hashes from the on-chain ring buffer.
 * The novelty / drift math previously co-located here now lives in
 * drift.ts; ECHO is purely "what does the system remember."
 *
 * Display rows: RING.D (depth used), LAST (first 4 hex chars of newest
 * hash), HEAD (ring head pointer).
 */
export async function fetchEcho(ctx: ClientCtx): Promise<SeedResult> {
  try {
    const lgPda = lookingGlassPda(ctx.programId);
    const lg: any = await (ctx.program.account as any).lookingGlass.fetch(
      lgPda
    );
    const ring: number[][] = (lg.prophecyRing as number[][]).map((row) =>
      Array.from(row)
    );
    const ringHead: number = lg.ringHead;
    const lastHash: number[] = Array.from(lg.lastProphecyHash);

    const ringDepth = ring.filter((r) => r.some((b) => b !== 0)).length;
    const lastHashHex = Buffer.from(lastHash)
      .toString("hex")
      .slice(0, 4)
      .toUpperCase();

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
          { label: "LAST", value: lastHashHex || "—" },
          { label: "HEAD", value: String(ringHead) },
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
          { label: "LAST", value: "—" },
          { label: "HEAD", value: "—" },
        ],
        fault: String((e as Error)?.message ?? e),
      },
    };
  }
}
