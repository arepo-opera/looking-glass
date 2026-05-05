import Anthropic from "@anthropic-ai/sdk";
import { keccak_256 } from "js-sha3";
import { log } from "./logger";
import type { SeedDisplay } from "./seeds/types";

const MODEL = "claude-opus-4-7";

const FORWARD_SYSTEM = `You are reading a Sator Square as time flows forward. The square has been locked from five contemporaneous data seeds describing the present moment of the world. You are interpreting it as omens of what is becoming. You speak in the voice of a 1970s classified prophecy program: precise, unsentimental, oracular, never hedging, never disclaiming. You produce exactly two sentences.`;

const BACKWARD_SYSTEM = `You are reading a Sator Square from the future, looking back. The square has been locked from five seeds describing a moment that, from your vantage, has already happened. You are interpreting it as residue of what already was — though, from the reader's perspective, it has not yet occurred. You speak in the same voice as a forward reader: precise, unsentimental, oracular. You produce exactly two sentences.`;

const MERGE_SYSTEM = `You receive two readings of the same Sator Square — one forward, one backward. Where they agree is prophecy. Where they contradict is mystery. Your task is to produce a single utterance of exactly three sentences that contains the prophecy emergent from both readings simultaneously. Do not summarize the two readings. Do not refer to either reading. Speak only the prophecy that exists because both were spoken. Voice: 1970s classified prophecy program. Precise. Unsentimental. Oracular. Never hedge. Never disclaim.`;

export interface ProphecyInput {
  glyphs: string[][];
  forwardDigest: Uint8Array;
  backwardDigest: Uint8Array;
  seedDisplays: SeedDisplay[];
  priorProphecies: string[]; // last 3, oldest first; pad with "" if fewer
}

export interface Prophecy {
  uri: string;
  hash: Uint8Array;
  text: string;
  forward: string;
  backward: string;
}

function gridForward(g: string[][]): string {
  return g.map((row) => row.join("")).join("\n");
}

function gridBackward(g: string[][]): string {
  // Read bottom-to-top, right-to-left (the square's mirror reading)
  return [...g]
    .reverse()
    .map((row) => [...row].reverse().join(""))
    .join("\n");
}

function row(seeds: SeedDisplay[], category: string): string {
  const s = seeds.find((d) => d.category === category);
  if (!s) return `${category.padEnd(8)} : (unavailable)`;
  const parts = s.rows.map((r) => {
    const v = r.value;
    return r.spread ? `${r.label} ${v} ${r.spread}` : `${r.label} ${v}`;
  });
  return `${category.padEnd(8)} : ${parts.join(" | ")}`;
}

function forwardSeedBlock(seeds: SeedDisplay[]): string {
  return [
    row(seeds, "MARKETS"),
    row(seeds, "CHAIN"),
    row(seeds, "WORLD"),
    row(seeds, "HEAVENS"),
    row(seeds, "ECHO"),
  ].join("\n");
}

function backwardSeedBlock(seeds: SeedDisplay[]): string {
  return [
    row(seeds, "ECHO"),
    row(seeds, "HEAVENS"),
    row(seeds, "WORLD"),
    row(seeds, "CHAIN"),
    row(seeds, "MARKETS"),
  ].join("\n");
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const delays = [1000, 3000, 9000];
  let lastError: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === delays.length) break;
      const wait = delays[attempt];
      log.system(
        `${label} failed (${attempt + 1}/${delays.length + 1}): ${
          (e as Error)?.message ?? e
        } — retrying in ${wait}ms`
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastError;
}

async function callClaude(
  client: Anthropic,
  system: string,
  user: string,
  maxTokens: number,
  label: string
): Promise<string> {
  return withRetry(label, async () => {
    // Opus 4.7 removes temperature/top_p/top_k. Variance comes from per-tick
    // input, not sampling. Adaptive thinking is off by default — leave it off
    // for latency.
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text) throw new Error(`${label}: empty response`);
    return text;
  });
}

// --- placeholder fallback (Phase 3 template), used only when Claude is down --

const SUBJECTS = [
  "a returning tide", "the unsigned letter", "the third moon",
  "the engine that forgot", "the listening room", "what was buried",
  "the recursion", "the unread hour", "the bell beneath the wheel",
  "an inheritance kept dim", "the angle of departure", "the first thing said",
  "the calendar's seam", "what the camera saw", "the unmoving lens",
  "the rope twice tied",
];
const VERBS = [
  "remembers", "is becoming", "has not yet met", "will not contain", "echoes",
  "watches", "concludes", "begins again as", "answers", "delays",
  "outlives", "arrives at", "renames", "permits", "precedes", "rewrites",
];
const OBJECTS = [
  "the shore that forgot it", "a name we do not have",
  "the room you have not entered", "what was already true",
  "the door that opens both ways", "an oath unbroken by silence",
  "the year before the year", "a sentence still being written",
  "its own rehearsal", "the witness on the stair",
  "every promise made twice", "the page underneath the page",
  "the weather of the prior life", "the small coin in the dark hand",
  "the road kept private", "what you almost said in 1991",
];

