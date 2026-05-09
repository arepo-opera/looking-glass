import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "../../../../shared/looking_glass.json";
import { kvGet } from "@/lib/kv-helpers";

// Server-side archive: walks the on-chain EpochSquare PDAs from the current
// epoch downward and returns them as a stable JSON schema for AI agents and
// other automated consumers.

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const PROGRAM_ID_STR =
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
  "EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu";
const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);

const READ_ONLY_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async (tx: any) => tx,
  signAllTransactions: async (txs: any[]) => txs,
} as any;

function lookingGlassPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("looking_glass")],
    PROGRAM_ID
  )[0];
}

function epochSquarePda(epoch: number): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(epoch));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("epoch"), buf],
    PROGRAM_ID
  )[0];
}

function layerIndexPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("layer_index")],
    PROGRAM_ID
  )[0];
}

function layer1Pda(idx: number): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(idx));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("layer1"), buf],
    PROGRAM_ID
  )[0];
}

function layer2Pda(idx: number): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(idx));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("layer2"), buf],
    PROGRAM_ID
  )[0];
}

const LAYER1_RETURN_LIMIT = 10;
const LAYER2_RETURN_LIMIT = 5;

interface LayerEntryOut {
  layer1_index?: number;
  layer2_index?: number;
  locked_at: string | null;
  epoch_range?: [number, number];
  layer1_range?: [number, number];
  synthesis_text: string;
  synthesis_hash: string | null;
  synthesis_uri: string;
  pda: string;
}

