import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

export type LogFormat = "pretty" | "json";

export interface Config {
  rpcUrl: string;
  wsUrl: string;
  // One of {keeperKeypairBase64, keeperKeypairPath} must be set; base64 wins.
  keeperKeypairBase64?: string;
  keeperKeypairPath?: string;
  oracleKeypairBase64?: string;
  oracleKeypairPath?: string;
  tickIntervalMs: number;
  programId: string;
  debugFastTick: boolean;
  ssePort: number;
  sseHost: string;
  metricsRpcUrl: string;
  anthropicApiKey: string | undefined;
  logFormat: LogFormat;
}

export function loadConfig(): Config {
  const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8899";
  const wsUrl =
    process.env.WS_URL ??
    rpcUrl.replace(/^http/, "ws").replace(/8899$/, "8900");
  const tickIntervalMs = Number(process.env.TICK_INTERVAL_MS ?? "30000");
  if (!Number.isFinite(tickIntervalMs) || tickIntervalMs <= 0) {
    throw new Error(`invalid TICK_INTERVAL_MS: ${process.env.TICK_INTERVAL_MS}`);
  }
  const ssePort = Number(process.env.PORT ?? process.env.SSE_PORT ?? "7777");
  // 0.0.0.0 so Railway can route ingress traffic to the container; keep the
  // option to override (e.g. localhost in dev).
  const sseHost = process.env.SSE_HOST ?? "0.0.0.0";
  const programId = process.env.PROGRAM_ID;
  if (!programId) throw new Error("missing env var PROGRAM_ID");

  const keeperKeypairBase64 = process.env.KEEPER_KEYPAIR;
  const keeperKeypairPath = process.env.KEEPER_KEYPAIR_PATH;
  const oracleKeypairBase64 = process.env.ORACLE_KEYPAIR;
  const oracleKeypairPath = process.env.ORACLE_KEYPAIR_PATH;
  if (!keeperKeypairBase64 && !keeperKeypairPath) {
    throw new Error("missing env: set KEEPER_KEYPAIR (base64) or KEEPER_KEYPAIR_PATH (file)");
  }
  if (!oracleKeypairBase64 && !oracleKeypairPath) {
    throw new Error("missing env: set ORACLE_KEYPAIR (base64) or ORACLE_KEYPAIR_PATH (file)");
  }

  const logFormatRaw = (process.env.LOG_FORMAT ?? "pretty").toLowerCase();
  if (logFormatRaw !== "pretty" && logFormatRaw !== "json") {
    throw new Error(`invalid LOG_FORMAT: ${process.env.LOG_FORMAT}`);
  }

  return {
    rpcUrl,
    wsUrl,
    keeperKeypairBase64,
    keeperKeypairPath,
    oracleKeypairBase64,
    oracleKeypairPath,
    tickIntervalMs,
    programId,
    debugFastTick: process.env.DEBUG_FAST_TICK === "1",
    ssePort,
    sseHost,
    metricsRpcUrl: process.env.HELIUS_RPC_URL ?? rpcUrl,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    logFormat: logFormatRaw as LogFormat,
  };
}
