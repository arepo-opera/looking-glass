import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

const IDL_PATH = path.resolve(__dirname, "..", "..", "shared", "looking_glass.json");

export interface ClientCtx {
  connection: Connection;
  keeper: Keypair;
  oracle: Keypair;
  program: Program;
  programId: PublicKey;
}

export function loadKeypair(p: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
  if (!Array.isArray(raw) || raw.length !== 64) {
    throw new Error(`keypair at ${p} is not a 64-byte JSON array`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

/**
 * Decode a base64-encoded keypair JSON (64-byte secret-key array). Used for
 * Railway / production where mounting a file is awkward but env vars are
 * easy. The base64 content is the result of `base64 -i keypair.json`.
 */
export function loadKeypairFromBase64(b64: string, label: string): Keypair {
  const decoded = Buffer.from(b64, "base64").toString("utf-8");
  let raw: unknown;
  try {
    raw = JSON.parse(decoded);
  } catch (e) {
    throw new Error(
      `${label}: failed to parse base64-decoded keypair as JSON (${(e as Error)?.message ?? e})`
    );
  }
  if (!Array.isArray(raw) || raw.length !== 64) {
    throw new Error(`${label}: decoded keypair is not a 64-byte JSON array`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

export function loadIdl(): any {
  if (!fs.existsSync(IDL_PATH)) {
    throw new Error(
      `IDL not found at ${IDL_PATH}. Run \`anchor build\` from the workspace root.`
    );
  }
  return JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));
}

export function buildClient(opts: {
  rpcUrl: string;
  wsUrl: string;
  keeper: Keypair;
  oracle: Keypair;
  programId: string;
}): ClientCtx {
  const connection = new Connection(opts.rpcUrl, {
    commitment: "confirmed",
    wsEndpoint: opts.wsUrl,
  });
  const wallet = new Wallet(opts.keeper);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const program = new Program(loadIdl(), provider);
  return {
    connection,
    keeper: opts.keeper,
    oracle: opts.oracle,
    program,
    programId: new PublicKey(opts.programId),
  };
}

export function lookingGlassPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("looking_glass")],
    programId
  )[0];
}

export function epochSquarePda(
  programId: PublicKey,
  epoch: number | bigint
): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(epoch));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("epoch"), buf],
    programId
  )[0];
}

export function layerIndexPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("layer_index")],
    programId
  )[0];
}

export function layer1Pda(
  programId: PublicKey,
  layer1Index: number | bigint
): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(layer1Index));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("layer1"), buf],
    programId
  )[0];
}

export function layer2Pda(
  programId: PublicKey,
  layer2Index: number | bigint
): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(layer2Index));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("layer2"), buf],
    programId
  )[0];
}
