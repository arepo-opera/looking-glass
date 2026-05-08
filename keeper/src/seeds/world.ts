import { SeedResult, digestOf, fallbackDigest } from "./types";

// Wikipedia recent-changes is a real-time stream of every edit on the
// english wikipedia. We use the REST polling endpoint (action=query
// list=recentchanges) rather than the SSE stream so we don't have to
// maintain a long-lived connection inside the keeper. Each poll returns
// up to 500 most-recent edits; we filter to the last 5 minutes and
// derive three signals: dominant namespace, edit velocity, top title.
//
// No API key, no rate-limit visible at our 30s cadence, and the
// endpoint is operationally one of the most reliable on the public
// internet — so WORLD should rarely fall back.
const WIKI_URL =
  "https://en.wikipedia.org/w/api.php" +
  "?action=query&list=recentchanges&format=json" +
  "&rcprop=title%7Ctimestamp&rclimit=500&rctype=edit%7Cnew";
const WIKI_HEADERS = {
  "User-Agent":
    "looking-glass-keeper/0.3 (+https://github.com/mschreiber89/sator-looking-glass)",
  Accept: "application/json",
};

const STALE_TTL_MS = 10 * 60 * 1000;
let lastGood: { result: SeedResult; at: number } | null = null;

interface RcEntry {
  type: string;
  ns: number;
  title: string;
  timestamp: string;
}
interface RcResponse {
  query?: { recentchanges?: RcEntry[] };
  error?: { info?: string };
}

// Wikipedia namespace ids → short labels. Most edits land in 0 (Main)
// or 1 (Talk). We collapse the long tail into "OTHER".
const NS_LABELS: Record<number, string> = {
  0: "MAIN",
  1: "TALK",
  2: "USER",
  3: "USERTALK",
  4: "PROJECT",
  6: "FILE",
  10: "TEMPLATE",
  14: "CATEGORY",
};
function nsLabel(ns: number): string {
  return NS_LABELS[ns] ?? "OTHER";
}

function shortTitle(t: string): string {
  // Strip parentheses and disambiguators, take first words, uppercase, cap 12.
  const cleaned = t
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-zA-Z0-9_]/g, " ")
    .trim();
  const head = cleaned.split(/\s+/).slice(0, 1).join("").toUpperCase();
  return head.slice(0, 12) || "UNTITLED";
}

export async function fetchWorld(): Promise<SeedResult> {
  let stage = "init";
  try {
    stage = "fetch";
    const resp = await fetch(WIKI_URL, {
      signal: AbortSignal.timeout(12_000),
      headers: WIKI_HEADERS,
    });
    if (!resp.ok) throw new Error(`wiki ${resp.status}`);
    stage = "parse";
    const data = (await resp.json()) as RcResponse;
    if (data.error) throw new Error(`wiki error: ${data.error.info}`);
    const changes = data.query?.recentchanges ?? [];
    if (changes.length === 0) throw new Error("wiki: empty results");

    stage = "compute";
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const recent = changes.filter((c) => {
      const t = Date.parse(c.timestamp);
      return Number.isFinite(t) && t >= fiveMinAgo;
    });
    const window = recent.length > 0 ? recent : changes.slice(0, 100);

    // Dominant namespace
    const nsCount = new Map<number, number>();
    for (const c of window) nsCount.set(c.ns, (nsCount.get(c.ns) ?? 0) + 1);
    const topNsEntry = [...nsCount.entries()].sort((a, b) => b[1] - a[1])[0];
    const dominantNs = topNsEntry ? topNsEntry[0] : 0;
    const dominantLabel = nsLabel(dominantNs);

    // Edit velocity: edits per minute over the actual window length
    const oldest = window[window.length - 1]?.timestamp;
    const newest = window[0]?.timestamp;
    let windowMin = 5;
    if (oldest && newest) {
      const span =
        (Date.parse(newest) - Date.parse(oldest)) / 60_000;
      if (span > 0.1) windowMin = span;
    }
    const editVelocity = window.length / windowMin;

    // Most-edited article title in the window
    const titleCount = new Map<string, number>();
    for (const c of window)
      titleCount.set(c.title, (titleCount.get(c.title) ?? 0) + 1);
    const topTitleEntry = [...titleCount.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0];
    const topTitle = topTitleEntry?.[0] ?? "";
    const topTitleHash = topTitle
      ? Buffer.from(digestOf("title", topTitle))
          .toString("hex")
          .slice(0, 16)
      : "";

    const digest = digestOf(
      "WORLD",
      dominantLabel,
      editVelocity.toFixed(2),
      topTitleHash,
      String(Math.floor(Date.now() / 60_000))
    );

    const result: SeedResult = {
      digest,
      display: {
        channel: "03",
        category: "WORLD",
        rows: [
          { label: "TONE", value: dominantLabel },
          {
            label: "EVT/15M",
            value: String(Math.round(editVelocity * 15)),
          },
          { label: "TAG", value: shortTitle(topTitle) },
        ],
      },
    };
    lastGood = { result, at: Date.now() };
    return result;
  } catch (e) {
    const detail = `wiki@${stage}: ${String((e as Error)?.message ?? e)}`;
    if (lastGood && Date.now() - lastGood.at < STALE_TTL_MS) {
      return {
        digest: lastGood.result.digest,
        display: {
          ...lastGood.result.display,
          fault: `cached: ${detail}`,
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
        fault: detail,
      },
    };
  }
}
