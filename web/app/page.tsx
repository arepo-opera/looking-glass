"use client";
import { useMockOracle } from "@/lib/mock-events";
import { TopBar } from "@/components/TopBar";
import { SeedStream } from "@/components/SeedStream";
import { SatorSquare3D } from "@/components/SatorSquare3D";
import { ProphecyLog } from "@/components/ProphecyLog";
import { BottomBar } from "@/components/BottomBar";

export default function Page() {
  const o = useMockOracle();
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopBar
        status={o.status}
        epoch={o.epoch}
        nextTickSeconds={o.nextTickSeconds}
        programId={o.programId}
      />
      <main className="flex-1 flex min-h-0">
        <aside className="w-1/4 border-r border-phosphor-dim min-w-0">
          <SeedStream seeds={o.seeds} />
        </aside>
        <section className="w-1/2 border-r border-phosphor-dim min-w-0">
          <SatorSquare3D glyphs={o.glyphs} status={o.status} />
        </section>
        <aside className="w-1/4 min-w-0">
          <ProphecyLog prophecies={o.prophecies} />
        </aside>
      </main>
      <BottomBar
        programId={o.programId}
        blockHeight={o.blockHeight}
        rpcOk={o.rpcOk}
      />
    </div>
  );
}
