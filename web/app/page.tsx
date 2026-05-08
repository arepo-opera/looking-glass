"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useMockOracle, OracleState } from "@/lib/mock-events";
import { useRealOracle } from "@/lib/real-oracle";
import { TopBar } from "@/components/TopBar";
import { SeedStream } from "@/components/SeedStream";
import { SatorSquare3D } from "@/components/SatorSquare3D";
import { ProphecyLog } from "@/components/ProphecyLog";
import { SynthesisLog } from "@/components/SynthesisLog";
import { BottomBar } from "@/components/BottomBar";
import { CRTOverlay } from "@/components/effects/CRTOverlay";
import { LoreDocument } from "@/components/LoreDocument";

function MockDashboard() {
  const oracle = useMockOracle();
  return <Dashboard oracle={oracle} />;
}

function LiveDashboard() {
  const oracle = useRealOracle();
  return <Dashboard oracle={oracle} />;
}

function Dashboard({ oracle }: { oracle: OracleState }) {
  const o = oracle;
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  return (
    <>
      {/* Below md: vertical scroll with stacked regions. md+: fixed-height
          three-column layout (unchanged from desktop). The cube uses
          order-1 on mobile so the visitor lands on it without scrolling
          past the seeds, but stays in the middle column on md+. */}
      <div className="min-h-screen md:h-screen w-screen flex flex-col">
        <TopBar
          status={o.status}
          epoch={o.epoch}
          nextTickSeconds={o.nextTickSeconds}
          programId={o.programId}
        />
        <main className="flex-1 flex flex-col md:flex-row min-h-0">
          <section className="order-1 md:order-2 w-full md:w-1/2 md:border-r border-phosphor-dim min-w-0 aspect-square md:aspect-auto md:min-h-0">
            <SatorSquare3D
              glyphs={o.glyphs}
              status={o.status}
              effectsEnabled={effectsEnabled}
            />
          </section>
          <aside className="order-2 md:order-1 w-full md:w-1/4 md:border-r border-phosphor-dim border-t md:border-t-0 min-w-0">
            <SeedStream seeds={o.seeds} />
          </aside>
          <aside className="order-3 w-full md:w-1/4 border-t md:border-t-0 border-phosphor-dim min-w-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ProphecyLog prophecies={o.prophecies} />
            </div>
            {/* SYNTHESIS.LOG region — Layer 1 + Layer 2 previews. Empty
                state until the on-chain synthesis layers begin firing. */}
            <div className="shrink-0 border-t border-phosphor-dim">
              <SynthesisLog />
            </div>
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
