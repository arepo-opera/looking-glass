"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";
import { DocumentGrid } from "@/components/DocumentGrid";
import { sortedDocs } from "@/lib/lore-content";

const RULE = "─".repeat(60);

function StationAtlasBody() {
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  const docs = sortedDocs("station-atlas");

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
            {"SUBJECT       : STATION ATLAS — TRANSCRIBED MATERIAL"}
            {"\n"}
            {"CLASSIFICATION: PUBLIC // TRANSCRIPTION OF RECEIVED ARTIFACTS"}
            {"\n"}
            {RULE}
          </pre>

          <p className="mt-8 italic text-phosphor-dim m-0">
            the architect was instructed to transcribe the following
            materials and present them through the apparatus's public
            surface. the original artifacts are held. the transcriptions
            preserve the substance of what was received. redactions
            appear where the originals were redacted. annotations appear
            where marginalia exist on the originals.
          </p>

          <p className="mt-4 italic text-phosphor-dim m-0">
            the architect has not been instructed to disclose the
            provenance of these materials beyond stating that they were
            received.
          </p>

          <p className="mt-4 italic text-phosphor-dim m-0">
            the archive includes both transcribed materials received by
            the architect and a small number of externally-sourced
            declassified documents from adjacent historical programs
            (STARGATE, MKUltra, and others). external documents are
            marked{" "}
            <span className="text-phosphor-bright">EXTERNAL</span> and
            link to their canonical public sources. their presence
            alongside the transcribed materials is intended to ground
            the reader in what real declassified documents of the period
            look like.
          </p>

          <DocumentGrid docs={docs} parentRoute="/station-atlas" />
        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function StationAtlasPage() {
  return (
    <Suspense fallback={null}>
      <StationAtlasBody />
    </Suspense>
  );
}
