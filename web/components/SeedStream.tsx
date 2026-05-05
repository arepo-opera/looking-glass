"use client";
import type { SeedReadout } from "@/lib/mock-events";

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
                  <span className="text-phosphor-bright tabular-nums">
                    {r.value}
                  </span>
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
