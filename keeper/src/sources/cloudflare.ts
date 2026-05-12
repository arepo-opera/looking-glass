import {
  SourceFetchResult,
  SourceValue,
  sourceUnavailable,
} from "./types";

// Cloudflare Radar — internet-traffic indicators. Free API; requires
// CLOUDFLARE_API_TOKEN env var. The token only needs Read access to
// the Radar scope.
//
// We pull three indicators per epoch:
//   - top attack vectors (Radar /attacks/layer7/top/attacks)
//   - BGP route announcements summary (Radar /bgp/timeseries)
//   - traffic anomaly score for the last hour (Radar /traffic/timeseries)

const BASE = "https://api.cloudflare.com/client/v4/radar";

async function getJson<T>(
  path: string,
  token: string
): Promise<T | null> {
  try {
    const r = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const body = (await r.json()) as { success?: boolean; result?: T };
    if (body.success !== true || !body.result) return null;
    return body.result;
  } catch {
    return null;
  }
}

export async function fetchCloudflare(): Promise<SourceFetchResult> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) return sourceUnavailable("CLOUDFLARE_API_TOKEN unset");
  try {
    const ts = Math.floor(Date.now() / 1000);
    const values: SourceValue[] = [];

    // Top L7 attack vectors (last 24h).
    const attacks = await getJson<{
      top_0?: Array<{ name: string; value: string }>;
    }>("/attacks/layer7/top/attacks?dateRange=1d&limit=5", token);
    if (attacks?.top_0 && attacks.top_0.length > 0) {
      const summary = attacks.top_0
        .slice(0, 3)
        .map((a) => `${a.name} ${a.value}%`)
        .join(", ");
      values.push({
        name: "cloudflare:attacks-l7-top",
        category: "CHAIN",
        raw_value: {
          window: "24h",
          top_attacks: attacks.top_0.slice(0, 5),
        },
        text_representation: `CF top L7 attacks (24h): ${summary}`,
        timestamp: ts,
      });
    }

    // BGP route announcements summary (24h).
    const bgp = await getJson<{
      serie_0?: { timestamps: string[]; values: string[] };
      meta?: { aggInterval?: string };
    }>("/bgp/timeseries?dateRange=1d", token);
    if (bgp?.serie_0 && bgp.serie_0.values.length > 0) {
      const last = bgp.serie_0.values[bgp.serie_0.values.length - 1];
      values.push({
        name: "cloudflare:bgp-announcements",
        category: "CHAIN",
        raw_value: {
          window: "24h",
          latest: last,
          interval: bgp.meta?.aggInterval ?? "unknown",
        },
        text_representation: `CF BGP announcements (last bin): ${last}`,
        timestamp: ts,
      });
    }

    // Traffic anomaly: take the most recent traffic-timeseries value vs
    // the 24h mean to derive a coarse anomaly indicator.
    const traffic = await getJson<{
      serie_0?: { timestamps: string[]; values: string[] };
    }>("/traffic/timeseries?dateRange=1d", token);
    if (traffic?.serie_0 && traffic.serie_0.values.length > 0) {
      const nums = traffic.serie_0.values.map((v) => Number(v)).filter((n) => Number.isFinite(n));
      if (nums.length > 0) {
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const last = nums[nums.length - 1];
        const dev = mean > 0 ? ((last - mean) / mean) * 100 : 0;
        values.push({
          name: "cloudflare:traffic-anomaly",
          category: "CHAIN",
          raw_value: {
            window: "24h",
            latest: last,
            mean,
            deviation_pct: Number(dev.toFixed(2)),
          },
          text_representation: `CF traffic ${last.toFixed(0)} (${dev >= 0 ? "+" : ""}${dev.toFixed(1)}% vs 24h mean)`,
          timestamp: ts,
        });
      }
    }

    if (values.length === 0) {
      return sourceUnavailable("cloudflare radar returned no usable data");
    }
    return { values };
  } catch (e: any) {
    return sourceUnavailable(`cloudflare: ${String(e?.message ?? e)}`);
  }
}
