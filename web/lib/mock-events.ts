"use client";
import { useEffect, useRef, useState } from "react";

export type Status = "GATHERING" | "SOLVING" | "LOCKED" | "READING";

export interface SeedReadout {
  channel: string;
  category: string;
  rows: { label: string; value: string; spread?: string }[];
}

export interface Prophecy {
  epoch: number;
  ts: number;
  text: string;
  glyphs: string[][];
}

export interface OracleState {
  status: Status;
  epoch: number;
  seeds: SeedReadout[];
  glyphs: string[][];
  prophecies: Prophecy[];
  nextTickSeconds: number;
  programId: string;
  blockHeight: number;
  rpcOk: boolean;
}

const ALPHABET = "SATOREPNVCLDIMHU";
const STARTING_EPOCH = 83;
const PROGRAM_ID = "GTEVyfq7zL91k1zjZrJCmkeidBvgDfMdEXUUsMcQWq5r";
const STARTING_BLOCK = 178293411;
const CYCLE_SECONDS = 30;

const SUBJECTS = [
  "a returning tide",
  "the unsigned letter",
  "the third moon",
  "the engine that forgot",
  "the listening room",
  "what was buried",
  "the recursion",
  "the unread hour",
  "the bell beneath the wheel",
  "an inheritance kept dim",
  "the angle of departure",
  "the first thing said",
  "the calendar's seam",
  "what the camera saw",
  "the unmoving lens",
  "the rope twice tied",
];

const VERBS = [
  "remembers",
  "is becoming",
  "has not yet met",
  "will not contain",
  "echoes",
  "watches",
  "concludes",
  "begins again as",
  "answers",
  "delays",
  "outlives",
  "arrives at",
  "renames",
  "permits",
  "precedes",
  "rewrites",
];

const OBJECTS = [
  "the shore that forgot it",
  "a name we do not have",
  "the room you have not entered",
  "what was already true",
  "the door that opens both ways",
  "an oath unbroken by silence",
  "the year before the year",
  "a sentence still being written",
  "its own rehearsal",
  "the witness on the stair",
  "every promise made twice",
  "the page underneath the page",
  "the weather of the prior life",
  "the small coin in the dark hand",
  "the road kept private",
  "what you almost said in 1991",
];

const UNIQUE_CELLS: [number, number][] = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
  [2, 0], [2, 1], [2, 2],
];

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lockedSquareForEpoch(epoch: number): string[][] {
  const rng = mulberry32(epoch * 31337 + 7);
  const grid: string[][] = Array.from({ length: 5 }, () => Array(5).fill(""));
  for (const [r, c] of UNIQUE_CELLS) {
    const g = ALPHABET[Math.floor(rng() * 16)];
    grid[r][c] = g;
    grid[4 - r][4 - c] = g;
  }
  return grid;
}

function flickerGrid(): string[][] {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * 16)])
  );
}

function prophecyForEpoch(epoch: number): string {
  const rng = mulberry32(epoch * 991 + 23);
  const lines: string[] = [];
  for (let i = 0; i < 3; i++) {
    const s = SUBJECTS[Math.floor(rng() * SUBJECTS.length)];
    const v = VERBS[Math.floor(rng() * VERBS.length)];
    const o = OBJECTS[Math.floor(rng() * OBJECTS.length)];
    lines.push(`${s} ${v} ${o}.`);
  }
  return lines.join("\n");
}

function initialProphecies(latest: number, anchor: number): Prophecy[] {
  const out: Prophecy[] = [];
  for (let i = 0; i < 4; i++) {
    const ep = latest - i;
    out.push({
      epoch: ep,
      ts: anchor - i * 180,
      text: prophecyForEpoch(ep),
      glyphs: lockedSquareForEpoch(ep),
    });
  }
  return out;
}

