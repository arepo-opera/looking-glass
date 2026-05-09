import { NextRequest, NextResponse } from "next/server";
import { buildProgram, fetchEpochSquareRecord } from "@/lib/oracle-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: { N: string } }
) {
  const epoch = Number(params.N);
  if (!Number.isFinite(epoch) || epoch <= 0) {
    return NextResponse.json(
      { error: "N must be a positive integer epoch number" },
      { status: 400 }
    );
  }
  const { connection, program } = buildProgram();
  const rec = await fetchEpochSquareRecord(program, connection, epoch);
  if (!rec) {
    return NextResponse.json(
      { error: "not found", epoch },
      { status: 404 }
    );
  }
  return NextResponse.json(rec, {
    headers: {
      // Atomic records are immutable once locked. Cache hard.
      "Cache-Control": "public, max-age=600, s-maxage=86400, immutable",
    },
  });
}
