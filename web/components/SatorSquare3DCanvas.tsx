"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Status } from "@/lib/mock-events";

const SLAB_W = 0.85;
const SLAB_H = 0.85;
const SLAB_D = 0.18;
const SLAB_GAP = 0.30;
const PITCH = SLAB_W + SLAB_GAP; // 1.15
const ALPHABET = "SATOREPNVCLDIMHU";
const TWO_PI = Math.PI * 2;

const PHOSPHOR_BRIGHT = "#d4a574";
const PHOSPHOR_DIM = "#7a5f3f";
const CHARCOAL = "#0a0908";

const FONT_URL = "/fonts/IMFellEnglishSC.ttf";

type CubeState = "GATHERING" | "SOLVING" | "LOCKING" | "LOCKED" | "READING";

class GlyphCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  current: string = "";

  constructor(size = 512) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.draw(" ");
  }

  draw(letter: string) {
    if (letter === this.current) return;
    this.current = letter;
    const size = this.canvas.width;
    this.ctx.clearRect(0, 0, size, size);
    this.ctx.fillStyle = PHOSPHOR_BRIGHT;
    this.ctx.font = `400 ${Math.floor(size * 0.72)}px "IM Fell English SC", serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
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

  // Two glyph canvases per slab: one for the front-facing plane, one for the
  // back-facing plane. The flip-board mechanic pre-loads the new glyph onto
  // whichever plane is hidden, then rotates 180° to reveal it.
  const glyphFront = useMemo(
    () =>
      Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => new GlyphCanvas(512))
      ),
    []
  );
  const glyphBack = useMemo(
    () =>
      Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => new GlyphCanvas(512))
      ),
    []
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
}

function Slab({ position, frontTexture, backTexture }: SlabProps) {
  return (
    <group position={position}>
      {/* dark stone box, all six faces uniform */}
      <mesh>
        <boxGeometry args={[SLAB_W, SLAB_H, SLAB_D]} />
        <meshStandardMaterial
          color={CHARCOAL}
          metalness={0.1}
          roughness={0.85}
          emissive={PHOSPHOR_DIM}
          emissiveIntensity={0.04}
        />
      </mesh>
      {/* front-face glyph plane, slightly proud of the box face */}
      <mesh position={[0, 0, SLAB_D / 2 + 0.001]}>
        <planeGeometry args={[SLAB_W * 0.96, SLAB_H * 0.96]} />
        <meshBasicMaterial map={frontTexture} transparent toneMapped={false} />
      </mesh>
      {/* back-face glyph plane, pre-rotated 180° on X so the slab's own 180°
          flip lands the texture upright in the camera's view */}
      <mesh
        position={[0, 0, -SLAB_D / 2 - 0.001]}
        rotation={[Math.PI, 0, 0]}
      >
        <planeGeometry args={[SLAB_W * 0.96, SLAB_H * 0.96]} />
        <meshBasicMaterial map={backTexture} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

const arrowShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.4, -0.08);
  s.lineTo(0.16, -0.08);
  s.lineTo(0.16, -0.20);
  s.lineTo(0.45, 0);
  s.lineTo(0.16, 0.20);
  s.lineTo(0.16, 0.08);
  s.lineTo(-0.4, 0.08);
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
  // canvas is 512×96, aspect 5.33; pick a plane height around the
  // section-label scale (~10px ≈ 0.18 units in this scene).
  const labelH = 0.18;
  const labelW = labelH * (512 / 96);
  return (
    <group position={[0, -2.85, 0]}>
      <group position={[1.3, 0, 0]}>
        <mesh>
          <extrudeGeometry args={[arrowShape, { depth: 0.06, bevelEnabled: false }]} />
          <meshBasicMaterial color={PHOSPHOR_DIM} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.32, 0]}>
          <planeGeometry args={[labelW, labelH]} />
          <meshBasicMaterial map={forwardTex} transparent toneMapped={false} />
        </mesh>
      </group>
      <group position={[-1.3, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI]}>
          <extrudeGeometry args={[arrowShape, { depth: 0.06, bevelEnabled: false }]} />
          <meshBasicMaterial color={PHOSPHOR_DIM} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.32, 0]}>
          <planeGeometry args={[labelW, labelH]} />
          <meshBasicMaterial map={backwardTex} transparent toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export function SatorSquare3DCanvas({ glyphs, status }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 10.0], fov: 35 }}
      style={{ width: "100%", height: "100%", background: CHARCOAL }}
      gl={{ antialias: true }}
    >
      <directionalLight position={[-1, 1, 1]} intensity={0.18} color={PHOSPHOR_BRIGHT} />
      <directionalLight position={[1, -0.5, 0.3]} intensity={0.06} color={PHOSPHOR_BRIGHT} />
      <CubeRig glyphs={glyphs} status={status} />
    </Canvas>
  );
}
