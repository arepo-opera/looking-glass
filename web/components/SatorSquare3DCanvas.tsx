"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Vector2 } from "three";
import type { Status } from "@/lib/mock-events";

const SLAB_W = 0.85;
const SLAB_H = 0.85;
const SLAB_D = 0.18;
const SLAB_GAP = 0.30;
const PITCH = SLAB_W + SLAB_GAP; // 1.15
const ALPHABET = "SATOREPNVCLDIMHU";
// Wider scramble pool for the LOCKING reveal — Latin letters dominate the
// look, with occasional numerals and esoteric symbols flashing through to
// sell "machine decoding the signal in real time."
const SCRAMBLE_LETTERS = ALPHABET;
const SCRAMBLE_SYMBOLS = "◊◉⊕⊗▣◈†‡¶§※‰⌬⊞⊟⊠⊡.,:;";
const SCRAMBLE_NUMERALS = "0123456789";
const TWO_PI = Math.PI * 2;

// LOCKING animation timing. Phase 1 scrambles every cell together; Phase 2
// settles cells one at a time at independent random offsets; then a short
// pause before the global LOCKED phosphor pulse takes over.
const SCRAMBLE_PHASE_MS = 2000;
const SETTLE_WINDOW_MS = 1500;
const TUMBLE_DURATION_MS = 300;
const TUMBLE_STEPS_MIN = 4;
const TUMBLE_STEPS_MAX = 6;
const FLASH_DURATION_MS = 150;
const POST_LOCK_DELAY_MS = 250;
const SCRAMBLE_INTERVAL_MIN = 60;
const SCRAMBLE_INTERVAL_MAX = 80;
// Per-frame chance a still-scrambling cell renders with one of the visual
// glitch variants (color flicker / horizontal offset / opacity dip /
// double-image). 25% across all variants combined.
const GLITCH_CHANCE = 0.25;
// Glitch tints — distinct enough to register as a single-frame anomaly.
const GLITCH_TINT_RED = "#c43d2a";
const GLITCH_TINT_COOL = "#b09280";
// Brighter tint used during the per-cell flash on settlement. Slightly
// boosted lightness over the resting amber.
const FLASH_TINT = "#f5cf9a";

// READING-phase directional sweeps. The cube no longer rotates during
// READING; instead, a sequence of axis-aligned highlights traverses the
// grid like a scanner taking multiple rapid readings of the locked
// square. Each sweep takes 5 cells × SWEEP_CELL_MS, then a short gap,
// then the next sweep. Total duration tuned to fit the 6s status
// override window.
interface Sweep {
  type: "row" | "col" | "diag" | "antidiag";
  axis: number; // row index (for row), column index (for col), unused for diag
  dir: 1 | -1; // 1 = forward (left/top), -1 = reverse
}
const SWEEP_DEFINITIONS: Sweep[] = [
  { type: "row", axis: 0, dir: 1 },
  { type: "row", axis: 0, dir: -1 },
  { type: "row", axis: 2, dir: 1 },
  { type: "row", axis: 4, dir: -1 },
  { type: "col", axis: 0, dir: 1 },
  { type: "col", axis: 4, dir: -1 },
  { type: "col", axis: 2, dir: 1 },
  { type: "diag", axis: 0, dir: 1 },
];
const SWEEP_CELL_MS = 120;
const SWEEP_GAP_MS = 150;
const SWEEP_LENGTH = 5;
const SWEEP_DURATION_MS = SWEEP_CELL_MS * SWEEP_LENGTH; // 600
const SWEEP_CYCLE_MS = SWEEP_DURATION_MS + SWEEP_GAP_MS; // 750
// Subtle temperature variation per sweep direction. Viewers shouldn't
// consciously register the shift — just feel that horizontal and
// vertical sweeps have different characters.
const SWEEP_TINT_HORIZONTAL = "#f5cf9a"; // warm (slightly orange)
const SWEEP_TINT_VERTICAL = "#e8d59b"; // cool (slightly straw)
const SWEEP_TINT_DIAG = "#eac896"; // base phosphor, brightened

function pickScrambleChar(): string {
  const r = Math.random();
  if (r < 0.7) {
    return SCRAMBLE_LETTERS[
      Math.floor(Math.random() * SCRAMBLE_LETTERS.length)
    ];
  }
  if (r < 0.9) {
    return SCRAMBLE_SYMBOLS[
      Math.floor(Math.random() * SCRAMBLE_SYMBOLS.length)
    ];
  }
  return SCRAMBLE_NUMERALS[
    Math.floor(Math.random() * SCRAMBLE_NUMERALS.length)
  ];
}
// Glyph canvas resolution. We sample with NearestFilter to keep the
// browser-rendered serif edges crisp under downsampling — that pixel-stepped
// quality is what reads as "chiseled" rather than "anti-aliased vector."
// 512² preserves enough source detail for IM Fell English's serifs while
// still giving Nearest a meaningful per-fragment pick.
const TEXTURE_SIZE = 512;
// Position-jitter magnitude (fraction of slab width). Real Pompeii carvings
// aren't laser-aligned; a few percent off-center per glyph reads "hand-placed."
const POS_JITTER = 0.02;
// Rotation-jitter magnitude in radians — about ±1.4°.
const ROT_JITTER = 0.025;

