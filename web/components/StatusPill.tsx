"use client";
import { useEffect, useState } from "react";
import type { Status } from "@/lib/mock-events";

const RED_HALO =
  "0 0 6px rgba(196,61,42,0.95), 0 0 14px rgba(196,61,42,0.55), 0 0 26px rgba(196,61,42,0.25)";
const AMBER_HALO =
  "0 0 4px rgba(212,165,116,0.55), 0 0 10px rgba(212,165,116,0.18)";

export function StatusPill({ status }: { status: Status }) {
  const [flashRed, setFlashRed] = useState(false);

  useEffect(() => {
    if (status === "LOCKED") {
      setFlashRed(true);
      const t = window.setTimeout(() => setFlashRed(false), 250);
      return () => window.clearTimeout(t);
    }
  }, [status]);

  const color = flashRed ? "text-warning-red" : "text-phosphor-bright";
  const halo = flashRed ? RED_HALO : AMBER_HALO;

  return (
    <div className="text-[12px] font-mono uppercase">
      <span className="text-phosphor-dim">STATUS:</span>{" "}
      <span
        className={color}
        style={{
          textShadow: halo,
          // settle the glow back to amber over the same window the color does
          transition: flashRed ? "none" : "text-shadow 250ms linear, color 250ms linear",
        }}
      >
        {status}
      </span>
    </div>
  );
}
