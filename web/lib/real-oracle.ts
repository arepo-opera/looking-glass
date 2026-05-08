"use client";
import { useEffect, useRef, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "../../shared/looking_glass.json";
import type { OracleState, Prophecy, SeedReadout, Status } from "./mock-events";

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "wss://api.devnet.solana.com";
const SSE_URL =
  process.env.NEXT_PUBLIC_KEEPER_SSE_URL ?? "http://localhost:7777/events";
const PROGRAM_ID_STR =
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
  "EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu";
const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);

const PROPHECY_LOG_DEPTH = 8;
const INITIAL_PROPHECY_FETCH = 8;
const REFETCH_INTERVAL_MS = 60_000; // belt-and-suspenders periodic refetch

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

function glyphsFromAccount(sq: any): string[][] {
  return (sq.glyphs as number[][]).map((row) =>
    Array.from(row).map((b) => String.fromCharCode(b))
  );
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

export function useRealOracle(): OracleState {
  const [status, setStatus] = useState<Status>("GATHERING");
  const [epoch, setEpoch] = useState(0);
  const [seeds, setSeeds] = useState<SeedReadout[]>([]);
  const [glyphs, setGlyphs] = useState<string[][]>(() =>
    Array.from({ length: 5 }, () => Array(5).fill(" "))
  );
  const [prophecies, setProphecies] = useState<Prophecy[]>([]);
  const [nextTickSeconds, setNextTickSeconds] = useState(180);
  const [blockHeight, setBlockHeight] = useState(0);
  const [rpcOk, setRpcOk] = useState(true);

  const programRef = useRef<Program | null>(null);
  const connectionRef = useRef<Connection | null>(null);
  // Tracks (deadline_ms, value_at_sync) so the local 1Hz ticker can derive
  // the displayed countdown without waiting for the next SSE update.
  const tickDeadlineRef = useRef<number | null>(null);
  // Re-entry guard for fetchEpochSquare so an SSE storm can't fan out into
  // a cascade of in-flight RPCs against the same epoch.
  const epochInFlightRef = useRef<number | null>(null);
  const lastFetchedEpochRef = useRef<number>(0);
  // Local LOCKED override window. The keeper broadcasts status on a 30s
  // timer and rarely catches the brief on-chain LOCKED state, so the cube's
  // LOCKING animation would never fire. We trigger it locally off the
  // epoch increment instead, holding status="LOCKED" for the duration of
  // the scramble + flash + post-lock pause and then handing back to the
  // server's most-recent status.
  const lockOverrideTimeoutRef = useRef<number | null>(null);
  const pendingServerStatusRef = useRef<Status | null>(null);
  // Liveness telemetry for the stability watchdog. Wall-clock timestamps
  // (Date.now()) — refs not state so we don't churn React on every event.
  const lastSseEventAtRef = useRef<number>(0);
  const lastRpcOkAtRef = useRef<number>(0);
  const lastRpcFailAtRef = useRef<number>(0);
  const sseReconnectsRef = useRef<number>(0);
  const sseEventCountRef = useRef<number>(0);
  // Forces the SSE useEffect to re-run, used by the watchdog when the
  // stream goes silent for too long without an explicit error firing.
  const [sseEpoch, setSseEpoch] = useState(0);

  // Build anchor client
  useEffect(() => {
    const connection = new Connection(RPC_URL, {
      commitment: "confirmed",
      wsEndpoint: WS_URL,
    });
    connectionRef.current = connection;
    const provider = new AnchorProvider(connection, READ_ONLY_WALLET, {
      commitment: "confirmed",
    });
    programRef.current = new Program(idl as any, provider);
    // eslint-disable-next-line no-console
    console.info(`[lg] anchor client ready, rpc=${RPC_URL}`);
  }, []);

  // ---------- on-chain fetches -------------------------------------------

  async function fetchEpochSquare(ep: number): Promise<{
    epoch: number;
    ts: number;
    glyphs: string[][];
    text: string;
  } | null> {
    const program = programRef.current;
    if (!program || ep <= 0) return null;
    if (epochInFlightRef.current === ep) return null;
    epochInFlightRef.current = ep;
    try {
      const sq: any = await (program.account as any).epochSquare.fetch(
        epochSquarePda(ep)
      );
      const text = decodeUri(sq.prophecyUri ?? "");
      lastRpcOkAtRef.current = Date.now();
      // eslint-disable-next-line no-console
      console.debug(`[lg] RPC ok: epochSquare ${ep} (text_len=${text.length})`);
      return {
        epoch: ep,
        ts: Number(sq.lockedAt),
        glyphs: glyphsFromAccount(sq),
        text,
      };
    } catch (e) {
      lastRpcFailAtRef.current = Date.now();
      // eslint-disable-next-line no-console
      console.warn(
        `[lg] RPC fail: epochSquare ${ep} → ${(e as Error)?.message ?? e}`
      );
      return null;
    } finally {
      if (epochInFlightRef.current === ep) epochInFlightRef.current = null;
    }
  }

  async function pullEpoch(ep: number, opts: { setGlyphs: boolean }): Promise<void> {
    const result = await fetchEpochSquare(ep);
    if (!result) return;
    if (opts.setGlyphs) setGlyphs(result.glyphs);
    if (result.text) {
      setProphecies((p) => {
        const filtered = p.filter((q) => q.epoch !== result.epoch);
        return [
          {
            epoch: result.epoch,
            ts: result.ts,
            text: result.text,
            glyphs: result.glyphs,
          },
          ...filtered,
        ].slice(0, PROPHECY_LOG_DEPTH);
      });
    }
    lastFetchedEpochRef.current = Math.max(lastFetchedEpochRef.current, ep);
  }

  async function hydrateFromChain(): Promise<void> {
    const program = programRef.current;
    if (!program) return;
    try {
      // eslint-disable-next-line no-console
      console.info("[lg] hydrating from chain…");
      const lg: any = await (program.account as any).lookingGlass.fetch(
        lookingGlassPda()
      );
      const onChainEpoch = Number(lg.epoch);
      const lastTickTs = Number(lg.lastTickTs);
      lastRpcOkAtRef.current = Date.now();
      // eslint-disable-next-line no-console
      console.info(
        `[lg] hydrate ok: lookingGlass.epoch=${onChainEpoch} lastTickTs=${lastTickTs}`
      );
      setEpoch(onChainEpoch);
      // Initialise the local countdown from the on-chain timestamp so we have
      // an authoritative anchor even before the keeper's first SSE status.
      if (lastTickTs > 0) {
        const nextTickAt = (lastTickTs + 180) * 1000;
        tickDeadlineRef.current = nextTickAt;
        setNextTickSeconds(Math.max(0, Math.round((nextTickAt - Date.now()) / 1000)));
      }
      setRpcOk(true);

      if (onChainEpoch > 0) {
        // Fetch a window of recent EpochSquare PDAs in parallel.
        const targets: number[] = [];
        for (let i = 0; i < INITIAL_PROPHECY_FETCH && onChainEpoch - i >= 1; i++) {
          targets.push(onChainEpoch - i);
        }
        const results = await Promise.all(targets.map((t) => fetchEpochSquare(t)));
        const populated = results.filter((r): r is NonNullable<typeof r> => r !== null);
        if (populated.length > 0) {
          // The latest one drives the visible cube glyphs.
          const latest = populated.find((r) => r.epoch === onChainEpoch);
          if (latest) setGlyphs(latest.glyphs);
          // Prophecy log: any EpochSquare that has prophecy_submitted text.
          const log: Prophecy[] = populated
            .filter((r) => r.text)
            .map((r) => ({
              epoch: r.epoch,
              ts: r.ts,
              text: r.text,
              glyphs: r.glyphs,
            }))
            .sort((a, b) => b.epoch - a.epoch)
            .slice(0, PROPHECY_LOG_DEPTH);
          setProphecies(log);
        }
        lastFetchedEpochRef.current = onChainEpoch;
      }
      // eslint-disable-next-line no-console
      console.info(`[lg] hydrated. epoch=${onChainEpoch}`);
    } catch (e) {
      lastRpcFailAtRef.current = Date.now();
      setRpcOk(false);
      // eslint-disable-next-line no-console
      console.warn(
        `[lg] hydrate failed: ${(e as Error)?.message ?? e}`
      );
    }
  }

  // Hydrate on mount + every 60s as a safety net for the rare case where an
  // SSE update is missed (network blip, server restart between status pings).
  useEffect(() => {
    if (!programRef.current) return;
    hydrateFromChain();
    const id = window.setInterval(hydrateFromChain, REFETCH_INTERVAL_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programRef.current]);

  // ---------- SSE channel -------------------------------------------------

  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;

    function open() {
      try {
        // eslint-disable-next-line no-console
        console.info(
          `[lg] SSE open() → ${SSE_URL} (reconnect #${sseReconnectsRef.current})`
        );
        es = new EventSource(SSE_URL);
        es.onopen = () => {
          // eslint-disable-next-line no-console
          console.info(
            `[lg] SSE OPEN (readyState=${es?.readyState ?? "?"}) reconnects=${sseReconnectsRef.current}`
          );
          lastSseEventAtRef.current = Date.now();
        };
        es.onmessage = (e) => {
          lastSseEventAtRef.current = Date.now();
          sseEventCountRef.current += 1;
          let data: LiveEvent;
          try {
            data = JSON.parse(e.data);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[lg] SSE: bad JSON payload", err);
            return;
          }
          // eslint-disable-next-line no-console
          console.debug(
            `[lg] SSE msg #${sseEventCountRef.current} type=${data.type}` +
              (data.type === "status"
                ? ` epoch=${data.epoch} status=${data.status}`
                : "")
          );
          switch (data.type) {
            case "seeds":
              setSeeds(data.seeds);
              break;
            case "status": {
              setEpoch(data.epoch);
              // Reset the local countdown's deadline. The keeper's authoritative
              // value is `nextTickSeconds` measured at `ts`; convert to an
              // absolute wall-clock deadline so the local 1Hz ticker can derive
              // the displayed countdown going forward.
              tickDeadlineRef.current =
                Date.now() + data.nextTickSeconds * 1000;
              setNextTickSeconds(data.nextTickSeconds);
              const epochAdvanced =
                data.epoch > 0 && data.epoch > lastFetchedEpochRef.current;
              if (epochAdvanced) {
                // Hydrate the new square + drive the LOCKING animation
                // locally. Holding status="LOCKED" for ~4.5s lets the cube's
                // scramble/settle/flash sequence run to completion before we
                // hand control back to the keeper's status feed.
                setStatus("LOCKED");
                if (lockOverrideTimeoutRef.current !== null) {
                  window.clearTimeout(lockOverrideTimeoutRef.current);
                }
                pendingServerStatusRef.current =
                  data.status === "LOCKED" ? "GATHERING" : data.status;
                lockOverrideTimeoutRef.current = window.setTimeout(() => {
                  const next =
                    pendingServerStatusRef.current ?? "GATHERING";
                  setStatus(next);
                  pendingServerStatusRef.current = null;
                  lockOverrideTimeoutRef.current = null;
                }, 4500);
                void pullEpoch(data.epoch, { setGlyphs: true });
              } else if (lockOverrideTimeoutRef.current !== null) {
                // Don't clobber the local LOCKED override mid-animation —
                // remember the latest server status and apply it when the
                // override timer expires.
                pendingServerStatusRef.current = data.status;
              } else {
                setStatus(data.status);
              }
              break;
            }
            case "prophecy":
              if (data.epoch > 0) {
                void pullEpoch(data.epoch, { setGlyphs: false });
              }
              break;
            default:
              // eslint-disable-next-line no-console
              console.warn("[lg] SSE: unknown event type", (data as any)?.type);
          }
        };
        es.onerror = () => {
          // eslint-disable-next-line no-console
          console.warn(
            `[lg] SSE onerror (readyState=${es?.readyState ?? "?"}) reconnecting in 5s`
          );
          es?.close();
          es = null;
          sseReconnectsRef.current += 1;
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
    // sseEpoch is the watchdog's force-reconnect signal — bumping it
    // re-runs this effect, which closes the old EventSource and opens
    // a new one even when the browser reports the existing connection
    // as still OPEN (silent-zombie case observed on Vercel/Railway).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sseEpoch]);

  // Lock-override timeout is owned by component lifetime, not SSE
  // reconnect — clearing it on every watchdog kick would cancel an
  // in-progress scramble animation.
  useEffect(() => {
    return () => {
      if (lockOverrideTimeoutRef.current !== null) {
        window.clearTimeout(lockOverrideTimeoutRef.current);
        lockOverrideTimeoutRef.current = null;
      }
    };
  }, []);

  // ---------- Liveness watchdog + heartbeat ------------------------------
  //
  // Two failure modes observed in the wild:
  //  (A) EventSource sits in readyState=OPEN but no events have arrived in
  //      minutes — Railway/Vercel proxy dropped the upstream socket
  //      silently, browser never noticed. The standard `onerror` reconnect
  //      flow never fires here.
  //  (B) Anchor RPC fetches start failing intermittently after a while
  //      (public devnet rate-limit drift), but no UI signal shows it.
  //
  // The heartbeat logs current state every 30s so the moment the stream
  // freezes is visible in the console. The watchdog forces an SSE
  // reconnect after 90s of silence (15s SSE keep-alive ping cadence × 6).
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const sseAge = lastSseEventAtRef.current
        ? Math.round((now - lastSseEventAtRef.current) / 1000)
        : -1;
      const rpcAge = lastRpcOkAtRef.current
        ? Math.round((now - lastRpcOkAtRef.current) / 1000)
        : -1;
      const rpcFailAge = lastRpcFailAtRef.current
        ? Math.round((now - lastRpcFailAtRef.current) / 1000)
        : -1;
      // eslint-disable-next-line no-console
      console.info(
        `[lg] alive — sse_last=${sseAge}s rpc_last=${rpcAge}s rpc_fail_last=${rpcFailAge}s ` +
          `sse_msgs=${sseEventCountRef.current} sse_reconnects=${sseReconnectsRef.current} ` +
          `epoch=${epoch} status=${status}`
      );
      // Watchdog: if the SSE has gone silent for >90s, force a reconnect.
      // The keeper sends `: ping\n\n` every 15s, so 90s without any event
      // (data or comment) is well past any normal quiet period.
      if (sseAge > 90 && lastSseEventAtRef.current > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `[lg] SSE watchdog: ${sseAge}s silent — forcing reconnect`
        );
        sseReconnectsRef.current += 1;
        setSseEpoch((n) => n + 1);
      }
    }, 30_000);
    return () => window.clearInterval(id);
  }, [epoch, status]);

  // ---------- 1Hz local countdown ----------------------------------------

  useEffect(() => {
    const id = window.setInterval(() => {
      const dl = tickDeadlineRef.current;
      if (dl === null) return;
      const remaining = Math.max(0, Math.round((dl - Date.now()) / 1000));
      setNextTickSeconds((prev) => (prev === remaining ? prev : remaining));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // ---------- block height heartbeat -------------------------------------

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionRef.current]);

  return {
    status,
    epoch,
    seeds,
    glyphs,
    prophecies,
    nextTickSeconds,
    programId: PROGRAM_ID_STR,
    blockHeight,
    rpcOk,
  };
}
