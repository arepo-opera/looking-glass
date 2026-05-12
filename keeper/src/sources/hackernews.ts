import {
  SourceFetchResult,
  SourceValue,
  sourceUnavailable,
} from "./types";

// Hacker News top stories via the public Firebase API. No key.
// Spec: top 5 stories with score + descendants.
//   https://hacker-news.firebaseio.com/v0/topstories.json
//   https://hacker-news.firebaseio.com/v0/item/{id}.json

const TOP_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const ITEM_URL = (id: number) =>
  `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

export async function fetchHackerNews(): Promise<SourceFetchResult> {
  try {
    const topRes = await fetch(TOP_URL);
    if (!topRes.ok)
      return sourceUnavailable(`hn topstories ${topRes.status}`);
    const ids = (await topRes.json()) as number[];
    const slice = ids.slice(0, 5);
    const stories = await Promise.all(
      slice.map(async (id) => {
        try {
          const r = await fetch(ITEM_URL(id));
          if (!r.ok) return null;
          return (await r.json()) as {
            id: number;
            title: string;
            score: number;
            descendants?: number;
            by: string;
            time: number;
            url?: string;
          };
        } catch {
          return null;
        }
      })
    );
    const ts = Math.floor(Date.now() / 1000);
    const values: SourceValue[] = stories
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s, i) => ({
        name: `hn:top-${i + 1}`,
        category: "WORLD",
        raw_value: {
          id: s.id,
          title: s.title,
          score: s.score,
          comments: s.descendants ?? 0,
          by: s.by,
          url: s.url ?? null,
        },
        text_representation: `HN ${s.score}↑ ${s.descendants ?? 0}💬 — ${s.title}`,
        timestamp: ts,
      }));
    return { values };
  } catch (e: any) {
    return sourceUnavailable(`hn: ${String(e?.message ?? e)}`);
  }
}
