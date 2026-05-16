import * as Astronomy from "astronomy-engine";
import { SeedResult, digestOf, fallbackDigest } from "./types";

const KP_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";
const XRAY_URL =
  "https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json";
const USGS_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson";

interface KpRow {
  time_tag: string;
  kp_index?: number;
  estimated_kp?: number;
}
interface XrayRow {
  time_tag: string;
  energy: string;
  flux: number;
}
interface UsgsFeature {
  properties?: {
    mag?: number;
    time?: number;
    place?: string;
  };
}
interface UsgsResponse {
  features?: UsgsFeature[];
}

function flareClass(maxFlux: number): string {
  if (maxFlux >= 1e-4) return `X${(maxFlux / 1e-4).toFixed(1)}`;
  if (maxFlux >= 1e-5) return `M${(maxFlux / 1e-5).toFixed(1)}`;
  if (maxFlux >= 1e-6) return `C${(maxFlux / 1e-6).toFixed(1)}`;
  if (maxFlux >= 1e-7) return `B${(maxFlux / 1e-7).toFixed(1)}`;
  return `A${(maxFlux / 1e-8).toFixed(1)}`;
}

function moonPhaseFraction(): number {
  const angle = Astronomy.MoonPhase(new Date());
  return (angle % 360) / 360;
}

interface QuakeStats {
  count24hM5: number;
  maxMag24h: number;
  count7dM6: number;
}

async function fetchQuakes(): Promise<QuakeStats> {
  const resp = await fetch(USGS_URL, {
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent":
        "looking-glass-keeper/0.3 (+https://github.com/arepo-opera/looking-glass)",
      Accept: "application/json",
    },
  });
  if (!resp.ok) throw new Error(`usgs ${resp.status}`);
  const data = (await resp.json()) as UsgsResponse;
  const features = data.features ?? [];
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  let count24hM5 = 0;
  let maxMag24h = 0;
  let count7dM6 = 0;
  for (const f of features) {
    const mag = f.properties?.mag ?? 0;
    const t = f.properties?.time ?? 0;
    if (t >= dayAgo && mag >= 5.0) {
      count24hM5 += 1;
      if (mag > maxMag24h) maxMag24h = mag;
    }
    if (mag >= 6.0) count7dM6 += 1;
  }
  return { count24hM5, maxMag24h, count7dM6 };
}

export async function fetchHeavens(): Promise<SeedResult> {
  // USGS isn't gated to the same try/catch envelope as KP/XRAY — if
  // USGS fails we still want KP+XRAY data, and vice versa. Quake stats
  // default to zeros on error so the digest is well-defined.
  let quakes: QuakeStats = { count24hM5: 0, maxMag24h: 0, count7dM6: 0 };
  let quakeFault: string | null = null;
  try {
    quakes = await fetchQuakes();
  } catch (e) {
    quakeFault = String((e as Error)?.message ?? e);
  }

  try {
    const [kpResp, xrayResp] = await Promise.all([
      fetch(KP_URL, { signal: AbortSignal.timeout(8000) }),
      fetch(XRAY_URL, { signal: AbortSignal.timeout(8000) }),
    ]);
    if (!kpResp.ok) throw new Error(`noaa-kp ${kpResp.status}`);
    if (!xrayResp.ok) throw new Error(`noaa-xray ${xrayResp.status}`);
    const kpRows = (await kpResp.json()) as KpRow[];
    const xrayRows = (await xrayResp.json()) as XrayRow[];

    const lastKp = kpRows[kpRows.length - 1];
    const kp = lastKp?.kp_index ?? lastKp?.estimated_kp ?? 0;

    const long = xrayRows.filter((r) => r.energy.startsWith("0.1-0.8"));
    const maxFlux =
      long.length === 0 ? 0 : Math.max(...long.map((r) => r.flux ?? 0));
    const flare = maxFlux > 0 ? flareClass(maxFlux) : "A0.0";

    const moon = moonPhaseFraction();

    const digest = digestOf(
      "HEAVENS",
      kp.toFixed(2),
      moon.toFixed(4),
      flare,
      String(quakes.count24hM5),
      quakes.maxMag24h.toFixed(1),
      String(quakes.count7dM6)
    );

    const eqValue =
      quakes.count24hM5 > 0
        ? `${quakes.count24hM5}/M${quakes.maxMag24h.toFixed(1)}`
        : "0";

    const display: SeedResult["display"] = {
      channel: "04",
      category: "HEAVENS",
      rows: [
        { label: "KP.IDX", value: kp.toFixed(2) },
        { label: "MOON.PH", value: moon.toFixed(2) },
        { label: "SOL.FL", value: flare },
        { label: "EQ.24H", value: eqValue },
      ],
    };
    if (quakeFault) display.fault = `quakes: ${quakeFault}`;
    return { digest, display };
  } catch (e) {
    let moonStr = "STALE";
    try {
      moonStr = moonPhaseFraction().toFixed(2);
    } catch {}
    return {
      digest: fallbackDigest("HEAVENS"),
      display: {
        channel: "04",
        category: "HEAVENS",
        rows: [
          { label: "KP.IDX", value: "STALE" },
          { label: "MOON.PH", value: moonStr },
          { label: "SOL.FL", value: "STALE" },
          { label: "EQ.24H", value: quakeFault ? "STALE" : String(quakes.count24hM5) },
        ],
        fault: String((e as Error)?.message ?? e),
      },
    };
  }
}
