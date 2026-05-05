export { fetchMarkets } from "./markets";
export { fetchChain } from "./chain";
export { fetchWorld } from "./world";
export { fetchHeavens } from "./heavens";
export { fetchEcho } from "./echo";
export type { SeedDisplay, SeedResult, SeedRow } from "./types";

import { ClientCtx } from "../anchor-client";
import { fetchMarkets } from "./markets";
import { fetchChain } from "./chain";
import { fetchWorld } from "./world";
import { fetchHeavens } from "./heavens";
import { fetchEcho } from "./echo";
import type { SeedDisplay } from "./types";

/**
 * Fan out the five fetchers in parallel. Each fetcher swallows its own
 * upstream errors and returns either real data or a fallback display, so
 * this aggregator never throws.
 */
export async function fetchAllSeeds(
  ctx: ClientCtx,
  rpcUrl: string
): Promise<SeedDisplay[]> {
  const results = await Promise.all([
    fetchMarkets(),
    fetchChain(rpcUrl),
    fetchWorld(),
    fetchHeavens(),
    fetchEcho(ctx),
  ]);
  return results.map((r) => r.display);
}
