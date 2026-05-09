import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "../../shared/looking_glass.json";
import { kvGet } from "./kv-helpers";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
export const PROGRAM_ID_STR =
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
  "EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu";
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);

const READ_ONLY_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async (tx: any) => tx,
  signAllTransactions: async (txs: any[]) => txs,
} as any;

export function buildProgram(): { connection: Connection; program: Program } {
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(connection, READ_ONLY_WALLET, {
    commitment: "confirmed",
  });
  const program = new Program(idl as any, provider);
  return { connection, program };
}

export function lookingGlassPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("looking_glass")],
    PROGRAM_ID
  )[0];
}
export function epochSquarePda(epoch: number | bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(epoch));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("epoch"), buf],
    PROGRAM_ID
  )[0];
}
export function layerIndexPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("layer_index")],
    PROGRAM_ID
  )[0];
}
export function layer1Pda(idx: number | bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(idx));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("layer1"), buf],
    PROGRAM_ID
  )[0];
}
export function layer2Pda(idx: number | bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(idx));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("layer2"), buf],
    PROGRAM_ID
  )[0];
}

export function decodeUri(uri: string): string {
  if (!uri || !uri.startsWith("inline:")) return "";
  try {
    return Buffer.from(uri.slice("inline:".length), "base64").toString("utf-8");
  } catch {
    return "";
  }
}
export function glyphsFromAccount(sq: any): string[][] {
  return (sq.glyphs as number[][]).map((row) =>
    Array.from(row).map((b) => String.fromCharCode(b))
  );
}
export function bytesToHex(bytes: number[] | Uint8Array): string {
  const arr = Array.isArray(bytes) ? bytes : Array.from(bytes);
  return (
    "0x" + arr.map((b) => (b & 0xff).toString(16).padStart(2, "0")).join("")
  );
}

const SPINE_NAMES = ["MARKETS", "CHAIN", "WORLD", "HEAVENS", "ECHO+DRIFT"];
export function spineOwnerForEpoch(epoch: number): string {
  return SPINE_NAMES[((epoch % 5) + 5) % 5] ?? "MARKETS";
}

export interface SeedRecord {
  captured_at_ts: number;
  markets: Record<string, { price: string; confidence: string }>;
  chain: Record<string, number>;
  world: Record<string, string | number>;
  heavens: Record<string, number | string>;
  echo: Record<string, number | string>;
  drift: Record<string, number | string>;
  spine_owner: string;
}

/**
 * Fetch the captured seed record for one epoch. The keeper writes
 * these to KV under `seeds:epoch:{N}` after each successful
 * submit_prophecy. Returns null for any epoch that locked before the
 * keeper began capturing seeds (Phase 20B-final and later).
 */
export async function fetchSeedsForEpoch(
  epoch: number
): Promise<SeedRecord | null> {
  const raw = await kvGet(`seeds:epoch:${epoch}`);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as SeedRecord;
  } catch {
    return null;
  }
}

export async function fetchEpochSquareRecord(
  program: Program,
  connection: Connection,
  epoch: number
): Promise<{
  epoch: number;
  locked_at: string | null;
  glyphs: string[][];
  prophecy_text: string;
  prophecy_hash: string | null;
  forward_digest: string;
  backward_digest: string;
  pda: string;
  tx_signature: string | null;
  seeds: SeedRecord | null;
} | null> {
  try {
    const pda = epochSquarePda(epoch);
    const sq: any = await (program.account as any).epochSquare.fetch(pda);
    const lockedAt = Number(sq.lockedAt);
    let txSig: string | null = null;
    try {
      const sigs = await connection.getSignaturesForAddress(pda, { limit: 1 });
      txSig = sigs[0]?.signature ?? null;
    } catch {
      /* swallow */
    }
    const text = decodeUri(sq.prophecyUri ?? "");
    const seeds = await fetchSeedsForEpoch(epoch);
    return {
      epoch,
      locked_at:
        lockedAt > 0 ? new Date(lockedAt * 1000).toISOString() : null,
      glyphs: glyphsFromAccount(sq),
      prophecy_text: text,
      prophecy_hash:
        sq.prophecyHash && sq.prophecyHash.length === 32
          ? bytesToHex(sq.prophecyHash)
          : null,
      forward_digest: bytesToHex(sq.forwardDigest ?? []),
      backward_digest: bytesToHex(sq.backwardDigest ?? []),
      pda: pda.toBase58(),
      tx_signature: txSig,
      seeds,
    };
  } catch {
    return null;
  }
}

export async function fetchLayer1Record(
  program: Program,
  index: number
): Promise<any | null> {
  try {
    const pda = layer1Pda(index);
    const acc: any = await (program.account as any).synthesisLayer1.fetch(pda);
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
    const lockedAt = Number(acc.lockedAt);
    return {
      layer1_index: Number(acc.layer1Index),
      locked_at: lockedAt > 0 ? new Date(lockedAt * 1000).toISOString() : null,
      epoch_range: [
        Number(acc.epochRangeStart),
        Number(acc.epochRangeEnd),
      ],
      synthesis_text: text,
      synthesis_hash:
        acc.synthesisHash && acc.synthesisHash.length === 32
          ? bytesToHex(acc.synthesisHash)
          : null,
      synthesis_uri: uri,
      pda: pda.toBase58(),
    };
  } catch {
    return null;
  }
}

export async function fetchLayer2Record(
  program: Program,
  index: number
): Promise<any | null> {
  try {
    const pda = layer2Pda(index);
    const acc: any = await (program.account as any).synthesisLayer2.fetch(pda);
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
    const lockedAt = Number(acc.lockedAt);
    return {
      layer2_index: Number(acc.layer2Index),
      locked_at: lockedAt > 0 ? new Date(lockedAt * 1000).toISOString() : null,
      layer1_range: [
        Number(acc.layer1RangeStart),
        Number(acc.layer1RangeEnd),
      ],
      synthesis_text: text,
      synthesis_hash:
        acc.synthesisHash && acc.synthesisHash.length === 32
          ? bytesToHex(acc.synthesisHash)
          : null,
      synthesis_uri: uri,
      pda: pda.toBase58(),
    };
  } catch {
    return null;
  }
}
