import { NextResponse } from "next/server";
import { fetchAtomicCorpus } from "@/lib/corpus-helpers";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const revalidate = 3600;

// Concrete vs abstract: a coarse heuristic. Words drawn from common
// concrete-noun lists vs abstract concepts. Not a substitute for a
// real wordlist (Brysbaert concreteness ratings) but stable and fast.
const CONCRETE = new Set([
  "door", "wall", "floor", "stone", "letter", "page", "book", "chair",
  "room", "house", "hand", "foot", "head", "face", "eye", "mouth",
  "water", "fire", "tree", "field", "road", "river", "city",
  "table", "window", "lamp", "key", "lock", "bell", "thread", "rope",
  "weight", "rain", "sun", "moon", "star", "earth", "ground", "sky",
  "candle", "ink", "paper", "page", "flag", "boat", "ship", "horse",
  "dog", "cat", "bird", "fish", "bone", "blood", "skin", "tooth",
  "salt", "bread", "wine", "milk", "metal", "wood", "glass", "iron",
  "machine", "engine", "phone", "wire", "screen",
]);
const ABSTRACT = new Set([
  "truth", "memory", "time", "thought", "idea", "feeling", "moment",
  "honor", "hope", "fear", "love", "loss", "pain", "joy", "peace",
  "freedom", "justice", "fate", "destiny", "soul", "spirit", "voice",
  "silence", "presence", "absence", "shadow", "name", "word", "story",
  "language", "form", "shape", "structure", "pattern", "system",
  "order", "chaos", "balance", "weight", "depth", "distance", "future",
  "past", "history", "knowledge", "understanding", "recognition",
  "reading", "interpretation", "meaning", "intention", "purpose",
  "consciousness", "awareness", "self", "other", "world",
  "reality", "truth", "lie", "secret",
]);

interface DriftPoint {
  epoch: number;
  avg_sentence_length: number;
  abstractness_score: number;
  pronoun_you_count: number;
  pronoun_we_count: number;
  pronoun_third_count: number;
  text_length: number;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
}

function avgSentenceLength(text: string): number {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return 0;
  const tokenCounts = sentences.map((s) => tokenize(s).length);
  return Number(
    (tokenCounts.reduce((a, b) => a + b, 0) / sentences.length).toFixed(2)
  );
}

function abstractnessScore(text: string): number {
  const tokens = tokenize(text);
  let abs = 0;
  let conc = 0;
  for (const t of tokens) {
    if (ABSTRACT.has(t)) abs += 1;
    if (CONCRETE.has(t)) conc += 1;
  }
  if (abs + conc === 0) return 0;
  return Number((abs / (abs + conc)).toFixed(3));
}

function pronounCounts(text: string): {
  you: number;
  we: number;
  third: number;
} {
  const tokens = tokenize(text);
  let you = 0;
  let we = 0;
  let third = 0;
  for (const t of tokens) {
    if (t === "you" || t === "your" || t === "yours") you += 1;
    else if (t === "we" || t === "our" || t === "ours" || t === "us") we += 1;
    else if (
      t === "it" ||
      t === "its" ||
      t === "they" ||
      t === "them" ||
      t === "their"
    )
      third += 1;
  }
  return { you, we, third };
}

export async function GET() {
  const corpus = await fetchAtomicCorpus();
  if (corpus.length === 0) {
    return NextResponse.json(
      { points: [], note: "corpus empty or unfetchable" },
      { status: 200 }
    );
  }
  const points: DriftPoint[] = corpus.map((entry) => {
    const pron = pronounCounts(entry.text);
    return {
      epoch: entry.epoch,
      avg_sentence_length: avgSentenceLength(entry.text),
      abstractness_score: abstractnessScore(entry.text),
      pronoun_you_count: pron.you,
      pronoun_we_count: pron.we,
      pronoun_third_count: pron.third,
      text_length: entry.text.length,
    };
  });

  // Compute rolling-window summaries (chunks of 25 epochs) so the
  // dashboard can render a compact line without choking on 700+ raw
  // points.
  const windowSize = 25;
  interface WindowSummary {
    window_start_epoch: number;
    window_end_epoch: number;
    n: number;
    avg_sentence_length: number;
    abstractness_score: number;
    pronoun_you_per_reading: number;
    pronoun_we_per_reading: number;
    pronoun_third_per_reading: number;
    avg_text_length: number;
  }
  const windows: WindowSummary[] = [];
  for (let i = 0; i < points.length; i += windowSize) {
    const w = points.slice(i, i + windowSize);
    if (w.length === 0) continue;
    const n = w.length;
    windows.push({
      window_start_epoch: w[0].epoch,
      window_end_epoch: w[n - 1].epoch,
      n,
      avg_sentence_length: Number(
        (w.reduce((s, p) => s + p.avg_sentence_length, 0) / n).toFixed(2)
      ),
      abstractness_score: Number(
        (w.reduce((s, p) => s + p.abstractness_score, 0) / n).toFixed(3)
      ),
      pronoun_you_per_reading: Number(
        (w.reduce((s, p) => s + p.pronoun_you_count, 0) / n).toFixed(2)
      ),
      pronoun_we_per_reading: Number(
        (w.reduce((s, p) => s + p.pronoun_we_count, 0) / n).toFixed(2)
      ),
      pronoun_third_per_reading: Number(
        (w.reduce((s, p) => s + p.pronoun_third_count, 0) / n).toFixed(2)
      ),
      avg_text_length: Math.round(
        w.reduce((s, p) => s + p.text_length, 0) / n
      ),
    });
  }

  return NextResponse.json(
    {
      corpus_size: corpus.length,
      window_size: windowSize,
      windows,
    },
    { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } }
  );
}
