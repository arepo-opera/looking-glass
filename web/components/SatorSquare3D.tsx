"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Status } from "@/lib/mock-events";

// r3f's Canvas can't render server-side (no DOM canvas), so the actual
// scene module is loaded on the client only.
const Canvas3D = dynamic(
  () => import("./SatorSquare3DCanvas").then((m) => m.SatorSquare3DCanvas),
  { ssr: false }
);

const WAITING_MESSAGES = [
  "gathering seeds…",
  "computing symmetry…",
  "verifying axes…",
  "submitting tick…",
  "awaiting confirmation…",
];

function WaitingMessage() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    // Fade out 200ms before swap, fade back in after. Total cycle 2000ms.
    const swap = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIdx((n) => (n + 1) % WAITING_MESSAGES.length);
        setVisible(true);
      }, 200);
    }, 2000);
    return () => window.clearInterval(swap);
  }, []);
  return (
    <div
      className="absolute left-0 right-0 bottom-3 text-center font-serif italic text-[12px] text-phosphor-dim pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms linear" }}
      aria-live="polite"
    >
      {WAITING_MESSAGES[idx]}
    </div>
  );
}

export function SatorSquare3D({
  glyphs,
  status,
  effectsEnabled = true,
}: {
  glyphs: string[][];
  status: Status;
  effectsEnabled?: boolean;
}) {
  return (
    <div className="h-full w-full flex flex-col min-w-0 relative">
      <div className="text-[10px] font-mono uppercase tracking-section text-phosphor-dim pl-3 pt-3 shrink-0">
        THE.SQUARE
      </div>
      <div className="flex-1 min-h-0">
        <Canvas3D glyphs={glyphs} status={status} effectsEnabled={effectsEnabled} />
      </div>
      {status === "WAITING" && <WaitingMessage />}
    </div>
  );
}
