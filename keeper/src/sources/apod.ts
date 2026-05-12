import {
  SourceFetchResult,
  SourceValue,
  sourceUnavailable,
} from "./types";

// NASA APOD (Astronomy Picture of the Day). Public DEMO_KEY tier
// has a 1000 req/day limit per IP, which is generous for a single
// epoch-per-3-minutes keeper. If the operator has signed up for a
// personal NASA API key, set NASA_API_KEY in the env to use it.

interface ApodResponse {
  date: string;
  title: string;
  explanation: string;
  media_type: string;
  url?: string;
  copyright?: string;
}

export async function fetchApod(): Promise<SourceFetchResult> {
  const key = process.env.NASA_API_KEY || "DEMO_KEY";
  const url = `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(
    key
  )}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return sourceUnavailable(`apod ${r.status}`);
    const d = (await r.json()) as ApodResponse;
    const ts = Math.floor(Date.now() / 1000);
    // First sentence of explanation, capped at 200 chars.
    const firstSentence = d.explanation
      .split(/(?<=[.!?])\s+/)[0]
      .slice(0, 200);
    return {
      values: [
        {
          name: "apod:daily",
          category: "HEAVENS",
          raw_value: {
            date: d.date,
            title: d.title,
            url: d.url ?? null,
            copyright: d.copyright ?? null,
          },
          text_representation: `APOD ${d.date} — ${d.title}: ${firstSentence}`,
          timestamp: ts,
        },
      ],
    };
  } catch (e: any) {
    return sourceUnavailable(`apod: ${String(e?.message ?? e)}`);
  }
}
