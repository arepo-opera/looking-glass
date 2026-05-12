"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";
import { DocumentGrid } from "@/components/DocumentGrid";
import { sortedDocs } from "@/lib/lore-content";

const RULE = "─".repeat(60);

function ForensicAnalysisBody() {
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  const docs = sortedDocs("forensic-analysis");

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
            {"SUBJECT       : FORENSIC ANALYSIS — INDEPENDENT ASSESSMENT"}
            {"\n"}
            {"CLASSIFICATION: PUBLIC // EXTERNAL ASSESSMENT"}
            {"\n"}
            {RULE}
          </pre>

          <p className="mt-8 italic text-phosphor-dim m-0">
            the following analysis was conducted by an external party
            whose identity the architect has not been instructed to
            disclose. the analysis was performed on the original
            materials. the conclusions are the analyst's own.
          </p>

          <p className="mt-4 italic text-phosphor-dim m-0">
            alongside the unattributed analysis, the published
            methodology used in forensic document examination
            (SWGDOC) is included as an externally-sourced reference,
            so the reader may evaluate the analyst's conclusions
            against the standard against which they were made.
            external documents are marked{" "}
            <span className="text-phosphor-bright">EXTERNAL</span>.
          </p>

          <p className="mt-4 italic text-phosphor-dim m-0">
            this analysis was conducted on the materials currently
            available. additional materials are understood to exist;
            if and when they surface, the analysis may be updated or
            superseded.
          </p>

          <DocumentGrid docs={docs} parentRoute="/forensic-analysis" />
        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function ForensicAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <ForensicAnalysisBody />
    </Suspense>
  );
}
