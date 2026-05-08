#!/usr/bin/env tsx
/**
 * One-shot: initialize the LayerIndex PDA after the program revision
 * deploys. Run once per devnet/mainnet.
 *
 *   AUTHORITY_KEYPAIR=$(cat ~/.config/solana/id.json | jq -c) \
 *   tsx scripts/init-layer-index.ts
 */
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey(
  "EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu"
);
const RPC = "https://api.devnet.solana.com";

function lookingGlassPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("looking_glass")],
    PROGRAM_ID
  )[0];
}
function layerIndexPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("layer_index")],
    PROGRAM_ID
  )[0];
}

async function main() {
  const secret = JSON.parse(
    fs.readFileSync(
      path.join(process.env.HOME!, ".config/solana/id.json"),
      "utf-8"
    )
  );
  const authority = Keypair.fromSecretKey(Uint8Array.from(secret));
  const connection = new Connection(RPC, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(authority), {
    commitment: "confirmed",
  });
  const idl = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "..", "shared", "looking_glass.json"),
      "utf-8"
    )
  );
  const program = new Program(idl as any, provider);

  const liPda = layerIndexPda();
  console.log(`LayerIndex PDA: ${liPda.toBase58()}`);
  try {
    const existing = await (program.account as any).layerIndex.fetch(liPda);
    console.log(
      `Already initialized: next_layer1=${existing.nextLayer1} next_layer2=${existing.nextLayer2}`
    );
    return;
  } catch {
    /* not initialized — proceed */
  }

  const sig = await (program.methods as any)
    .initLayerIndex()
    .accounts({
      lookingGlass: lookingGlassPda(),
      layerIndex: liPda,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`init_layer_index tx: ${sig}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
