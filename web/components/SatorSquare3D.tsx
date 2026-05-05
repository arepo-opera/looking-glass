"use client";
import dynamic from "next/dynamic";
import type { Status } from "@/lib/mock-events";

// r3f's Canvas can't render server-side (no DOM canvas), so the actual
// scene module is loaded on the client only.
const Canvas3D = dynamic(
  () => import("./SatorSquare3DCanvas").then((m) => m.SatorSquare3DCanvas),
  { ssr: false }
);

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
    <div className="h-full w-full flex flex-col min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-section text-phosphor-dim pl-3 pt-3 shrink-0">
        THE.SQUARE
      </div>
      <div className="flex-1 min-h-0">
        <Canvas3D glyphs={glyphs} status={status} effectsEnabled={effectsEnabled} />
      </div>
    </div>
  );
}
