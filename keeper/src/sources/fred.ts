import {
  SourceFetchResult,
  SourceValue,
  sourceUnavailable,
} from "./types";

// FRED (Federal Reserve Economic Data) — 5 indicator series.
// Requires a free API key from https://fred.stlouisfed.org/.
// Env: FRED_API_KEY. If unset, the module no-ops cleanly so the
// rest of the apparatus continues to operate.

const SERIES: Array<{
  id: string;
  short: string;
  label: string;
  unit: string;
}> = [
  { id: "UNRATE", short: "unemployment-rate", label: "unemployment", unit: "%" },
  { id: "CPIAUCSL", short: "cpi-headline", label: "CPI", unit: " idx" },
  { id: "DGS10", short: "treasury-10y", label: "10Y treasury", unit: "%" },
  { id: "M2SL", short: "m2", label: "M2 money supply", unit: "B$" },
  { id: "DFF", short: "fed-funds-rate", label: "fed funds", unit: "%" },
];

const BASE = "https://api.stlouisfed.org/fred/series/observations";

export async function fetchFred(): Promise<SourceFetchResult> {
  const key = process.env.FRED_API_KEY;
  if (!key) {
    return sourceUnavailable("FRED_API_KEY unset");
  }
  try {
    const ts = Math.floor(Date.now() / 1000);
    const results = await Promise.all(
      SERIES.map(async (s) => {
        try {
          const url =
            `${BASE}?series_id=${s.id}&api_key=${encodeURIComponent(key)}` +
            `&file_type=json&sort_order=desc&limit=2`;
          const r = await fetch(url);
          if (!r.ok) return null;
          const data = (await r.json()) as {
            observations?: Array<{ date: string; value: string }>;
          };
          const obs = data.observations ?? [];
          if (obs.length === 0) return null;
          const latest = obs[0];
          const prior = obs[1];
          const latestNum = Number(latest.value);
          const priorNum = prior ? Number(prior.value) : NaN;
          const delta =
            Number.isFinite(latestNum) && Number.isFinite(priorNum)
              ? latestNum - priorNum
              : null;
          const deltaTxt =
            delta !== null
              ? ` (${delta >= 0 ? "+" : ""}${delta.toFixed(2)})`
              : "";
          const v: SourceValue = {
            name: `fred:${s.short}`,
            category: "MARKETS",
            raw_value: {
              series_id: s.id,
              latest_date: latest.date,
              latest_value: latestNum,
              prior_value: priorNum,
              delta,
              unit: s.unit,
            },
            text_representation: `FRED ${s.label} ${latest.value}${s.unit}${deltaTxt} as of ${latest.date}`,
            timestamp: ts,
          };
          return v;
        } catch {
          return null;
        }
      })
    );
    const values: SourceValue[] = [];
    for (const r of results) if (r !== null) values.push(r);
    return { values };
  } catch (e: any) {
    return sourceUnavailable(`fred: ${String(e?.message ?? e)}`);
  }
}