const PHOSPHOR_BRIGHT = "#d4a574";
const PHOSPHOR_DIM = "#7a5f3f";
const CHARCOAL = "#0a0908";
// Phosphor base color in HSL space (matches PHOSPHOR_BRIGHT). Per-cell glyphs
// jitter around this point so some letters read slightly more burned-in or
// fresher than others.
const PHOSPHOR_HUE = 30;
const PHOSPHOR_SAT = 51;
const PHOSPHOR_LIGHT = 64;

const FONT_URL = "/fonts/IMFellEnglishSC.ttf";

type CubeState = "GATHERING" | "SOLVING" | "LOCKING" | "LOCKED" | "READING";

// Deterministic per-cell pseudo-random values seeded on row+column. The same
// square renders the same jitter every frame — only when the locked square
// changes do new positions/rotations come into play (and only because the
// glyph itself is different, not because the scene rolled new dice).
function cellSeed(r: number, c: number): number {
  return ((r * 5 + c + 1) * 2654435761) >>> 0;
}
function cellHash(seed: number, salt: number): number {
  let x = (seed ^ (salt * 0x9e3779b9)) >>> 0;
  x ^= x << 13;
  x = x >>> 0;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 0xffffffff;
}
// Map [0,1) → [-1,1] so callers get a signed jitter value.
function cellSigned(seed: number, salt: number): number {
  return cellHash(seed, salt) * 2 - 1;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Per-cell phosphor tint — base color biased ±5° in hue and ±10% in
// lightness, deterministically by row+column.
function phosphorTint(seed: number): string {
  const hue = PHOSPHOR_HUE + cellSigned(seed, 0xa5) * 5;
  const light = clamp(PHOSPHOR_LIGHT * (1 + cellSigned(seed, 0xb7) * 0.10), 40, 80);
  return `hsl(${hue.toFixed(1)}, ${PHOSPHOR_SAT}%, ${light.toFixed(1)}%)`;
}

// One-time stone-grain texture: dark charcoal with low-amplitude per-pixel
// noise plus a few faint streaks. Repeated across all 25 slabs so they read
// as polished basalt rather than uniform digital fill.
let _stoneTexture: THREE.CanvasTexture | null = null;
function getStoneTexture(): THREE.CanvasTexture {
  if (_stoneTexture) return _stoneTexture;
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = CHARCOAL;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    // ±10 per channel — barely-visible variation when stretched on a slab
    const n = (Math.random() - 0.5) * 20;
    img.data[i] = clamp(img.data[i] + n, 0, 255) | 0;
    img.data[i + 1] = clamp(img.data[i + 1] + n * 0.85, 0, 255) | 0;
    img.data[i + 2] = clamp(img.data[i + 2] + n * 0.65, 0, 255) | 0;
  }
  ctx.putImageData(img, 0, 0);
  // A handful of soft darker streaks — the kind of vein you'd see in basalt.
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#000";
  for (let i = 0; i < 5; i++) {
    ctx.lineWidth = 0.6 + Math.random() * 1.2;
    ctx.beginPath();
    const x0 = Math.random() * size;
    const y0 = Math.random() * size;
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(
      x0 + (Math.random() - 0.5) * size,
      y0 + (Math.random() - 0.5) * size,
      Math.random() * size,
      Math.random() * size,
      Math.random() * size,
      Math.random() * size
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.4, 1.4);
  _stoneTexture = tex;
  return tex;
}

// Read the next/font-assigned family for IM Fell English SC. next/font
// generates an obfuscated family name (e.g. __IM_Fell_English_SC_3d1acd)
// and exposes it as the value of the --font-im-fell CSS variable on
// document.documentElement. Canvas needs that exact name — the literal
// "IM Fell English SC" doesn't match any loaded face and silently falls
// back to system serif, which on macOS reads as Times-style book-letter
// (tall, varied-height) instead of the SC variant (stocky, uniform).
function resolveImFellFamily(): string {
  if (typeof document === "undefined") return `"IM Fell English SC", serif`;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-im-fell")
    .trim();
  return v ? `${v}, "IM Fell English SC", serif` : `"IM Fell English SC", serif`;
}

class GlyphCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  current: string = "";
  tint: string;
  fontFamily: string;

  constructor(
    size = TEXTURE_SIZE,
    tint: string = PHOSPHOR_BRIGHT,
    fontFamily: string = `"IM Fell English SC", serif`
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext("2d")!;
    this.tint = tint;
    this.fontFamily = fontFamily;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    // NearestFilter preserves the browser-rasterized serif edges as crisp
    // pixel transitions when the texture is sampled at screen size —
    // LinearFilter blurs them into a soft halo that kills the chiseled feel.
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.draw(" ");
  }

  // Update the family used for subsequent draws. Forces the next draw call
  // to repaint, since the parent invokes setFontFamily after the SC face
  // finishes loading and the previously-stamped serif fallback needs to be
  // replaced even if the displayed letter hasn't changed.
  setFontFamily(family: string) {
    if (this.fontFamily === family) return;
    this.fontFamily = family;
    this.current = "";
  }

  draw(letter: string) {
    if (letter === this.current) return;
    this.current = letter;
    const size = this.canvas.width;
    const fontSpec = `400 ${Math.floor(size * 0.72)}px ${this.fontFamily}`;
    this.ctx.clearRect(0, 0, size, size);
    this.ctx.font = fontSpec;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = this.tint;
    // Just draw the letter. IM Fell English SC already has natural chisel
    // irregularity in its serifs — any blur, halo, or erosion pass on top
    // smooths that detail away rather than reinforcing it.
    this.ctx.fillText(letter, size / 2, size / 2 + size * 0.04);
    this.texture.needsUpdate = true;
  }

  // Scramble-frame draw with optional glitch overrides. Used by LOCKING.
  // Forces a redraw every call (sets current to "" so subsequent draw()
  // with the same letter still repaints), since glitch state varies
  // frame-to-frame and the regular short-circuit would freeze the look.
  drawStyled(
    letter: string,
    opts: {
      tintOverride?: string;
      offsetXPx?: number;
      offsetYPx?: number;
      alpha?: number;
      doubleImageWith?: string;
    }
  ) {
    this.current = "";
    const size = this.canvas.width;
    const fontSpec = `400 ${Math.floor(size * 0.72)}px ${this.fontFamily}`;
    this.ctx.clearRect(0, 0, size, size);
    this.ctx.font = fontSpec;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    const tint = opts.tintOverride ?? this.tint;
    const alpha = opts.alpha ?? 1.0;
    const ox = opts.offsetXPx ?? 0;
    const oy = opts.offsetYPx ?? 0;
    const baseY = size / 2 + size * 0.04;
    if (opts.doubleImageWith) {
      // Two glyphs offset on x — each at half-alpha so the channel reads
      // "two parallel signals overlapping" rather than a chunky bold.
      this.ctx.globalAlpha = alpha * 0.55;
      this.ctx.fillStyle = tint;
      this.ctx.fillText(opts.doubleImageWith, size / 2 - 6 + ox, baseY + oy);
      this.ctx.fillText(letter, size / 2 + 6 + ox, baseY + oy);
    } else {
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = tint;
      this.ctx.fillText(letter, size / 2 + ox, baseY + oy);
    }
    this.ctx.globalAlpha = 1.0;
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }
}

