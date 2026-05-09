import { NextRequest, NextResponse } from "next/server";
import {
  kvConfigured,
  kvErrorResponse,
  kvGet,
  kvKeys,
} from "@/lib/kv-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function GET(req: NextRequest) {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") ?? "50") || 50, 1),
    200
  );
  const indexKeys = await kvKeys("annotation:recent:*", 500);
  // Keys sort lexicographically; the timestamp prefix means
  // alphabetic = chronological. Sort descending and take the limit.
  indexKeys.sort();
  indexKeys.reverse();
  const top = indexKeys.slice(0, limit);
  const ids = await Promise.all(top.map((k) => kvGet(k)));
  const docs = await Promise.all(
    ids
      .filter((v): v is string => typeof v === "string")
      .map(async (annId) => {
        const raw = await kvGet(`annotation:${annId}`);
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
  );
  const out = docs.filter((d): d is NonNullable<typeof d> => d !== null);
  return NextResponse.json(
    { count: out.length, annotations: out },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } }
  );
}
