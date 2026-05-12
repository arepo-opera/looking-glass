"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";
import { DocumentGrid } from "@/components/DocumentGrid";
import { sortedDocs } from "@/lib/lore-content";

const RULE = "─".repeat(60);

function TransmittalsBody() {
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  const docs = sortedDocs("transmittals");

  return (
    <>
      <article
        className="bg-charcoal min-h-screen w-full"
        style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
      >
        <div className="max-w-[88ch] mx-auto px-4 py-16 font-mono text-[12px] leading-[1.7] text-phosphor-bright">
          <pre className="whitespace-pre m-0 leading-[1.6]">
            {RULE}
            {"\n"}
            {"SUBJECT       : TRANSMITTAL ARCHIVE — TRANSCRIBED CORRESPONDENCE"}
            {"\n"}
            {"CLASSIFICATION: PUBLIC // TRANSCRIPTION OF RECEIVED MATERIALS"}
            {"\n"}
            {RULE}
          </pre>

          <p className="mt-8 italic text-phosphor-dim m-0">
            correspondence transcribed from materials received by the
            architect's family between approximately 1968 and 2007. the
            apparatus has been instructed to make these visible. the
            originals are not available for inspection. their substance,
            to the degree it can be rendered, is preserved here.
          </p>

          <p className="mt-4 italic text-phosphor-dim m-0">
            the archive includes both transcribed correspondence and an
            externally-sourced declassified document showing what
            documented inter-agency transmittals of the same period
            looked like. external documents are marked{" "}
            <span className="text-phosphor-bright">EXTERNAL</span>.
          </p>

          <DocumentGrid docs={docs} parentRoute="/transmittals" />
        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function TransmittalsPage() {
  return (
    <Suspense fallback={null}>
      <TransmittalsBody />
    </Suspense>
  );
}
