import { NextResponse } from "next/server";
import { kvConfigured, kvErrorResponse, kvGet, kvKeys } from "@/lib/kv-helpers";

export const revalidate = 60;

export async function GET() {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const keys = await kvKeys("agent:public:*", 1000);
  const records = await Promise.all(
    keys.map(async (k) => {
      const raw = await kvGet(k);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })
  );
  const agents = records
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => (b.registered_at_ts ?? 0) - (a.registered_at_ts ?? 0));
  return NextResponse.json(
    {
      total: agents.length,
      agents,
    },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
  );
}
