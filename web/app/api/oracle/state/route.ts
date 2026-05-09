import { NextResponse } from "next/server";
import {
  buildProgram,
  fetchEpochSquareRecord,
  fetchLayer1Record,
  fetchLayer2Record,
  fetchSeedsForEpoch,
  layerIndexPda,
  lookingGlassPda,
} from "@/lib/oracle-helpers";

export const revalidate = 30;

export async function GET() {
  const { connection, program } = buildProgram();
  let lg: any;
  try {
    lg = await (program.account as any).lookingGlass.fetch(lookingGlassPda());
  } catch (e: any) {
    return NextResponse.json(
      { error: "could not fetch LookingGlass", detail: String(e?.message ?? e) },
      { status: 503 }
    );
  }
  const currentEpoch = Number(lg.epoch);
  const lastTickTs = Number(lg.lastTickTs);
  const nextTickAtTs = lastTickTs > 0 ? lastTickTs + 180 : null;

  // Last atomic prophecy (the most recently locked epoch).
  const lastEpochRecord =
    currentEpoch > 0
      ? await fetchEpochSquareRecord(program, connection, currentEpoch)
      : null;

  // Layer indices, if LayerIndex PDA initialized.
  let lastLayer1: any = null;
  let lastLayer2: any = null;
  try {
    const li: any = await (program.account as any).layerIndex.fetch(
      layerIndexPda()
    );
    const nextL1 = Number(li.nextLayer1);
    const nextL2 = Number(li.nextLayer2);
    if (nextL1 > 0) lastLayer1 = await fetchLayer1Record(program, nextL1 - 1);
    if (nextL2 > 0) lastLayer2 = await fetchLayer2Record(program, nextL2 - 1);
  } catch {
    /* LayerIndex not initialized — leave nulls */
  }

  // Current seeds payload (most recent epoch's captured seeds).
  const currentSeeds =
    currentEpoch > 0 ? await fetchSeedsForEpoch(currentEpoch) : null;

  return NextResponse.json(
    {
      current_epoch: currentEpoch,
      last_tick_at_ts: lastTickTs > 0 ? lastTickTs : null,
      next_tick_at_ts: nextTickAtTs,
      last_prophecy: lastEpochRecord,
      last_layer1: lastLayer1,
      last_layer2: lastLayer2,
      current_seeds: currentSeeds,
    },
    {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
    }
  );
}
