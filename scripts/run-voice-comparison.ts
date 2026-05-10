/* eslint-disable no-console */
//
// Voice-comparison harness for Phase A (Haiku-reads-Opus-merge vs all-Opus).
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... pnpm tsx scripts/run-voice-comparison.ts
//
// What it does:
//   1. Fetches the blind comparison set from /api/comparison/voice-test
//   2. Asks claude-opus-4-7 to play judge — without telling it which
//      configuration produced which prophecy, it must (a) flag any
//      voice inconsistencies and (b) guess the configuration of each
//      blind_id with a confidence score.
//   3. Fetches the answer key from /api/comparison/voice-test/key
//   4. Scores the judge against the truth and prints a report:
//        - per-prophecy guess vs truth
//        - bucket-level accuracy (chance is ~50%)
//        - the judge's qualitative voice notes verbatim
//
// Decision rule (encoded for the human to apply):
//   accuracy ≤ 60%: configurations are voice-equivalent → ship cheap config
//   accuracy 60–80%: judgment call, document the differences
//   accuracy ≥ 80%: configurations are distinguishable → keep all-opus
//
// Exit code: 0 always (this is reporting, not gating).

import Anthropic from "@anthropic-ai/sdk";

const BASE =
  process.env.COMPARISON_BASE_URL ??
  "https://sator-looking-glass-web.vercel.app";
const JUDGE_MODEL = "claude-opus-4-7";

interface BlindEntry {
  blind_id: string;
  epoch: number;
  prophecy_text: string;
  seeds_summary: string;
}

interface PublicTest {
  test_id: string;
  generated_at: string;
  buckets: Record<string, number>;
  shuffled_prophecies: BlindEntry[];
  instructions: string;
}

interface KeyEntry {
  blind_id: string;
  epoch: number;
  configuration_id: string;
  read_model: string;
  merge_model: string;
}

interface KeyResponse {
  test_id: string;
  generated_at: string;
  buckets: Record<string, number>;
  answer_key: KeyEntry[];
}

interface JudgeGuess {
  blind_id: string;
  guessed_configuration: string;
  confidence: number; // 0-100
  reason: string;
}

interface JudgeResult {
  voice_notes: string;
  guesses: JudgeGuess[];
}

const JUDGE_SYSTEM = `You are a careful literary critic with experience evaluating consistent oracular voice across long corpora. You have been given prophecies from a single instrument that may have produced them under two different language-model configurations. Your job is to detect — without being told which is which — whether the configurations diverge in voice.`;

function buildJudgePrompt(test: PublicTest): string {
  const list = test.shuffled_prophecies
    .map(
      (p) =>
        `[${p.blind_id}]  epoch ${p.epoch}  seeds: ${p.seeds_summary}\n${p.prophecy_text}`
    )
    .join("\n\n");
  return `Below are ${test.shuffled_prophecies.length} prophecies from one oracle. They were produced under exactly two model configurations, called A and B. The mapping from blind_id to configuration is hidden from you.

For each prophecy, the seeds_summary is a small subset of the input data that produced it (so you can account for the fact that different inputs naturally produce different outputs).

Your task has two parts:

1. VOICE NOTES (free-form prose, ~200 words): describe what you observe about the corpus's voice as a whole. Identify any prophecies that feel notably different in voice, register, syntactic rhythm, abstractness, sentence-length, or imagery from the rest. Quote specific blind_ids when you do.

2. GUESSES (structured JSON): for each blind_id, guess which configuration produced it (output literally "A" or "B"), give a confidence score 0-100, and one short sentence of reasoning. The two groups are exactly equal in size unless the buckets in the test header are uneven (in which case match those bucket sizes).

Output format — return exactly one JSON document with this shape, and nothing else:

{
  "voice_notes": "string of prose",
  "guesses": [
    {"blind_id": "p01", "guessed_configuration": "A", "confidence": 72, "reason": "string"},
    ...
  ]
}

Header for this test:
  test_id:        ${test.test_id}
  prophecy_count: ${test.shuffled_prophecies.length}
  buckets:        ${JSON.stringify(test.buckets)}

The prophecies:

${list}

Now produce the JSON document.`;
}

function extractJsonBlock(s: string): string {
  // Tolerate Claude wrapping JSON in ```json fences.
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find the first '{' and last '}' as a fallback.
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i === -1 || j === -1 || j < i) {
    throw new Error("no JSON object found in judge response");
  }
  return s.slice(i, j + 1);
}

