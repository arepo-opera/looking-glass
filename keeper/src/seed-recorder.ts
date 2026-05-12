import { log } from "./logger";
import type { SeedDisplay } from "./seeds/types";
import type { ModelConfig } from "./prophecy-generator";

// After each successful submit_prophecy, the keeper POSTs the
// structured seed record to /api/seeds/{epoch} so the dashboard's
// archive endpoint can merge them into responses. Idempotent
// (first-write-wins). Fire-and-forget — errors logged but never
// blocking.

const ENDPOINT_BASE =
  process.env.SEED_RECORDER_URL ??
  "https://sator-looking-glass-web.vercel.app/api/seeds";

interface MarketRow {
  label: string;
  price: string;
  confidence: string;
}

function rowsToObject(
  rows: SeedDisplay["rows"]
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const r of rows) {
    if (typeof r.value === "string") {
      const n = Number(r.value.replace(/[, ]/g, ""));
      out[r.label] = Number.isFinite(n) && r.value.match(/^[\d.,\s]+$/)
        ? n
        : r.value;
    }
  }
  return out;
}

function marketsToObject(
  rows: SeedDisplay["rows"]
): Record<string, { price: string; confidence: string }> {
  const out: Record<string, { price: string; confidence: string }> = {};
  for (const r of rows) {
    out[r.label] = {
      price: r.value,
      confidence: (r.spread ?? "").replace(/^±/, ""),
    };
  }
  return out;
}

function structureSeeds(
  seeds: SeedDisplay[]
): {
  markets: Record<string, { price: string; confidence: string }>;
  chain: Record<string, string | number>;
  world: Record<string, string | number>;
  heavens: Record<string, string | number>;
  echo: Record<string, string | number>;
  drift: Record<string, string | number>;
} {
  const byCat: Record<string, SeedDisplay> = {};
  for (const s of seeds) byCat[s.category] = s;
  return {
    markets: byCat.MARKETS ? marketsToObject(byCat.MARKETS.rows) : {},
    chain: byCat.CHAIN ? rowsToObject(byCat.CHAIN.rows) : {},
    world: byCat.WORLD ? rowsToObject(byCat.WORLD.rows) : {},
    heavens: byCat.HEAVENS ? rowsToObject(byCat.HEAVENS.rows) : {},
    echo: byCat.ECHO ? rowsToObject(byCat.ECHO.rows) : {},
    drift: byCat.DRIFT ? rowsToObject(byCat.DRIFT.rows) : {},
  };
}

export async function recordSeedsForEpoch(
  epoch: number,
  seeds: SeedDisplay[],
  models?: ModelConfig,
  sourceSelections?: Record<string, unknown>
): Promise<void> {
  try {
    const structured = structureSeeds(seeds);
    const body = {
      captured_at_ts: Math.floor(Date.now() / 1000),
      ...structured,
      ...(models ? { models } : {}),
      ...(sourceSelections && Object.keys(sourceSelections).length > 0
        ? { source_selection: sourceSelections }
        : {}),
    };
    const url = `${ENDPOINT_BASE}/${epoch}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.status === 201 || resp.status === 409) {
      log.system(
        `[seeds] recorded epoch=${epoch} status=${resp.status === 201 ? "stored" : "already"}`
      );
    } else {
      const text = await resp.text();
      log.system(
        `[seeds] record failed epoch=${epoch} status=${resp.status}: ${text.slice(0, 200)}`
      );
    }
  } catch (e: any) {
    log.system(
      `[seeds] record threw epoch=${epoch}: ${(e as Error)?.message ?? e}`
    );
  }
}
