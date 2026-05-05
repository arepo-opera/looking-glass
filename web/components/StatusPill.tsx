"use client";
import { useEffect, useState } from "react";
import type { Status } from "@/lib/mock-events";

export function StatusPill({ status }: { status: Status }) {
  const [flashRed, setFlashRed] = useState(false);

  useEffect(() => {
    if (status === "LOCKED") {
      setFlashRed(true);
      const t = window.setTimeout(() => setFlashRed(false), 250);
      return () => window.clearTimeout(t);
    }
  }, [status]);

  const color = flashRed
    ? "text-warning-red border-warning-red"
    : "text-phosphor-bright border-phosphor-dim";

  return (
    <div
      className={`text-[12px] font-mono uppercase border px-2 leading-[22px] ${color}`}
    >
      <span className="text-phosphor-dim">STATUS:</span> {status}
    </div>
  );
}
