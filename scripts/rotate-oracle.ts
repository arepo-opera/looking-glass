#!/usr/bin/env tsx
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey(
  "EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu"
);
const NEW_ORACLE = new PublicKey(
  "3mUqAwghf6zmJsPydBvb1XnrdzhGb2KrGZSpJCeAGtLo"
);
const RPC = "https://api.devnet.solana.com";

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const secret = JSON.parse(
    fs.readFileSync(
      path.join(process.env.HOME!, ".config/solana/id.json"),
      "utf-8"
    )
  );
  const authority = Keypair.fromSecretKey(Uint8Array.from(secret));
  const provider = new AnchorProvider(conn, new Wallet(authority), {
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

  const lgBefore: any = await (program.account as any).lookingGlass.fetch(
    lgPda
  );
  console.log(
    `before: authority=${lgBefore.authority.toBase58()}, oracle_signer=${lgBefore.oracleSigner.toBase58()}`
  );
  console.log(`authority signer (this script): ${authority.publicKey.toBase58()}`);

  if (lgBefore.oracleSigner.equals(NEW_ORACLE)) {
    console.log("oracle_signer already matches; nothing to do.");
    return;
  }

  const sig = await (program.methods as any)
    .rotateOracleSigner(NEW_ORACLE)
    .accounts({
      lookingGlass: lgPda,
      authority: authority.publicKey,
    })
    .rpc();
  console.log(`rotate tx: ${sig}`);

  const lgAfter: any = await (program.account as any).lookingGlass.fetch(lgPda);
  console.log(
    `after:  authority=${lgAfter.authority.toBase58()}, oracle_signer=${lgAfter.oracleSigner.toBase58()}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
