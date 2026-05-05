import {
  ClientCtx,
  epochSquarePda,
} from "./anchor-client";
import { log } from "./logger";
import { generateProphecy } from "./prophecy-generator";
import { submitProphecy } from "./submit";

const SEED_NAMES = ["MARKETS", "CHAIN", "WORLD", "HEAVENS", "ECHO"];
const MONTHS_NUMERIC = [
  "01","02","03","04","05","06","07","08","09","10","11","12",
];

export function shortHexHeadTail(
  bytes: Uint8Array | number[],
  head = 4,
  tail = 4
): string {
  const buf = Buffer.from(bytes as any);
  const hex = buf.toString("hex");
  if (head + tail >= buf.length) return hex;
  return `${hex.slice(0, head * 2)}...${hex.slice(-tail * 2)}`;
}

export function shortHexHead(
  bytes: Uint8Array | number[],
  head = 4
): string {
  return `${Buffer.from(bytes as any).toString("hex").slice(0, head * 2)}...`;
}

function pad(n: number | bigint, width: number): string {
  return String(n).padStart(width, "0");
}

function fmtUtcLockedAt(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${MONTHS_NUMERIC[d.getUTCMonth()]}-${p(
      d.getUTCDate()
    )} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`
  );
}

export function printSquareBanner(ep: any): void {
  const epoch = Number(ep.epoch);
  const grid: number[][] = (ep.glyphs as number[][]).map((row) =>
    Array.from(row)
  );
  log.blank();
  log.rule();
  log.data(
    `EPOCH ${pad(epoch, 4)}    LOCKED ${fmtUtcLockedAt(Number(ep.lockedAt))}`
  );
  log.data(`NONCE ${pad(Number(ep.nonce), 8)}`);
  log.rule();
  log.blank();
  for (const row of grid) {
    log.data("  " + row.map((b) => String.fromCharCode(b)).join("   "));
  }
  log.blank();
  log.rule();
  log.data(`FORWARD  : ${shortHexHeadTail(ep.forwardDigest)}`);
  log.data(`BACKWARD : ${shortHexHeadTail(ep.backwardDigest)}`);
  log.data("SEEDS:");
  for (let i = 0; i < SEED_NAMES.length; i++) {
    log.data(`  ${SEED_NAMES[i].padEnd(7)}  ${shortHexHead(ep.seeds[i])}`);
  }
  log.rule();
  log.blank();
}

export async function respondToProphecyRequest(
  ctx: ClientCtx,
  ep: any
): Promise<void> {
  const epoch = Number(ep.epoch);
  printSquareBanner(ep);

  if (ep.prophecySubmitted) {
    log.system(
      `epoch ${epoch} already has a prophecy on-chain; nothing to do.`
    );
    return;
  }

  const forward = Uint8Array.from(ep.forwardDigest);
  const prophecy = generateProphecy({ forwardDigest: forward });
  log.system("prophecy:");
  for (const line of prophecy.text.split("\n")) {
    log.data(`  ${line}`);
  }

  try {
    const sig = await submitProphecy(ctx, epoch, prophecy.uri, prophecy.hash);
    log.system(
      `prophecy born — hash ${shortHexHeadTail(prophecy.hash)} — tx ${sig.slice(0, 8)}...`
    );
  } catch (e: any) {
    const s = String(e?.message ?? e);
    if (s.includes("AlreadySubmitted")) {
      log.system(`prophecy already submitted on-chain; treating as a no-op.`);
    } else {
      log.system(`submit failed: ${s}`);
    }
  }
}

export function startListener(ctx: ClientCtx): number {
  const subId = ctx.program.addEventListener(
    "ProphecyRequested" as any,
    async (event: any, slot: number, signature: string) => {
      const epoch = Number(event.epoch);
      log.system(
        `event ProphecyRequested epoch=${epoch} slot=${slot} sig=${signature.slice(0, 8)}...`
      );
      try {
        const ep: any = await (ctx.program.account as any).epochSquare.fetch(
          epochSquarePda(ctx.programId, epoch)
        );
        await respondToProphecyRequest(ctx, ep);
      } catch (e: any) {
        log.system(`listener error: ${e?.message ?? e}`);
      }
    }
  );
  return subId;
}
