import { StatusPill } from "./StatusPill";
import type { Status } from "@/lib/mock-events";

interface Props {
  status: Status;
  epoch: number;
  nextTickSeconds: number;
  programId: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function TopBar({ status, epoch, nextTickSeconds, programId }: Props) {
  const mm = pad2(Math.floor(nextTickSeconds / 60));
  const ss = pad2(nextTickSeconds % 60);
  return (
    <header className="h-[32px] shrink-0 border-b border-phosphor-dim flex items-center justify-between px-3">
      <StatusPill status={status} />
      <div className="text-[12px] font-mono flex gap-6">
        <span>
          <span className="text-phosphor-dim">NEXT.TICK</span> {mm}:{ss}
        </span>
        <span>
          <span className="text-phosphor-dim">EP</span>{" "}
          {String(epoch).padStart(4, "0")}
        </span>
        <span>
          <span className="text-phosphor-dim">PRG</span>{" "}
          {programId.slice(0, 4)}...{programId.slice(-4)}
        </span>
      </div>
    </header>
  );
}
