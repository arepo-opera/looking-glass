"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
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

// Linear-ish rotation that briefly stalls near 270° (3/4 of the way through),
// the way a worn servo motor catches just before settling.
function servoEase(t: number): number {
  if (t < 0.72) return (t / 0.72) * 0.75;
  if (t < 0.80) return 0.75;
  return 0.75 + ((t - 0.80) / 0.20) * 0.25;
}

// Half-cosine pulse 0 → 1 → 0 over [0, 1].
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
  const slabRefs = useRef<(THREE.Mesh | null)[][]>(
    Array.from({ length: 5 }, () => [null, null, null, null, null] as (THREE.Mesh | null)[])
  );
  const glyphMaterialRefs = useRef<(THREE.MeshStandardMaterial | null)[][]>(
    Array.from({ length: 5 }, () => [null, null, null, null, null] as (THREE.MeshStandardMaterial | null)[])
  );

  const glyphCanvases = useMemo(() => {
    return Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => new GlyphCanvas(512))
    );
  }, []);

  useEffect(() => {
    return () => {
      for (const row of glyphCanvases) for (const g of row) g.dispose();
    };
  }, [glyphCanvases]);

  // Internal cube state machine — runs ahead of the prop status when it
  // needs to (e.g. SOLVING ends → LOCKING runs for 1.2s before settling
  // into LOCKED rest).
  const stateRef = useRef({
    cubeState: "GATHERING" as CubeState,
    enteredAtMs: typeof performance !== "undefined" ? performance.now() : 0,
    flickerLastMs: 0,
    rowSwapped: [false, false, false, false, false],
    finalGlyphs: glyphs.map((row) => [...row]),
    displayedGlyphs: glyphs.map((row) => [...row]),
  });

  // Initial draw once fonts are ready.
  useEffect(() => {
    const drawAll = () => {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          glyphCanvases[r][c].draw(glyphs[r]?.[c] ?? "?");
        }
      }
    };
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(drawAll);
    } else {
      drawAll();
    }
    // we only want this on mount
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
      stateRef.current.rowSwapped = [false, false, false, false, false];
      stateRef.current.finalGlyphs = glyphs.map((row) => [...row]);
    } else if (status === "READING" && cs !== "READING") {
      stateRef.current.cubeState = "READING";
      stateRef.current.enteredAtMs = now;
    } else if (status === "GATHERING" && cs !== "GATHERING") {
      stateRef.current.cubeState = "GATHERING";
      stateRef.current.enteredAtMs = now;
      stateRef.current.displayedGlyphs = glyphs.map((row) => [...row]);
      // make sure the new locked glyphs are showing on every face
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          glyphCanvases[r][c].draw(glyphs[r]?.[c] ?? "?");
        }
      }
      // and reset any leftover rotations
      for (let r = 0; r < 5; r++) {
        const rg = rowRefs.current[r];
        if (rg) rg.rotation.x = 0;
        for (let c = 0; c < 5; c++) {
          const s = slabRefs.current[r][c];
          if (s) s.rotation.x = 0;
        }
      }
    }
  }, [status, glyphs, glyphCanvases]);

  useFrame(({ clock }) => {
    const now = performance.now();
    const t = clock.getElapsedTime();
    const cs = stateRef.current.cubeState;
    const elapsedMs = now - stateRef.current.enteredAtMs;
    const elapsedSec = elapsedMs / 1000;
    const sg = squareGroupRef.current;
    if (!sg) return;

    if (cs === "GATHERING") {
      // breathing scale, soft Y-axis drift
      const phase = (t / 4) % 1;
      const breathe = 1.0 + 0.012 * 0.5 * (1 - Math.cos(phase * TWO_PI));
      sg.scale.setScalar(breathe);
      sg.rotation.y = 0.02 * Math.sin(t * (TWO_PI / 12));
      // ensure default emissive intensity
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const m = glyphMaterialRefs.current[r][c];
          if (m && m.emissiveIntensity !== 1.0) m.emissiveIntensity = 1.0;
        }
      }
    } else if (cs === "SOLVING") {
      sg.scale.setScalar(1.0);
      sg.rotation.y = 0;
      // Each row flickers for 600ms in sequence; once a row is past its
      // window it sits with whatever random letter it landed on (the spec's
      // "settles" — the cube goes intentionally quiet before the lock).
      if (now - stateRef.current.flickerLastMs >= 60) {
        stateRef.current.flickerLastMs = now;
        for (let r = 0; r < 5; r++) {
          const startMs = r * 600;
          const endMs = (r + 1) * 600;
          if (elapsedMs >= startMs && elapsedMs < endMs) {
            for (let c = 0; c < 5; c++) {
              const letter = ALPHABET[Math.floor(Math.random() * 16)];
              glyphCanvases[r][c].draw(letter);
            }
          }
        }
      }
    } else if (cs === "LOCKING") {
      sg.scale.setScalar(1.0);
      sg.rotation.y = 0;

      // ~1.0s of staggered row rotations, then ~0.2s of a uniform slab
      // spin to "click" the lock home.
      const rowDuration = 0.7;
      const rowStagger = 0.05;
      const colsStart = 1.0;
      const colsDuration = 0.2;

      // Row rotations (each row 360° on its row axis, with mid-rotation
      // texture swap during the back-facing window)
      for (let r = 0; r < 5; r++) {
        const startSec = r * rowStagger;
        const localT = (elapsedSec - startSec) / rowDuration;
        const rg = rowRefs.current[r];
        if (!rg) continue;
        if (localT <= 0) {
          rg.rotation.x = 0;
        } else if (localT >= 1) {
          rg.rotation.x = 0; // 360° ≡ 0
          if (!stateRef.current.rowSwapped[r]) {
            stateRef.current.rowSwapped[r] = true;
            for (let c = 0; c < 5; c++) {
              glyphCanvases[r][c].draw(stateRef.current.finalGlyphs[r][c]);
            }
          }
        } else {
          const eased = servoEase(localT);
          rg.rotation.x = eased * TWO_PI;
          if (eased > 0.5 && !stateRef.current.rowSwapped[r]) {
            stateRef.current.rowSwapped[r] = true;
            for (let c = 0; c < 5; c++) {
              glyphCanvases[r][c].draw(stateRef.current.finalGlyphs[r][c]);
            }
          }
        }
      }

      // Final 200ms uniform slab spin
      if (elapsedSec >= colsStart && elapsedSec < colsStart + colsDuration) {
        const localT = (elapsedSec - colsStart) / colsDuration;
        const rot = localT * TWO_PI;
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            const s = slabRefs.current[r][c];
            if (s) s.rotation.x = rot;
          }
        }
      } else if (elapsedSec >= colsStart + colsDuration) {
        // settle
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            const s = slabRefs.current[r][c];
            if (s && s.rotation.x !== 0) s.rotation.x = 0;
          }
        }
        stateRef.current.cubeState = "LOCKED";
        stateRef.current.enteredAtMs = now;
        stateRef.current.displayedGlyphs = stateRef.current.finalGlyphs.map(
          (row) => [...row]
        );
      }
    } else if (cs === "LOCKED") {
      // Brief phosphor pulse (250ms), then slow breathing (6s cycle)
      const intensity = 1.0 + 0.4 * pulse(elapsedSec / 0.25);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const m = glyphMaterialRefs.current[r][c];
          if (m) m.emissiveIntensity = intensity;
        }
      }
      const phase = (elapsedSec / 6) % 1;
      sg.scale.setScalar(1.0 + 0.012 * 0.5 * (1 - Math.cos(phase * TWO_PI)));
      sg.rotation.y = 0;
    } else if (cs === "READING") {
      // Single slow Y-axis rotation over 6s, then hold
      const localT = Math.min(elapsedSec / 6, 1);
      sg.rotation.y = localT * TWO_PI;
      sg.scale.setScalar(1.0);
      // restore default emissive after the LOCKED pulse
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const m = glyphMaterialRefs.current[r][c];
          if (m && m.emissiveIntensity !== 1.0) m.emissiveIntensity = 1.0;
        }
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
                glyphTexture={glyphCanvases[r][c].texture}
                slabRef={(el) => {
                  slabRefs.current[r][c] = el;
                }}
                materialRef={(el) => {
                  glyphMaterialRefs.current[r][c] = el;
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
  glyphTexture: THREE.Texture;
  slabRef: (el: THREE.Mesh | null) => void;
  materialRef: (el: THREE.MeshStandardMaterial | null) => void;
}

function Slab({ position, glyphTexture, slabRef, materialRef }: SlabProps) {
  return (
    <mesh ref={slabRef} position={position}>
      <boxGeometry args={[SLAB_W, SLAB_H, SLAB_D]} />
      {/* +X */}
      <meshStandardMaterial attach="material-0" color={CHARCOAL} metalness={0.1} roughness={0.85} emissive={PHOSPHOR_DIM} emissiveIntensity={0.04} />
      {/* -X */}
      <meshStandardMaterial attach="material-1" color={CHARCOAL} metalness={0.1} roughness={0.85} emissive={PHOSPHOR_DIM} emissiveIntensity={0.04} />
      {/* +Y */}
      <meshStandardMaterial attach="material-2" color={CHARCOAL} metalness={0.1} roughness={0.85} emissive={PHOSPHOR_DIM} emissiveIntensity={0.04} />
      {/* -Y */}
      <meshStandardMaterial attach="material-3" color={CHARCOAL} metalness={0.1} roughness={0.85} emissive={PHOSPHOR_DIM} emissiveIntensity={0.04} />
      {/* +Z (front) — glyph face */}
      <meshStandardMaterial
        ref={materialRef}
        attach="material-4"
        color={CHARCOAL}
        emissive={PHOSPHOR_BRIGHT}
        emissiveMap={glyphTexture}
        emissiveIntensity={1.0}
        metalness={0}
        roughness={1}
        toneMapped={false}
      />
      {/* -Z (back) */}
      <meshStandardMaterial attach="material-5" color={CHARCOAL} metalness={0.1} roughness={0.85} />
    </mesh>
  );
}

const arrowShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.12);
  s.lineTo(0.2, -0.12);
  s.lineTo(0.2, -0.28);
  s.lineTo(0.6, 0);
  s.lineTo(0.2, 0.28);
  s.lineTo(0.2, 0.12);
  s.lineTo(-0.5, 0.12);
  s.closePath();
  return s;
})();

