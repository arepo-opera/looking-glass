import { SeedResult, digestOf, fallbackDigest } from "./types";

const HERMES_URL = "https://hermes.pyth.network/api/latest_price_feeds";

// Six-feed portfolio: three crypto + three broader (gold, EUR, JPY).
// USD/JPY substitutes for VIX — Pyth Hermes does not expose a clean
// volatility index feed at the time of writing (BVIV/DVOL queries
// returned empty). USD/JPY broadens currency exposure beyond EUR and
// reads as a major-economy signal alongside the others.
const FEEDS = {
  BTC: {
    id: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    label: "BTC",
    dp: 0,
  },
  SOL: {
    id: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
    label: "SOL",
    dp: 2,
  },
  ETH: {
    id: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    label: "ETH",
    dp: 0,
  },
  XAU: {
    id: "765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2",
    label: "GLD",
    dp: 0,
  },
  EUR: {
    id: "a995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b",
    label: "EUR",
    dp: 4,
  },
  JPY: {
    id: "ef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52",
    label: "JPY",
    dp: 2,
  },
} as const;

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

// Display rotation: the dashboard column has space for ~3 rows. Cycle
// between the crypto bucket and the broader bucket every poll. The
// digest always covers all six — only the display alternates.
let rotationCounter = 0;

export async function fetchMarkets(): Promise<SeedResult> {
  const ids = Object.values(FEEDS)
    .map((f) => `ids[]=${f.id}`)
    .join("&");
  const url = `${HERMES_URL}?${ids}&binary=false`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) throw new Error(`pyth ${resp.status}`);
    const feeds = (await resp.json()) as PythFeed[];
    const byId = new Map(feeds.map((f) => [f.id.replace(/^0x/, ""), f]));

    const ordered = (
      ["BTC", "SOL", "ETH", "XAU", "EUR", "JPY"] as const
    ).map((k) => {
      const f = byId.get(FEEDS[k].id);
      if (!f) throw new Error(`pyth missing ${k}`);
      return { key: k, feed: f, meta: FEEDS[k] };
    });

    const digestParts: (string | number)[] = ["MARKETS"];
    for (const o of ordered) {
      digestParts.push(o.feed.price.price, o.feed.price.conf);
    }
    const digest = digestOf(...digestParts);

    // Pre-compute pretty rows for every feed; the rotation just picks
    // which three to display.
    const allRows = ordered.map((o) => {
      const price = scale(o.feed.price);
      const conf = scale({ ...o.feed.price, price: o.feed.price.conf });
      return {
        label: o.meta.label,
        value: fmt(price, o.meta.dp),
        spread: `±${fmt(conf, o.meta.dp)}`,
      };
    });

    rotationCounter += 1;
    const showCrypto = rotationCounter % 2 === 1;
    const visibleRows = showCrypto ? allRows.slice(0, 3) : allRows.slice(3, 6);

    return {
      digest,
      display: {
        channel: "01",
        category: "MARKETS",
        rows: visibleRows,
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
