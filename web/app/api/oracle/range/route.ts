import { NextRequest, NextResponse } from "next/server";
import { buildProgram, fetchEpochSquareRecord } from "@/lib/oracle-helpers";

export const maxDuration = 60;

const HARD_LIMIT = 100;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromRaw = Number(searchParams.get("from") ?? "");
  const toRaw = Number(searchParams.get("to") ?? "");
  if (
    !Number.isFinite(fromRaw) ||
    !Number.isFinite(toRaw) ||
    fromRaw <= 0 ||
    toRaw <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "from + to query params required, both positive integers (epoch numbers)",
      },
      { status: 400 }
    );
  }
  const from = Math.min(fromRaw, toRaw);
  const to = Math.max(fromRaw, toRaw);
  const span = to - from + 1;
  if (span > HARD_LIMIT) {
    return NextResponse.json(
      {
        error: `range too large; max ${HARD_LIMIT} epochs per call`,
        from,
        to,
        requested: span,
      },
      { status: 400 }
    );
  }
  const { connection, program } = buildProgram();
  const targets: number[] = [];
  for (let i = from; i <= to; i++) targets.push(i);
  const records = await Promise.all(
    targets.map((ep) => fetchEpochSquareRecord(program, connection, ep))
  );
  return NextResponse.json(
    {
      from,
      to,
      count: records.filter((r) => r !== null).length,
      records: records.filter((r): r is NonNullable<typeof r> => r !== null),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    }
  );
}
