import { NextResponse } from "next/server";
import { fetchAtomicCorpus } from "@/lib/corpus-helpers";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "by", "for",
  "with", "is", "are", "was", "were", "be", "been", "being", "as", "it",
  "its", "this", "that", "these", "those", "but", "not", "no", "so", "if",
  "from", "you", "your", "yours", "i", "we", "our", "us", "they", "them",
  "their", "he", "she", "his", "her", "what", "which", "who", "whom",
  "do", "does", "did", "have", "has", "had", "will", "would", "could",
  "can", "may", "might", "must", "should", "shall", "than", "then",
  "there", "here", "now", "when", "where", "while", "any", "all",
  "some", "out", "up", "down", "off", "into", "onto", "over", "under",
  "again", "still", "also", "just", "even", "ever", "very", "more",
  "most", "much", "such", "own", "same", "other", "another",
]);

interface MotifEntry {
  phrase: string;
  count: number;
  first_epoch: number;
  last_epoch: number;
  density_per_100: number;
  // 25-bucket density across the corpus timeline (1 = present in
  // bucket, 0 = absent). Lets the UI render an inline sparkline.
  timeline_buckets: number[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z' ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export async function GET() {
  const corpus = await fetchAtomicCorpus();
  if (corpus.length === 0) {
    return NextResponse.json(
      { motifs: [], note: "corpus empty or unfetchable" },
      { status: 200 }
    );
  }

  // Build n-gram frequency tables for n=2..5. For each n-gram, track
  // first/last appearance epoch + total count + a 25-bucket presence
  // mask across the full corpus span.
  const minEpoch = corpus[0].epoch;
  const maxEpoch = corpus[corpus.length - 1].epoch;
  const span = Math.max(1, maxEpoch - minEpoch + 1);
  const numBuckets = 25;
  const bucketWidth = span / numBuckets;

  const ngramFirst = new Map<string, number>();
  const ngramLast = new Map<string, number>();
  const ngramCount = new Map<string, number>();
  const ngramBuckets = new Map<string, Set<number>>();

  for (const entry of corpus) {
    const tokens = tokenize(entry.text);
    const seenInThisEpoch = new Set<string>();
    const bucket = Math.min(
      numBuckets - 1,
      Math.floor((entry.epoch - minEpoch) / bucketWidth)
    );
    for (let n = 2; n <= 5; n++) {
      for (let i = 0; i + n <= tokens.length; i++) {
        const phrase = tokens.slice(i, i + n).join(" ");
        seenInThisEpoch.add(phrase);
        ngramCount.set(phrase, (ngramCount.get(phrase) ?? 0) + 1);
        if (!ngramFirst.has(phrase)) ngramFirst.set(phrase, entry.epoch);
        ngramLast.set(phrase, entry.epoch);
        if (!ngramBuckets.has(phrase)) ngramBuckets.set(phrase, new Set());
        ngramBuckets.get(phrase)!.add(bucket);
      }
    }
  }

  // Score: prefer phrases that appear across many epochs (broad
  // recurrence), not phrases that appear once and concentrate. Use
  // (epoch_span_covered * count) as a rough distinctiveness score,
  // then prefer longer phrases as tiebreaker.
  type Entry = MotifEntry & { score: number };
  const entries: Entry[] = [];
  for (const [phrase, count] of ngramCount) {
    if (count < 3) continue;
    const buckets = ngramBuckets.get(phrase)!;
    const epochSpan =
      (ngramLast.get(phrase) ?? 0) - (ngramFirst.get(phrase) ?? 0);
    const coverage = buckets.size; // 1..25
    const wordCount = phrase.split(" ").length;
    const score = count * coverage * Math.sqrt(wordCount);
    const timelineBuckets = Array.from({ length: numBuckets }, (_, i) =>
      buckets.has(i) ? 1 : 0
    );
    entries.push({
      phrase,
      count,
      first_epoch: ngramFirst.get(phrase) ?? 0,
      last_epoch: ngramLast.get(phrase) ?? 0,
      density_per_100: Number(((count / corpus.length) * 100).toFixed(2)),
      timeline_buckets: timelineBuckets,
      score,
    });
  }
  entries.sort((a, b) => b.score - a.score);
  const top = entries.slice(0, 25).map(({ score: _s, ...rest }) => rest);

  return NextResponse.json(
    {
      corpus_size: corpus.length,
      epoch_range: [minEpoch, maxEpoch],
      timeline_bucket_count: numBuckets,
      motifs: top,
    },
    { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } }
  );
}