function ReadingArrows() {
  return (
    <group position={[0, -2.55, 0]}>
      <group position={[1.3, 0, 0]}>
        <mesh>
          <extrudeGeometry args={[arrowShape, { depth: 0.06, bevelEnabled: false }]} />
          <meshStandardMaterial color={PHOSPHOR_DIM} emissive={PHOSPHOR_DIM} emissiveIntensity={0.5} metalness={0} roughness={1} />
        </mesh>
        <Html position={[0, -0.55, 0]} center transform={false} style={{ pointerEvents: "none" }}>
          <span
            style={{
              color: PHOSPHOR_DIM,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            FORWARD
          </span>
        </Html>
      </group>
      <group position={[-1.3, 0, 0]} rotation={[0, 0, Math.PI]}>
        <mesh>
          <extrudeGeometry args={[arrowShape, { depth: 0.06, bevelEnabled: false }]} />
          <meshStandardMaterial color={PHOSPHOR_DIM} emissive={PHOSPHOR_DIM} emissiveIntensity={0.5} metalness={0} roughness={1} />
        </mesh>
      </group>
      <group position={[-1.3, 0, 0]}>
        <Html position={[0, -0.55, 0]} center transform={false} style={{ pointerEvents: "none" }}>
          <span
            style={{
              color: PHOSPHOR_DIM,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            BACKWARD
          </span>
        </Html>
      </group>
    </group>
  );
}

export function SatorSquare3DCanvas({ glyphs, status }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8.5], fov: 35 }}
      style={{ width: "100%", height: "100%", background: CHARCOAL }}
      gl={{ antialias: true }}
    >
      <directionalLight position={[-1, 1, 1]} intensity={0.18} color={PHOSPHOR_BRIGHT} />
      <directionalLight position={[1, -0.5, 0.3]} intensity={0.06} color={PHOSPHOR_BRIGHT} />
      <CubeRig glyphs={glyphs} status={status} />
    </Canvas>
  );
}
