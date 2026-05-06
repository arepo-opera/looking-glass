#!/usr/bin/env tsx
/**
 * One-shot backfill: walk back through recent EpochSquare PDAs and submit a
 * template prophecy for any that are missing one. Used after the
 * has_one(oracle_signer) misconfiguration was fixed via rotate-oracle, since
 * submissions for those epochs had been silently failing on chain.
 *
 * Uses the production oracle keypair (passed via env as base64) to satisfy
 * the has_one constraint on the LookingGlass.
 */
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { keccak_256 } from "js-sha3";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey(
  "EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu"
);
const RPC = "https://api.devnet.solana.com";
const MAX_BACKFILL = Number(process.env.MAX_BACKFILL ?? "6");

const SUBJECTS = [
  "a returning tide", "the unsigned letter", "the third moon",
  "the engine that forgot", "the listening room", "what was buried",
  "the recursion", "the unread hour", "the bell beneath the wheel",
  "an inheritance kept dim", "the angle of departure", "the first thing said",
  "the calendar's seam", "what the camera saw", "the unmoving lens",
  "the rope twice tied",
];
const VERBS = [
  "remembers", "is becoming", "has not yet met", "will not contain", "echoes",
  "watches", "concludes", "begins again as", "answers", "delays",
  "outlives", "arrives at", "renames", "permits", "precedes", "rewrites",
];
const OBJECTS = [
  "the shore that forgot it", "a name we do not have",
  "the room you have not entered", "what was already true",
  "the door that opens both ways", "an oath unbroken by silence",
  "the year before the year", "a sentence still being written",
  "its own rehearsal", "the witness on the stair",
  "every promise made twice", "the page underneath the page",
  "the weather of the prior life", "the small coin in the dark hand",
  "the road kept private", "what you almost said in 1991",
];

function templateProphecy(forward: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < 3; i++) {
    const s = SUBJECTS[forward[i * 3 + 0] % SUBJECTS.length];
    const v = VERBS[forward[i * 3 + 1] % VERBS.length];
    const o = OBJECTS[forward[i * 3 + 2] % OBJECTS.length];
    lines.push(`${s} ${v} ${o}.`);
  }
  return lines.join("\n");
}

function epochSquarePda(epoch: number): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(epoch));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("epoch"), buf],
    PROGRAM_ID
  )[0];
}

function loadKeypairFromBase64(b64: string): Keypair {
  const decoded = Buffer.from(b64, "base64").toString("utf-8");
  const arr = JSON.parse(decoded);
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

async function main() {
  const oracleB64 = process.env.ORACLE_KEYPAIR;
  if (!oracleB64) throw new Error("set ORACLE_KEYPAIR (base64) in env");
  const oracle = loadKeypairFromBase64(oracleB64);

  // Anchor needs a wallet for the provider; use the local default keypair as
  // the fee payer. (The keeper will continue paying fees in production; this
  // script is one-off and the host's wallet is convenient.)
  const payerSecret = JSON.parse(
    fs.readFileSync(
      path.join(process.env.HOME!, ".config/solana/id.json"),
      "utf-8"
    )
  );
  const payer = Keypair.fromSecretKey(Uint8Array.from(payerSecret));

  const conn = new Connection(RPC, "confirmed");
  const provider = new AnchorProvider(conn, new Wallet(payer), {
    commitment: "confirmed",
  });
  const idl = JSON.parse(
    fs.readFileSync(
      "/Users/michaelschreiber/sator-looking-glass/shared/looking_glass.json",
      "utf-8"
    )
  );
  const program = new Program(idl as any, provider);

  const [lgPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("looking_glass")],
    PROGRAM_ID
  );
  const lg: any = await (program.account as any).lookingGlass.fetch(lgPda);
  const headEpoch = Number(lg.epoch);
  console.log(
    `head epoch: ${headEpoch}, oracle on-chain: ${lg.oracleSigner.toBase58()}, oracle script: ${oracle.publicKey.toBase58()}`
  );
  if (!lg.oracleSigner.equals(oracle.publicKey)) {
    throw new Error("oracle keypair does not match the on-chain oracle_signer; rotate first");
  }

  let submitted = 0;
  for (let i = 0; i < MAX_BACKFILL && headEpoch - i >= 1; i++) {
    const ep = headEpoch - i;
    const pda = epochSquarePda(ep);
    let sq: any;
    try {
      sq = await (program.account as any).epochSquare.fetch(pda);
    } catch (e) {
      console.log(`epoch ${ep}: (not found)`);
      continue;
    }
    if (sq.prophecySubmitted) {
      console.log(`epoch ${ep}: already submitted, skipping`);
      continue;
    }
    const text = templateProphecy(Uint8Array.from(sq.forwardDigest));
    const uri = "inline:" + Buffer.from(text, "utf-8").toString("base64");
    if (Buffer.byteLength(uri, "utf-8") > 256) {
      // truncate to fit, prioritising the last sentence
      const sentences = text.split(/(?<=[.!?])\s+/);
      let attempt = sentences[sentences.length - 1] ?? text;
      while (
        Buffer.byteLength(
          "inline:" + Buffer.from(attempt, "utf-8").toString("base64"),
          "utf-8"
        ) > 256
      )
        attempt = attempt.slice(1);
      console.log(`epoch ${ep}: truncated to fit 256-byte URI`);
      const truncatedUri =
        "inline:" + Buffer.from(attempt, "utf-8").toString("base64");
      const hash = new Uint8Array(keccak_256.arrayBuffer(attempt));
      try {
        const sig = await (program.methods as any)
          .submitProphecy(new BN(ep), truncatedUri, Array.from(hash))
          .accounts({
            lookingGlass: lgPda,
            epochSquare: pda,
            oracleSigner: oracle.publicKey,
          })
          .signers([oracle])
          .rpc();
        console.log(`epoch ${ep}: submitted tx ${sig.slice(0, 16)}…`);
        submitted += 1;
      } catch (e: any) {
        console.log(`epoch ${ep}: submit failed: ${e?.message ?? e}`);
      }
    } else {
      const hash = new Uint8Array(keccak_256.arrayBuffer(text));
      try {
        const sig = await (program.methods as any)
          .submitProphecy(new BN(ep), uri, Array.from(hash))
          .accounts({
            lookingGlass: lgPda,
            epochSquare: pda,
            oracleSigner: oracle.publicKey,
          })
          .signers([oracle])
          .rpc();
        console.log(`epoch ${ep}: submitted tx ${sig.slice(0, 16)}…`);
        submitted += 1;
      } catch (e: any) {
        console.log(`epoch ${ep}: submit failed: ${e?.message ?? e}`);
      }
    }
  }
  console.log(`done — backfilled ${submitted} prophecies`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
