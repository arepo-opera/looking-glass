import { SeedResult, digestOf, fallbackDigest } from "./types";

interface RpcResp<T> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

interface PerfSample {
  slot: number;
  numTransactions: number;
  numSlots: number;
  samplePeriodSecs: number;
}

interface EpochInfo {
  absoluteSlot: number;
  blockHeight: number;
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  transactionCount?: number;
}

async function rpc<T>(url: string, method: string, params: unknown[] = []): Promise<T> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`${method} ${resp.status}`);
  const j = (await resp.json()) as RpcResp<T>;
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  if (j.result === undefined) throw new Error(`${method}: empty result`);
  return j.result;
}

export async function fetchChain(rpcUrl: string): Promise<SeedResult> {
  try {
    const [perf, epoch] = await Promise.all([
      rpc<PerfSample[]>(rpcUrl, "getRecentPerformanceSamples", [5]),
      rpc<EpochInfo>(rpcUrl, "getEpochInfo"),
    ]);

    const validPerf = perf.filter((p) => p.samplePeriodSecs > 0);
    const tps =
      validPerf.length === 0
        ? 0
        : validPerf.reduce((s, p) => s + p.numTransactions / p.samplePeriodSecs, 0) /
          validPerf.length;

    // We don't have a cheap "whales over the last minute" query, so use the
    // delta of total tx count over the recent perf window as a proxy for
    // network activity intensity. NEW.TKN/MIN follows the same proxy.
    const recentTxDelta = validPerf.reduce((s, p) => s + p.numTransactions, 0);
    const txPerMin = recentTxDelta * (60 / Math.max(1, validPerf.length * 60));
    const whaleProxy = Math.floor(tps / 500); // crude: 1 whale-bucket per 500 TPS

    const digest = digestOf(
      "CHAIN",
      Math.floor(tps),
      epoch.absoluteSlot,
      whaleProxy,
      Math.floor(txPerMin)
    );

    return {
      digest,
      display: {
        channel: "02",
        category: "CHAIN",
        rows: [
          { label: "TPS", value: tps.toFixed(0) },
          { label: "WHALE.TX", value: String(whaleProxy) },
          { label: "TKN/MIN", value: txPerMin.toFixed(0) },
        ],
      },
    };
  } catch (e) {
    return {
      digest: fallbackDigest("CHAIN"),
      display: {
        channel: "02",
        category: "CHAIN",
        rows: [
          { label: "TPS", value: "FAULT" },
          { label: "WHALE.TX", value: "FAULT" },
          { label: "TKN/MIN", value: "FAULT" },
        ],
        fault: String((e as Error)?.message ?? e),
      },
    };
  }
}
