#!/usr/bin/env tsx
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Default to devnet so the script "just works" against the deployed program
// after Phase 9. Override with RPC_URL=http://127.0.0.1:8899 for localnet.
const RPC_URL =
  process.env.RPC_URL ??
  process.env.LOOKING_GLASS_RPC ??
  "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID ?? "EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu"
);
const MIN_TICK_INTERVAL = 180;
const SQUARE_SIZE = 5;
const RULE_LINE = "═".repeat(44);
const SEED_NAMES = ["MARKETS", "CHAIN", "WORLD", "HEAVENS", "ECHO"];
const IDL_PATH = path.resolve(__dirname, "..", "shared", "looking_glass.json");

function lookingGlassPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("looking_glass")],
    PROGRAM_ID
  )[0];
}

function epochSquarePda(epoch: number | bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(epoch));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("epoch"), buf],
    PROGRAM_ID
  )[0];
}

function loadIdl(): any {
  if (!fs.existsSync(IDL_PATH)) {
    throw new Error(
      `IDL not found at ${IDL_PATH}. Run \`anchor build\` first.`
    );
  }
  return JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));
}

async function loadOrCreateAuthority(
  connection: Connection
): Promise<Keypair> {
  const idJsonPath = path.join(
    os.homedir(),
    ".config",
    "solana",
    "id.json"
  );
  let kp: Keypair;
  if (fs.existsSync(idJsonPath)) {
    const secret = JSON.parse(fs.readFileSync(idJsonPath, "utf-8"));
    kp = Keypair.fromSecretKey(Uint8Array.from(secret));
    console.log(
      `authority loaded from ${idJsonPath}: ${kp.publicKey.toBase58()}`
    );
  } else {
    kp = Keypair.generate();
    console.log(`authority generated: ${kp.publicKey.toBase58()}`);
  }
  const balance = await connection.getBalance(kp.publicKey);
  if (balance < 2 * LAMPORTS_PER_SOL) {
    console.log("airdropping 5 SOL to authority...");
    const sig = await connection.requestAirdrop(
      kp.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(sig, "confirmed");
  }
  return kp;
}

function shortHexHeadTail(
  bytes: Uint8Array | number[],
  head = 4,
  tail = 4
): string {
  const buf = Buffer.from(bytes as any);
  const hex = buf.toString("hex");
  if (head + tail >= buf.length) return hex;
  return `${hex.slice(0, head * 2)}...${hex.slice(-tail * 2)}`;
}

function shortHexHead(bytes: Uint8Array | number[], head = 4): string {
  const hex = Buffer.from(bytes as any).toString("hex");
  return `${hex.slice(0, head * 2)}...`;
}

function formatTimestampUtc(unixSeconds: bigint | number): string {
  const ms = Number(unixSeconds) * 1000;
  const d = new Date(ms);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ` +
    `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`
  );
}

function pad(n: number | bigint, width: number): string {
  return String(n).padStart(width, "0");
}

interface SymmetryReport {
  ok: boolean;
  failure?: string;
}

function symmetryCheck(grid: number[][]): SymmetryReport {
  const n = SQUARE_SIZE;
  const last = n - 1;
  const fail = (msg: string): SymmetryReport => ({ ok: false, failure: msg });

  for (let c = 0; c < n; c++) {
    if (grid[0][c] !== grid[last][last - c])
      return fail(`row 0/4 mirror at c=${c}`);
  }
  for (let c = 0; c < n; c++) {
    if (grid[1][c] !== grid[last - 1][last - c])
      return fail(`row 1/3 mirror at c=${c}`);
  }
  for (let c = 0; c < n; c++) {
    if (grid[2][c] !== grid[2][last - c])
      return fail(`row 2 palindrome at c=${c}`);
  }
  for (let r = 0; r < n; r++) {
    if (grid[r][0] !== grid[last - r][last])
      return fail(`col 0/4 mirror at r=${r}`);
  }
  for (let r = 0; r < n; r++) {
    if (grid[r][1] !== grid[last - r][last - 1])
      return fail(`col 1/3 mirror at r=${r}`);
  }
  for (let r = 0; r < n; r++) {
    if (grid[r][2] !== grid[last - r][2])
      return fail(`col 2 palindrome at r=${r}`);
  }
  for (let i = 0; i < n; i++) {
    if (grid[i][i] !== grid[last - i][last - i])
      return fail(`main diag palindrome at i=${i}`);
  }
  for (let i = 0; i < n; i++) {
    if (grid[i][last - i] !== grid[last - i][i])
      return fail(`anti-diag palindrome at i=${i}`);
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] !== grid[last - r][last - c])
        return fail(`180 rotation at (${r},${c})`);
    }
  }
  return { ok: true };
}

function printSquare(sq: any, grid: number[][]): void {
  console.log("");
  console.log(RULE_LINE);
  console.log(
    `EPOCH ${pad(Number(sq.epoch), 4)}    LOCKED ${formatTimestampUtc(
      BigInt(sq.lockedAt)
    )}`
  );
  console.log(`NONCE ${pad(Number(sq.nonce), 8)}`);
  console.log(RULE_LINE);
  console.log("");
  for (const row of grid) {
    console.log("  " + row.map((b) => String.fromCharCode(b)).join("   "));
  }
  console.log("");
  console.log(RULE_LINE);
  console.log(`FORWARD  : ${shortHexHeadTail(sq.forwardDigest)}`);
  console.log(`BACKWARD : ${shortHexHeadTail(sq.backwardDigest)}`);
  console.log("SEEDS:");
  for (let i = 0; i < SEED_NAMES.length; i++) {
    console.log(
      `  ${SEED_NAMES[i].padEnd(7)}  ${shortHexHead(sq.seeds[i])}`
    );
  }
  console.log(RULE_LINE);
  console.log("");
}

async function main(): Promise<void> {
  const connection = new Connection(RPC_URL, "confirmed");

  try {
    await connection.getVersion();
  } catch (_e) {
    console.error(
      `cannot reach validator at ${RPC_URL}. Start one with:\n  solana-test-validator\nor\n  anchor localnet`
    );
    process.exit(1);
  }

  const programAccount = await connection.getAccountInfo(PROGRAM_ID);
  if (!programAccount) {
    console.error(
      `program ${PROGRAM_ID.toBase58()} is not deployed. Run:\n  anchor deploy`
    );
    process.exit(1);
  }

  const authority = await loadOrCreateAuthority(connection);
  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const program = new Program(loadIdl(), provider);

  const lgPda = lookingGlassPda();
  const lgInfo = await connection.getAccountInfo(lgPda);

  let currentEpoch: number;
  if (!lgInfo) {
    console.log("LookingGlass PDA not found — calling initialize...");
    await program.methods
      .initialize(authority.publicKey)
      .accounts({
        lookingGlass: lgPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    console.log("initialized.");
    currentEpoch = 0;
  } else {
    const lg: any = await program.account.lookingGlass.fetch(lgPda);
    currentEpoch = Number(lg.epoch);
    const lastTickTs = Number(lg.lastTickTs);
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - lastTickTs;
    if (lastTickTs > 0 && elapsed < MIN_TICK_INTERVAL) {
      const remaining = MIN_TICK_INTERVAL - elapsed;
      console.log(
        `LookingGlass already at epoch ${currentEpoch}; last tick was ${elapsed}s ago.`
      );
      console.log(
        `wait ${remaining} more seconds before the next tick will be accepted.`
      );
      process.exit(0);
    }
    console.log(
      `LookingGlass at epoch ${currentEpoch}; ticking to epoch ${currentEpoch + 1}...`
    );
  }

  const nextEpoch = currentEpoch + 1;
  const epochPda = epochSquarePda(nextEpoch);

  await program.methods
    .tick()
    .accounts({
      lookingGlass: lgPda,
      epochSquare: epochPda,
      payer: authority.publicKey,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  console.log(`tick succeeded; epoch ${nextEpoch} locked.`);

  const sq: any = await program.account.epochSquare.fetch(epochPda);
  const grid: number[][] = (sq.glyphs as number[][]).map((row) =>
    Array.from(row)
  );

  printSquare(sq, grid);

  const result = symmetryCheck(grid);
  if (result.ok) {
    console.log("SYMMETRY: OK");
  } else {
    console.log(`SYMMETRY: FAIL (${result.failure})`);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
