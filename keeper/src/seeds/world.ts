import { SeedResult, digestOf, fallbackDigest } from "./types";

// We previously hit GDELT's tonechart + themecount endpoints. GDELT changed
// their public response shapes in late 2024 and free-tier traffic now eats
// 429s aggressively even with a polite User-Agent. Switched to The Guardian
// Open Platform, which is free for non-commercial use, returns structured
// JSON with section/pillar/headline fields, and doesn't throttle the
// once-per-30s cadence we run.
//
// Schema notes from the docs (https://open-platform.theguardian.com/):
//   GET /search?api-key=<KEY>&order-by=newest&page-size=50
//        &show-fields=headline,trailText
//        &from-date=<ISO>
//   → { response: { results: [{
//        id, sectionId, sectionName, pillarName,
//        webPublicationDate, webTitle, fields:{ headline, trailText }
//      }, ...] } }
//
// API key: GUARDIAN_API_KEY env var; defaults to "test" which is the
// documented public testing key. The instrument's traffic is well under any
// reasonable rate limit on either tier.
const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY ?? "test";
const GUARDIAN_HEADERS = {
  "User-Agent":
    "looking-glass-keeper/0.2 (+https://github.com/mschreiber89/sator-looking-glass)",
  Accept: "application/json",
};
// Cache the last successful WORLD result for ~10 minutes so a transient
// 5xx/429 doesn't immediately blank the dashboard's WORLD column. The
// fault-fallback path only kicks in when the cache has also gone cold.
const STALE_TTL_MS = 10 * 60 * 1000;
let lastGood: { result: SeedResult; at: number } | null = null;

interface GuardianResult {
  id?: string;
  sectionId?: string;
  sectionName?: string;
  pillarName?: string;
  webPublicationDate?: string;
  webTitle?: string;
  fields?: { headline?: string; trailText?: string };
}
interface GuardianResponse {
  response?: { status?: string; results?: GuardianResult[] };
}

// Tiny sentiment scorer over headline + trailText. Counts hits in two small
// keyword sets weighted equally, then normalises to roughly the ±2 GDELT
// "tone" range readers were already used to. Not pretending to be a real NLP
// pipeline — it's a reading off the world's current key-word mix.
const NEG_KEYWORDS = [
  "war",
  "killed",
  "kills",
  "death",
  "deaths",
  "dies",
  "dead",
  "wounded",
  "injured",
  "victim",
  "victims",
  "crisis",
  "attack",
  "attacks",
  "fire",
  "flood",
  "storm",
  "crash",
  "crashes",
  "scandal",
  "loss",
  "lost",
  "protest",
  "protests",
  "warn",
  "warns",
  "warning",
  "fail",
  "fails",
  "fraud",
  "arrested",
  "guilty",
  "deny",
  "denies",
  "shutdown",
  "strike",
  "collapse",
  "tariff",
  "sanctions",
  "missile",
  "explosion",
];
const POS_KEYWORDS = [
  "win",
  "wins",
  "won",
  "victory",
  "celebrate",
  "celebrates",
  "rescue",
  "rescued",
  "save",
  "saved",
  "discover",
  "discovery",
  "breakthrough",
  "found",
  "agreement",
  "agree",
  "agreed",
  "deal",
  "peace",
  "approved",
  "record",
  "best",
  "first",
  "launch",
  "launches",
  "open",
  "opens",
  "rises",
  "rise",
  "gains",
  "boost",
  "boosts",
  "growth",
  "approve",
];

function scoreSentiment(text: string): number {
  if (!text) return 0;
  const tokens = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  let pos = 0;
  let neg = 0;
  for (const t of tokens) {
    if (POS_KEYWORDS.includes(t)) pos += 1;
    if (NEG_KEYWORDS.includes(t)) neg += 1;
  }
  return pos - neg;
}

function shortenSection(raw: string): string {
  // Guardian section ids look like "world", "us-news", "uk-news",
  // "australia-news", "business". Take the first hyphenated token,
  // uppercase, max 12 chars.
  const head = raw.split("-")[0] ?? raw;
  return head.toUpperCase().slice(0, 12);
}

export async function fetchWorld(): Promise<SeedResult> {
  try {
    const fromDate = new Date(Date.now() - 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19) + "Z";
    const url =
      `https://content.guardianapis.com/search` +
      `?api-key=${encodeURIComponent(GUARDIAN_API_KEY)}` +
      `&order-by=newest&page-size=50` +
      `&show-fields=headline,trailText` +
      `&from-date=${encodeURIComponent(fromDate)}`;
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: GUARDIAN_HEADERS,
    });
    if (!resp.ok) throw new Error(`guardian ${resp.status}`);
    const data = (await resp.json()) as GuardianResponse;
    const results = data.response?.results ?? [];
    if (results.length === 0) throw new Error("guardian: empty results");

    // Tone: sum sentiment across all returned headlines/trail-text, divide
    // by article count, then scale into ±2 so the dashboard reads at a
    // similar magnitude to the prior GDELT tone column.
    let toneAccum = 0;
    let evtCount15m = 0;
    const sectionFreq = new Map<string, number>();
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    for (const r of results) {
      const headline = r.fields?.headline ?? r.webTitle ?? "";
      const trail = r.fields?.trailText ?? "";
      toneAccum += scoreSentiment(`${headline} ${trail}`);
      const t = r.webPublicationDate
        ? Date.parse(r.webPublicationDate)
        : NaN;
      if (Number.isFinite(t) && t >= fifteenMinutesAgo) evtCount15m += 1;
      const sec = r.sectionId ?? r.sectionName ?? "general";
      sectionFreq.set(sec, (sectionFreq.get(sec) ?? 0) + 1);
    }
    const weightedTone = (toneAccum / results.length) * 0.7; // dampen
    const top = [...sectionFreq.entries()].sort((a, b) => b[1] - a[1])[0];
    const topTag = top ? shortenSection(top[0]) : "GENERAL";

    const digest = digestOf(
      "WORLD",
      weightedTone.toFixed(3),
      evtCount15m,
      topTag
    );

    const result: SeedResult = {
      digest,
      display: {
        channel: "03",
        category: "WORLD",
        rows: [
          { label: "TONE", value: weightedTone.toFixed(2) },
          { label: "EVT/15M", value: String(evtCount15m) },
          { label: "TAG", value: topTag },
        ],
      },
    };
    lastGood = { result, at: Date.now() };
    return result;
  } catch (e) {
    if (lastGood && Date.now() - lastGood.at < STALE_TTL_MS) {
      return {
        digest: lastGood.result.digest,
        display: {
          ...lastGood.result.display,
          fault: `cached: ${String((e as Error)?.message ?? e)}`,
        },
      };
    }
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
