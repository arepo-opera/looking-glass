import {
  buildProgram,
  fetchEpochSquareRecord,
  lookingGlassPda,
  type SeedRecord,
} from "@/lib/oracle-helpers";
import {
  kvConfigured,
  kvGet,
  kvMget,
  kvSet,
} from "@/lib/kv-helpers";

const TARGET_PER_BUCKET = 10;
const SCAN_DEPTH = 200;

export interface SeedDoc extends Partial<SeedRecord> {
  models?: {
    read: string;
    merge: string;
    configuration_id: string;
  };
}

export interface BlindEntry {
  blind_id: string;
  epoch: number;
  prophecy_text: string;
  seeds_summary: string;
}

export interface KeyEntry {
  blind_id: string;
  epoch: number;
  configuration_id: string;
  read_model: string;
  merge_model: string;
}

export interface CachedTest {
  test_id: string;
  generated_at: string;
  buckets: Record<string, number>;
  shuffled_prophecies: BlindEntry[];
  answer_key: KeyEntry[];
}

export type BuildTestError = { error: string };

export function configurationOf(seed: SeedDoc | null): string {
  return seed?.models?.configuration_id ?? "all-opus";
}

function seedsSummary(seed: SeedDoc | null): string {
  if (!seed) return "(seeds unavailable for this epoch)";
  const parts: string[] = [];
  const btc = seed.markets?.["BTC"]?.price;
  if (btc) parts.push(`BTC ${btc}`);
  const tps = (seed.chain as any)?.TPS;
  if (tps !== undefined) parts.push(`TPS ${tps}`);
  const evt = (seed.world as any)?.["EVT/15M"];
  if (evt !== undefined) parts.push(`EVT/15M ${evt}`);
  const kp = (seed.heavens as any)?.["KP.IDX"];
  if (kp !== undefined) parts.push(`KP.IDX ${kp}`);
  const drift = (seed.drift as any)?.SCORE;
  if (drift !== undefined) parts.push(`DRIFT ${drift}`);
  return parts.length > 0 ? parts.join(" | ") : "(seeds present, no summary fields)";
}

function stableShuffle<T extends { epoch: number }>(items: T[], salt: string): T[] {
  function h(s: string): number {
    let x = 2166136261;
    for (let i = 0; i < s.length; i++) {
      x ^= s.charCodeAt(i);
      x = (x * 16777619) >>> 0;
    }
    return x >>> 0;
  }
  return [...items].sort(
    (a, b) => h(salt + ":" + a.epoch) - h(salt + ":" + b.epoch)
  );
}

async function getCurrentEpoch(): Promise<number> {
  const { program } = buildProgram();
  try {
    const lg: any = await (program.account as any).lookingGlass.fetch(
      lookingGlassPda()
    );
    return Number(lg.epoch);
  } catch {
    return 0;
  }
}

export async function buildTest(): Promise<CachedTest | BuildTestError> {
  if (!kvConfigured()) return { error: "kv not configured" };
  const currentEpoch = await getCurrentEpoch();
  if (currentEpoch === 0) return { error: "could not read current epoch" };

  const epochs: number[] = [];
  const startEp = Math.max(1, currentEpoch - SCAN_DEPTH + 1);
  for (let e = currentEpoch; e >= startEp; e--) epochs.push(e);
  const seedKeys = epochs.map((e) => `seeds:epoch:${e}`);
  const seedRaws = await kvMget(seedKeys);

  const allOpusEpochs: number[] = [];
  const haikuOpusEpochs: number[] = [];
  for (let i = 0; i < epochs.length; i++) {
    const raw = seedRaws[i];
    if (!raw) continue;
    let doc: SeedDoc | null = null;
    try {
      doc = JSON.parse(raw) as SeedDoc;
    } catch {
      continue;
    }
    const cfg = configurationOf(doc);
    if (cfg === "all-opus" && allOpusEpochs.length < TARGET_PER_BUCKET) {
      allOpusEpochs.push(epochs[i]);
    } else if (
      cfg === "haiku-reads-opus-merge" &&
      haikuOpusEpochs.length < TARGET_PER_BUCKET
    ) {
      haikuOpusEpochs.push(epochs[i]);
    }
    if (
      allOpusEpochs.length >= TARGET_PER_BUCKET &&
      haikuOpusEpochs.length >= TARGET_PER_BUCKET
    ) {
      break;
    }
  }

  const testId =
    haikuOpusEpochs.length > 0
      ? `voice-test-vs${haikuOpusEpochs[0]}`
      : `voice-test-pending-${currentEpoch}`;

  const cacheKey = `comparison:voice-test:${testId}`;
  const cachedRaw = await kvGet(cacheKey);
  if (cachedRaw) {
    try {
      return JSON.parse(cachedRaw) as CachedTest;
    } catch {
      /* corrupted, regenerate */
    }
  }

  const { program, connection } = buildProgram();
  const allEpochs = [...allOpusEpochs, ...haikuOpusEpochs];
  const records = await Promise.all(
    allEpochs.map(async (ep) => {
      const r = await fetchEpochSquareRecord(program, connection, ep);
      const idx = epochs.indexOf(ep);
      let seedDoc: SeedDoc | null = null;
      if (idx >= 0 && seedRaws[idx]) {
        try {
          seedDoc = JSON.parse(seedRaws[idx] as string) as SeedDoc;
        } catch {
          /* swallow */
        }
      }
      return { epoch: ep, record: r, seed: seedDoc };
    })
  );

  const shuffled = stableShuffle(records, testId);
  const blindList: BlindEntry[] = [];
  const keyList: KeyEntry[] = [];
  shuffled.forEach((row, i) => {
    const blindId = `p${String(i + 1).padStart(2, "0")}`;
    const cfg = configurationOf(row.seed);
    blindList.push({
      blind_id: blindId,
      epoch: row.epoch,
      prophecy_text: row.record?.prophecy_text ?? "(prophecy unavailable)",
      seeds_summary: seedsSummary(row.seed),
    });
    keyList.push({
      blind_id: blindId,
      epoch: row.epoch,
      configuration_id: cfg,
      read_model: row.seed?.models?.read ?? "claude-opus-4-7",
      merge_model: row.seed?.models?.merge ?? "claude-opus-4-7",
    });
  });

  const result: CachedTest = {
    test_id: testId,
    generated_at: new Date().toISOString(),
    buckets: {
      "all-opus": allOpusEpochs.length,
      "haiku-reads-opus-merge": haikuOpusEpochs.length,
    },
    shuffled_prophecies: blindList,
    answer_key: keyList,
  };

  try {
    await kvSet(cacheKey, JSON.stringify(result), 86400);
  } catch {
    /* swallow — endpoint still returns the live build */
  }
  return result;
}
