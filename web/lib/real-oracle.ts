"use client";
import { useEffect, useRef, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "../../shared/looking_glass.json";
import type { OracleState, Prophecy, SeedReadout, Status } from "./mock-events";

const MIN_TICK_INTERVAL = 180;
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8899";
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:8900";
const SSE_URL =
  process.env.NEXT_PUBLIC_KEEPER_SSE_URL ?? "http://localhost:7777/events";
const PROGRAM_ID_STR =
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
  "GTEVyfq7zL91k1zjZrJCmkeidBvgDfMdEXUUsMcQWq5r";
const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);

const READ_ONLY_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async (tx: any) => tx,
  signAllTransactions: async (txs: any[]) => txs,
} as any;

function lookingGlassPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("looking_glass")],
    PROGRAM_ID
  )[0];
}

function epochSquarePda(epoch: number | bigint): PublicKey {
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

interface SeedsEvent {
  type: "seeds";
  seeds: SeedReadout[];
  ts: number;
}
interface StatusEvent {
  type: "status";
  status: Status;
  epoch: number;
  nextTickSeconds: number;
  ts: number;
}
interface ProphecyEvent {
  type: "prophecy";
  epoch: number;
  text: string;
  hash: string;
  ts: number;
}
type LiveEvent = SeedsEvent | StatusEvent | ProphecyEvent;

const STARTING_BLOCK = 0;
const PROGRAM_ID_DISPLAY = PROGRAM_ID_STR;

export function useRealOracle(): OracleState {
  const [status, setStatus] = useState<Status>("GATHERING");
  const [epoch, setEpoch] = useState(0);
  const [seeds, setSeeds] = useState<SeedReadout[]>([]);
  const [glyphs, setGlyphs] = useState<string[][]>(() =>
    Array.from({ length: 5 }, () => Array(5).fill(" "))
  );
  const [prophecies, setProphecies] = useState<Prophecy[]>([]);
  const [nextTickSeconds, setNextTickSeconds] = useState(MIN_TICK_INTERVAL);
  const [blockHeight, setBlockHeight] = useState(STARTING_BLOCK);
  const [rpcOk, setRpcOk] = useState(true);
  const programRef = useRef<Program | null>(null);
  const connectionRef = useRef<Connection | null>(null);

  // Build anchor client + initial state pull
  useEffect(() => {
    const connection = new Connection(RPC_URL, {
      commitment: "confirmed",
      wsEndpoint: WS_URL,
    });
    connectionRef.current = connection;
    const provider = new AnchorProvider(connection, READ_ONLY_WALLET, {
      commitment: "confirmed",
    });
    const program = new Program(idl as any, provider);
    programRef.current = program;

    const lgPda = lookingGlassPda();

    let cancelled = false;

    async function loadInitial() {
      try {
        const lg: any = await (program.account as any).lookingGlass.fetch(lgPda);
        if (cancelled) return;
        const ep = Number(lg.epoch);
        setEpoch(ep);
        if (ep > 0) {
          // grid from latest locked EpochSquare
          try {
            const sq: any = await (program.account as any).epochSquare.fetch(
              epochSquarePda(ep)
            );
            if (!cancelled) {
              setGlyphs(
                (sq.glyphs as number[][]).map((row) =>
                  Array.from(row).map((b) => String.fromCharCode(b))
                )
              );
            }
          } catch {}
          // walk backwards through the ring for the prophecy log
          const log: Prophecy[] = [];
          for (let i = 0; i < 8 && ep - i >= 1; i++) {
            const target = ep - i;
            try {
              const sq: any = await (program.account as any).epochSquare.fetch(
                epochSquarePda(target)
              );
              const text = decodeUri(sq.prophecyUri ?? "");
              if (!text) continue;
              log.push({
                epoch: target,
                ts: Number(sq.lockedAt),
                text,
                glyphs: (sq.glyphs as number[][]).map((row) =>
                  Array.from(row).map((b) => String.fromCharCode(b))
                ),
              });
            } catch {
              // missing epoch
            }
          }
          if (!cancelled) setProphecies(log);
        }
        setRpcOk(true);
      } catch (e) {
        setRpcOk(false);
      }
    }
    loadInitial();

    // Subscribe to ProphecyRequested → update glyphs immediately when a new
    // square is locked, even before the keeper SSE catches up.
    const requestedSub = program.addEventListener(
      "ProphecyRequested" as any,
      async (event: any) => {
        const ev = Number(event.epoch);
        try {
          const sq: any = await (program.account as any).epochSquare.fetch(
            epochSquarePda(ev)
          );
          setEpoch(ev);
          setGlyphs(
            (sq.glyphs as number[][]).map((row) =>
              Array.from(row).map((b) => String.fromCharCode(b))
            )
          );
        } catch {}
      }
    );
    const bornSub = program.addEventListener(
      "ProphecyBorn" as any,
      async (event: any) => {
        const ev = Number(event.epoch);
        try {
          const sq: any = await (program.account as any).epochSquare.fetch(
            epochSquarePda(ev)
          );
          const text = decodeUri(sq.prophecyUri ?? "");
          if (!text) return;
          setProphecies((p) =>
            [
              {
                epoch: ev,
                ts: Number(sq.lockedAt),
                text,
                glyphs: (sq.glyphs as number[][]).map((row) =>
                  Array.from(row).map((b) => String.fromCharCode(b))
                ),
              },
              ...p.filter((q) => q.epoch !== ev),
            ].slice(0, 8)
          );
        } catch {}
      }
    );

    return () => {
      cancelled = true;
      try {
        program.removeEventListener(requestedSub);
        program.removeEventListener(bornSub);
      } catch {}
    };
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SSE: keeper-driven seed displays + status updates
  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;

    function open() {
      try {
        // eslint-disable-next-line no-console
        console.info(`[lg] opening SSE → ${SSE_URL}`);
        es = new EventSource(SSE_URL);
        es.onopen = () => {
          // eslint-disable-next-line no-console
          console.info("[lg] SSE connected");
        };
        es.onmessage = (e) => {
          let data: LiveEvent;
          try {
            data = JSON.parse(e.data);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[lg] SSE: bad JSON payload", err, e.data?.slice?.(0, 80));
            return;
          }
          switch (data.type) {
            case "seeds":
              setSeeds(data.seeds);
              break;
            case "status":
              setStatus(data.status);
              setEpoch(data.epoch);
              setNextTickSeconds(data.nextTickSeconds);
              break;
            case "prophecy":
              // Duplicate of the on-chain ProphecyBorn listener; the
              // setProphecies dedupe handles overlap.
              break;
            default:
              // eslint-disable-next-line no-console
              console.warn("[lg] SSE: unknown event type", (data as any)?.type);
          }
        };
        es.onerror = (err) => {
          // eslint-disable-next-line no-console
          console.warn("[lg] SSE error, reconnecting in 5s", err);
          es?.close();
          es = null;
          retry = setTimeout(open, 5000);
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[lg] SSE constructor threw, retrying in 5s", err);
        retry = setTimeout(open, 5000);
      }
    }
    open();

    return () => {
      if (retry) clearTimeout(retry);
      es?.close();
    };
  }, []);

  // Block height ticker (cheap heartbeat)
  useEffect(() => {
    const conn = connectionRef.current;
    if (!conn) return;
    let cancelled = false;
    async function tick() {
      try {
        const slot = await conn!.getSlot("confirmed");
        if (!cancelled) {
          setBlockHeight(slot);
          setRpcOk(true);
        }
      } catch {
        if (!cancelled) setRpcOk(false);
      }
    }
    tick();
    const id = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return {
    status,
    epoch,
    seeds,
    glyphs,
    prophecies,
    nextTickSeconds,
    programId: PROGRAM_ID_DISPLAY,
    blockHeight,
    rpcOk,
  };
}
