"use client";
import Link from "next/link";
import type { LoreDocument } from "@/lib/lore-content";
import { docSlug } from "@/lib/lore-content";

interface DocumentGridProps {
  docs: LoreDocument[];
  parentRoute: string; // "/station-atlas" etc.
}

function classificationTone(c: string): string {
  const s = c.toLowerCase();
  if (
    s.includes("public") ||
    s.includes("standards") ||
    s.includes("unaddressed")
  ) {
    return "text-phosphor-dim";
  }
  if (s.includes("anomalous") || s.includes("eyes only") || s.includes("final")) {
    return "text-warning-red";
  }
  if (s.includes("restricted") || s.includes("confidential") || s.includes("internal")) {
    return "text-warning-red";
  }
  return "text-phosphor-dim";
}

function shortSubject(doc: LoreDocument): string {
  if (doc.title) return doc.title;
  const f = doc.fields ?? {};
  return (
    f.SUBJECT ||
    f.RE ||
    f.STATUS ||
    doc.type.replace(/_/g, " ")
  );
}

export function DocumentGrid({ docs, parentRoute }: DocumentGridProps) {
  return (
    <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {docs.map((doc) => {
        const slug = docSlug(doc.doc_id);
        const cls = doc.classification ?? "";
        return (
          <Link
            key={doc.doc_id}
            href={`${parentRoute}/${slug}`}
            className="block border border-phosphor-dim/50 hover:border-phosphor-bright p-4 transition-colors duration-150 no-underline group bg-charcoal"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-[11px] font-mono text-phosphor-dim group-hover:text-phosphor-bright transition-colors break-all">
                {doc.doc_id}
              </div>
              {doc.external ? (
                <span className="shrink-0 text-[9px] uppercase tracking-section bg-phosphor-dim/20 text-phosphor-bright px-2 py-0.5 border border-phosphor-dim/40">
                  EXTERNAL
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-[80px_1fr] gap-y-1 gap-x-3 text-[11px] font-mono">
              <div className="text-phosphor-dim">date</div>
              <div className="text-phosphor-bright">{doc.date}</div>
              <div className="text-phosphor-dim">type</div>
              <div className="text-phosphor-bright">
                {doc.type.replace(/_/g, " ")}
              </div>
              {cls ? (
                <>
                  <div className="text-phosphor-dim">classification</div>
                  <div className={classificationTone(cls)}>{cls}</div>
                </>
              ) : null}
            </div>
            <div className="mt-3 text-[12px] text-phosphor-bright font-mono leading-snug">
              {shortSubject(doc)}
            </div>
            <div className="mt-4 text-[11px] text-phosphor-dim group-hover:text-phosphor-bright transition-colors font-mono">
              → READ DOCUMENT
            </div>
          </Link>
        );
      })}
    </div>
  );
}
