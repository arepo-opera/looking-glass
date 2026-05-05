"use client";
import { useState } from "react";
import type { Prophecy } from "@/lib/mock-events";

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function formatTs(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${p(d.getUTCDate())}${MONTHS[d.getUTCMonth()]}${String(
      d.getUTCFullYear()
    ).slice(-2)} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}UTC`
  );
}

export function ProphecyLog({ prophecies }: { prophecies: Prophecy[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-section text-phosphor-dim pl-3 pt-3 shrink-0">
        PROPHECY.LOG
      </div>
      <div className="flex-1 flex flex-col mt-3 overflow-hidden">
        {prophecies.map((p, i) => {
          const opacity = hovered === p.epoch ? 1 : Math.max(0.35, 1 - i * 0.1);
          return (
            <div
              key={p.epoch}
              className="px-3 py-2"
              style={{ opacity }}
              onMouseEnter={() => setHovered(p.epoch)}
              onMouseLeave={() =>
                setHovered((h) => (h === p.epoch ? null : h))
              }
            >
              <div className="text-[12px] font-mono flex justify-between">
                <span className="text-phosphor-bright">
                  EP.{String(p.epoch).padStart(4, "0")}
                </span>
                <span className="text-phosphor-dim">{formatTs(p.ts)}</span>
              </div>
              <div className="text-phosphor-dim text-[12px] my-1">─</div>
              {hovered === p.epoch ? (
                <div className="grid grid-cols-5 gap-x-2 my-1 max-w-[160px]">
                  {p.glyphs.flat().map((g, j) => (
                    <div
                      key={j}
                      className="text-phosphor-bright font-serif text-center text-[20px] leading-none"
                    >
                      {g}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] font-mono text-phosphor-bright whitespace-pre-wrap">
                  {p.text}
                </div>
              )}
              <div className="text-phosphor-dim text-[12px] mt-1">─</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
