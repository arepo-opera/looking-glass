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
  // Highest epoch we've successfully *fetched* a square for — used by
  // pullEpoch as a "have we hydrated this one" guard. Updated by both the
  // 60s periodic hydrate and SSE-driven pullEpoch calls.
  const lastFetchedEpochRef = useRef<number>(0);
  // Highest epoch we've *animated* through. Separate from lastFetchedEpochRef
  // so the 60s hydrate's silent fetches don't suppress the LOCKING
  // animation when the next SSE event arrives — without this, the hydrate
  // can race ahead and bump lastFetchedEpochRef before the SSE handler
  // sees the new epoch, and the animation never fires for that lock.
  // Initialized null so the very first observed epoch (mount) doesn't
  // trigger a spurious animation.
  const lastAnimatedEpochRef = useRef<number | null>(null);
  // Highest on-chain epoch we've used to *anchor* the countdown deadline.
  // The 60s periodic hydrate must not re-anchor on every poll because RPC
  // can return a slightly stale lastTickTs that, when refreshed a poll
  // later with the correct value, produces an apparent forward jump in
  // the displayed countdown (the bug we observed: 22s → 48s). The
  // deadline is re-anchored only when the on-chain epoch is strictly
  // greater than this ref.
  const lastDeadlineEpochRef = useRef<number>(0);
  // Local status override. The keeper broadcasts status on a 30s timer
  // and almost never catches the brief on-chain SOLVING/LOCKED/READING
  // window, so the dashboard cycles status locally off the epoch
  // increment instead. The override fires through the four phases that
  // match the cube's scramble→tumble→flash→settled timing, then hands
  // back to the keeper's most-recent status.
  const overrideTimeoutsRef = useRef<number[]>([]);
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
      // Re-anchor the countdown deadline only when the on-chain epoch
      // has advanced past the last anchor. Periodic hydrates that see
      // the same epoch leave the deadline alone — RPC's lastTickTs can
      // wobble by ±a few seconds across reads (different validator
      // observations), and re-anchoring on every poll surfaces that
      // wobble as forward jumps in the displayed countdown. The 1Hz
      // local interval (the only writer of nextTickSeconds state) keeps
      // ticking down from the existing anchor.
      if (lastTickTs > 0 && onChainEpoch > lastDeadlineEpochRef.current) {
        const nextTickAt = (lastTickTs + 180) * 1000;
        tickDeadlineRef.current = nextTickAt;
        lastDeadlineEpochRef.current = onChainEpoch;
        // eslint-disable-next-line no-console
        console.info(
          `[lg] countdown anchor reset: epoch=${onChainEpoch} lastTickTs=${lastTickTs} deadline=+${Math.round((nextTickAt - Date.now()) / 1000)}s`
        );
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

  // ---------- Status override (cube animation phases) --------------------
  //
  // Cube animation timeline (from SatorSquare3DCanvas):
  //   SOLVING       row activation flicker     2000ms
  //   LOCKING       per-cell scramble          ~2000ms
  //                 settlement window          1500ms
  //                 worst-case tumble + flash   450ms
  //                 post-lock pause             250ms
  //                 → cs auto-transitions to LOCKED
  //   READING       directional sweeps × 8    ~6000ms (Phase 15 sweep)
  //
  // The status override drives the *pill* display and signals the cube
  // to enter each phase. LOCKED phase is held for 5000ms to give the
  // cube's full scramble + settle + flash + post-lock chain (worst-case
  // ~4200ms) margin to finish before status flips to READING and the
  // sweeps begin.
  function clearStatusOverride() {
    for (const t of overrideTimeoutsRef.current) window.clearTimeout(t);
    overrideTimeoutsRef.current = [];
  }
  function runStatusOverride(serverStatus: Status) {
    clearStatusOverride();
    pendingServerStatusRef.current =
      serverStatus === "LOCKED" ||
      serverStatus === "SOLVING" ||
      serverStatus === "READING" ||
      serverStatus === "WAITING"
        ? "GATHERING"
        : serverStatus;
    // Dissolution + waiting already happened (driven off nextTickSeconds
    // hitting 0). Epoch advance here means the keeper has confirmed the
    // tick — fire LOCKED immediately so the cube starts scramble from
    // the empty/dissolved grid, then READING sweeps, then GATHERING.
    setStatus("LOCKED");
    overrideTimeoutsRef.current.push(
      window.setTimeout(() => setStatus("READING"), 5000)
    );
    overrideTimeoutsRef.current.push(
      window.setTimeout(() => {
        setStatus(pendingServerStatusRef.current ?? "GATHERING");
        pendingServerStatusRef.current = null;
        overrideTimeoutsRef.current = [];
      }, 11000)
    );
  }

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
              // Note: we deliberately do NOT update tickDeadlineRef from
              // SSE here. The keeper's nextTickSeconds is computed at
              // broadcast time and arrives out-of-phase with the local
              // tick — overriding the deadline on each SSE event made
              // the displayed countdown jump backwards every ~30s. The
              // deadline is owned by hydrateFromChain (every 60s + on
              // every observed epoch advance), which derives it from
              // the on-chain lastTickTs.
              const epochAdvanced =
                lastAnimatedEpochRef.current !== null &&
                data.epoch > 0 &&
                data.epoch > lastAnimatedEpochRef.current;
              if (lastAnimatedEpochRef.current === null && data.epoch > 0) {
                // First observed epoch — record but don't animate.
                lastAnimatedEpochRef.current = data.epoch;
              }
              if (epochAdvanced) {
                lastAnimatedEpochRef.current = data.epoch;
                // Phased status override matches the cube's animation
                // timeline: SOLVING during scramble, LOCKED during
                // tumble+flash, READING after lock, then hand back.
                runStatusOverride(data.status);
                // Refresh the on-chain countdown deadline immediately —
                // the new tick just happened, so deadline = now + 180s.
                // Also bump lastDeadlineEpochRef so the next periodic
                // hydrate doesn't re-anchor with a stale lastTickTs.
                tickDeadlineRef.current = Date.now() + 180_000;
                lastDeadlineEpochRef.current = data.epoch;
                // eslint-disable-next-line no-console
                console.info(
                  `[lg] countdown anchor reset (epoch advance): epoch=${data.epoch}`
                );
                void pullEpoch(data.epoch, { setGlyphs: true });
              } else if (overrideTimeoutsRef.current.length > 0) {
                // Don't clobber an in-flight override — remember the
                // latest server status and apply it when the override
                // chain ends.
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

  // Status-override timeouts are owned by component lifetime, not SSE
  // reconnect — clearing them on every watchdog kick would cancel an
  // in-progress scramble animation.
  useEffect(() => {
    return () => {
      clearStatusOverride();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // The ONLY writer of nextTickSeconds. Every other code path that wants
  // to influence the displayed countdown must do so via tickDeadlineRef
  // (which only changes when the on-chain epoch advances or on the very
  // first hydrate). This keeps the displayed number a pure function of
  // (anchor, wall clock) — monotonically decreasing within a tick window,
  // resetting only at epoch boundaries.
  useEffect(() => {
    const id = window.setInterval(() => {
      const dl = tickDeadlineRef.current;
      if (dl === null) return;
      const remaining = Math.max(0, Math.round((dl - Date.now()) / 1000));
      // eslint-disable-next-line no-console
      console.log("[lg] countdown", {
        deadlineEpoch: lastDeadlineEpochRef.current,
        remainingSec: remaining,
        source: "interval",
      });
      setNextTickSeconds((prev) => (prev === remaining ? prev : remaining));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // When the countdown hits zero and we're still in GATHERING, transition
  // to WAITING so the cube can dissolve and the dashboard can show the
  // "machine working" status text. The override chain (kicked off by the
  // SSE epoch advance) takes over from there.
  useEffect(() => {
    if (nextTickSeconds === 0 && status === "GATHERING") {
      // eslint-disable-next-line no-console
      console.log("[lg.anim]", {
        ts: Date.now(),
        event: "timer-zero-enter-waiting",
      });
      setStatus("WAITING");
    }
  }, [nextTickSeconds, status]);

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
