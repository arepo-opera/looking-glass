"use client";
import { useEffect, useRef, useState } from "react";
import type { SeedReadout } from "@/lib/mock-events";

const VALUE_HALO =
  "0 0 6px rgba(212,165,116,0.85), 0 0 12px rgba(212,165,116,0.35)";

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

export function SeedStream({ seeds }: { seeds: SeedReadout[] }) {
  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-section text-phosphor-dim pl-3 pt-3 shrink-0">
        SEED.STREAM
      </div>
      <div className="flex-1 flex flex-col mt-3 min-h-0">
        {seeds.map((s, i) => (
          <div
            key={s.channel}
            className={
              "flex-1 px-3 py-3 " +
              (i > 0 ? "border-t border-phosphor-dim" : "")
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
                  <HaloValue value={r.value} />
                  {r.spread && (
                    <span className="text-phosphor-dim ml-2">{r.spread}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
