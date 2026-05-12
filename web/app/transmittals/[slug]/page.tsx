"use client";
import { Suspense } from "react";
import { useParams, useSearchParams, notFound } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";
import { DocumentDetail } from "@/components/DocumentDetail";
import { findDocBySlug, sortedDocs } from "@/lib/lore-content";

function Body() {
  const params = useSearchParams();
  const route = useParams();
  const slug = String(route?.slug ?? "");
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  const found = findDocBySlug("transmittals", slug);
  if (!found) notFound();

  const docs = sortedDocs("transmittals");
  const idx = docs.findIndex((d) => d.doc_id === found!.doc.doc_id);

  return (
    <>
      <DocumentDetail
        parentRoute="/transmittals"
        parentLabel="transmittals"
        doc={found!.doc}
        lore={found!.lore}
        idx={idx}
        docs={docs}
      />
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function TransmittalDocPage() {
  return (
    <Suspense fallback={null}>
      <Body />
    </Suspense>
  );
}
