import { NextResponse } from "next/server";
import { fetchLayer1Corpus, fetchLayer2Corpus } from "@/lib/corpus-helpers";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const ABSTRACT = new Set([
  "memory", "time", "voice", "silence", "presence", "absence", "shadow",
  "name", "history", "future", "self", "other", "world", "reality",
  "truth", "meaning", "intention", "purpose", "consciousness",
  "awareness", "structure", "pattern", "system", "form", "shape",
  "depth", "distance", "language", "interpretation", "reading",
]);

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
}

function abstractDensity(text: string): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  let abs = 0;
  for (const t of tokens) if (ABSTRACT.has(t)) abs += 1;
  return Number((abs / tokens.length).toFixed(4));
}

function firstSentence(text: string): string {
  const m = text.match(/[^.!?\n]+[.!?]/);
  return (m ? m[0] : text).trim().slice(0, 200);
}

function lastSentence(text: string): string {
  const cleaned = text.trim();
  const sentences = cleaned.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return "";
  return sentences[sentences.length - 1].slice(0, 200);
}

export async function GET() {
  const [layer1, layer2] = await Promise.all([
    fetchLayer1Corpus(),
    fetchLayer2Corpus(),
  ]);

  const layer1Timeline = layer1
    .sort((a, b) => a.index - b.index)
    .map((e) => ({
      index: e.index,
      locked_at: e.locked_at > 0 ? new Date(e.locked_at * 1000).toISOString() : null,
      length_chars: e.text.length,
      abstract_density: abstractDensity(e.text),
      first_line: firstSentence(e.text),
      last_line: lastSentence(e.text),
    }));

  const layer2Timeline = layer2
    .sort((a, b) => a.index - b.index)
    .map((e) => ({
      index: e.index,
      locked_at: e.locked_at > 0 ? new Date(e.locked_at * 1000).toISOString() : null,
      length_chars: e.text.length,
      abstract_density: abstractDensity(e.text),
      first_line: firstSentence(e.text),
      last_line: lastSentence(e.text),
    }));

  return NextResponse.json(
    {
      layer1_count: layer1.length,
      layer2_count: layer2.length,
      layer1_timeline: layer1Timeline,
      layer2_timeline: layer2Timeline,
      as_of: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } }
  );
}
