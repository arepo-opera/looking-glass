import { BN } from "@coral-xyz/anchor";
import {
  ClientCtx,
  lookingGlassPda,
  epochSquarePda,
} from "./anchor-client";

export async function submitProphecy(
  ctx: ClientCtx,
  epoch: number,
  uri: string,
  hash: Uint8Array
): Promise<string> {
  if (uri.length > 256) {
    throw new Error(`prophecy URI too long: ${uri.length} bytes (max 256)`);
  }
  if (hash.length !== 32) {
    throw new Error(`prophecy hash must be 32 bytes, got ${hash.length}`);
  }
  const lgPda = lookingGlassPda(ctx.programId);
  const epPda = epochSquarePda(ctx.programId, epoch);

  return await ctx.program.methods
    .submitProphecy(new BN(epoch), uri, Array.from(hash))
    .accounts({
      lookingGlass: lgPda,
      epochSquare: epPda,
      oracleSigner: ctx.oracle.publicKey,
    } as any)
    .signers([ctx.oracle])
    .rpc();
}
