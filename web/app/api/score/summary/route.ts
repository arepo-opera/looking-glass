import { NextResponse } from "next/server";
import { kvConfigured, kvErrorResponse, kvGet } from "@/lib/kv-helpers";

export const revalidate = 300;

interface CategoryStats {
  count: number;
  resonance_rate: number;
}

interface SummaryDoc {
  total_prophecies: number;
  abstract_only_count: number;
  testable_count: number;
  scored_count: number;
  resonance_rate: number;
  by_category: Record<string, CategoryStats>;
  last_updated: number;
  methodology_version: string;
  // Phase 20A note — until the scoring pass runs, the resonance
  // numbers are zero across the board. testable_count and
  // abstract_only_count populate as soon as extraction runs.
  notes: string;
}

const EMPTY_SUMMARY: SummaryDoc = {
  total_prophecies: 0,
  abstract_only_count: 0,
  testable_count: 0,
  scored_count: 0,
  resonance_rate: 0,
  by_category: {},
  last_updated: 0,
  methodology_version: "1.0",
  notes:
    "Phase 20A: claim extraction is the only pipeline running. Scoring (Phase 20B) has not yet executed against any prophecy. resonance_rate, scored_count, and the by_category resonance_rate fields are all 0 by definition. testable_count and abstract_only_count populate as extraction runs against the archive.",
};

export async function GET() {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const raw = await kvGet("score:summary");
  if (raw === null) {
    return NextResponse.json(EMPTY_SUMMARY, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
    });
  }
  try {
    const doc = JSON.parse(raw);
    return NextResponse.json(doc, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
    });
  } catch {
    return NextResponse.json(EMPTY_SUMMARY, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
    });
  }
}
