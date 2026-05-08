#!/usr/bin/env tsx
/**
 * One-shot retroactive claim extraction for every atomic prophecy on
 * chain. Run AFTER reviewing the test-set extraction quality — the
 * full backfill costs ~$1 (≈500 prophecies × ~$0.002 each on Haiku).
 *
 * Idempotent: skips any epoch where claims:epoch:{N} already exists.
 * Safe to re-run after a partial failure.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-...  \
 *   KV_REST_API_URL=https://...upstash.io \
 *   KV_REST_API_TOKEN=... \
 *   tsx keeper/src/scripts/backfill-extraction.ts [start_epoch] [end_epoch]
 *
 * Defaults to start=1 end=current_epoch from the on-chain
 * LookingGlass account.
 */
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";
import {
  extractClaims,
  loadExtractorConfig,
  readClaims,
  storeClaims,
} from "../extraction";

const PROGRAM_ID = new PublicKey(
  "EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu"
);
const RPC = process.env.RPC_URL ?? "https://api.devnet.solana.com";

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

async function main() {
  const cfg = loadExtractorConfig();
  if (!cfg.apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  // Force enabled for the backfill regardless of EXTRACTION_ENABLED env.
  cfg.enabled = true;

  const startArg = Number(process.argv[2] ?? "");
  const endArg = Number(process.argv[3] ?? "");

  // Read-only wallet (we don't sign anything in the backfill — just
  // fetch accounts).
  const dummyKp = Keypair.generate();
  const conn = new Connection(RPC, "confirmed");
  const provider = new AnchorProvider(conn, new Wallet(dummyKp), {
    commitment: "confirmed",
  });
  const idl = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "..", "..", "..", "shared", "looking_glass.json"),
      "utf-8"
    )
  );
  const program = new Program(idl as any, provider);

  let endEpoch = Number.isFinite(endArg) && endArg > 0 ? endArg : 0;
  if (endEpoch === 0) {
    const lg: any = await (program.account as any).lookingGlass.fetch(
      lookingGlassPda()
    );
    endEpoch = Number(lg.epoch);
  }
  const startEpoch =
    Number.isFinite(startArg) && startArg > 0 ? startArg : 1;
  console.log(
    `[backfill] extracting claims for epoch ${startEpoch}..${endEpoch} (${endEpoch - startEpoch + 1} prophecies)`
  );

  let extracted = 0;
  let skipped = 0;
  let abstract = 0;
  let testable = 0;
  let failed = 0;

  for (let ep = startEpoch; ep <= endEpoch; ep++) {
    try {
      const existing = await readClaims("epoch", ep);
      if (existing) {
        skipped += 1;
        if (existing.is_abstract_only) abstract += 1;
        else testable += 1;
        continue;
      }
      const sq: any = await (program.account as any).epochSquare.fetch(
        epochSquarePda(ep)
      );
      const text = decodeUri(sq.prophecyUri ?? "");
      if (!text) {
        console.log(`[backfill] EP.${ep}: no prophecy text on chain, skipping`);
        continue;
      }
      const doc = await extractClaims(cfg, "epoch", ep, text);
      await storeClaims(doc);
      extracted += 1;
      if (doc.is_abstract_only) abstract += 1;
      else testable += 1;
      const tag = doc.is_abstract_only
        ? "abstract_only"
        : `${doc.extracted_claims.length} claim(s)`;
      console.log(`[backfill] EP.${ep}: ${tag}`);
    } catch (e: any) {
      failed += 1;
      console.error(`[backfill] EP.${ep} FAILED: ${e?.message ?? e}`);
    }
  }

  console.log(
    `\n[backfill] done — extracted=${extracted} skipped=${skipped} abstract_only=${abstract} testable=${testable} failed=${failed}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
