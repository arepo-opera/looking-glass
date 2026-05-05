import { SeedResult, digestOf, fallbackDigest } from "./types";

const HERMES_URL =
  "https://hermes.pyth.network/api/latest_price_feeds";

const FEED_IDS = {
  SOL: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  BTC: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
};

interface PythPrice {
  price: string;
  conf: string;
  expo: number;
  publish_time: number;
}

interface PythFeed {
  id: string;
  price: PythPrice;
  ema_price: PythPrice;
}

function scale(p: PythPrice): number {
  return Number(p.price) * Math.pow(10, p.expo);
}

function fmt(n: number, dp = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    maximumFractionDigits: dp,
    minimumFractionDigits: 0,
  });
}

export async function fetchMarkets(): Promise<SeedResult> {
  const ids = Object.values(FEED_IDS).map((id) => `ids[]=${id}`).join("&");
  const url = `${HERMES_URL}?${ids}&binary=false`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error(`pyth ${resp.status}`);
    const feeds = (await resp.json()) as PythFeed[];
    const byId = new Map(feeds.map((f) => [f.id.replace(/^0x/, ""), f]));

    const sol = byId.get(FEED_IDS.SOL);
    const btc = byId.get(FEED_IDS.BTC);
    const eth = byId.get(FEED_IDS.ETH);
    if (!sol || !btc || !eth) throw new Error("pyth missing one of SOL/BTC/ETH");

    const btcPrice = scale(btc.price);
    const btcConf = scale(btc.price) > 0 ? scale({ ...btc.price, price: btc.price.conf }) : 0;
    const solPrice = scale(sol.price);
    const solConf = scale({ ...sol.price, price: sol.price.conf });
    const ethPrice = scale(eth.price);
    const ethConf = scale({ ...eth.price, price: eth.price.conf });

    const digest = digestOf(
      "MARKETS",
      btc.price.price, btc.price.conf,
      sol.price.price, sol.price.conf,
      eth.price.price, eth.price.conf
    );

    return {
      digest,
      display: {
        channel: "01",
        category: "MARKETS",
        rows: [
          { label: "BTC", value: fmt(btcPrice, 0), spread: `±${fmt(btcConf, 0)}` },
          { label: "SOL", value: fmt(solPrice, 2), spread: `±${fmt(solConf, 2)}` },
          { label: "ETH", value: fmt(ethPrice, 0), spread: `±${fmt(ethConf, 0)}` },
        ],
      },
    };
  } catch (e) {
    return {
      digest: fallbackDigest("MARKETS"),
      display: {
        channel: "01",
        category: "MARKETS",
        rows: [
          { label: "BTC", value: "STALE" },
          { label: "SOL", value: "STALE" },
          { label: "ETH", value: "STALE" },
        ],
        fault: String((e as Error)?.message ?? e),
      },
    };
  }
}