function bucketLabels(buckets: Record<string, number>): {
  configToLetter: Map<string, "A" | "B">;
  letterToConfig: Record<"A" | "B", string>;
} {
  // Assign A/B by alphabetical order of configuration_id so the
  // judge's output is deterministically interpretable. The judge does
  // NOT see this mapping — it has to discover the partition.
  const sorted = Object.keys(buckets).sort();
  const a = sorted[0] ?? "all-opus";
  const b = sorted[1] ?? "haiku-reads-opus-merge";
  const configToLetter = new Map<string, "A" | "B">();
  configToLetter.set(a, "A");
  configToLetter.set(b, "B");
  return { configToLetter, letterToConfig: { A: a, B: b } };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is required");
    process.exit(1);
  }

  console.log(`fetching ${BASE}/api/comparison/voice-test ...`);
  const testRes = await fetch(`${BASE}/api/comparison/voice-test`);
  if (!testRes.ok) {
    console.error(`voice-test fetch failed: ${testRes.status}`);
    process.exit(1);
  }
  const test = (await testRes.json()) as PublicTest;
  console.log(
    `test_id=${test.test_id} prophecies=${test.shuffled_prophecies.length} buckets=${JSON.stringify(test.buckets)}`
  );
  if (test.shuffled_prophecies.length === 0) {
    console.error(
      "no prophecies in test — has the keeper produced any seeds with model config yet?"
    );
    process.exit(1);
  }
  const counts = Object.values(test.buckets);
  if (counts.length < 2 || counts.some((c) => c < 5)) {
    console.warn(
      `WARNING: a bucket has fewer than 5 prophecies. Comparison will be weak. Run again once both buckets reach 10.`
    );
  }

  const client = new Anthropic();
  console.log(`asking ${JUDGE_MODEL} to judge ...`);
  const resp = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 4000,
    system: JUDGE_SYSTEM,
    messages: [{ role: "user", content: buildJudgePrompt(test) }],
  });
  const raw = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  let parsed: JudgeResult;
  try {
    parsed = JSON.parse(extractJsonBlock(raw)) as JudgeResult;
  } catch (e) {
    console.error("could not parse judge response as JSON:", e);
    console.error("---raw response---");
    console.error(raw);
    process.exit(1);
  }

  console.log(`fetching ${BASE}/api/comparison/voice-test/key ...`);
  const keyRes = await fetch(`${BASE}/api/comparison/voice-test/key`);
  if (!keyRes.ok) {
    console.error(`key fetch failed: ${keyRes.status}`);
    process.exit(1);
  }
  const key = (await keyRes.json()) as KeyResponse;
  if (key.test_id !== test.test_id) {
    console.warn(
      `WARNING: test_id mismatch (${test.test_id} vs ${key.test_id}); a new test rolled in mid-run`
    );
  }

  const { configToLetter, letterToConfig } = bucketLabels(test.buckets);
  const truthByBlindId = new Map<string, string>();
  for (const k of key.answer_key) {
    const letter = configToLetter.get(k.configuration_id);
    if (letter) truthByBlindId.set(k.blind_id, letter);
  }

  let correct = 0;
  let total = 0;
  console.log("\n=== PER-PROPHECY ===");
  console.log(
    `  letter mapping: A = ${letterToConfig.A}, B = ${letterToConfig.B}`
  );
  for (const g of parsed.guesses) {
    const truth = truthByBlindId.get(g.blind_id);
    const ok = truth && g.guessed_configuration === truth ? "✓" : "✗";
    if (truth && g.guessed_configuration === truth) correct += 1;
    total += 1;
    console.log(
      `  ${g.blind_id}  guess=${g.guessed_configuration}  truth=${truth ?? "?"}  conf=${g.confidence}%  ${ok}  ${g.reason.slice(0, 80)}`
    );
  }

  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  console.log("\n=== JUDGE VOICE NOTES ===");
  console.log(parsed.voice_notes);

  console.log("\n=== SCORE ===");
  console.log(
    `  accuracy: ${correct}/${total} = ${accuracy.toFixed(1)}%  (chance = 50%)`
  );
  if (accuracy >= 80) {
    console.log(
      `  RECOMMENDATION: configurations are distinguishable. Keep all-opus.`
    );
  } else if (accuracy >= 60) {
    console.log(
      `  RECOMMENDATION: marginal discrimination. Human judgment call needed — review voice notes above.`
    );
  } else {
    console.log(
      `  RECOMMENDATION: configurations are voice-equivalent. Ship the cheaper config (haiku-reads-opus-merge).`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