function initialSeeds(): SeedReadout[] {
  return [
    {
      channel: "01",
      category: "MARKETS",
      rows: [
        { label: "BTC", value: "73402", spread: "±31" },
        { label: "SOL", value: "201.4", spread: "±0.08" },
        { label: "ETH", value: "3854", spread: "±12" },
      ],
    },
    {
      channel: "02",
      category: "CHAIN",
      rows: [
        { label: "TPS", value: "4127" },
        { label: "WHALE.TX", value: "8" },
        { label: "TKN/MIN", value: "234" },
      ],
    },
    {
      channel: "03",
      category: "WORLD",
      rows: [
        { label: "TONE", value: "-1.4" },
        { label: "EVT/15M", value: "8447" },
        { label: "TAG", value: "MIDEAST" },
      ],
    },
    {
      channel: "04",
      category: "HEAVENS",
      rows: [
        { label: "KP.IDX", value: "3.2" },
        { label: "MOON.PH", value: "0.74" },
        { label: "SOL.FL", value: "B6.1" },
      ],
    },
    {
      channel: "05",
      category: "ECHO",
      rows: [
        { label: "RING.D", value: "8/8" },
        { label: "DRIFT.K", value: "0.0042" },
        { label: "RECURSE", value: "0.91" },
      ],
    },
  ];
}

function jitterValue(v: string): string {
  const m = v.match(/^(-?\d+(?:\.\d+)?)/);
  if (!m) return v;
  const n = parseFloat(m[1]);
  const decimals = (m[1].split(".")[1] ?? "").length;
  const drift = (Math.random() - 0.5) * (Math.abs(n) * 0.005 + 0.05);
  const newN = (n + drift).toFixed(decimals);
  return v.replace(m[1], newN);
}

function jitterSeed(s: SeedReadout): SeedReadout {
  return {
    ...s,
    rows: s.rows.map((r) => ({ ...r, value: jitterValue(r.value) })),
  };
}

export function useMockOracle(): OracleState {
  const [epoch, setEpoch] = useState(STARTING_EPOCH);
  const [status, setStatus] = useState<Status>("GATHERING");
  const [glyphs, setGlyphs] = useState<string[][]>(() =>
    lockedSquareForEpoch(STARTING_EPOCH)
  );
  const [seeds, setSeeds] = useState<SeedReadout[]>(initialSeeds);
  const [prophecies, setProphecies] = useState<Prophecy[]>(() =>
    initialProphecies(STARTING_EPOCH, Math.floor(Date.now() / 1000) - 30)
  );
  const [nextTickSeconds, setNextTickSeconds] = useState(20);
  const [blockHeight, setBlockHeight] = useState(STARTING_BLOCK);

  const cycleStartRef = useRef<number | null>(null);
  const lastStatusRef = useRef<Status>("GATHERING");

  useEffect(() => {
    if (cycleStartRef.current === null) cycleStartRef.current = Date.now();

    const tick = () => {
      const elapsed = (Date.now() - cycleStartRef.current!) / 1000;
      const cycleNum = Math.floor(elapsed / CYCLE_SECONDS);
      const phase = elapsed - cycleNum * CYCLE_SECONDS;

      let next: Status;
      if (phase < 15) next = "GATHERING";
      else if (phase < 20) next = "SOLVING";
      else if (phase < 22) next = "LOCKED";
      else next = "READING";

      setNextTickSeconds(
        phase < 20 ? Math.max(0, Math.ceil(20 - phase)) : Math.ceil(50 - phase)
      );

      if (next !== lastStatusRef.current) {
        if (next === "LOCKED") {
          const newEpoch = STARTING_EPOCH + cycleNum + 1;
          setEpoch(newEpoch);
          setGlyphs(lockedSquareForEpoch(newEpoch));
        } else if (next === "READING") {
          const newEpoch = STARTING_EPOCH + cycleNum + 1;
          setProphecies((p) =>
            [
              {
                epoch: newEpoch,
                ts: Math.floor(Date.now() / 1000),
                text: prophecyForEpoch(newEpoch),
                glyphs: lockedSquareForEpoch(newEpoch),
              },
              ...p,
            ].slice(0, 8)
          );
        }
        lastStatusRef.current = next;
        setStatus(next);
      }
    };

    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, []);

  // Glyph flicker only while SOLVING
  useEffect(() => {
    if (status !== "SOLVING") return;
    const id = window.setInterval(() => {
      setGlyphs(flickerGrid());
    }, 30);
    return () => window.clearInterval(id);
  }, [status]);

  // Seed values drift
  useEffect(() => {
    const id = window.setInterval(() => {
      setSeeds((s) => s.map(jitterSeed));
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  // Block height climbs at ~2.5 blocks/sec
  useEffect(() => {
    const id = window.setInterval(() => {
      setBlockHeight((b) => b + 1);
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  return {
    status,
    epoch,
    seeds,
    glyphs,
    prophecies,
    nextTickSeconds,
    programId: PROGRAM_ID,
    blockHeight,
    rpcOk: true,
  };
}
