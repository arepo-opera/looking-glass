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
const TWO_PI = Math.PI * 2;
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

class GlyphCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  current: string = "";
  tint: string;

  constructor(size = TEXTURE_SIZE, tint: string = PHOSPHOR_BRIGHT) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext("2d")!;
    this.tint = tint;
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

  draw(letter: string) {
    if (letter === this.current) return;
    this.current = letter;
    const size = this.canvas.width;
    const fontSpec = `400 ${Math.floor(size * 0.72)}px "IM Fell English SC", serif`;
    this.ctx.clearRect(0, 0, size, size);
    this.ctx.font = fontSpec;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = this.tint;
    // Just draw the letter. IM Fell English already has natural chisel
    // irregularity in its serifs — any blur, halo, or erosion pass on top
    // smooths that detail away rather than reinforcing it.
    this.ctx.fillText(letter, size / 2, size / 2 + size * 0.04);
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
          (_, c) => new GlyphCanvas(TEXTURE_SIZE, cellAttrs[r][c].tint)
        )
      ),
    [cellAttrs]
  );
  const glyphBack = useMemo(
    () =>
      Array.from({ length: 5 }, (_, r) =>
        Array.from(
          { length: 5 },
          (_, c) => new GlyphCanvas(TEXTURE_SIZE, cellAttrs[r][c].tint)
        )
      ),
    [cellAttrs]
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
    // Per-row "rest rotation" — every LOCKING bumps this by +π. We animate
    // from rowBaseRotation to rowBaseRotation + π and then commit the bump.
    rowBaseRotation: [0, 0, 0, 0, 0],
    // false = front canvas currently visible; true = back canvas visible.
    rowFlipped: [false, false, false, false, false],
    rowSettled: [true, true, true, true, true],
    finalGlyphs: glyphs.map((row) => [...row]),
    displayedGlyphs: glyphs.map((row) => [...row]),
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
  });

  // Initial draw (front canvases) once the font is loaded.
  useEffect(() => {
    const drawAll = () => {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          glyphFront[r][c].draw(glyphs[r]?.[c] ?? "?");
        }
      }
    };
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(drawAll);
    } else {
      drawAll();
    }
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      stateRef.current.rowSettled = [false, false, false, false, false];
      // Pre-load the final glyphs onto each slab's currently-hidden face,
      // so when the row flips 180° the camera sees the new state directly.
      for (let r = 0; r < 5; r++) {
        const targetIsBack = !stateRef.current.rowFlipped[r];
        const target = targetIsBack ? glyphBack : glyphFront;
        for (let c = 0; c < 5; c++) {
          target[r][c].draw(stateRef.current.finalGlyphs[r][c]);
        }
      }
    } else if (status === "READING" && cs !== "READING") {
      stateRef.current.cubeState = "READING";
      stateRef.current.enteredAtMs = now;
      // If we arrived in READING without going through a clean LOCKING (e.g.
      // we mounted late or status skipped past LOCKED), make sure the visible
      // face is showing the current locked glyphs.
      for (let r = 0; r < 5; r++) {
        const visible = stateRef.current.rowFlipped[r] ? glyphBack : glyphFront;
        for (let c = 0; c < 5; c++) {
          visible[r][c].draw(glyphs[r]?.[c] ?? "?");
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
    if (cs === "SOLVING" || cs === "LOCKING") return;
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

    if (cs === "GATHERING") {
      const phase = (t / 4) % 1;
      const breathe = 1.0 + 0.012 * 0.5 * (1 - Math.cos(phase * TWO_PI));
      sg.scale.setScalar(breathe);
      sg.rotation.y = 0.02 * Math.sin(t * (TWO_PI / 12));
      // hold each row at its base rotation
      for (let r = 0; r < 5; r++) {
        const rg = rowRefs.current[r];
        if (rg) rg.rotation.x = stateRef.current.rowBaseRotation[r];
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

      const rowDuration = 0.7;
      const rowStagger = 0.05;
      let allSettled = true;

      for (let r = 0; r < 5; r++) {
        const startSec = r * rowStagger;
        const localT = (elapsedSec - startSec) / rowDuration;
        const rg = rowRefs.current[r];
        if (!rg) continue;
        const base = stateRef.current.rowBaseRotation[r];
        if (localT <= 0) {
          rg.rotation.x = base;
          allSettled = false;
        } else if (localT >= 1) {
          rg.rotation.x = base + Math.PI;
          if (!stateRef.current.rowSettled[r]) {
            stateRef.current.rowSettled[r] = true;
            // Commit the +π bump and toggle which canvas is "live".
            stateRef.current.rowBaseRotation[r] = base + Math.PI;
            stateRef.current.rowFlipped[r] = !stateRef.current.rowFlipped[r];
          }
        } else {
          const eased = servoEase(localT);
          rg.rotation.x = base + eased * Math.PI;
          allSettled = false;
        }
      }

      if (allSettled) {
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
      const localT = Math.min(elapsedSec / 6, 1);
      sg.rotation.y = localT * TWO_PI;
      sg.scale.setScalar(1.0);
      for (let r = 0; r < 5; r++) {
        const rg = rowRefs.current[r];
        if (rg) rg.rotation.x = stateRef.current.rowBaseRotation[r];
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

      {status === "READING" && <ReadingArrows />}
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

// Small "indicator" arrow — the spec wants the bottom group to occupy
// roughly the bottom 8-10% of the visible region, not feature-prominence.
const arrowShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.22, -0.04);
  s.lineTo(0.08, -0.04);
  s.lineTo(0.08, -0.10);
  s.lineTo(0.22, 0);
  s.lineTo(0.08, 0.10);
  s.lineTo(0.08, 0.04);
  s.lineTo(-0.22, 0.04);
  s.closePath();
  return s;
})();

function makeLabelTexture(text: string): THREE.CanvasTexture {
  const w = 512;
  const h = 96;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = PHOSPHOR_BRIGHT;
  ctx.font = `400 56px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // tracking-section: ~0.1em letter-spacing → render character-by-character
  const chars = text.split("");
  ctx.letterSpacing = "5px";
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function ReadingArrows() {
  const forwardTex = useMemo(() => makeLabelTexture("FORWARD"), []);
  const backwardTex = useMemo(() => makeLabelTexture("BACKWARD"), []);
  useEffect(
    () => () => {
      forwardTex.dispose();
      backwardTex.dispose();
    },
    [forwardTex, backwardTex]
  );
  // Label canvas is 512×96 (aspect ~5.33); plane height matches the
  // 10px section-label scale, so labelH ≈ 0.10 units in this scene.
  const labelH = 0.10;
  const labelW = labelH * (512 / 96);
  return (
    <group position={[0, -2.85, 0]}>
      <group position={[0.85, 0, 0]}>
        <mesh>
          <extrudeGeometry args={[arrowShape, { depth: 0.04, bevelEnabled: false }]} />
          <meshBasicMaterial color={PHOSPHOR_DIM} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.14, 0]}>
          <planeGeometry args={[labelW, labelH]} />
          <meshBasicMaterial map={forwardTex} transparent toneMapped={false} />
        </mesh>
      </group>
      <group position={[-0.85, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI]}>
          <extrudeGeometry args={[arrowShape, { depth: 0.04, bevelEnabled: false }]} />
          <meshBasicMaterial color={PHOSPHOR_DIM} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.14, 0]}>
          <planeGeometry args={[labelW, labelH]} />
          <meshBasicMaterial map={backwardTex} transparent toneMapped={false} />
        </mesh>
      </group>
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
      camera={{ position: [0, 0, 10.0], fov: 35 }}
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