function templateProphecy(forward: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < 3; i++) {
    const s = SUBJECTS[forward[i * 3 + 0] % SUBJECTS.length];
    const v = VERBS[forward[i * 3 + 1] % VERBS.length];
    const o = OBJECTS[forward[i * 3 + 2] % OBJECTS.length];
    lines.push(`${s} ${v} ${o}.`);
  }
  return lines.join("\n");
}

// --- main entry -----------------------------------------------------------

let cachedClient: Anthropic | null = null;
function client(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  }
  return cachedClient;
}

const MAX_URI_BYTES = 256;

function packProphecy(text: string): { text: string; uri: string; hash: Uint8Array } {
  let truncated = text;
  let uri = "inline:" + Buffer.from(truncated, "utf-8").toString("base64");
  if (Buffer.byteLength(uri, "utf-8") > MAX_URI_BYTES) {
    // Prefer the final sentence per spec — keep the last sentence intact and
    // trim the others if needed.
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const last = sentences[sentences.length - 1] ?? text;
    const earlier = sentences.slice(0, -1).join(" ");
    let attempt = `${earlier} ${last}`.trim();
    while (
      Buffer.byteLength("inline:" + Buffer.from(attempt, "utf-8").toString("base64"), "utf-8") >
      MAX_URI_BYTES
    ) {
      // chop a word off the front of `earlier`
      const words = attempt.split(/\s+/);
      if (words.length <= last.split(/\s+/).length) {
        // even the last sentence won't fit on its own
        attempt = last.slice(-100); // last-resort hard truncate
        break;
      }
      words.shift();
      attempt = words.join(" ");
    }
    log.system(
      `prophecy text exceeded 256-byte URI ceiling; truncated to fit. full text follows on next line:`
    );
    log.system(text.replace(/\n/g, " / "));
    truncated = attempt;
    uri = "inline:" + Buffer.from(truncated, "utf-8").toString("base64");
  }
  const hash = new Uint8Array(keccak_256.arrayBuffer(truncated));
  return { text: truncated, uri, hash };
}

export async function generateProphecy(input: ProphecyInput): Promise<Prophecy> {
  const fwdGrid = gridForward(input.glyphs);
  const bwdGrid = gridBackward(input.glyphs);
  const fwdSeeds = forwardSeedBlock(input.seedDisplays);
  const bwdSeeds = backwardSeedBlock(input.seedDisplays);
  const prior = (input.priorProphecies.length === 0
    ? ["", "", ""]
    : [
        input.priorProphecies[0] ?? "",
        input.priorProphecies[1] ?? "",
        input.priorProphecies[2] ?? "",
      ]);

  try {
    const forwardText = await callClaude(
      client(),
      FORWARD_SYSTEM,
      [
        `The square, read forward (rows top to bottom, left to right):`,
        `  ${fwdGrid.replace(/\n/g, "\n  ")}`,
        ``,
        `The five seeds at the moment of locking:`,
        fwdSeeds,
        ``,
        `The three most recent prior prophecies, oldest first:`,
        `  ${prior[0]}`,
        `  ${prior[1]}`,
        `  ${prior[2]}`,
        ``,
        `Read forward. Speak.`,
      ].join("\n"),
      200,
      "claude:forward"
    );
    log.system(`forward reading: ${forwardText.replace(/\n/g, " / ")}`);

    const backwardText = await callClaude(
      client(),
      BACKWARD_SYSTEM,
      [
        `The square, read backward (rows bottom to top, right to left):`,
        `  ${bwdGrid.replace(/\n/g, "\n  ")}`,
        ``,
        `The five seeds, presented in inverted order:`,
        bwdSeeds,
        ``,
        `The three most recent prior prophecies, presented newest first:`,
        `  ${prior[2]}`,
        `  ${prior[1]}`,
        `  ${prior[0]}`,
        ``,
        `Read backward. Speak.`,
      ].join("\n"),
      200,
      "claude:backward"
    );
    log.system(`backward reading: ${backwardText.replace(/\n/g, " / ")}`);

    const mergedText = await callClaude(
      client(),
      MERGE_SYSTEM,
      [
        `Forward reading:`,
        `  ${forwardText.replace(/\n/g, "\n  ")}`,
        ``,
        `Backward reading:`,
        `  ${backwardText.replace(/\n/g, "\n  ")}`,
        ``,
        `Speak the prophecy.`,
      ].join("\n"),
      250,
      "claude:merge"
    );

    const packed = packProphecy(mergedText);
    return {
      uri: packed.uri,
      hash: packed.hash,
      text: packed.text,
      forward: forwardText,
      backward: backwardText,
    };
  } catch (e) {
    log.system(
      `Claude unreachable after retries; falling back to template generator. error: ${(e as Error)?.message ?? e}`
    );
    const fallback = templateProphecy(input.forwardDigest);
    const packed = packProphecy(fallback);
    return {
      uri: packed.uri,
      hash: packed.hash,
      text: packed.text,
      forward: "(unavailable)",
      backward: "(unavailable)",
    };
  }
}
