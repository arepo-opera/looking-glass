import { SeedResult, digestOf, fallbackDigest } from "./types";

const HERMES_URL = "https://hermes.pyth.network/api/latest_price_feeds";

// Eight-feed portfolio. No rotation — every feed displays
// simultaneously. Equity feeds (SPY, QQQ) freeze at last-close prices
// outside US market hours; we still show those values rather than
// blanking the row, so the channel is always populated.
//
// All feed IDs verified live against Pyth Hermes
// (/v2/price_feeds + /api/latest_price_feeds) on 2026-05-08.
const FEEDS = [
  {
    key: "BTC",
    id: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    label: "BTC",
    dp: 0,
  },
  {
    key: "SOL",
    id: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
    label: "SOL",
    dp: 2,
  },
  {
    key: "ETH",
    id: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    label: "ETH",
    dp: 0,
  },
  {
    key: "SPY",
    id: "19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5",
    label: "SPY",
    dp: 2,
  },
  {
    key: "QQQ",
    id: "9695e2b96ea7b3859da9ed25b7a46a920a776e2fdae19a7bcfdf2b219230452d",
    label: "QQQ",
    dp: 2,
  },
  {
    key: "DXY",
    id: "710afe0041a07156bfd71971160c78a326bf8121403e0d4e140d06bea0353b7f",
    label: "DXY",
    dp: 2,
  },
  {
    key: "XAU",
    id: "765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2",
    label: "GLD",
    dp: 0,
  },
  {
    key: "EUR",
    id: "a995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b",
    label: "EUR",
    dp: 4,
  },
] as const;

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
  const ids = FEEDS.map((f) => `ids[]=${f.id}`).join("&");
  const url = `${HERMES_URL}?${ids}&binary=false`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) throw new Error(`pyth ${resp.status}`);
    const feeds = (await resp.json()) as PythFeed[];
    const byId = new Map(feeds.map((f) => [f.id.replace(/^0x/, ""), f]));

    const ordered = FEEDS.map((meta) => {
      const f = byId.get(meta.id);
      if (!f) throw new Error(`pyth missing ${meta.key}`);
      return { meta, feed: f };
    });

    const digestParts: (string | number)[] = ["MARKETS"];
    for (const o of ordered) {
      digestParts.push(o.feed.price.price, o.feed.price.conf);
    }
    const digest = digestOf(...digestParts);

    const rows = ordered.map((o) => {
      const price = scale(o.feed.price);
      const conf = scale({ ...o.feed.price, price: o.feed.price.conf });
      return {
        label: o.meta.label,
        value: fmt(price, o.meta.dp),
        spread: `±${fmt(conf, o.meta.dp)}`,
      };
    });

    return {
      digest,
      display: {
        channel: "01",
        category: "MARKETS",
        rows,
      },
    };
  } catch (e) {
    return {
      digest: fallbackDigest("MARKETS"),
      display: {
        channel: "01",
        category: "MARKETS",
        rows: FEEDS.map((f) => ({ label: f.label, value: "STALE" })),
        fault: String((e as Error)?.message ?? e),
      },
    };
  }
}
