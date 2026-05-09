import { Connection, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
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

/**
 * Walk every EpochSquare PDA from epoch 1 → current and decode the
 * prophecy text. Results cached in-process for an hour. Vercel
 * function instances are short-lived so the cache is best-effort —
 * subsequent invocations may rebuild.
 */
export async function fetchAtomicCorpus(): Promise<CorpusEntry[]> {
  if (cachedCorpus && Date.now() - cachedCorpus.at < CACHE_TTL_MS) {
    return cachedCorpus.entries;
  }
  const { connection: _connection, program } = buildProgram();
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
  const targets: number[] = [];
  for (let ep = 1; ep <= currentEpoch; ep++) targets.push(ep);
  // Fetch in batches of 25 to avoid hammering the public RPC.
  const out: CorpusEntry[] = [];
  for (let i = 0; i < targets.length; i += 25) {
    const batch = targets.slice(i, i + 25);
    const results = await Promise.all(
      batch.map(async (ep) => {
        try {
          const sq: any = await (program.account as any).epochSquare.fetch(
            epochSquarePda(ep)
          );
          const text = decodeUri(sq.prophecyUri ?? "");
          if (!text) return null;
          return {
            epoch: ep,
            text,
            locked_at: Number(sq.lockedAt),
          };
        } catch {
          return null;
        }
      })
    );
    for (const r of results) if (r) out.push(r);
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
  const out: { index: number; text: string; locked_at: number }[] = [];
  for (let i = 0; i < indices.length; i += 10) {
    const batch = indices.slice(i, i + 10);
    const results = await Promise.all(
      batch.map(async (idx) => {
        try {
          const acc: any = await (
            program.account as any
          ).synthesisLayer1.fetch(layer1Pda(idx));
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
        } catch {
          return null;
        }
      })
    );
    for (const r of results) if (r) out.push(r);
  }
  cachedLayer1 = { at: Date.now(), entries: out };
  return out;
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
  const out: { index: number; text: string; locked_at: number }[] = [];
  for (let i = 0; i < nextL2; i++) {
    try {
      const acc: any = await (program.account as any).synthesisLayer2.fetch(
        layer2Pda(i)
      );
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
      out.push({
        index: Number(acc.layer2Index),
        text,
        locked_at: Number(acc.lockedAt),
      });
    } catch {
      /* skip */
    }
  }
  cachedLayer2 = { at: Date.now(), entries: out };
  return out;
}
