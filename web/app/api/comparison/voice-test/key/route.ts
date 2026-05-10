import { NextResponse } from "next/server";
import {
  buildProgram,
  lookingGlassPda,
} from "@/lib/oracle-helpers";
import {
  kvConfigured,
  kvErrorResponse,
  kvGet,
  kvKeys,
} from "@/lib/kv-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface KeyEntry {
  blind_id: string;
  epoch: number;
  configuration_id: string;
  read_model: string;
  merge_model: string;
}

interface CachedTest {
  test_id: string;
  generated_at: string;
  buckets: Record<string, number>;
  answer_key: KeyEntry[];
}

/**
 * Returns the answer key for the most recent voice-test cached by
 * /api/comparison/voice-test. The same test_id is served by both
 * routes; the test_id rolls over when a fresh haiku-bucket epoch
 * lands as the most-recent, so the key always corresponds to the
 * test currently shown by the public endpoint.
 *
 * If no test has been generated yet, returns 404 with an instruction
 * to fetch /api/comparison/voice-test first.
 */
export async function GET() {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  // Find the most recent cached test. We pick by lex-greatest test_id;
  // the id format ("voice-test-vsN" / "voice-test-pending-N") sorts
  // correctly because both buckets share fixed prefixes followed by a
  // numeric epoch, and the haiku-vs entries naturally sort after the
  // pending placeholders.
  const testKeys = await kvKeys("comparison:voice-test:*", 200);
  if (testKeys.length === 0) {
    return NextResponse.json(
      {
        error: "no voice-test cached yet",
        hint: "fetch /api/comparison/voice-test first to generate one",
      },
      { status: 404 }
    );
  }
  // Prefer haiku-vs entries over pending entries; sort numerically by
  // trailing epoch.
  const sorted = [...testKeys].sort((a, b) => {
    const aHaiku = a.includes("voice-test-vs");
    const bHaiku = b.includes("voice-test-vs");
    if (aHaiku !== bHaiku) return aHaiku ? -1 : 1;
    const an = Number(a.match(/\d+$/)?.[0] ?? 0);
    const bn = Number(b.match(/\d+$/)?.[0] ?? 0);
    return bn - an;
  });
  const cachedRaw = await kvGet(sorted[0]);
  if (!cachedRaw) {
    return NextResponse.json(
      { error: "cached test missing under expected key" },
      { status: 500 }
    );
  }
  let cached: CachedTest;
  try {
    cached = JSON.parse(cachedRaw) as CachedTest;
  } catch {
    return NextResponse.json(
      { error: "cached test value not valid JSON" },
      { status: 500 }
    );
  }
  return NextResponse.json(
    {
      test_id: cached.test_id,
      generated_at: cached.generated_at,
      buckets: cached.buckets,
      answer_key: cached.answer_key,
      note:
        "Each entry maps a blind_id from /api/comparison/voice-test to its true configuration. configuration_id 'all-opus' = 3 Opus calls per prophecy (current default); 'haiku-reads-opus-merge' = Haiku 4.5 for forward+backward reads, Opus 4.7 for the merge step. A judge that cannot reliably distinguish the two configurations indicates voice-equivalence.",
    },
    {
      headers: { "Cache-Control": "private, no-cache" },
    }
  );
}
