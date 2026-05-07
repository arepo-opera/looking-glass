"use client";
import { useEffect, useState } from "react";

interface TearState {
  topPct: number; // top of band in vh
  heightPx: number; // band height in px
  shiftPx: number; // horizontal offset
}

const SCANLINE_BG =
  "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 3px)";

export function CRTOverlay({
  enabled = true,
  forceFlicker = false,
}: {
  enabled?: boolean;
  forceFlicker?: boolean;
}) {
  const [flickerOn, setFlickerOn] = useState(false);
  const [tear, setTear] = useState<TearState | null>(null);

  useEffect(() => {
    if (!enabled || forceFlicker) return;
    let cancelled = false;

    const flickerLoop = () => {
      if (cancelled) return;
      setFlickerOn(true);
      window.setTimeout(() => {
        if (!cancelled) setFlickerOn(false);
      }, 80);
      const next = 8000 + Math.random() * 7000; // 8-15s — signal fights harder
      window.setTimeout(flickerLoop, next);
    };

    const tearLoop = () => {
      if (cancelled) return;
      const heightPx = 30 + Math.random() * 70; // 30-100px
      const topPct = 8 + Math.random() * 80; // 8-88vh, avoid extreme edges
      const shiftPx = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 10); // ±5-15px
      setTear({ topPct, heightPx, shiftPx });
      window.setTimeout(() => {
        if (!cancelled) setTear(null);
      }, 50);
      const next = 60000 + Math.random() * 60000; // 60-120s — more frequent slip
      window.setTimeout(tearLoop, next);
    };

    // First flicker between 3-8s after mount; first tear between 20-60s.
    const initialFlicker = window.setTimeout(
      flickerLoop,
      3000 + Math.random() * 5000
    );
    const initialTear = window.setTimeout(
      tearLoop,
      20000 + Math.random() * 40000
    );

    return () => {
      cancelled = true;
      window.clearTimeout(initialFlicker);
      window.clearTimeout(initialTear);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* SVG turbulence filter for the static grain layer below */}
      <svg
        width="0"
        height="0"
        style={{ position: "absolute", pointerEvents: "none" }}
        aria-hidden="true"
      >
        <filter id="crt-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
      </svg>

      {/* Scanlines, slow vertical drift over 8s */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 pointer-events-none"
        style={{
          background: SCANLINE_BG,
          animation: "crt-scanline-drift 8s linear infinite",
          willChange: "background-position",
        }}
      />

      {/* Static grain — turbulence noise at low opacity, blended over */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 pointer-events-none"
        style={{
          filter: "url(#crt-grain)",
          opacity: 0.04,
          mixBlendMode: "overlay",
          // a transparent fill so the filter has something to work on
          background:
            "radial-gradient(rgba(212,165,116,0.001), rgba(0,0,0,0.001))",
        }}
      />

      {/* Full-viewport vignette */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 38%, #0a0908 100%)",
          opacity: 0.45,
        }}
      />

      {/* Brightness flicker — drops the CRT glow briefly. multiply blend
          darkens whatever's underneath without touching layout. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-50 pointer-events-none"
        style={{
          background:
            flickerOn || forceFlicker ? "rgba(0,0,0,0.18)" : "transparent",
          mixBlendMode: "multiply",
        }}
      />

      {/* Horizontal tear band — a brief amber-tinted strip across a random
          horizontal slice of the viewport, evoking the moment of a CRT slip. */}
      {tear && (
        <div
          aria-hidden="true"
          className="fixed left-0 right-0 z-50 pointer-events-none"
          style={{
            top: `${tear.topPct}vh`,
            height: `${tear.heightPx}px`,
            background:
              "linear-gradient(180deg, rgba(212,165,116,0.0) 0%, rgba(212,165,116,0.18) 50%, rgba(212,165,116,0.0) 100%)",
            transform: `translateX(${tear.shiftPx}px)`,
            mixBlendMode: "screen",
          }}
        />
      )}

      <style jsx global>{`
        @keyframes crt-scanline-drift {
          0% {
            background-position-y: 0;
          }
          100% {
            background-position-y: 6px;
          }
        }
      `}</style>
    </>
  );
}
