/**
 * scripts/launch-token.ts — TENET token launch via pump.fun bonding curve.
 *
 * Run with `pnpm tsx scripts/launch-token.ts ...`. See scripts/README.md
 * for usage. Keypairs are loaded from JSON files at runtime and never
 * logged, written to disk, or committed.
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import minimist from "minimist";
import BN from "bn.js";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  PumpSdk,
  OnlinePumpSdk,
  getBuyTokenAmountFromSolAmount,
} from "@pump-fun/pump-sdk";

type Network = "devnet" | "mainnet";

// Pump.fun tokens use 6 decimals (SPL Token 2022). The display divisor
// is for human-readable output only — on-chain arithmetic uses raw BN.
const TOKEN_DECIMALS = 6;

// Transaction-fee headroom for priority + sig fees. Conservative for a
// bundled create+ATA+buy at launch (typically <0.005 SOL even on busy
// mainnet; the extra cushion swallows any unexpected priority spike).
const TX_FEE_BUFFER_SOL = 0.02;

const USAGE = `Usage: pnpm tsx scripts/launch-token.ts \\
  --network <devnet|mainnet> \\
  --mint-keypair <path-to-mint-keypair.json> \\
  --creator-keypair <path-to-creator-keypair.json> \\
  --metadata-uri <https://...> \\
  --dev-buy-sol <amount> \\
  [--dry-run]

Env:
  SOLANA_MAINNET_RPC   optional paid RPC for mainnet; falls back to
                       https://api.mainnet-beta.solana.com with a warning.`;

function fail(msg: string, code = 1): never {
  console.error(`error: ${msg}`);
  process.exit(code);
}

function loadKeypairFile(path: string, label: string): Keypair {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    fail(`${label} keypair file not readable: ${path} (${err.code ?? err.message})`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail(`${label} keypair file is not valid JSON: ${path}`);
  }
  if (!Array.isArray(parsed) || parsed.some((n) => typeof n !== "number")) {
    fail(`${label} keypair file must be a JSON array of byte numbers (solana-keygen format): ${path}`);
  }
  try {
    return Keypair.fromSecretKey(Uint8Array.from(parsed as number[]));
  } catch (e) {
    fail(`${label} keypair could not be decoded: ${(e as Error).message}`);
  }
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const ans = await new Promise<string>((res) => rl.question(prompt, res));
    return ans.trim().toLowerCase() === "yes";
  } finally {
    rl.close();
  }
}

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: [
      "network",
      "mint-keypair",
      "creator-keypair",
      "metadata-uri",
      "dev-buy-sol",
    ],
    boolean: ["dry-run", "help"],
    alias: { h: "help" },
  });

  if (argv.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const network = argv.network as Network | undefined;
  const mintKeypairPath = argv["mint-keypair"] as string | undefined;
  const creatorKeypairPath = argv["creator-keypair"] as string | undefined;
  const metadataUri = argv["metadata-uri"] as string | undefined;
  const devBuySolRaw = argv["dev-buy-sol"] as string | undefined;
  const dryRun = Boolean(argv["dry-run"]);

  const missing: string[] = [];
  if (!network) missing.push("--network");
  if (!mintKeypairPath) missing.push("--mint-keypair");
  if (!creatorKeypairPath) missing.push("--creator-keypair");
  if (!metadataUri) missing.push("--metadata-uri");
  if (devBuySolRaw === undefined || devBuySolRaw === "") missing.push("--dev-buy-sol");
  if (missing.length > 0) {
    console.error(`error: missing required argument(s): ${missing.join(", ")}\n`);
    console.error(USAGE);
    process.exit(2);
  }
  if (network !== "devnet" && network !== "mainnet") {
    fail(`--network must be 'devnet' or 'mainnet', got '${network}'`, 2);
  }

  // Refuse to silently launch with no position. Reject zero, negatives,
  // and any non-numeric string. Allow fractional SOL (lamport-resolution
  // truncation happens downstream).
  const devBuySol = Number(devBuySolRaw);
  if (!Number.isFinite(devBuySol) || devBuySol <= 0) {
    fail(
      `--dev-buy-sol must be a positive number (got '${devBuySolRaw}'); ` +
        `refusing to launch with no dev position.`,
      2,
    );
  }
  const devBuyLamports = new BN(Math.floor(devBuySol * LAMPORTS_PER_SOL));

  // ── Resolve RPC ────────────────────────────────────────────────────────
  let rpcUrl: string;
  if (network === "devnet") {
    rpcUrl = "https://api.devnet.solana.com";
  } else {
    const envRpc = process.env.SOLANA_MAINNET_RPC;
    if (envRpc && envRpc.length > 0) {
      rpcUrl = envRpc;
    } else {
      rpcUrl = "https://api.mainnet-beta.solana.com";
      console.warn(
        "warning: SOLANA_MAINNET_RPC not set; using public mainnet RPC. " +
          "Rate limits may cause the transaction to fail. Use a paid RPC for production.",
      );
    }
  }
  const connection = new Connection(rpcUrl, "confirmed");

  // ── Load keypairs ──────────────────────────────────────────────────────
  const mintKeypair = loadKeypairFile(mintKeypairPath!, "mint");
  const creatorKeypair = loadKeypairFile(creatorKeypairPath!, "creator");

  const mintAddress = mintKeypair.publicKey.toBase58();
  const creatorAddress = creatorKeypair.publicKey.toBase58();

  // ── Verify vanity suffix ───────────────────────────────────────────────
  if (!mintAddress.toLowerCase().endsWith("tenet")) {
    fail(
      `mint public key does not end in "tenet" (case-insensitive): ${mintAddress}\n` +
        `       refusing to launch with the wrong vanity keypair.`,
    );
  }

  // ── Balance check ──────────────────────────────────────────────────────
  // Creator must cover: floor cost (dust for rent etc.) + the dev buy +
  // a tx fee buffer for the bundled create+ATA+buy.
  const balanceLamports = await connection.getBalance(creatorKeypair.publicKey);
  const balanceSol = balanceLamports / LAMPORTS_PER_SOL;
  const minBaseSol = network === "mainnet" ? 0.1 : 0.05;
  const requiredSol = minBaseSol + devBuySol + TX_FEE_BUFFER_SOL;
  if (balanceSol < requiredSol) {
    fail(
      `insufficient balance: creator has ${balanceSol.toFixed(6)} SOL on ${network}, ` +
        `need at least ${requiredSol.toFixed(6)} SOL ` +
        `(${minBaseSol} floor + ${devBuySol} dev-buy + ${TX_FEE_BUFFER_SOL} tx-fee buffer)`,
    );
  }

  // ── Metadata fetch + validate ──────────────────────────────────────────
  let metadata: Record<string, unknown>;
  try {
    const res = await fetch(metadataUri!);
    if (!res.ok) {
      fail(`metadata fetch failed: HTTP ${res.status} ${res.statusText} for ${metadataUri}`);
    }
    metadata = (await res.json()) as Record<string, unknown>;
  } catch (e) {
    fail(`metadata fetch error: ${(e as Error).message}`);
  }
  const required = ["name", "symbol", "description", "image"];
  const missingMeta = required.filter((k) => !(k in metadata) || metadata[k] == null);
  if (missingMeta.length > 0) {
    fail(`metadata is missing required fields: ${missingMeta.join(", ")}`);
  }

  // ── Fetch pump.fun chain state for the buy estimate ───────────────────
  // OnlinePumpSdk wraps the Connection and exposes the on-chain reads
  // needed to compute the expected-tokens-out for a fresh bonding-curve
  // buy. We fetch Global (always needed); FeeConfig is best-effort — the
  // amount computer accepts null and degrades to a slightly less-precise
  // estimate, which is acceptable because the on-chain transaction does
  // its own authoritative pricing.
  const onlineSdk = new OnlinePumpSdk(connection);
  const global = await onlineSdk.fetchGlobal();
  let feeConfig = null;
  try {
    feeConfig = await onlineSdk.fetchFeeConfig();
  } catch {
    // On networks where FeeConfig isn't deployed yet (e.g. some devnet
    // states), fall back to null. The estimate stays usable.
  }
  const expectedTokens = getBuyTokenAmountFromSolAmount({
    global,
    feeConfig,
    mintSupply: null, // fresh mint
    bondingCurve: null, // fresh curve — derived from Global
    amount: devBuyLamports,
  });
  const expectedTokensDisplay =
    Number(expectedTokens.toString()) / 10 ** TOKEN_DECIMALS;

  // ── Summary ────────────────────────────────────────────────────────────
  console.log("");
  console.log("────────────────────────────────────────────────────────────────");
  console.log(" PUMP.FUN TOKEN LAUNCH — TENET");
  console.log("────────────────────────────────────────────────────────────────");
  console.log(` Network          : ${network}`);
  console.log(` RPC              : ${rpcUrl}`);
  console.log(` Mint address     : ${mintAddress}`);
  console.log(` Creator          : ${creatorAddress}`);
  console.log(` Creator balance  : ${balanceSol.toFixed(6)} SOL`);
  console.log(` Metadata URI     : ${metadataUri}`);
  console.log(` Metadata name    : ${String(metadata.name)}`);
  console.log(` Metadata symbol  : ${String(metadata.symbol)}`);
  console.log(` Token name (ix)  : TENET`);
  console.log(` Token symbol (ix): TENET`);
  console.log(` Dev buy amount   : ${devBuySol} SOL`);
  console.log(
    ` Expected tokens  : ~${expectedTokensDisplay.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })} TENET (estimate; SDK enforces 1% slippage tolerance)`,
  );
  console.log(` Transaction      : create + ATA + buy (atomic, single tx)`);
  console.log(` Dry-run          : ${dryRun ? "yes" : "no"}`);
  console.log("────────────────────────────────────────────────────────────────");
  console.log("");

  if (dryRun) {
    console.log("dry-run complete, no transaction submitted");
    process.exit(0);
  }

  // ── Confirmation ───────────────────────────────────────────────────────
  const ok = await confirm(
    `Type "yes" to launch TENET and buy ${devBuySol} SOL atomically: `,
  );
  if (!ok) {
    console.error("aborted by user");
    process.exit(1);
  }

  // ── Build atomic create + ATA + buy ───────────────────────────────────
  // createV2AndBuyInstructions returns 3 instructions:
  //   1. createV2          — initializes mint + bonding curve
  //   2. createAssociatedTokenAccountIdempotent — creator's ATA
  //   3. buy               — spend devBuyLamports for expectedTokens out
  // All three are atomic in a single transaction. mayhemMode: false is
  // the standard bonding curve. Slippage is hardcoded to 1% inside the
  // SDK helper (which is what pump.fun's own launches use — at a fresh
  // mint there is no pre-existing liquidity for an MEV bot to sandwich).
  const pumpSdk = new PumpSdk();
  const ixs = await pumpSdk.createV2AndBuyInstructions({
    global,
    mint: mintKeypair.publicKey,
    name: "TENET",
    symbol: "TENET",
    uri: metadataUri!,
    creator: creatorKeypair.publicKey,
    user: creatorKeypair.publicKey,
    amount: expectedTokens,
    solAmount: devBuyLamports,
    mayhemMode: false,
  });

  // ── Submit ────────────────────────────────────────────────────────────
  const tx = new Transaction();
  for (const ix of ixs) tx.add(ix);
  let sig: string;
  try {
    sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [creatorKeypair, mintKeypair],
      { commitment: "confirmed" },
    );
  } catch (e) {
    const err = e as Error & { logs?: string[] };
    console.error("");
    console.error("transaction failed:");
    console.error(err.message);
    if (Array.isArray(err.logs) && err.logs.length > 0) {
      console.error("");
      console.error("logs:");
      for (const l of err.logs) console.error(`  ${l}`);
    }
    process.exit(1);
  }

  const solscanCluster = network === "mainnet" ? "" : "?cluster=devnet";
  const pumpUrl =
    network === "mainnet"
      ? `https://pump.fun/${mintAddress}`
      : `https://pump.fun/${mintAddress} (mainnet UI; devnet listing not guaranteed)`;

  console.log("");
  console.log("────────────────────────────────────────────────────────────────");
  console.log(" Token launched successfully");
  console.log("────────────────────────────────────────────────────────────────");
  console.log(` Signature : ${sig}`);
  console.log(` Solscan   : https://solscan.io/tx/${sig}${solscanCluster}`);
  console.log(` Pump.fun  : ${pumpUrl}`);
  console.log("────────────────────────────────────────────────────────────────");
}

main().catch((e) => {
  console.error("unexpected error:");
  console.error((e as Error).stack ?? String(e));
  process.exit(1);
});
