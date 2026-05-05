import { SystemProgram } from "@solana/web3.js";
import { loadConfig, Config } from "./config";
import {
  buildClient,
  ClientCtx,
  loadKeypair,
  lookingGlassPda,
  epochSquarePda,
} from "./anchor-client";
import { log } from "./logger";
import { fireTick } from "./tick";
import {
  startListener,
  respondToProphecyRequest,
  ProphecyContext,
} from "./prophecy-listener";
import { fetchAllSeeds } from "./seeds";
import type { SeedDisplay } from "./seeds/types";
import { SseServer } from "./sse-server";
import type { Status } from "./types";

const MIN_TICK_INTERVAL_SECS = 180;
const TICK_CLOCK_SKEW_GRACE_SECS = 3;

// How often we re-poll real-world seed feeds while the cube is GATHERING.
// 30s lines up with the dashboard's existing "next tick in N" cadence.
const SEED_REFRESH_MS = 30_000;

// Shared state — seeds + status updated by the keeper, read by the listener
// and pushed to SSE clients.
interface KeeperState {
  status: Status;
  epoch: number;
  nextTickSeconds: number;
  seeds: SeedDisplay[];
}

async function maybeInitialize(ctx: ClientCtx): Promise<void> {
  const lgPda = lookingGlassPda(ctx.programId);
  const info = await ctx.connection.getAccountInfo(lgPda);
  if (info) return;
  log.system("LookingGlass PDA not found; calling initialize...");
  await ctx.program.methods
    .initialize(ctx.oracle.publicKey)
    .accounts({
      lookingGlass: lgPda,
      authority: ctx.keeper.publicKey,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();
  log.system("initialized.");
}

async function recoverPendingProphecy(
  ctx: ClientCtx,
  context: ProphecyContext
): Promise<void> {
  const lgPda = lookingGlassPda(ctx.programId);
  const lg: any = await (ctx.program.account as any).lookingGlass
    .fetch(lgPda)
    .catch(() => null);
  if (!lg) return;
  const epoch = Number(lg.epoch);
  if (epoch === 0) return;
  const epPda = epochSquarePda(ctx.programId, epoch);
  const ep: any = await (ctx.program.account as any).epochSquare
    .fetch(epPda)
    .catch(() => null);
  if (!ep) return;
  if (ep.prophecySubmitted) {
    log.system(`epoch ${epoch} already has a prophecy on-chain; resuming.`);
    return;
  }
  log.system(
    `recovering: epoch ${epoch} EpochSquare exists but no prophecy yet, processing now.`
  );
  await respondToProphecyRequest(ctx, ep, context);
}

async function tickIfDue(
  ctx: ClientCtx,
  cfg: Config,
  state: KeeperState,
  context: ProphecyContext
): Promise<void> {
  const lgPda = lookingGlassPda(ctx.programId);
  const lg: any = await (ctx.program.account as any).lookingGlass.fetch(lgPda);
  const epoch = Number(lg.epoch);
  const lastTickTs = Number(lg.lastTickTs);
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - lastTickTs;

  state.epoch = epoch;

  const effectiveInterval = MIN_TICK_INTERVAL_SECS + TICK_CLOCK_SKEW_GRACE_SECS;
  if (lastTickTs > 0 && elapsed < effectiveInterval && !cfg.debugFastTick) {
    state.status = "GATHERING";
    state.nextTickSeconds = effectiveInterval - elapsed;
    log.system(`next tick in ${state.nextTickSeconds}s (epoch ${epoch}).`);
    return;
  }

  state.status = "SOLVING";
  state.nextTickSeconds = 0;
  log.system(`firing tick: epoch ${epoch} → ${epoch + 1}.`);
  try {
    const { signature, nextEpoch } = await fireTick(ctx, epoch);
    log.system(
      `tick tx confirmed for epoch ${nextEpoch}: ${signature.slice(0, 8)}...`
    );
    state.status = "LOCKED";
    state.epoch = nextEpoch;
    const epPda = epochSquarePda(ctx.programId, nextEpoch);
    const ep: any = await (ctx.program.account as any).epochSquare.fetch(epPda);
    state.status = "READING";
    await respondToProphecyRequest(ctx, ep, context);
    state.status = "GATHERING";
  } catch (e: any) {
    state.status = "GATHERING";
    const s = String(e?.message ?? e);
    if (s.includes("TickTooSoon")) {
      log.system("tick rejected on-chain (TickTooSoon); will retry next loop.");
    } else {
      log.system(`tick failed: ${s}`);
    }
  }
}

async function refreshSeeds(
  ctx: ClientCtx,
  cfg: Config,
  state: KeeperState,
  sse: SseServer
): Promise<void> {
  try {
    state.seeds = await fetchAllSeeds(ctx, cfg.metricsRpcUrl);
    sse.broadcast({
      type: "seeds",
      seeds: state.seeds,
      ts: Math.floor(Date.now() / 1000),
    });
    const faults = state.seeds.filter((s) => s.fault).map((s) => s.category);
    if (faults.length > 0) {
      log.system(`seed fetch faults: ${faults.join(", ")}`);
    }
  } catch (e) {
    log.system(`seed refresh error: ${(e as Error)?.message ?? e}`);
  }
}

function broadcastStatus(state: KeeperState, sse: SseServer): void {
  sse.broadcast({
    type: "status",
    status: state.status,
    epoch: state.epoch,
    nextTickSeconds: state.nextTickSeconds,
    ts: Math.floor(Date.now() / 1000),
  });
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.anthropicApiKey) {
    log.system(
      "warning: ANTHROPIC_API_KEY not set — every prophecy will fall back to the template generator."
    );
  }
  const keeperKp = loadKeypair(cfg.keeperKeypairPath);
  const oracleKp = loadKeypair(cfg.oracleKeypairPath);
  const ctx = buildClient({
    rpcUrl: cfg.rpcUrl,
    wsUrl: cfg.wsUrl,
    keeper: keeperKp,
    oracle: oracleKp,
    programId: cfg.programId,
  });

  await maybeInitialize(ctx);

  const lgPda = lookingGlassPda(ctx.programId);
  const lg: any = await (ctx.program.account as any).lookingGlass.fetch(lgPda);

  const state: KeeperState = {
    status: "GATHERING",
    epoch: Number(lg.epoch),
    nextTickSeconds: MIN_TICK_INTERVAL_SECS,
    seeds: [],
  };

  const sse = new SseServer();
  sse.start(cfg.ssePort);
  log.rule();
  log.data("looking glass keeper online");
  log.data(`program  ${ctx.programId.toBase58()}`);
  log.data(`epoch    ${state.epoch}`);
  log.data(`keeper   ${ctx.keeper.publicKey.toBase58()}`);
  log.data(`oracle   ${ctx.oracle.publicKey.toBase58()}`);
  log.data(`rpc      ${cfg.rpcUrl}`);
  log.data(`metrics  ${cfg.metricsRpcUrl}`);
  log.data(`ws       ${cfg.wsUrl}`);
  log.data(`sse      http://localhost:${cfg.ssePort}/events`);
  if (cfg.debugFastTick) {
    log.data("DEBUG_FAST_TICK is on (keeper-side gate disabled).");
  }
  log.rule();

  const contextProvider = (): ProphecyContext => ({
    seedDisplays: state.seeds,
    broadcast: (ev) => sse.broadcast(ev),
  });

  // Seed the initial display before any tick / event handler can ask for it.
  await refreshSeeds(ctx, cfg, state, sse);

  const subId = startListener(ctx, contextProvider);
  log.system(
    `subscribed to ProphecyRequested events (subscription ${subId}).`
  );

  await recoverPendingProphecy(ctx, contextProvider());

  log.system(
    `tick scheduler running every ${cfg.tickIntervalMs}ms (on-chain interval ${MIN_TICK_INTERVAL_SECS}s).`
  );
  log.system(`seed refresh running every ${SEED_REFRESH_MS}ms.`);

  const tickHandle = setInterval(() => {
    tickIfDue(ctx, cfg, state, contextProvider()).catch((e) => {
      log.system(`scheduler iteration error: ${e?.message ?? e}`);
    });
    broadcastStatus(state, sse);
  }, cfg.tickIntervalMs);

  const seedHandle = setInterval(() => {
    refreshSeeds(ctx, cfg, state, sse).catch((e) => {
      log.system(`seed iteration error: ${e?.message ?? e}`);
    });
  }, SEED_REFRESH_MS);

  // Initial tick attempt
  await tickIfDue(ctx, cfg, state, contextProvider());
  broadcastStatus(state, sse);

  const shutdown = async (sig: string) => {
    log.system(`received ${sig}; shutting down keeper.`);
    clearInterval(tickHandle);
    clearInterval(seedHandle);
    sse.stop();
    try {
      await ctx.program.removeEventListener(subId);
    } catch {}
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await new Promise<void>(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
