import { NextRequest, NextResponse } from "next/server";
import { buildProgram, fetchLayer2Record } from "@/lib/oracle-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: { N: string } }
) {
  const idx = Number(params.N);
  if (!Number.isFinite(idx) || idx < 0) {
    return NextResponse.json(
      { error: "N must be a non-negative integer index" },
      { status: 400 }
    );
  }
  const { program } = buildProgram();
  const rec = await fetchLayer2Record(program, idx);
  if (!rec) {
    return NextResponse.json(
      { error: "not found", index: idx },
      { status: 404 }
    );
  }
  return NextResponse.json(rec, {
    headers: {
      "Cache-Control": "public, max-age=600, s-maxage=86400, immutable",
    },
  });
}
