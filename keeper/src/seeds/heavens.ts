import * as Astronomy from "astronomy-engine";
import { SeedResult, digestOf, fallbackDigest } from "./types";

const KP_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";
const XRAY_URL = "https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json";

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

function flareClass(maxFlux: number): string {
  // X-ray flux thresholds (W/m^2) for solar flare classification.
  if (maxFlux >= 1e-4) return `X${(maxFlux / 1e-4).toFixed(1)}`;
  if (maxFlux >= 1e-5) return `M${(maxFlux / 1e-5).toFixed(1)}`;
  if (maxFlux >= 1e-6) return `C${(maxFlux / 1e-6).toFixed(1)}`;
  if (maxFlux >= 1e-7) return `B${(maxFlux / 1e-7).toFixed(1)}`;
  return `A${(maxFlux / 1e-8).toFixed(1)}`;
}

function moonPhaseFraction(): number {
  // Astronomy.MoonPhase returns 0..360°; map to 0..1.
  const angle = Astronomy.MoonPhase(new Date());
  return (angle % 360) / 360;
}

export async function fetchHeavens(): Promise<SeedResult> {
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

    // Long-wave (0.1-0.8 nm) channel is the conventional one for the
    // X-ray class. Filter to those, then take the max flux over the
    // 6h window.
    const long = xrayRows.filter((r) => r.energy.startsWith("0.1-0.8"));
    const maxFlux = long.length === 0 ? 0 : Math.max(...long.map((r) => r.flux ?? 0));
    const flare = maxFlux > 0 ? flareClass(maxFlux) : "A0.0";

    const moon = moonPhaseFraction();

    const digest = digestOf(
      "HEAVENS",
      kp.toFixed(2),
      moon.toFixed(4),
      flare
    );

    return {
      digest,
      display: {
        channel: "04",
        category: "HEAVENS",
        rows: [
          { label: "KP.IDX", value: kp.toFixed(2) },
          { label: "MOON.PH", value: moon.toFixed(2) },
          { label: "SOL.FL", value: flare },
        ],
      },
    };
  } catch (e) {
    // Moon phase is local — still report it on fallback.
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
        ],
        fault: String((e as Error)?.message ?? e),
      },
    };
  }
}
