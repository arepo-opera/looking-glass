import { SystemProgram } from "@solana/web3.js";
import {
  ClientCtx,
  lookingGlassPda,
  epochSquarePda,
} from "./anchor-client";

export async function fireTick(
  ctx: ClientCtx,
  currentEpoch: number
): Promise<{ signature: string; nextEpoch: number }> {
  const lgPda = lookingGlassPda(ctx.programId);
  const nextEpoch = currentEpoch + 1;
  const epPda = epochSquarePda(ctx.programId, nextEpoch);

  const signature = await ctx.program.methods
    .tick()
    .accounts({
      lookingGlass: lgPda,
      epochSquare: epPda,
      payer: ctx.keeper.publicKey,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  return { signature, nextEpoch };
}
