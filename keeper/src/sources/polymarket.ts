import {
  SourceFetchResult,
  SourceValue,
  sourceUnavailable,
} from "./types";

// Polymarket top active markets. Public Gamma API.
//   https://gamma-api.polymarket.com/markets
// Spec: top 5 by volume, active and not resolved.

const URL =
  "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=20&order=volume24hr&ascending=false";

interface PolyMarket {
  id: string | number;
  slug?: string;
  question: string;
  outcomes?: string | string[];
  outcomePrices?: string | string[];
  volume24hr?: number | string;
  volume?: number | string;
  liquidity?: number | string;
  endDate?: string;
}

function parseArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function compactMoney(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export async function fetchPolymarket(): Promise<SourceFetchResult> {
  try {
    const r = await fetch(URL);
    if (!r.ok)
      return sourceUnavailable(`polymarket ${r.status}`);
    const arr = (await r.json()) as PolyMarket[];
    const ts = Math.floor(Date.now() / 1000);
    const top = arr.slice(0, 5);
    const values: SourceValue[] = top.map((m, i) => {
      const outcomes = parseArray(m.outcomes);
      const prices = parseArray(m.outcomePrices);
      const vol = asNumber(m.volume24hr ?? m.volume);
      const slugPart = (m.slug ?? `market-${m.id}`).toString().slice(0, 60);
      const yesPrice = prices[0] ? asNumber(prices[0]) : null;
      const priceTxt =
        yesPrice !== null ? `yes ${yesPrice.toFixed(2)}` : "—";
      return {
        name: `polymarket:${slugPart}`,
        category: "MARKETS",
        raw_value: {
          rank: i + 1,
          id: m.id,
          slug: m.slug,
          question: m.question,
          outcomes,
          prices: prices.map(asNumber),
          volume_24h: vol,
          end_date: m.endDate ?? null,
        },
        text_representation: `POLY ${priceTxt} vol ${compactMoney(vol)} — ${m.question}`,
        timestamp: ts,
      };
    });
    return { values };
  } catch (e: any) {
    return sourceUnavailable(`polymarket: ${String(e?.message ?? e)}`);
  }
}
