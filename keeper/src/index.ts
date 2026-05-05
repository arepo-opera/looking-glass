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
} from "./prophecy-listener";
// Note: the listener subscribes to ProphecyRequested events for ticks fired
// by other actors (e.g. the Phase 2 demo, a second keeper). For ticks the
// keeper fires itself, we synchronously fetch and process the EpochSquare
// in tickIfDue() — this avoids any window where the WebSocket subscription
// hasn't connected yet and is idempotent (the listener and the inline path
// both check ep.prophecy_submitted before doing anything).

const MIN_TICK_INTERVAL_SECS = 180;

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

async function recoverPendingProphecy(ctx: ClientCtx): Promise<void> {
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
  await respondToProphecyRequest(ctx, ep);
}

async function tickIfDue(ctx: ClientCtx, cfg: Config): Promise<void> {
  const lgPda = lookingGlassPda(ctx.programId);
  const lg: any = await (ctx.program.account as any).lookingGlass.fetch(lgPda);
  const epoch = Number(lg.epoch);
  const lastTickTs = Number(lg.lastTickTs);
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - lastTickTs;

  if (lastTickTs > 0 && elapsed < MIN_TICK_INTERVAL_SECS && !cfg.debugFastTick) {
    log.system(
      `next tick in ${MIN_TICK_INTERVAL_SECS - elapsed}s (epoch ${epoch}).`
    );
    return;
  }

  log.system(`firing tick: epoch ${epoch} → ${epoch + 1}.`);
  try {
    const { signature, nextEpoch } = await fireTick(ctx, epoch);
    log.system(
      `tick tx confirmed for epoch ${nextEpoch}: ${signature.slice(0, 8)}...`
    );
    const epPda = epochSquarePda(ctx.programId, nextEpoch);
    const ep: any = await (ctx.program.account as any).epochSquare.fetch(epPda);
    await respondToProphecyRequest(ctx, ep);
  } catch (e: any) {
    const s = String(e?.message ?? e);
    if (s.includes("TickTooSoon")) {
      log.system("tick rejected on-chain (TickTooSoon); will retry next loop.");
    } else {
      log.system(`tick failed: ${s}`);
    }
  }
}

async function main(): Promise<void> {
  const cfg = loadConfig();
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

  log.rule();
  log.data("looking glass keeper online");
  log.data(`program  ${ctx.programId.toBase58()}`);
  log.data(`epoch    ${Number(lg.epoch)}`);
  log.data(`keeper   ${ctx.keeper.publicKey.toBase58()}`);
  log.data(`oracle   ${ctx.oracle.publicKey.toBase58()}`);
  log.data(`rpc      ${cfg.rpcUrl}`);
  log.data(`ws       ${cfg.wsUrl}`);
  if (cfg.debugFastTick) {
    log.data("DEBUG_FAST_TICK is on (keeper-side gate disabled).");
  }
  log.rule();

  const subId = startListener(ctx);
  log.system(
    `subscribed to ProphecyRequested events (subscription ${subId}).`
  );

  await recoverPendingProphecy(ctx);

  log.system(
    `tick scheduler running every ${cfg.tickIntervalMs}ms (on-chain interval ${MIN_TICK_INTERVAL_SECS}s).`
  );

  const intervalHandle = setInterval(() => {
    tickIfDue(ctx, cfg).catch((e) => {
      log.system(`scheduler iteration error: ${e?.message ?? e}`);
    });
  }, cfg.tickIntervalMs);

  await tickIfDue(ctx, cfg);

  const shutdown = async (sig: string) => {
    log.system(`received ${sig}; shutting down keeper.`);
    clearInterval(intervalHandle);
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
