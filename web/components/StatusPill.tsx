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

  return (
    <div className="text-[12px] font-mono uppercase">
      <span className="text-phosphor-dim">STATUS:</span>{" "}
      <span className={flashRed ? "text-warning-red" : "text-phosphor-bright"}>
        {status}
      </span>
    </div>
  );
}