// Linear-ish rotation that briefly stalls near 75% of the way through —
// for the 180° flip that's around 135°, the way a worn servo motor catches
// just before settling.
function servoEase(t: number): number {
  if (t < 0.72) return (t / 0.72) * 0.75;
  if (t < 0.80) return 0.75;
  return 0.75 + ((t - 0.80) / 0.20) * 0.25;
}

function pulse(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  return Math.sin(t * Math.PI);
}

interface SceneProps {
  glyphs: string[][];
  status: Status;
}

function CubeRig({ glyphs, status }: SceneProps) {
  const squareGroupRef = useRef<THREE.Group>(null!);
  const rowRefs = useRef<(THREE.Group | null)[]>([null, null, null, null, null]);
  // Refs to each cell's two glyph plane meshes — used by the interference
  // burst loop in useFrame to nudge a few slabs by a few pixels.
  const frontPlaneRefs = useRef<(THREE.Mesh | null)[][]>(
    Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null))
  );
  const backPlaneRefs = useRef<(THREE.Mesh | null)[][]>(
    Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null))
  );

  const stoneTexture = useMemo(() => getStoneTexture(), []);
  const fontFamily = useMemo(() => resolveImFellFamily(), []);

  // Per-cell deterministic jitter and tint. row+column → seed → x/y/rotation
  // offsets and a slightly different amber. Computed once and reused on
  // every render of the same square.
  const cellAttrs = useMemo(() => {
    return Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 5 }, (_, c) => {
        const seed = cellSeed(r, c);
        return {
          seed,
          x: cellSigned(seed, 0x11) * SLAB_W * POS_JITTER,
          y: cellSigned(seed, 0x22) * SLAB_W * POS_JITTER,
          rot: cellSigned(seed, 0x33) * ROT_JITTER,
          tint: phosphorTint(seed),
        };
      })
    );
  }, []);

  // Two glyph canvases per slab: one for the front-facing plane, one for the
  // back-facing plane. The flip-board mechanic pre-loads the new glyph onto
  // whichever plane is hidden, then rotates 180° to reveal it. Both faces
  // for the same cell share a tint so the slab reads as one consistent
  // weathered carving regardless of which side is up.
  const glyphFront = useMemo(
    () =>
      Array.from({ length: 5 }, (_, r) =>
        Array.from(
          { length: 5 },
          (_, c) =>
            new GlyphCanvas(TEXTURE_SIZE, cellAttrs[r][c].tint, fontFamily)
        )
      ),
    [cellAttrs, fontFamily]
  );
  const glyphBack = useMemo(
    () =>
      Array.from({ length: 5 }, (_, r) =>
        Array.from(
          { length: 5 },
          (_, c) =>
            new GlyphCanvas(TEXTURE_SIZE, cellAttrs[r][c].tint, fontFamily)
        )
      ),
    [cellAttrs, fontFamily]
  );

  useEffect(() => {
    return () => {
      for (const row of glyphFront) for (const g of row) g.dispose();
      for (const row of glyphBack) for (const g of row) g.dispose();
    };
  }, [glyphFront, glyphBack]);

  const stateRef = useRef({
    cubeState: "GATHERING" as CubeState,
    enteredAtMs: typeof performance !== "undefined" ? performance.now() : 0,
    flickerLastMs: 0,
    // Per-row "rest rotation" — kept at 0 since the LOCKING flip-board was
    // replaced by per-cell scrambling. Reads stay; writes never fire.
    rowBaseRotation: [0, 0, 0, 0, 0],
    rowFlipped: [false, false, false, false, false],
    rowSettled: [true, true, true, true, true],
    finalGlyphs: glyphs.map((row) => [...row]),
    displayedGlyphs: glyphs.map((row) => [...row]),
    // Latest flash end-time across all 25 cells during LOCKING. Persists
    // across frames so the LOCKED transition can wait POST_LOCK_DELAY_MS
    // after the last cell's flash ends — without this we'd treat the
    // first all-settled frame as the cue and fire too early.
    lastFlashEndMs: 0,
    // Per-cell lock state, populated when LOCKING begins. Every cell has its
    // own scramble cadence, settle time within the window, and tumble
    // sequence — so the reveal looks like 25 channels independently
    // landing rather than a synchronized flip.
    cellLock: Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => ({
        phase: "scramble" as "scramble" | "tumble" | "flash" | "settled",
        settleAtMs: 0,
        tumbleStartMs: 0,
        tumbleSteps: [] as string[],
        tumbleStepIndex: 0,
        lastChangeMs: 0,
        nextInterval: 70,
        flashUntilMs: 0,
      }))
    ),
    // Interference burst: every 30-60s a handful of slabs briefly shift by a
    // few pixels to sell "this signal is coming over a long, lossy channel."
    // The first burst is scheduled 6-15s after mount; subsequent bursts
    // re-roll their next-start when each one ends.
    interference: {
      active: false,
      endMs: 0,
      nextStartMs:
        (typeof performance !== "undefined" ? performance.now() : 0) +
        6000 +
        Math.random() * 9000,
      affected: [] as { r: number; c: number; dx: number; dy: number }[],
    },
    // READING-phase sweep state. lastHighlight tracks the (r,c) most
    // recently highlighted so we can restore it to its resting tint
    // when the sweep moves on.
    sweep: {
      lastHighlight: null as { r: number; c: number } | null,
    },
    // GATHERING-phase signal-check flicker. Replaces the previous
    // breathing-scale + slow-Y-drift ambient with a much rarer, more
    // mechanical event: every 30-60s one random cell briefly dims its
    // glyph plane and shakes 1px on x for ~120ms, like a vacuum tube
    // reseating. The instrument waits at rest, but it isn't dead.
    gatheringFlicker: {
      active: false,
      startMs: 0,
      cell: null as { r: number; c: number } | null,
      // First flicker 5-30s after first entering GATHERING; subsequent
      // intervals are recomputed on each completion.
      nextStartMs:
        (typeof performance !== "undefined" ? performance.now() : 0) +
        5_000 +
        Math.random() * 25_000,
    },
  });

  // Initial draw — force-load the SC font, then stamp every front canvas.
  // next/font's faces are lazy-loaded by default (only when a layout uses
  // them), and the dashboard body uses JetBrains Mono, not the SC face,
  // so document.fonts.ready alone resolves before the SC face is fetched.
  // We have to call document.fonts.load() with the resolved family to kick
  // the request, await it, and then stamp the canvases. Without this, the
  // first paint shows system serif (Times-style) and only the next status
  // transition repaints with the right face.
  useEffect(() => {
    let cancelled = false;
    const drawAll = () => {
      if (cancelled) return;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          glyphFront[r][c].setFontFamily(fontFamily);
          glyphBack[r][c].setFontFamily(fontFamily);
          glyphFront[r][c].draw(glyphs[r]?.[c] ?? "?");
        }
      }
    };
    const probeText = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const probeFont = `400 ${Math.floor(TEXTURE_SIZE * 0.72)}px ${fontFamily}`;
    if (typeof document !== "undefined" && document.fonts?.load) {
      document.fonts
        .load(probeFont, probeText)
        .then(() => document.fonts.ready)
        .then(drawAll)
        .catch(drawAll);
    } else {
      drawAll();
    }
    return () => {
      cancelled = true;
    };
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontFamily]);

  // Status transitions
  useEffect(() => {
    const now = performance.now();
    const cs = stateRef.current.cubeState;
    if (status === "SOLVING" && cs !== "SOLVING" && cs !== "LOCKING") {
      stateRef.current.cubeState = "SOLVING";
      stateRef.current.enteredAtMs = now;
    } else if (status === "LOCKED" && cs !== "LOCKING" && cs !== "LOCKED") {
      stateRef.current.cubeState = "LOCKING";
      stateRef.current.enteredAtMs = now;
      stateRef.current.finalGlyphs = glyphs.map((row) => [...row]);
      stateRef.current.lastFlashEndMs = 0;
      // Initialise per-cell lock state. Each cell picks a settle time
      // uniformly across the settlement window, a 4-6 step tumble
      // sequence ending on its true glyph, and a scramble cadence in
      // [60ms, 80ms]. The scramble loop in useFrame drives the rest.
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const finalGlyph = stateRef.current.finalGlyphs[r]?.[c] ?? "?";
          const stepCount =
            TUMBLE_STEPS_MIN +
            Math.floor(
              Math.random() * (TUMBLE_STEPS_MAX - TUMBLE_STEPS_MIN + 1)
            );
          const tumbleSteps: string[] = [];
          for (let i = 0; i < stepCount - 1; i++) {
            tumbleSteps.push(pickScrambleChar());
          }
          tumbleSteps.push(finalGlyph);
          stateRef.current.cellLock[r][c] = {
            phase: "scramble",
            settleAtMs: SCRAMBLE_PHASE_MS + Math.random() * SETTLE_WINDOW_MS,
            tumbleStartMs: 0,
            tumbleSteps,
            tumbleStepIndex: 0,
            lastChangeMs: now,
            nextInterval:
              SCRAMBLE_INTERVAL_MIN +
              Math.random() *
                (SCRAMBLE_INTERVAL_MAX - SCRAMBLE_INTERVAL_MIN),
            flashUntilMs: 0,
          };
        }
      }
    } else if (status === "READING" && cs !== "READING") {
      stateRef.current.cubeState = "READING";
      stateRef.current.enteredAtMs = now;
      stateRef.current.sweep.lastHighlight = null;
      // Stamp every cell with its resting glyph + per-cell tint so the
      // sweep highlights cleanly restore on de-highlight. Also captures
      // the case where we arrived in READING without a clean LOCKING
      // (mount, status skipped past LOCKED, etc.).
      stateRef.current.finalGlyphs = glyphs.map((row) => [...row]);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const g = glyphs[r]?.[c] ?? "?";
          glyphFront[r][c].drawStyled(g, {
            tintOverride: cellAttrs[r][c].tint,
          });
        }
      }
    } else if (status === "GATHERING" && cs !== "GATHERING") {
      stateRef.current.cubeState = "GATHERING";
      stateRef.current.enteredAtMs = now;
      stateRef.current.displayedGlyphs = glyphs.map((row) => [...row]);
      // Make sure the new locked glyphs are showing on whichever face is
      // currently up.
      for (let r = 0; r < 5; r++) {
        const visible = stateRef.current.rowFlipped[r] ? glyphBack : glyphFront;
        for (let c = 0; c < 5; c++) {
          visible[r][c].draw(glyphs[r]?.[c] ?? "?");
        }
      }
    }
  }, [status, glyphs, glyphFront, glyphBack]);

  // Standalone "redraw on glyphs prop change" effect. The status-transition
  // effect above only repaints when status itself transitions — but in the
  // live oracle, status sits at GATHERING while the on-chain hydrate fetches
  // the locked square asynchronously. Without this, the very first render's
  // initial " " glyphs stay on the canvas forever and the cube reads as
  // empty stone. Skip during SOLVING / LOCKING so we don't clobber the live
  // animation that's mid-flicker or mid-flip.
  useEffect(() => {
    const cs = stateRef.current.cubeState;
    // Skip during any active animation phase — those phases own the
    // canvas writes (SOLVING flicker, LOCKING scramble, LOCKED flash,
    // READING sweep highlights). Repainting from this effect during
    // them would cancel the animation visually.
    if (
      cs === "SOLVING" ||
      cs === "LOCKING" ||
      cs === "LOCKED" ||
      cs === "READING"
    )
      return;
    const displayed = stateRef.current.displayedGlyphs;
    let changed = false;
    for (let r = 0; r < 5 && !changed; r++) {
      for (let c = 0; c < 5 && !changed; c++) {
        if ((glyphs[r]?.[c] ?? " ") !== (displayed[r]?.[c] ?? " ")) {
          changed = true;
        }
      }
    }
    if (!changed) return;
    stateRef.current.displayedGlyphs = glyphs.map((row) => [...row]);
    for (let r = 0; r < 5; r++) {
      const visible = stateRef.current.rowFlipped[r] ? glyphBack : glyphFront;
      for (let c = 0; c < 5; c++) {
        visible[r][c].draw(glyphs[r]?.[c] ?? "?");
      }
    }
  }, [glyphs, glyphFront, glyphBack]);

  useFrame(({ clock }) => {
    const now = performance.now();
    const t = clock.getElapsedTime();
    const cs = stateRef.current.cubeState;
    const elapsedMs = now - stateRef.current.enteredAtMs;
    const elapsedSec = elapsedMs / 1000;
    const sg = squareGroupRef.current;
    if (!sg) return;

    // If a GATHERING-phase flicker was in progress when status changed,
    // restore the affected cell's plane material + position before the
    // new phase starts writing to the canvas. Otherwise the cell can
    // be left at opacity 0.6 / shaken position for the duration of the
    // next phase.
    {
      const fk = stateRef.current.gatheringFlicker;
      if (fk.active && fk.cell && cs !== "GATHERING") {
        const { r, c } = fk.cell;
        const plane = frontPlaneRefs.current[r][c];
        const mat = plane?.material as THREE.MeshBasicMaterial | undefined;
        const j = cellAttrs[r][c];
        if (mat) mat.opacity = 1.0;
        if (plane) plane.position.set(j.x, j.y, SLAB_D / 2 + 0.001);
        fk.active = false;
        fk.cell = null;
      }
    }

    if (cs === "GATHERING") {
      // The cube is genuinely at rest — no breathing, no Y-drift. The
      // CRT effects on top of the scene are still moving, but the
      // instrument readout itself doesn't perform when there's nothing
      // to read.
      sg.scale.setScalar(1.0);
      sg.rotation.y = 0;
      for (let r = 0; r < 5; r++) {
        const rg = rowRefs.current[r];
        if (rg) rg.rotation.x = stateRef.current.rowBaseRotation[r];
      }

      // Signal-check flicker: every 30-60s, one random cell dims and
      // shakes microscopically. Two-ramp opacity curve (60ms down to
      // 0.6, 60ms back to 1.0) plus a 1-pixel-equivalent x offset for
      // the same window.
      const fk = stateRef.current.gatheringFlicker;
      if (!fk.active && now >= fk.nextStartMs) {
        fk.active = true;
        fk.startMs = now;
        const r = Math.floor(Math.random() * 5);
        const c = Math.floor(Math.random() * 5);
        fk.cell = { r, c };
      }
      if (fk.active && fk.cell) {
        const elapsed = now - fk.startMs;
        const { r, c } = fk.cell;
        const plane = frontPlaneRefs.current[r][c];
        const mat = plane?.material as THREE.MeshBasicMaterial | undefined;
        const j = cellAttrs[r][c];
        if (elapsed >= 120) {
          // Restore: opacity 1, position back to per-cell jitter.
          if (mat) mat.opacity = 1.0;
          if (plane) plane.position.set(j.x, j.y, SLAB_D / 2 + 0.001);
          fk.active = false;
          fk.cell = null;
          fk.nextStartMs = now + 30_000 + Math.random() * 30_000;
        } else if (mat && plane) {
          let opacity: number;
          if (elapsed < 60) {
            opacity = 1.0 - 0.4 * (elapsed / 60);
          } else {
            opacity = 0.6 + 0.4 * ((elapsed - 60) / 60);
          }
          mat.opacity = opacity;
          // 1 texture-pixel-equivalent x offset (matches the
          // interference-burst scale unit but ⅓ the magnitude).
          const pxScale = SLAB_W * 0.96 * (1 / TEXTURE_SIZE);
          plane.position.set(j.x + pxScale, j.y, SLAB_D / 2 + 0.001);
        }
      }
    } else if (cs === "SOLVING") {
      sg.scale.setScalar(1.0);
      sg.rotation.y = 0;
      // Row-by-row flicker: the visible face's canvas gets a fresh random letter
      // every ~60ms while that row is in its 600ms activation window.
      if (now - stateRef.current.flickerLastMs >= 60) {
        stateRef.current.flickerLastMs = now;
        for (let r = 0; r < 5; r++) {
          const startMs = r * 600;
          const endMs = (r + 1) * 600;
          if (elapsedMs >= startMs && elapsedMs < endMs) {
            const visible = stateRef.current.rowFlipped[r] ? glyphBack : glyphFront;
            for (let c = 0; c < 5; c++) {
              visible[r][c].draw(ALPHABET[Math.floor(Math.random() * 16)]);
            }
          }
        }
      }
    } else if (cs === "LOCKING") {
      sg.scale.setScalar(1.0);
      sg.rotation.y = 0;
      // Hold rows static — flip-board is gone, scramble runs in canvas.
      for (let r = 0; r < 5; r++) {
        const rg = rowRefs.current[r];
        if (rg) rg.rotation.x = stateRef.current.rowBaseRotation[r];
      }

      let allSettled = true;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const cell = stateRef.current.cellLock[r][c];
          const canvas = glyphFront[r][c];
          const finalGlyph = stateRef.current.finalGlyphs[r]?.[c] ?? "?";

          if (cell.phase === "scramble") {
            allSettled = false;
            if (elapsedMs >= cell.settleAtMs) {
              cell.phase = "tumble";
              cell.tumbleStartMs = now;
              cell.tumbleStepIndex = 0;
              cell.lastChangeMs = now;
              cell.nextInterval =
                TUMBLE_DURATION_MS / cell.tumbleSteps.length;
            } else if (now - cell.lastChangeMs >= cell.nextInterval) {
              cell.lastChangeMs = now;
              cell.nextInterval =
                SCRAMBLE_INTERVAL_MIN +
                Math.random() *
                  (SCRAMBLE_INTERVAL_MAX - SCRAMBLE_INTERVAL_MIN);
              const ch = pickScrambleChar();
              if (Math.random() < GLITCH_CHANCE) {
                const variant = Math.floor(Math.random() * 4);
                if (variant === 0) {
                  // Color flicker — red or cooler-amber for one frame.
                  canvas.drawStyled(ch, {
                    tintOverride:
                      Math.random() < 0.5
                        ? GLITCH_TINT_RED
                        : GLITCH_TINT_COOL,
                  });
                } else if (variant === 1) {
                  // Horizontal offset 2-4 px.
                  const px =
                    (Math.random() < 0.5 ? -1 : 1) *
                    (2 + Math.random() * 2);
                  canvas.drawStyled(ch, { offsetXPx: px });
                } else if (variant === 2) {
                  // Brief opacity dip.
                  canvas.drawStyled(ch, { alpha: 0.6 });
                } else {
                  // Double-image overlap with another random char.
                  canvas.drawStyled(ch, {
                    doubleImageWith: pickScrambleChar(),
                  });
                }
              } else {
                canvas.draw(ch);
              }
            }
          } else if (cell.phase === "tumble") {
            allSettled = false;
            if (now - cell.lastChangeMs >= cell.nextInterval) {
              cell.lastChangeMs = now;
              if (cell.tumbleStepIndex < cell.tumbleSteps.length) {
                const ch = cell.tumbleSteps[cell.tumbleStepIndex];
                cell.tumbleStepIndex += 1;
                canvas.draw(ch);
              }
              if (cell.tumbleStepIndex >= cell.tumbleSteps.length) {
                cell.phase = "flash";
                cell.flashUntilMs = now + FLASH_DURATION_MS;
                if (cell.flashUntilMs > stateRef.current.lastFlashEndMs) {
                  stateRef.current.lastFlashEndMs = cell.flashUntilMs;
                }
                canvas.drawStyled(finalGlyph, {
                  tintOverride: FLASH_TINT,
                });
              }
            }
          } else if (cell.phase === "flash") {
            allSettled = false;
            if (now >= cell.flashUntilMs) {
              cell.phase = "settled";
              canvas.draw(finalGlyph);
            }
          }
        }
      }

      if (
        allSettled &&
        now >= stateRef.current.lastFlashEndMs + POST_LOCK_DELAY_MS
      ) {
        stateRef.current.cubeState = "LOCKED";
        stateRef.current.enteredAtMs = now;
        stateRef.current.displayedGlyphs = stateRef.current.finalGlyphs.map(
          (row) => [...row]
        );
      }
    } else if (cs === "LOCKED") {
      // No emissive intensity here — the front/back glyph planes are
      // MeshBasicMaterial (unlit), so the brief "phosphor pulse" rides on
      // the squareGroup's scale instead. Tiny scale bump that decays over
      // 250ms, then the slow 6s breathe.
      const pulseT = elapsedSec / 0.25;
      const pulseScale = 1.0 + 0.03 * pulse(pulseT);
      const breatheT = (elapsedSec / 6) % 1;
      const breathe = 1.0 + 0.012 * 0.5 * (1 - Math.cos(breatheT * TWO_PI));
      sg.scale.setScalar(pulseScale * breathe);
      sg.rotation.y = 0;
      for (let r = 0; r < 5; r++) {
        const rg = rowRefs.current[r];
        if (rg) rg.rotation.x = stateRef.current.rowBaseRotation[r];
      }
    } else if (cs === "READING") {
      // No rotation. The cube stays static while a sequence of axis-
      // aligned highlights traverses it like a scanner. Each sweep
      // crosses one row/column/diagonal in SWEEP_DURATION_MS, then a
      // SWEEP_GAP_MS pause, then the next direction.
      sg.scale.setScalar(1.0);
      sg.rotation.y = 0;
      for (let r = 0; r < 5; r++) {
        const rg = rowRefs.current[r];
        if (rg) rg.rotation.x = stateRef.current.rowBaseRotation[r];
      }

      const sweepIndex = Math.floor(elapsedMs / SWEEP_CYCLE_MS);
      const localMs = elapsedMs - sweepIndex * SWEEP_CYCLE_MS;
      const sweepActive =
        sweepIndex < SWEEP_DEFINITIONS.length && localMs < SWEEP_DURATION_MS;
      let target: { r: number; c: number } | null = null;
      let tint: string = SWEEP_TINT_HORIZONTAL;
      if (sweepActive) {
        const sweep = SWEEP_DEFINITIONS[sweepIndex];
        const cellIdx = Math.min(
          SWEEP_LENGTH - 1,
          Math.floor(localMs / SWEEP_CELL_MS)
        );
        const stepFwd = sweep.dir > 0 ? cellIdx : SWEEP_LENGTH - 1 - cellIdx;
        if (sweep.type === "row") {
          target = { r: sweep.axis, c: stepFwd };
          tint = SWEEP_TINT_HORIZONTAL;
        } else if (sweep.type === "col") {
          target = { r: stepFwd, c: sweep.axis };
          tint = SWEEP_TINT_VERTICAL;
        } else if (sweep.type === "diag") {
          target = { r: stepFwd, c: stepFwd };
          tint = SWEEP_TINT_DIAG;
        } else if (sweep.type === "antidiag") {
          target = { r: stepFwd, c: SWEEP_LENGTH - 1 - stepFwd };
          tint = SWEEP_TINT_DIAG;
        }
      }

      const last = stateRef.current.sweep.lastHighlight;
      const targetSame =
        target !== null &&
        last !== null &&
        target.r === last.r &&
        target.c === last.c;
      if (!targetSame) {
        // Restore the previous highlight to its resting glyph at the
        // per-cell tint, and stamp the new highlight.
        if (last !== null) {
          const lf = stateRef.current.finalGlyphs[last.r]?.[last.c];
          const lc = glyphFront[last.r][last.c];
          // Force redraw — drawStyled sets current="" so the next draw
          // is honored even when the letter matches.
          lc.drawStyled(lf ?? "?", { tintOverride: cellAttrs[last.r][last.c].tint });
        }
        if (target !== null) {
          const tf = stateRef.current.finalGlyphs[target.r]?.[target.c];
          const tc = glyphFront[target.r][target.c];
          tc.drawStyled(tf ?? "?", { tintOverride: tint });
        }
        stateRef.current.sweep.lastHighlight = target;
      }
    }

    // Interference burst: every 30-60s, pick 3-7 random slabs and shift their
    // glyph planes by ~3 px-equivalent for 200-400 ms. Skipped during LOCKING
    // so the flip animation reads cleanly.
    const iState = stateRef.current.interference;
    if (cs !== "LOCKING") {
      if (!iState.active && now >= iState.nextStartMs) {
        iState.active = true;
        iState.endMs = now + 200 + Math.random() * 200;
        const count = 3 + Math.floor(Math.random() * 5); // 3-7 inclusive
        // 3 px on a 256 texture maps to ~3/256 of the plane width.
        const pxScale = (SLAB_W * 0.96) * (3 / TEXTURE_SIZE);
        const used = new Set<number>();
        iState.affected = [];
        while (iState.affected.length < count) {
          const idx = Math.floor(Math.random() * 25);
          if (used.has(idx)) continue;
          used.add(idx);
          const r = Math.floor(idx / 5);
          const c = idx % 5;
          const dx = (Math.random() < 0.5 ? -1 : 1) * pxScale;
          const dy = (Math.random() < 0.5 ? -1 : 1) * pxScale;
          iState.affected.push({ r, c, dx, dy });
        }
        for (const a of iState.affected) {
          const j = cellAttrs[a.r][a.c];
          const f = frontPlaneRefs.current[a.r][a.c];
          const b = backPlaneRefs.current[a.r][a.c];
          if (f) f.position.set(j.x + a.dx, j.y + a.dy, SLAB_D / 2 + 0.001);
          if (b) b.position.set(j.x + a.dx, j.y + a.dy, -SLAB_D / 2 - 0.001);
        }
      } else if (iState.active && now >= iState.endMs) {
        for (const a of iState.affected) {
          const j = cellAttrs[a.r][a.c];
          const f = frontPlaneRefs.current[a.r][a.c];
          const b = backPlaneRefs.current[a.r][a.c];
          if (f) f.position.set(j.x, j.y, SLAB_D / 2 + 0.001);
          if (b) b.position.set(j.x, j.y, -SLAB_D / 2 - 0.001);
        }
        iState.active = false;
        iState.affected = [];
        iState.nextStartMs = now + 30000 + Math.random() * 30000;
      }
    }
  });

  return (
    <>
      <group ref={squareGroupRef}>
        {[0, 1, 2, 3, 4].map((r) => (
          <group
            key={r}
            ref={(el) => {
              rowRefs.current[r] = el;
            }}
            position={[0, (2 - r) * PITCH, 0]}
          >
            {[0, 1, 2, 3, 4].map((c) => (
              <Slab
                key={c}
                position={[(c - 2) * PITCH, 0, 0]}
                frontTexture={glyphFront[r][c].texture}
                backTexture={glyphBack[r][c].texture}
                stoneTexture={stoneTexture}
                jitterX={cellAttrs[r][c].x}
                jitterY={cellAttrs[r][c].y}
                jitterRot={cellAttrs[r][c].rot}
                setFrontRef={(m) => {
                  frontPlaneRefs.current[r][c] = m;
                }}
                setBackRef={(m) => {
                  backPlaneRefs.current[r][c] = m;
                }}
              />
            ))}
          </group>
        ))}
      </group>

    </>
  );
}

