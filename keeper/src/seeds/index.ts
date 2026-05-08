export { fetchMarkets } from "./markets";
export { fetchChain } from "./chain";
export { fetchWorld } from "./world";
export { fetchHeavens } from "./heavens";
export { fetchEcho } from "./echo";
export { fetchDrift } from "./drift";
export type { SeedDisplay, SeedResult, SeedRow } from "./types";

import { ClientCtx } from "../anchor-client";
import { fetchMarkets } from "./markets";
import { fetchChain } from "./chain";
import { fetchWorld } from "./world";
import { fetchHeavens } from "./heavens";
import { fetchEcho } from "./echo";
import { fetchDrift } from "./drift";
import type { SeedDisplay } from "./types";
import { digestOf } from "./types";

const SPINE_NAMES = ["MARKETS", "CHAIN", "WORLD", "HEAVENS", "ECHO+DRIFT"];

/**
 * Fan out the six fetchers in parallel. ECHO+DRIFT are computed
 * separately but combined into one 32-byte hash for "on-chain" symmetry
 * (note: the deployed program currently derives its glyphs from on-
 * chain network state and does not actually consume keeper-side seed
 * digests — these computations remain authoritative for the dashboard
 * display + the off-chain methodology, and will become consensus
 * inputs in a future program revision). The dashboard receives all
 * SIX displays.
 *
 * Spine rotation: each tick a different seed has primacy in the
 * spine cell of the palindrome (see /methodology). Currently logged
 * for off-chain visibility; the future program revision will use the
 * mod-5 selector to bias the on-chain glyph derivation.
 */
export async function fetchAllSeeds(
  ctx: ClientCtx,
  rpcUrl: string,
  currentEpoch?: number
): Promise<SeedDisplay[]> {
  const [markets, chain, world, heavens, echo] = await Promise.all([
    fetchMarkets(),
    fetchChain(rpcUrl),
    fetchWorld(),
    fetchHeavens(),
    fetchEcho(ctx),
  ]);
  const drift = fetchDrift([
    markets.digest,
    chain.digest,
    world.digest,
    heavens.digest,
    echo.digest,
  ]);
  // Echo+Drift combined hash. Reserved for the future on-chain
  // revision; not consumed by the current deployed program.
  const _echoDriftCombined = digestOf(
    "ECHO_DRIFT",
    echo.digest,
    drift.digest
  );

  if (typeof currentEpoch === "number" && currentEpoch >= 0) {
    const spineIdx = ((currentEpoch % 5) + 5) % 5;
    process.stderr.write(
      `[spine] epoch=${currentEpoch} primacy=${SPINE_NAMES[spineIdx]}\n`
    );
  }

  return [
    markets.display,
    chain.display,
    world.display,
    heavens.display,
    echo.display,
    drift.display,
  ];
}
