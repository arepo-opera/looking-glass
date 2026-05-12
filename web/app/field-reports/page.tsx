"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";
import { DocumentGrid } from "@/components/DocumentGrid";
import { sortedDocs } from "@/lib/lore-content";

const RULE = "─".repeat(60);

function FieldReportsBody() {
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  const docs = sortedDocs("field-reports");

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
            {"SUBJECT       : FIELD REPORTS — TRANSCRIBED OPERATIONAL RECORDS"}
            {"\n"}
            {"CLASSIFICATION: PUBLIC // TRANSCRIPTION OF RECEIVED MATERIALS"}
            {"\n"}
            {RULE}
          </pre>

          <p className="mt-8 italic text-phosphor-dim m-0">
            operational records transcribed from materials received by
            the architect. dates span 1962—2009. the apparatus has been
            instructed to make these visible. some records remain held
            and may surface in time. the architect has not been
            instructed to explain the reporting structure they reflect.
          </p>

          <p className="mt-4 italic text-phosphor-dim m-0">
            the archive includes both transcribed reports and an
            externally-sourced declassified document — a representative
            STARGATE remote-viewing session transcript — included so
            the reader can see the documented session structure of the
            comparison case referenced throughout the transcribed
            material. external documents are marked{" "}
            <span className="text-phosphor-bright">EXTERNAL</span>.
          </p>

          <DocumentGrid docs={docs} parentRoute="/field-reports" />
        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function FieldReportsPage() {
  return (
    <Suspense fallback={null}>
      <FieldReportsBody />
    </Suspense>
  );
}
