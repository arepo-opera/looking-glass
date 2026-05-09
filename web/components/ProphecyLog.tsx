"use client";
import { useEffect, useState } from "react";
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

interface AnnotationDoc {
  annotation_id: string;
  agent_id: string;
  agent_name: string;
  annotation_text: string;
  pattern_claims: Array<{ claim_type: string; claim_text: string }>;
  submitted_at_ts: number;
}

function WitnessExpandable({ epoch }: { epoch: number }) {
  const [annotations, setAnnotations] = useState<AnnotationDoc[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/annotations/target/epoch/${epoch}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const list: AnnotationDoc[] = Array.isArray(data?.annotations)
          ? data.annotations
          : [];
        setAnnotations(list);
      })
      .catch(() => {
        /* swallow — annotations are optional */
      });
    return () => {
      cancelled = true;
    };
  }, [epoch]);
  if (!annotations || annotations.length === 0) return null;
  const n = annotations.length;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="bg-transparent border-0 p-0 m-0 font-mono text-[10px] cursor-pointer no-underline hover:underline text-phosphor-dim"
      >
        {open ? "▾" : "▸"} {n} witness{n === 1 ? "" : "es"} {n === 1 ? "has" : "have"} spoken on this reading
      </button>
      {open ? (
        <div className="mt-2 pl-3 border-l border-phosphor-dim/30 space-y-2">
          {annotations.map((a) => (
            <div key={a.annotation_id} className="text-[10px] font-mono">
              <div className="text-phosphor-dim">
                {a.agent_name || a.agent_id}
              </div>
              <div className="text-phosphor-bright whitespace-pre-wrap leading-snug mt-1">
                {a.annotation_text}
              </div>
              {a.pattern_claims && a.pattern_claims.length > 0 ? (
                <div className="mt-1 text-phosphor-dim">
                  {a.pattern_claims.map((c, i) => (
                    <div key={i}>
                      · {c.claim_type}: {c.claim_text}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
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
          const opacity =
            hovered === p.epoch ? 1 : Math.max(0.32, 1 - i * 0.11);
          return (
            <div
              key={p.epoch}
              className="px-3 py-3"
              style={{ opacity }}
              onMouseEnter={() => setHovered(p.epoch)}
              onMouseLeave={() =>
                setHovered((h) => (h === p.epoch ? null : h))
              }
            >
              <div className="text-[12px] font-mono flex justify-between mb-2">
                <span className="text-phosphor-bright">
                  EP.{String(p.epoch).padStart(4, "0")}
                </span>
                <span className="text-phosphor-dim">{formatTs(p.ts)}</span>
              </div>
              {hovered === p.epoch ? (
                <div className="grid grid-cols-5 gap-x-2 max-w-[160px]">
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
                <div className="text-[12px] font-mono text-phosphor-bright whitespace-pre-wrap leading-snug">
                  {p.text}
                </div>
              )}
              <WitnessExpandable epoch={p.epoch} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
