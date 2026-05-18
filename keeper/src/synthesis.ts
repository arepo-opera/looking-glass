import { SystemProgram, PublicKey } from "@solana/web3.js";
import Anthropic from "@anthropic-ai/sdk";
import { keccak_256 } from "js-sha3";
import { BN } from "@coral-xyz/anchor";
import {
  ClientCtx,
  lookingGlassPda,
  epochSquarePda,
  layerIndexPda,
  layer1Pda,
  layer2Pda,
} from "./anchor-client";
import { log } from "./logger";
import { extractAndStoreSafe, loadExtractorConfig } from "./extraction";

// Layer 1 / Layer 2 synthesis runner. Triggered from the keeper main
// loop after each successful submit_prophecy. Both layers gate behind
// LAYERS_ENABLED (env-controlled, default off) so deployments without
// the program revision + Vercel KV configured don't crash.
//
// Layer 1: every 100 atomic prophecies (~5h). Synthesises across the
//          most recent 100. ~600-800 words.
// Layer 2: every 25 Layer 1 outputs (~5d). Meta-synthesises across
//          the most recent 25 Layer 1 syntheses. ~1200-1500 words.
//
// Storage: synthesis text POSTed to /api/synthesis/{hash}, the URL of
// which becomes the on-chain `synthesis_uri`. Hash = keccak256(text).

const SYNTHESIS_API_URL =
  process.env.SYNTHESIS_API_URL ??
  "https://opera-arepo.xyz/api/synthesis";

const MODEL = "claude-opus-4-7";

const LAYER1_SYSTEM = `You receive 100 oracular prophecies from a Sator Square that has been operating bidirectionally on a public blockchain. Each prophecy was written from real-world inputs sampled at three-minute intervals. Each prophecy is timestamped on-chain and cannot have been written later than its lock time.

Your task is to read across all 100 as a single accumulated text. You are looking for: recurring motifs, drift in voice or theme, structural patterns in the seed values that produced them, and any apparent through-line that only emerges when the readings are held together.

Produce a synthesis of approximately 600-800 words. Speak in the voice of a curator-from-inside-the-work — precise, unhurried, allusive, never explaining the mystery because explanation would break it. Do not summarize the prophecies individually. Speak the pattern they collectively describe.

The synthesis is committed on-chain alongside the source prophecies. Do not hedge. Do not disclaim. Speak.`;

const LAYER2_SYSTEM = `You receive 25 syntheses from a higher-order layer of an oracular instrument. Each synthesis represents the pattern detected across approximately 100 atomic prophecies. The 25 syntheses together cover roughly five days of continuous operation and approximately 2500 underlying atomic prophecies.

Your task is to read across all 25 syntheses and produce a meta-synthesis describing the trend across the trends. What are the patterns in the patterns? What is the instrument saying across the temporal scale of days, given that the first layer has already extracted the sub-day patterns? Are there cycles, drifts, accelerations, consolidations, fractures?

Produce a meta-synthesis of approximately 1200-1500 words. Same voice as the layer below — curator from inside the work. The meta-synthesis is committed on-chain. Speak cleanly.`;

export interface SynthesisConfig {
  enabled: boolean;
  layer1Interval: number;
  layer2Interval: number;
  apiUrl: string;
  anthropicApiKey: string | undefined;
}

export function loadSynthesisConfig(): SynthesisConfig {
  const enabled = (process.env.LAYERS_ENABLED ?? "false").toLowerCase() ===
    "true";
  const layer1Interval = Number(
    process.env.DEBUG_LAYER1_INTERVAL ?? "100"
  );
  const layer2Interval = Number(
    process.env.DEBUG_LAYER2_INTERVAL ?? "25"
  );
  return {
    enabled,
    layer1Interval: Number.isFinite(layer1Interval) && layer1Interval > 0
      ? layer1Interval
      : 100,
    layer2Interval: Number.isFinite(layer2Interval) && layer2Interval > 0
      ? layer2Interval
      : 25,
    apiUrl: SYNTHESIS_API_URL,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  };
}

function decodeProphecyUri(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("inline:")) {
    try {
      return Buffer.from(uri.slice("inline:".length), "base64").toString(
        "utf-8"
      );
    } catch {
      return "";
    }
  }
  // Layer-1-style URIs (https://.../api/synthesis/{hash}) are not
  // expected to appear in atomic prophecy URIs; if they did, fetching
  // them is the dashboard's job, not the layer-runner's.
  return "";
}