interface SlabProps {
  position: [number, number, number];
  frontTexture: THREE.Texture;
  backTexture: THREE.Texture;
  stoneTexture: THREE.Texture;
  jitterX: number;
  jitterY: number;
  jitterRot: number;
  setFrontRef: (m: THREE.Mesh | null) => void;
  setBackRef: (m: THREE.Mesh | null) => void;
}

function Slab({
  position,
  frontTexture,
  backTexture,
  stoneTexture,
  jitterX,
  jitterY,
  jitterRot,
  setFrontRef,
  setBackRef,
}: SlabProps) {
  return (
    <group position={position}>
      {/* dark stone box — stoneTexture supplies a subtle per-pixel grain so
          the slab reads as polished basalt rather than a uniform fill. */}
      <mesh>
        <boxGeometry args={[SLAB_W, SLAB_H, SLAB_D]} />
        <meshStandardMaterial
          color="#ffffff"
          map={stoneTexture}
          metalness={0.1}
          roughness={0.85}
          emissive={PHOSPHOR_DIM}
          emissiveIntensity={0.04}
        />
      </mesh>
      {/* front-face glyph plane, slightly proud of the box face. Per-cell
          jitter on x/y/z-rotation gives the carving a hand-placed feel. */}
      <mesh
        ref={setFrontRef}
        position={[jitterX, jitterY, SLAB_D / 2 + 0.001]}
        rotation={[0, 0, jitterRot]}
      >
        <planeGeometry args={[SLAB_W * 0.96, SLAB_H * 0.96]} />
        <meshBasicMaterial map={frontTexture} transparent toneMapped={false} />
      </mesh>
      {/* back-face glyph plane, pre-rotated 180° on X so the slab's own 180°
          flip lands the texture upright in the camera's view. The z-rotation
          jitter is negated so it reads in the same handed direction after
          the X flip. */}
      <mesh
        ref={setBackRef}
        position={[jitterX, jitterY, -SLAB_D / 2 - 0.001]}
        rotation={[Math.PI, 0, -jitterRot]}
      >
        <planeGeometry args={[SLAB_W * 0.96, SLAB_H * 0.96]} />
        <meshBasicMaterial map={backTexture} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

interface CanvasProps extends SceneProps {
  effectsEnabled?: boolean;
}

const chromaticOffset = new Vector2(0.0008, 0.0008);

export function SatorSquare3DCanvas({
  glyphs,
  status,
  effectsEnabled = true,
}: CanvasProps) {
  return (
    <Canvas
      // Wider FOV than the original 35° so the 5×5 grid has margin on all
      // sides regardless of container aspect ratio. At fov=45° the
      // vertical span at z=10 is ~8.3 world units, leaving ~30% margin
      // around the ~5.5-unit cube — fits cleanly on phone-portrait
      // (square container) and desktop alike. r3f's Canvas updates the
      // projection matrix on container resize automatically.
      camera={{ position: [0, 0, 10.0], fov: 45 }}
      style={{ width: "100%", height: "100%", background: CHARCOAL }}
      gl={{ antialias: true }}
    >
      <directionalLight position={[-1, 1, 1]} intensity={0.18} color={PHOSPHOR_BRIGHT} />
      <directionalLight position={[1, -0.5, 0.3]} intensity={0.06} color={PHOSPHOR_BRIGHT} />
      <CubeRig glyphs={glyphs} status={status} />
      {effectsEnabled && (
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.4}
            luminanceSmoothing={0.2}
            mipmapBlur
            radius={0.7}
          />
          <ChromaticAberration
            offset={chromaticOffset}
            radialModulation={false}
            modulationOffset={0}
          />
          <Noise opacity={0.06} blendFunction={BlendFunction.OVERLAY} />
          <Vignette offset={0.5} darkness={0.45} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