function decodeUri(uri: string): string {
  if (!uri || !uri.startsWith("inline:")) return "";
  try {
    return Buffer.from(uri.slice("inline:".length), "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function glyphsFromAccount(sq: any): string[][] {
  return (sq.glyphs as number[][]).map((row) =>
    Array.from(row).map((b) => String.fromCharCode(b))
  );
}

function bytesToHex(bytes: number[] | Uint8Array): string {
  const arr = Array.isArray(bytes) ? bytes : Array.from(bytes);
  return (
    "0x" + arr.map((b) => (b & 0xff).toString(16).padStart(2, "0")).join("")
  );
}

interface ArchiveEntry {
  epoch: number;
  locked_at: string | null;
  glyphs: string[][];
  prophecy_text: string;
  prophecy_hash: string | null;
  forward_digest: string;
  backward_digest: string;
  pda: string;
  tx_signature: string | null;
  // Phase 20B-final: seeds populated from KV (`seeds:epoch:{N}`)
  // for any epoch that locked after the keeper began recording them.
  // Returns null for older epochs whose seeds were never captured.
  seeds: unknown | null;
  spine_owner: string;
}

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") ?? "100") || 100, 1),
    500
  );
  const fromParam = searchParams.get("from");

  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(connection, READ_ONLY_WALLET, {
    commitment: "confirmed",
  });
  const program = new Program(idl as any, provider);

  let currentEpoch: number;
  try {
    const lg: any = await (program.account as any).lookingGlass.fetch(
      lookingGlassPda()
    );
    currentEpoch = Number(lg.epoch);
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "could not fetch LookingGlass account",
        detail: String(e?.message ?? e),
      },
      { status: 503 }
    );
  }

  const fromEpoch = fromParam ? Number(fromParam) : currentEpoch;
  const startEpoch = Math.max(0, Math.min(currentEpoch, fromEpoch));
  const endEpoch = Math.max(1, startEpoch - limit + 1);

  const targets: number[] = [];
  for (let ep = startEpoch; ep >= endEpoch; ep--) targets.push(ep);

  // Fetch every targeted EpochSquare in parallel. tx_signature is fetched
  // best-effort with the same parallel call — failed lookups return null
  // rather than failing the whole response.
  const entries: (ArchiveEntry | null)[] = await Promise.all(
    targets.map(async (ep): Promise<ArchiveEntry | null> => {
      try {
        const pda = epochSquarePda(ep);
        const sq: any = await (program.account as any).epochSquare.fetch(pda);
        const lockedAt = Number(sq.lockedAt);
        let txSig: string | null = null;
        try {
          const sigs = await connection.getSignaturesForAddress(pda, {
            limit: 1,
          });
          txSig = sigs[0]?.signature ?? null;
        } catch {
          txSig = null;
        }
        const prophecyText = decodeUri(sq.prophecyUri ?? "");
        const prophecyHashBytes: number[] | undefined = sq.prophecyHash;
        return {
          epoch: ep,
          locked_at:
            lockedAt > 0 ? new Date(lockedAt * 1000).toISOString() : null,
          glyphs: glyphsFromAccount(sq),
          prophecy_text: prophecyText,
          prophecy_hash:
            prophecyHashBytes && prophecyHashBytes.length === 32
              ? bytesToHex(prophecyHashBytes)
              : null,
          forward_digest: bytesToHex(sq.forwardDigest ?? []),
          backward_digest: bytesToHex(sq.backwardDigest ?? []),
          pda: pda.toBase58(),
          tx_signature: txSig,
          seeds: null as unknown,
          spine_owner: ((ep % 5) + 5) % 5 === 0
            ? "MARKETS"
            : ((ep % 5) + 5) % 5 === 1
              ? "CHAIN"
              : ((ep % 5) + 5) % 5 === 2
                ? "WORLD"
                : ((ep % 5) + 5) % 5 === 3
                  ? "HEAVENS"
                  : "ECHO+DRIFT",
        };
      } catch {
        return null;
      }
    })
  );

  const prophecies = entries.filter((e): e is ArchiveEntry => e !== null);

  // Phase 20B-final: enrich each entry with the captured seed record
  // from KV, if one exists. Older epochs whose seeds were never
  // captured stay at seeds: null. Single SCAN-style fetch per entry;
  // no rate-limit concerns at the request volumes we expect.
  await Promise.all(
    prophecies.map(async (p) => {
      try {
        const raw = await kvGet(`seeds:epoch:${p.epoch}`);
        if (raw) {
          try {
            p.seeds = JSON.parse(raw);
          } catch {
            /* leave null */
          }
        }
      } catch {
        /* leave null */
      }
    })
  );

  // ---- Layer 1 / Layer 2 syntheses --------------------------------------
  //
  // Pull the LayerIndex PDA. If it doesn't exist yet, the program revision
  // that introduced it isn't deployed and the layers are still inactive —
  // arrays stay empty and the layer index fields stay null.
  let currentLayer1Index: number | null = null;
  let currentLayer2Index: number | null = null;
  let layer1Out: LayerEntryOut[] = [];
  let layer2Out: LayerEntryOut[] = [];
  try {
    const liAcc: any = await (program.account as any).layerIndex.fetch(
      layerIndexPda()
    );
    const nextL1 = Number(liAcc.nextLayer1);
    const nextL2 = Number(liAcc.nextLayer2);
    currentLayer1Index = nextL1 - 1; // most-recent index that exists
    currentLayer2Index = nextL2 - 1;

    if (nextL1 > 0) {
      const start = Math.max(0, nextL1 - LAYER1_RETURN_LIMIT);
      const indices: number[] = [];
      for (let i = nextL1 - 1; i >= start; i--) indices.push(i);
      layer1Out = (
        await Promise.all(
          indices.map(async (idx): Promise<LayerEntryOut | null> => {
            try {
              const pda = layer1Pda(idx);
              const acc: any = await (
                program.account as any
              ).synthesisLayer1.fetch(pda);
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
                  /* swallow — synthesis storage may be 503/down */
                }
              }
              const lockedAt = Number(acc.lockedAt);
              const hashBytes: number[] | undefined = acc.synthesisHash;
              return {
                layer1_index: Number(acc.layer1Index),
                locked_at:
                  lockedAt > 0
                    ? new Date(lockedAt * 1000).toISOString()
                    : null,
                epoch_range: [
                  Number(acc.epochRangeStart),
                  Number(acc.epochRangeEnd),
                ],
                synthesis_text: text,
                synthesis_hash:
                  hashBytes && hashBytes.length === 32
                    ? bytesToHex(hashBytes)
                    : null,
                synthesis_uri: uri,
                pda: pda.toBase58(),
              };
            } catch {
              return null;
            }
          })
        )
      ).filter((e): e is LayerEntryOut => e !== null);
    }

    if (nextL2 > 0) {
      const start = Math.max(0, nextL2 - LAYER2_RETURN_LIMIT);
      const indices: number[] = [];
      for (let i = nextL2 - 1; i >= start; i--) indices.push(i);
      layer2Out = (
        await Promise.all(
          indices.map(async (idx): Promise<LayerEntryOut | null> => {
            try {
              const pda = layer2Pda(idx);
              const acc: any = await (
                program.account as any
              ).synthesisLayer2.fetch(pda);
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
              const hashBytes: number[] | undefined = acc.synthesisHash;
              return {
                layer2_index: Number(acc.layer2Index),
                locked_at:
                  lockedAt > 0
                    ? new Date(lockedAt * 1000).toISOString()
                    : null,
                layer1_range: [
                  Number(acc.layer1RangeStart),
                  Number(acc.layer1RangeEnd),
                ],
                synthesis_text: text,
                synthesis_hash:
                  hashBytes && hashBytes.length === 32
                    ? bytesToHex(hashBytes)
                    : null,
                synthesis_uri: uri,
                pda: pda.toBase58(),
              };
            } catch {
              return null;
            }
          })
        )
      ).filter((e): e is LayerEntryOut => e !== null);
    }
  } catch {
    /* LayerIndex PDA not present — layers inactive, arrays stay empty */
  }

  const body = {
    project: "SATOR LOOKING GLASS",
    program_id: PROGRAM_ID_STR,
    explorer: `https://explorer.solana.com/address/${PROGRAM_ID_STR}?cluster=devnet`,
    schema_version: 2,
    current_epoch: currentEpoch,
    // Layer indices populated below from on-chain LayerIndex PDA.
    current_layer1_index: null as number | null,
    current_layer2_index: null as number | null,
    fetched_at: new Date().toISOString(),
    pagination: {
      from: startEpoch,
      to: endEpoch,
      limit,
      next_from: endEpoch > 1 ? endEpoch - 1 : null,
    },
    notes: {
      seeds_field:
        "seeds at locking are not retained on-chain. only their keccak digests are stored (forward_digest, backward_digest). reserved for a future schema bump that persists raw seeds via Arweave.",
      synthesis_layers:
        "layer1_syntheses and layer2_meta_syntheses are reserved fields that populate once the respective layers begin firing. layer 1 fires every ~5 hours; layer 2 every ~5 days.",
    },
    prophecies,
    // Renamed alias for clarity in the v2 schema. atomic_prophecies
    // is the authoritative key going forward; `prophecies` stays as a
    // back-compat alias for v1 consumers.
    atomic_prophecies: prophecies,
    layer1_syntheses: layer1Out,
    layer2_meta_syntheses: layer2Out,
  };
  body.current_layer1_index = currentLayer1Index;
  body.current_layer2_index = currentLayer2Index;

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
