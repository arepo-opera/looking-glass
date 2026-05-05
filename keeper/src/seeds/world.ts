import { SeedResult, digestOf, fallbackDigest } from "./types";

const GDELT_TONE =
  "https://api.gdeltproject.org/api/v2/doc/doc?query=*&mode=tonechart&format=json&timespan=15min";
const GDELT_THEMES =
  "https://api.gdeltproject.org/api/v2/doc/doc?query=*&mode=themecount&format=json&timespan=15min&maxrecords=5";

interface ToneBucket {
  bin: number;
  count: number;
}

interface ToneResponse {
  tonechart?: ToneBucket[];
}

interface ThemeRow {
  theme?: string;
  Theme?: string;
  count?: number;
  Count?: number;
}

interface ThemeResponse {
  themes?: ThemeRow[];
}

function shortenTheme(raw: string): string {
  // GDELT themes look like "TAX_FNCACT_BUDGET" or "MIDEAST_PEACE_PROCESS".
  // Take the first 1-2 hyphen-or-underscore-separated tokens, max 12 chars.
  const cleaned = raw.replace(/^TAX_/, "").replace(/_+/g, ".");
  const head = cleaned.split(".").slice(0, 2).join(".");
  return head.slice(0, 12).toUpperCase();
}

export async function fetchWorld(): Promise<SeedResult> {
  try {
    const [toneResp, themeResp] = await Promise.all([
      fetch(GDELT_TONE, { signal: AbortSignal.timeout(8000) }),
      fetch(GDELT_THEMES, { signal: AbortSignal.timeout(8000) }),
    ]);
    if (!toneResp.ok) throw new Error(`gdelt-tone ${toneResp.status}`);
    if (!themeResp.ok) throw new Error(`gdelt-themes ${themeResp.status}`);
    const tone = (await toneResp.json()) as ToneResponse;
    const themes = (await themeResp.json()) as ThemeResponse;

    const buckets = tone.tonechart ?? [];
    const totalEvents = buckets.reduce((s, b) => s + (b.count ?? 0), 0);
    const weightedTone =
      totalEvents === 0
        ? 0
        : buckets.reduce((s, b) => s + (b.bin ?? 0) * (b.count ?? 0), 0) / totalEvents;

    const themeRows = themes.themes ?? [];
    const top = themeRows[0];
    const topTheme = top
      ? shortenTheme((top.theme ?? top.Theme ?? "GENERAL").toString())
      : "GENERAL";

    const digest = digestOf(
      "WORLD",
      weightedTone.toFixed(3),
      totalEvents,
      topTheme
    );

    return {
      digest,
      display: {
        channel: "03",
        category: "WORLD",
        rows: [
          { label: "TONE", value: weightedTone.toFixed(2) },
          { label: "EVT/15M", value: String(totalEvents) },
          { label: "TAG", value: topTheme },
        ],
      },
    };
  } catch (e) {
    return {
      digest: fallbackDigest("WORLD"),
      display: {
        channel: "03",
        category: "WORLD",
        rows: [
          { label: "TONE", value: "STALE" },
          { label: "EVT/15M", value: "STALE" },
          { label: "TAG", value: "STALE" },
        ],
        fault: String((e as Error)?.message ?? e),
      },
    };
  }
}