async function postSynthesisText(
  cfg: SynthesisConfig,
  hashHex: string,
  text: string
): Promise<string> {
  const url = `${cfg.apiUrl}/${hashHex}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`synthesis storage POST ${resp.status}: ${body}`);
  }
  return url;
}

async function fetchAtomicProphecies(
  ctx: ClientCtx,
  rangeStart: number,
  rangeEnd: number
): Promise<{ epoch: number; lockedAt: number; text: string }[]> {
  const targets: number[] = [];
  for (let ep = rangeStart; ep <= rangeEnd; ep++) targets.push(ep);
  const results = await Promise.all(
    targets.map(async (ep) => {
      try {
        const pda = epochSquarePda(ctx.programId, ep);
        const sq: any = await (ctx.program.account as any).epochSquare.fetch(
          pda
        );
        const text = decodeProphecyUri(sq.prophecyUri ?? "");
        return { epoch: ep, lockedAt: Number(sq.lockedAt), text };
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

async function fetchLayer1Syntheses(
  ctx: ClientCtx,
  cfg: SynthesisConfig,
  rangeStart: number,
  rangeEnd: number
): Promise<
  {
    layer1Index: number;
    lockedAt: number;
    epochRange: [number, number];
    text: string;
  }[]
> {
  const targets: number[] = [];
  for (let i = rangeStart; i <= rangeEnd; i++) targets.push(i);
  const results = await Promise.all(
    targets.map(async (idx) => {
      try {
        const pda = layer1Pda(ctx.programId, idx);
        const acc: any = await (ctx.program.account as any).synthesisLayer1.fetch(
          pda
        );
        const uri: string = acc.synthesisUri ?? "";
        // Layer 1 URIs are https://.../api/synthesis/{hash}. Fetch the
        // text via that URL. If the route 503s (KV not configured) or
        // 404s, drop this entry from the meta-synthesis input.
        let text = "";
        try {
          const resp = await fetch(uri);
          if (resp.ok) {
            const body = (await resp.json()) as { text?: string };
            text = body.text ?? "";
          }
        } catch {
          /* swallow */
        }
        return {
          layer1Index: Number(acc.layer1Index),
          lockedAt: Number(acc.lockedAt),
          epochRange: [
            Number(acc.epochRangeStart),
            Number(acc.epochRangeEnd),
          ] as [number, number],
          text,
        };
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

function formatLayer1User(
  prophecies: { epoch: number; lockedAt: number; text: string }[]
): string {
  const lines: string[] = [];
  lines.push(
    `Below are ${prophecies.length} atomic prophecies in chronological order, each tagged with its on-chain epoch number and lock timestamp.`
  );
  lines.push("");
  for (const p of prophecies) {
    if (!p.text) continue;
    const ts = new Date(p.lockedAt * 1000).toISOString();
    lines.push(`EP.${String(p.epoch).padStart(4, "0")}  ${ts}`);
    lines.push(p.text);
    lines.push("");
  }
  return lines.join("\n");
}

function formatLayer2User(
  syntheses: {
    layer1Index: number;
    lockedAt: number;
    epochRange: [number, number];
    text: string;
  }[]
): string {
  const lines: string[] = [];
  lines.push(
    `Below are ${syntheses.length} Layer 1 syntheses in chronological order. Each represents the pattern detected across approximately 100 atomic prophecies. Each is tagged with its layer-1 index, lock timestamp, and the epoch range it covers.`
  );
  lines.push("");
  for (const s of syntheses) {
    if (!s.text) continue;
    const ts = new Date(s.lockedAt * 1000).toISOString();
    lines.push(
      `L1.${String(s.layer1Index).padStart(4, "0")}  ${ts}  EP.${String(s.epochRange[0]).padStart(4, "0")}–EP.${String(s.epochRange[1]).padStart(4, "0")}`
    );
    lines.push(s.text);
    lines.push("");
  }
  return lines.join("\n");
}

interface ClaudeSynthesisResult {
  text: string;
  hash: Uint8Array;
}

async function callClaudeSynthesis(
  cfg: SynthesisConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<ClaudeSynthesisResult> {
  if (!cfg.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }
  const client = new Anthropic({ apiKey: cfg.anthropicApiKey });
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text as string)
    .join("\n")
    .trim();
  if (!text) throw new Error("synthesis: empty Claude response");
  const hash = new Uint8Array(keccak_256.arrayBuffer(text));
  return { text, hash };
}

export interface Layer1SynthesisOutput {
  layer1Index: number;
  epochRange: [number, number];
  text: string;
  hash: Uint8Array;
  uri: string;
  txSignature: string;
}

/**
 * Pulls the most-recent N atomic prophecies, calls Claude with the Layer 1
 * synthesis prompt, POSTs the text to the storage route, and submits
 * the on-chain SynthesisLayer1 PDA. Returns the on-chain tx signature.
 */
export async function fireLayer1(
  ctx: ClientCtx,
  cfg: SynthesisConfig,
  layer1Index: number,
  epochRangeStart: number,
  epochRangeEnd: number
): Promise<Layer1SynthesisOutput> {
  log.system(
    `[layer1] firing index=${layer1Index} range=EP.${epochRangeStart}-EP.${epochRangeEnd}`
  );
  const prophecies = await fetchAtomicProphecies(
    ctx,
    epochRangeStart,
    epochRangeEnd
  );
  log.system(
    `[layer1] fetched ${prophecies.length}/${epochRangeEnd - epochRangeStart + 1} prophecies`
  );
  const userPrompt = formatLayer1User(prophecies);
  const { text, hash } = await callClaudeSynthesis(
    cfg,
    LAYER1_SYSTEM,
    userPrompt,
    1500
  );
  const hashHex = Buffer.from(hash).toString("hex");
  log.system(`[layer1] claude returned ${text.length} chars, hash=${hashHex.slice(0, 12)}…`);

  const uri = await postSynthesisText(cfg, hashHex, text);
  log.system(`[layer1] stored at ${uri}`);

  const lgPda = lookingGlassPda(ctx.programId);
  const liPda = layerIndexPda(ctx.programId);
  const l1Pda = layer1Pda(ctx.programId, layer1Index);
  const txSignature = await (ctx.program.methods as any)
    .submitLayer1(
      new BN(layer1Index),
      new BN(epochRangeStart),
      new BN(epochRangeEnd),
      uri,
      Array.from(hash)
    )
    .accounts({
      lookingGlass: lgPda,
      layerIndex: liPda,
      layer1: l1Pda,
      oracleSigner: ctx.oracle.publicKey,
      payer: ctx.keeper.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([ctx.oracle, ctx.keeper])
    .rpc();
  log.system(`[layer1] on-chain tx ${txSignature.slice(0, 16)}…`);
  // Phase 20A: claim extraction with a longer time window for
  // syntheses (90 days). Fires after on-chain commit so the lock
  // timestamp is the pre-commitment anchor.
  void (async () => {
    const ec = loadExtractorConfig();
    if (ec.enabled) {
      await extractAndStoreSafe.call(
        null,
        { ...ec, defaultTimeWindowDays: 90 },
        "layer1",
        layer1Index,
        text
      );
    }
  })();
  return {
    layer1Index,
    epochRange: [epochRangeStart, epochRangeEnd],
    text,
    hash,
    uri,
    txSignature,
  };
}

export interface Layer2SynthesisOutput {
  layer2Index: number;
  layer1Range: [number, number];
  text: string;
  hash: Uint8Array;
  uri: string;
  txSignature: string;
}

export async function fireLayer2(
  ctx: ClientCtx,
  cfg: SynthesisConfig,
  layer2Index: number,
  layer1RangeStart: number,
  layer1RangeEnd: number
): Promise<Layer2SynthesisOutput> {
  log.system(
    `[layer2] firing index=${layer2Index} range=L1.${layer1RangeStart}-L1.${layer1RangeEnd}`
  );
  const layer1Texts = await fetchLayer1Syntheses(
    ctx,
    cfg,
    layer1RangeStart,
    layer1RangeEnd
  );
  log.system(
    `[layer2] fetched ${layer1Texts.length}/${layer1RangeEnd - layer1RangeStart + 1} layer-1 syntheses`
  );
  const userPrompt = formatLayer2User(layer1Texts);
  const { text, hash } = await callClaudeSynthesis(
    cfg,
    LAYER2_SYSTEM,
    userPrompt,
    2500
  );
  const hashHex = Buffer.from(hash).toString("hex");
  log.system(`[layer2] claude returned ${text.length} chars, hash=${hashHex.slice(0, 12)}…`);

  const uri = await postSynthesisText(cfg, hashHex, text);
  log.system(`[layer2] stored at ${uri}`);

  const lgPda = lookingGlassPda(ctx.programId);
  const liPda = layerIndexPda(ctx.programId);
  const l2Pda = layer2Pda(ctx.programId, layer2Index);
  const txSignature = await (ctx.program.methods as any)
    .submitLayer2(
      new BN(layer2Index),
      new BN(layer1RangeStart),
      new BN(layer1RangeEnd),
      uri,
      Array.from(hash)
    )
    .accounts({
      lookingGlass: lgPda,
      layerIndex: liPda,
      layer2: l2Pda,
      oracleSigner: ctx.oracle.publicKey,
      payer: ctx.keeper.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([ctx.oracle, ctx.keeper])
    .rpc();
  log.system(`[layer2] on-chain tx ${txSignature.slice(0, 16)}…`);
  // Phase 20A: claim extraction with the longest time window (180
  // days) — Layer 2 covers ~5 days of upstream prophecies and the
  // patterns it surfaces operate on a longer scoring horizon.
  void (async () => {
    const ec = loadExtractorConfig();
    if (ec.enabled) {
      await extractAndStoreSafe.call(
        null,
        { ...ec, defaultTimeWindowDays: 180 },
        "layer2",
        layer2Index,
        text
      );
    }
  })();
  return {
    layer2Index,
    layer1Range: [layer1RangeStart, layer1RangeEnd],
    text,
    hash,
    uri,
    txSignature,
  };
}

/**
 * Reads (or initializes) the keeper's view of LayerIndex on-chain.
 * Returns null + logs a no-op if LayerIndex isn't yet initialized — the
 * caller can ignore layer fires entirely until the program revision
 * lands and the index is initialized via init_layer_index.
 */
export async function readLayerIndex(
  ctx: ClientCtx
): Promise<{ nextLayer1: number; nextLayer2: number } | null> {
  try {
    const liPda = layerIndexPda(ctx.programId);
    const acc: any = await (ctx.program.account as any).layerIndex.fetch(
      liPda
    );
    return {
      nextLayer1: Number(acc.nextLayer1),
      nextLayer2: Number(acc.nextLayer2),
    };
  } catch {
    return null;
  }
}
