import {
  SourceFetchResult,
  SourceValue,
  sourceUnavailable,
} from "./types";

// Reddit /r/all top trending. Requires app-only OAuth via a Reddit
// "script" app. Env: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET.
// We use the application-only flow (no user account).

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const TOP_URL = "https://oauth.reddit.com/r/all/top.json?t=hour&limit=5";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppOnlyToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "sator-looking-glass/1.0 (apparatus)",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) return null;
  const body = (await r.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!body.access_token) return null;
  const expiresAt = Date.now() + ((body.expires_in ?? 3600) - 60) * 1000;
  cachedToken = { token: body.access_token, expiresAt };
  return body.access_token;
}

export async function fetchReddit(): Promise<SourceFetchResult> {
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
    return sourceUnavailable("REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET unset");
  }
  try {
    const token = await getAppOnlyToken();
    if (!token) return sourceUnavailable("reddit token fetch failed");
    const r = await fetch(TOP_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "sator-looking-glass/1.0 (apparatus)",
      },
    });
    if (!r.ok) return sourceUnavailable(`reddit ${r.status}`);
    const body = (await r.json()) as {
      data?: {
        children?: Array<{
          data: {
            id: string;
            title: string;
            subreddit: string;
            score: number;
            num_comments: number;
            permalink: string;
            created_utc: number;
          };
        }>;
      };
    };
    const items = body.data?.children ?? [];
    const ts = Math.floor(Date.now() / 1000);
    const values: SourceValue[] = items.slice(0, 5).map((it, i) => {
      const d = it.data;
      return {
        name: `reddit:r-all-top-${i + 1}`,
        category: "WORLD",
        raw_value: {
          id: d.id,
          title: d.title,
          subreddit: d.subreddit,
          score: d.score,
          comments: d.num_comments,
          permalink: `https://reddit.com${d.permalink}`,
          created_utc: d.created_utc,
        },
        text_representation: `r/${d.subreddit} ${d.score}↑ ${d.num_comments}💬 — ${d.title}`,
        timestamp: ts,
      };
    });
    return { values };
  } catch (e: any) {
    return sourceUnavailable(`reddit: ${String(e?.message ?? e)}`);
  }
}
