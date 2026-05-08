"use client";
import { useEffect, useRef, useState } from "react";
import type { SeedReadout } from "@/lib/mock-events";

const VALUE_HALO =
  "0 0 6px rgba(212,165,116,0.85), 0 0 12px rgba(212,165,116,0.35)";
const SCRAMBLE_DURATION_MS = 300;
const SCRAMBLE_STEP_MS = 50;
const SCRAMBLE_CHARS = "0123456789ABCDEF";

function HaloValue({ value }: { value: string }) {
  const prevRef = useRef<string>(value);
  const [haloOn, setHaloOn] = useState(false);

  useEffect(() => {
    if (value === prevRef.current) return;
    prevRef.current = value;
    setHaloOn(true);
    const t = window.setTimeout(() => setHaloOn(false), 150);
    return () => window.clearTimeout(t);
  }, [value]);

  return (
    <span
      className="text-phosphor-bright tabular-nums"
      style={{
        textShadow: haloOn ? VALUE_HALO : "none",
        transition: haloOn ? "none" : "text-shadow 200ms linear",
      }}
    >
      {value}
    </span>
  );
}

// Renders random hex/digit characters at SCRAMBLE_STEP_MS cadence,
// matching the target string's length. Used during channel rotation
// transitions (e.g. MARKETS rotating from crypto to broader-portfolio
// rows) to sell "channel retuning" instead of an instant value swap.
function ScrambleValue({ length }: { length: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () => setTick((t) => t + 1),
      SCRAMBLE_STEP_MS
    );
    return () => window.clearInterval(id);
  }, []);
  let s = "";
  for (let i = 0; i < length; i++) {
    s += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
  }
  return <span className="text-phosphor-bright tabular-nums">{s}</span>;
}

function Channel({ s, isFirst }: { s: SeedReadout; isFirst: boolean }) {
  // The keeper rotates which sub-portfolio it sends each poll for some
  // channels (MARKETS today, others later). Whenever the row LABEL set
  // changes, run a brief scramble across the visible values before
  // settling on the new feed.
  const labelKey = s.rows.map((r) => r.label).join("|");
  const prevKey = useRef<string>(labelKey);
  const [scrambling, setScrambling] = useState(false);
  useEffect(() => {
    if (labelKey === prevKey.current) return;
    prevKey.current = labelKey;
    setScrambling(true);
    const t = window.setTimeout(
      () => setScrambling(false),
      SCRAMBLE_DURATION_MS
    );
    return () => window.clearTimeout(t);
  }, [labelKey]);

  return (
    <div
      className={
        "flex-1 px-3 py-3 " +
        (!isFirst ? "border-t border-phosphor-dim" : "")
      }
    >
      <div className="text-[12px] font-mono">
        <span className="text-phosphor-dim">{s.channel}</span>{" "}
        <span className="text-phosphor-dim">{s.category}</span>
      </div>
      <div className="mt-1 text-[12px] font-mono">
        {s.rows.map((r) => (
          <div key={r.label} className="flex">
            <span className="text-phosphor-dim w-[80px] shrink-0">
              {r.label}
            </span>
            {scrambling ? (
              <ScrambleValue length={Math.max(1, r.value.length)} />
            ) : (
              <HaloValue value={r.value} />
            )}
            {r.spread && !scrambling && (
              <span className="text-phosphor-dim ml-2">{r.spread}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeedStream({ seeds }: { seeds: SeedReadout[] }) {
  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-section text-phosphor-dim pl-3 pt-3 shrink-0">
        SEED.STREAM
      </div>
      <div className="flex-1 flex flex-col mt-3 min-h-0">
        {seeds.map((s, i) => (
          <Channel key={s.channel} s={s} isFirst={i === 0} />
        ))}
      </div>
    </div>
  );
}
