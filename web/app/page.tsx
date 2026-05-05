"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useMockOracle, OracleState } from "@/lib/mock-events";
import { useRealOracle } from "@/lib/real-oracle";
import { TopBar } from "@/components/TopBar";
import { SeedStream } from "@/components/SeedStream";
import { SatorSquare3D } from "@/components/SatorSquare3D";
import { ProphecyLog } from "@/components/ProphecyLog";
import { BottomBar } from "@/components/BottomBar";
import { CRTOverlay } from "@/components/effects/CRTOverlay";
import { LoreDocument } from "@/components/LoreDocument";

function MockDashboard() {
  return <Dashboard oracle={useMockOracle()} />;
}

function LiveDashboard() {
  return <Dashboard oracle={useRealOracle()} />;
}

function Dashboard({ oracle }: { oracle: OracleState }) {
  const o = oracle;
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  return (
    <>
      <div className="h-screen w-screen flex flex-col">
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
            <SatorSquare3D
              glyphs={o.glyphs}
              status={o.status}
              effectsEnabled={effectsEnabled}
            />
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
      <LoreDocument />
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

function PageInner() {
  const params = useSearchParams();
  const live = params.get("live") === "1";
  return live ? <LiveDashboard /> : <MockDashboard />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}
