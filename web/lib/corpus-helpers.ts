import { PublicKey } from "@solana/web3.js";
import {
  buildProgram,
  decodeUri,
  epochSquarePda,
  layer1Pda,
  layer2Pda,
  layerIndexPda,
  lookingGlassPda,
} from "./oracle-helpers";

export interface CorpusEntry {
  epoch: number;
  text: string;
  locked_at: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedCorpus: { at: number; entries: CorpusEntry[] } | null = null;
let cachedLayer1: { at: number; entries: { index: number; text: string; locked_at: number }[] } | null = null;
let cachedLayer2: { at: number; entries: { index: number; text: string; locked_at: number }[] } | null = null;

// Batched fetchMultiple: Anchor allows up to 100 addresses per
// getMultipleAccountsInfo RPC call, but the public Solana endpoint
// limits to 100. Run several batches in parallel for throughput.
async function fetchMultipleBatched<T>(
  programAccount: any,
  pdas: PublicKey[],
  chunkSize = 100
): Promise<(T | null)[]> {
  const chunks: PublicKey[][] = [];
  for (let i = 0; i < pdas.length; i += chunkSize) {
    chunks.push(pdas.slice(i, i + chunkSize));
  }
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        return (await programAccount.fetchMultiple(chunk)) as (T | null)[];
      } catch {
        return chunk.map(() => null as T | null);
      }
    })
  );
  return results.flat();
}

/**
 * Walk every EpochSquare PDA from epoch 1 → current and decode the
 * prophecy text. Uses Anchor's fetchMultiple under the hood
 * (getMultipleAccountsInfo) — 700 epochs becomes 7 RPC calls instead
 * of 700. Results cached in-process for an hour. Vercel function
 * instances are short-lived so the cache is best-effort.
 */
export async function fetchAtomicCorpus(): Promise<CorpusEntry[]> {
  if (cachedCorpus && Date.now() - cachedCorpus.at < CACHE_TTL_MS) {
    return cachedCorpus.entries;
  }
  const { program } = buildProgram();
  let currentEpoch = 0;
  try {
    const lg: any = await (program.account as any).lookingGlass.fetch(
      lookingGlassPda()
    );
    currentEpoch = Number(lg.epoch);
  } catch {
    return [];
  }
  if (currentEpoch === 0) return [];
  const epochs: number[] = [];
  for (let ep = 1; ep <= currentEpoch; ep++) epochs.push(ep);
  const pdas = epochs.map((ep) => epochSquarePda(ep));
  const accounts = await fetchMultipleBatched<any>(
    (program.account as any).epochSquare,
    pdas
  );
  const out: CorpusEntry[] = [];
  for (let i = 0; i < epochs.length; i++) {
    const sq = accounts[i];
    if (!sq) continue;
    const text = decodeUri(sq.prophecyUri ?? "");
    if (!text) continue;
    out.push({
      epoch: epochs[i],
      text,
      locked_at: Number(sq.lockedAt),
    });
  }
  cachedCorpus = { at: Date.now(), entries: out };
  return out;
}

export async function fetchLayer1Corpus(): Promise<
  { index: number; text: string; locked_at: number }[]
> {
  if (cachedLayer1 && Date.now() - cachedLayer1.at < CACHE_TTL_MS) {
    return cachedLayer1.entries;
  }
  const { program } = buildProgram();
  let nextL1 = 0;
  try {
    const li: any = await (program.account as any).layerIndex.fetch(
      layerIndexPda()
    );
    nextL1 = Number(li.nextLayer1);
  } catch {
    return [];
  }
  if (nextL1 === 0) return [];
  const indices: number[] = [];
  for (let i = 0; i < nextL1; i++) indices.push(i);
  const pdas = indices.map((idx) => layer1Pda(idx));
  const accounts = await fetchMultipleBatched<any>(
    (program.account as any).synthesisLayer1,
    pdas
  );
  // Resolve synthesis_uri text in parallel.
  const out = await Promise.all(
    accounts.map(async (acc) => {
      if (!acc) return null;
      const uri: string = acc.synthesisUri ?? "";
      let text = "";
      if (uri) {
        try {
          const r = await fetch(uri);
          if (r.ok) {
            const body = (await r.json()) as { text?: string };
            text = body.text ?? "";
          }
        } catch {
          /* swallow */
        }
      }
      return {
        index: Number(acc.layer1Index),
        text,
        locked_at: Number(acc.lockedAt),
      };
    })
  );
  const filtered = out.filter(
    (e): e is { index: number; text: string; locked_at: number } => e !== null
  );
  cachedLayer1 = { at: Date.now(), entries: filtered };
  return filtered;
}

export async function fetchLayer2Corpus(): Promise<
  { index: number; text: string; locked_at: number }[]
> {
  if (cachedLayer2 && Date.now() - cachedLayer2.at < CACHE_TTL_MS) {
    return cachedLayer2.entries;
  }
  const { program } = buildProgram();
  let nextL2 = 0;
  try {
    const li: any = await (program.account as any).layerIndex.fetch(
      layerIndexPda()
    );
    nextL2 = Number(li.nextLayer2);
  } catch {
    return [];
  }
  if (nextL2 === 0) return [];
  const indices: number[] = [];
  for (let i = 0; i < nextL2; i++) indices.push(i);
  const pdas = indices.map((idx) => layer2Pda(idx));
  const accounts = await fetchMultipleBatched<any>(
    (program.account as any).synthesisLayer2,
    pdas
  );
  const out = await Promise.all(
    accounts.map(async (acc) => {
      if (!acc) return null;
      const uri: string = acc.synthesisUri ?? "";
      let text = "";
      if (uri) {
        try {
          const r = await fetch(uri);
          if (r.ok) {
            const body = (await r.json()) as { text?: string };
            text = body.text ?? "";
          }
        } catch {
          /* swallow */
        }
      }
      return {
        index: Number(acc.layer2Index),
        text,
        locked_at: Number(acc.lockedAt),
      };
    })
  );
  const filtered = out.filter(
    (e): e is { index: number; text: string; locked_at: number } => e !== null
  );
  cachedLayer2 = { at: Date.now(), entries: filtered };
  return filtered;
}
