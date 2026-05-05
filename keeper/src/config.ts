import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

export interface Config {
  rpcUrl: string;
  wsUrl: string;
  keeperKeypairPath: string;
  oracleKeypairPath: string;
  tickIntervalMs: number;
  programId: string;
  debugFastTick: boolean;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`missing env var ${name} (see keeper/.env.example)`);
  }
  return v;
}

export function loadConfig(): Config {
  const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8899";
  const wsUrl = process.env.WS_URL ?? rpcUrl.replace(/^http/, "ws").replace(/8899$/, "8900");
  const tickIntervalMs = Number(process.env.TICK_INTERVAL_MS ?? "30000");
  if (!Number.isFinite(tickIntervalMs) || tickIntervalMs <= 0) {
    throw new Error(`invalid TICK_INTERVAL_MS: ${process.env.TICK_INTERVAL_MS}`);
  }
  return {
    rpcUrl,
    wsUrl,
    keeperKeypairPath: required("KEEPER_KEYPAIR_PATH"),
    oracleKeypairPath: required("ORACLE_KEYPAIR_PATH"),
    tickIntervalMs,
    programId: required("PROGRAM_ID"),
    debugFastTick: process.env.DEBUG_FAST_TICK === "1",
  };
}
