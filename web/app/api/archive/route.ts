import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "../../../../shared/looking_glass.json";

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
  // Seeds at locking are not retained on-chain — only the keccak digests
  // that derive from them. Reserved here for a future schema bump.
  seeds: null;
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
          seeds: null,
        };
      } catch {
        return null;
      }
    })
  );

  const prophecies = entries.filter((e): e is ArchiveEntry => e !== null);

  const body = {
    project: "SATOR LOOKING GLASS",
    program_id: PROGRAM_ID_STR,
    explorer: `https://explorer.solana.com/address/${PROGRAM_ID_STR}?cluster=devnet`,
    schema_version: 2,
    current_epoch: currentEpoch,
    // Layer indices land here once Layer 1 / Layer 2 begin firing.
    // Both layers require the program revision that adds
    // SynthesisLayer1 / SynthesisLayer2 PDAs + submit_layer1 /
    // submit_layer2 instructions; until that lands these stay null
    // and the synthesis arrays below stay empty. Schema_version 2 is
    // bumped now so clients can integrate against the stable shape
    // before the first synthesis fires.
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
    layer1_syntheses: [] as unknown[],
    layer2_meta_syntheses: [] as unknown[],
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
