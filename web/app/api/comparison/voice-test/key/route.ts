import { NextResponse } from "next/server";
import { buildTest } from "@/lib/voice-comparison";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Returns the answer key for the test that /api/comparison/voice-test
 * is currently serving. Uses the same buildTest() logic so the test_id
 * is guaranteed to match — no scanning, no risk of picking up a stale
 * cache entry from a different keyspace.
 */
export async function GET() {
  const built = await buildTest();
  if ("error" in built) {
    return NextResponse.json(built, { status: 503 });
  }
  return NextResponse.json(
    {
      test_id: built.test_id,
      generated_at: built.generated_at,
      buckets: built.buckets,
      answer_key: built.answer_key,
      note:
        "Each entry maps a blind_id from /api/comparison/voice-test to its true configuration. configuration_id 'all-opus' = 3 Opus calls per prophecy (current default); 'haiku-reads-opus-merge' = Haiku 4.5 for forward+backward reads, Opus 4.7 for the merge step. A judge that cannot reliably distinguish the two configurations indicates voice-equivalence.",
    },
    {
      headers: { "Cache-Control": "private, no-cache" },
    }
  );
}
