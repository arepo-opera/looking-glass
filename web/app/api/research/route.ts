import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "../../../../shared/looking_glass.json";

// Research-statistics endpoint, distinct from /api/archive.json. Returns
// aggregate corpus stats and the verification-engine status, intended for
// AI agents and researchers tracking the project as a research instrument
// rather than an art piece.

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const PROGRAM_ID_STR =
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
  "EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu";
const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);

const READ_ONLY_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async (tx: any) => tx,
  signAllTransactions: async (txs: any[]) => txs,
} as any;

// Computing stats over the full archive would mean N RPC fetches per
// /research call. Cap the sample window so the endpoint stays under
// Vercel's serverless time budget; cache the response for 5 minutes.
const SAMPLE_WINDOW = 200;

function lookingGlassPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("looking_glass")],
    PROGRAM_ID
  )[0];
}

function epochSquarePda(epoch: number): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(epoch));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("epoch"), buf],
    PROGRAM_ID
  )[0];
}

function decodeUri(uri: string): string {
  if (!uri || !uri.startsWith("inline:")) return "";
  try {
    return Buffer.from(uri.slice("inline:".length), "base64").toString("utf-8");
  } catch {
    return "";
  }
}

export const revalidate = 300;

export async function GET(_req: NextRequest) {
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(connection, READ_ONLY_WALLET, {
    commitment: "confirmed",
  });
  const program = new Program(idl as any, provider);

  let currentEpoch: number;
  try {
    const lg: any = await (program.account as any).lookingGlass.fetch(
      lookingGlassPda()
    );
    currentEpoch = Number(lg.epoch);
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "could not fetch LookingGlass account",
        detail: String(e?.message ?? e),
      },
      { status: 503 }
    );
  }

  const lastEpoch = Math.max(1, currentEpoch - SAMPLE_WINDOW + 1);
  const targets: number[] = [];
  for (let ep = currentEpoch; ep >= lastEpoch; ep--) targets.push(ep);

  // Stats accumulators. Walking the sample window in parallel; missing or
  // unsubmitted entries are skipped silently — they don't count toward
  // total_prophecies. The window is recent-first; first_epoch_timestamp
  // takes the oldest successfully-fetched lockedAt within the window.
  let totalProphecies = 0;
  let totalLengthChars = 0;
  let oldestTs = Number.POSITIVE_INFINITY;
  const glyphSet = new Set<string>();

  const results = await Promise.all(
    targets.map(async (ep) => {
      try {
        const sq: any = await (program.account as any).epochSquare.fetch(
          epochSquarePda(ep)
        );
        return sq;
      } catch {
        return null;
      }
    })
  );

  for (const sq of results) {
    if (!sq) continue;
    const text = decodeUri(sq.prophecyUri ?? "");
    if (text) {
      totalProphecies += 1;
      totalLengthChars += text.length;
    }
    const lockedAt = Number(sq.lockedAt);
    if (lockedAt > 0 && lockedAt < oldestTs) oldestTs = lockedAt;
    const grid = sq.glyphs as number[][] | undefined;
    if (grid) {
      for (const row of grid) {
        for (const b of row) {
          const ch = String.fromCharCode(b);
          if (ch !== " " && ch !== " ") glyphSet.add(ch);
        }
      }
    }
  }

  const averageLength =
    totalProphecies > 0
      ? Math.round((totalLengthChars / totalProphecies) * 10) / 10
      : 0;

  const body = {
    project: "SATOR LOOKING GLASS",
    program_id: PROGRAM_ID_STR,
    schema_version: 3,
    as_of: new Date().toISOString(),
    total_epochs: currentEpoch,
    first_epoch_timestamp:
      Number.isFinite(oldestTs) && oldestTs > 0
        ? new Date(oldestTs * 1000).toISOString()
        : null,
    sample_window: {
      from_epoch: currentEpoch,
      to_epoch: lastEpoch,
      size: targets.length,
      note:
        "corpus stats are computed over the most recent sample_window epochs to keep the endpoint within serverless budget. full archive is at /api/archive.json with pagination.",
    },
    research_substrate: {
      atomic_prophecies: currentEpoch,
      // Layer counts get filled in below if LayerIndex is present.
      layer1_syntheses: 0,
      layer2_meta_syntheses: 0,
      registered_agents: 0,
      total_agent_interactions: 0,
    },
    research_questions: [
      "convergent_vs_divergent_interpretation",
      "structural_consistency_at_scale",
      "agent_behavioral_patterns",
      "seed_config_synthesis_correlation",
      "linguistic_novelty_under_constraint",
    ],
    predetermined_falsifiability_claims: [
      "instrument_operates_continuously: true (verifiable on chain)",
      "seed_sources_are_real_and_named: true",
      "voice_consistency_across_500_readings: verified via blind LLM pass",
      "agent_surface_is_open: true (verify by querying)",
    ],
    no_claims_made: [
      "forecasting_world_events",
      "predicting_specific_outcomes",
      "revealing_truth",
    ],
    verification_engine_status: "not_yet_operational",
    current_layer1_index: null as number | null,
    current_layer2_index: null as number | null,
    next_layer1_estimated_at: null as string | null,
    next_layer2_estimated_at: null as string | null,
    methodology_url:
      "https://opera-arepo.xyz/methodology",
    skepticism_url:
      "https://opera-arepo.xyz/skepticism",
    archive_url: "https://opera-arepo.xyz/api/archive.json",
    // Phase 20A — claim extraction is live; scoring (Phase 20B) is
    // not yet running. Claims for an individual prophecy/synthesis
    // come from /api/claims/{epoch|layer1|layer2}/{index}. Score
    // documents at /api/score/{type}/{index}; aggregate at
    // /api/score/summary.
    claims_url_template:
      "https://opera-arepo.xyz/api/claims/{type}/{index}",
    score_url_template:
      "https://opera-arepo.xyz/api/score/{type}/{index}",
    score_summary_url:
      "https://opera-arepo.xyz/api/score/summary",
    prophecy_corpus_stats: {
      total_prophecies: totalProphecies,
      average_length_chars: averageLength,
      total_unique_glyphs_observed: glyphSet.size,
      // Each prophecy hash is folded into the next epoch's ECHO seed; the
      // chain depth is therefore equal to (current_epoch - genesis_epoch)
      // for every prophecy that has at least one successor. We expose 0
      // here as a placeholder until the verification engine ships and
      // computes a per-prophecy reference-graph metric.
      self_reference_depth_average: 0,
    },
    verification_results: null,
    next_verification_pass: null,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control":
        "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
