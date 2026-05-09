import { NextResponse } from "next/server";
import { fetchAtomicCorpus } from "@/lib/corpus-helpers";
import { fetchSeedsForEpoch } from "@/lib/oracle-helpers";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const revalidate = 3600;

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
}

function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const sumX = xs.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = ys.slice(0, n).reduce((a, b) => a + b, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return null;
  return Number((num / Math.sqrt(denX * denY)).toFixed(4));
}

export async function GET() {
  const corpus = await fetchAtomicCorpus();
  if (corpus.length === 0) {
    return NextResponse.json({ note: "corpus empty", correlations: {} });
  }
  // Pull seed records in parallel for every epoch in the corpus. Most
  // will be null (epochs that locked before Phase 20B-final's seed-
  // recording landed). The correlation pass only includes points
  // where seeds exist.
  const seedsByEpoch = new Map<
    number,
    Awaited<ReturnType<typeof fetchSeedsForEpoch>>
  >();
  await Promise.all(
    corpus.map(async (e) => {
      const s = await fetchSeedsForEpoch(e.epoch);
      seedsByEpoch.set(e.epoch, s);
    })
  );
  const withSeeds = corpus.filter((e) => seedsByEpoch.get(e.epoch) !== null);

  if (withSeeds.length < 5) {
    return NextResponse.json(
      {
        corpus_size: corpus.length,
        epochs_with_seeds: withSeeds.length,
        note:
          "the apparatus is still gathering enough memory to know its own weather. these correlations will deepen as the corpus grows. seed-capture began only at Phase 20B-final; older epochs locked without seed records.",
        correlations: {},
      },
      { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } }
    );
  }

  // Feature extraction per epoch with seeds.
  interface Point {
    epoch: number;
    text_length: number;
    self_ref_density: number;
    abstract_token_count: number;
    market_btc_price: number;
    market_spy_price: number;
    chain_tps: number;
    world_edits: number;
    heavens_kp: number;
    eq_24h: number;
    drift_score: number;
    drift_delta: number;
  }

  const points: Point[] = [];
  for (const e of withSeeds) {
    const seeds: any = seedsByEpoch.get(e.epoch);
    if (!seeds) continue;
    const tokens = tokenize(e.text);
    const selfRefTokens = tokens.filter((t) =>
      [
        "square",
        "ring",
        "reading",
        "prophecy",
        "the",
        "this",
        "that",
        "log",
        "seal",
        "witness",
      ].includes(t)
    ).length;
    const abstractCount = tokens.filter((t) =>
      [
        "memory",
        "time",
        "voice",
        "silence",
        "presence",
        "absence",
        "shadow",
        "name",
        "history",
        "future",
      ].includes(t)
    ).length;
    const num = (v: any): number => {
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const cleaned = v.replace(/[, ]/g, "");
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };
    points.push({
      epoch: e.epoch,
      text_length: e.text.length,
      self_ref_density: tokens.length > 0 ? selfRefTokens / tokens.length : 0,
      abstract_token_count: abstractCount,
      market_btc_price: num(seeds.markets?.BTC?.price),
      market_spy_price: num(seeds.markets?.SPY?.price),
      chain_tps: num(seeds.chain?.TPS),
      world_edits: num(seeds.world?.["EVT/15M"]),
      heavens_kp: num(seeds.heavens?.["KP.IDX"]),
      eq_24h: (() => {
        const v = seeds.heavens?.["EQ.24H"];
        if (typeof v === "string" && v.includes("/")) {
          const n = Number(v.split("/")[0]);
          return Number.isFinite(n) ? n : 0;
        }
        return num(v);
      })(),
      drift_score: num(seeds.drift?.SCORE),
      drift_delta: num(seeds.drift?.DELTA),
    });
  }

  const corr = (key1: keyof Point, key2: keyof Point) =>
    pearsonCorrelation(
      points.map((p) => p[key1] as number),
      points.map((p) => p[key2] as number)
    );

  const correlations = {
    drift_score_vs_text_length: corr("drift_score", "text_length"),
    drift_score_vs_abstract_token_count: corr(
      "drift_score",
      "abstract_token_count"
    ),
    chain_tps_vs_self_ref_density: corr("chain_tps", "self_ref_density"),
    heavens_kp_vs_text_length: corr("heavens_kp", "text_length"),
    world_edits_vs_text_length: corr("world_edits", "text_length"),
    market_btc_vs_text_length: corr("market_btc_price", "text_length"),
    eq_24h_vs_self_ref_density: corr("eq_24h", "self_ref_density"),
  };

  return NextResponse.json(
    {
      corpus_size: corpus.length,
      epochs_with_seeds: withSeeds.length,
      sample_size_for_correlations: points.length,
      correlations,
      caveat:
        "Pearson correlation; n is small (Phase 20B-final seed capture is recent) so confidence intervals are wide. these will tighten as the corpus grows.",
    },
    { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } }
  );
}
