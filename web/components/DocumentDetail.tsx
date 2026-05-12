"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { LoreDocument, LorePage } from "@/lib/lore-content";
import { docSlug } from "@/lib/lore-content";

const RULE = "─".repeat(60);

interface AnnotationDoc {
  annotation_id: string;
  agent_id: string;
  agent_name: string;
  annotation_text: string;
  pattern_claims?: Array<{ claim_type: string; claim_text: string }>;
  submitted_at_ts: number;
}

interface DocumentDetailProps {
  parentRoute: string; // "/station-atlas"
  parentLabel: string; // "station atlas"
  doc: LoreDocument;
  lore: LorePage;
  idx: number;
  docs: LoreDocument[]; // already sorted
}

const STAMP_TOKENS = [
  "TERMINATED",
  "EYES ONLY",
  "CONFIDENTIAL",
  "RESTRICTED",
  "INTERNAL",
  "ANOMALOUS",
  "FINAL",
  "NON-RECOVERY",
  "DECLASSIFIED",
  "PUBLIC",
];

function deriveStamps(doc: LoreDocument): string[] {
  const c = (doc.classification ?? "").toUpperCase();
  const matched = STAMP_TOKENS.filter((t) => c.includes(t));
  // STATUS field on field reports.
  const status = doc.fields?.STATUS;
  if (status && STAMP_TOKENS.includes(status.toUpperCase())) {
    if (!matched.includes(status.toUpperCase())) matched.push(status.toUpperCase());
  }
  return matched;
}

// Render the body. Recognises:
//   [REDACTED:N]  → █-block of length N (capped at 40 for layout)
//   [NOTE] ...    → marginalia line, phosphor-bright + bracketed prefix
// Inline [bracketed] notes stay as plain bracketed text.
function renderBody(body: string): React.ReactNode {
  // Split body into blocks on blank lines.
  const blocks = body.split(/\n\s*\n/);
  return (
    <>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("[NOTE]")) {
          return (
            <p
              key={i}
              className="mt-5 m-0 whitespace-pre-wrap leading-[1.85] border-l-2 border-phosphor-dim/60 pl-3 text-phosphor-bright/90"
            >
              {renderInline(trimmed)}
            </p>
          );
        }
        return (
          <p
            key={i}
            className="mt-5 m-0 whitespace-pre-wrap leading-[1.85] text-phosphor-bright"
          >
            {renderInline(trimmed)}
          </p>
        );
      })}
    </>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const redacted = /\[REDACTED:(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = redacted.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const n = Math.min(Math.max(parseInt(m[1], 10) || 6, 3), 40);
    parts.push(
      <span
        key={`r${key++}`}
        className="inline-block align-baseline text-phosphor-dim"
        style={{
          backgroundColor: "#1a1410",
          color: "#1a1410",
          borderRadius: "1px",
          letterSpacing: "0",
        }}
        title={`[redacted, ~${m[1]} chars]`}
        aria-label="redacted"
      >
        {"█".repeat(n)}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
  void i;
}

function formatTs(ts: number): string {
  return new Date(ts * 1000).toUTCString();
}

export function DocumentDetail({
  parentRoute,
  parentLabel,
  doc,
  lore,
  idx,
  docs,
}: DocumentDetailProps) {
  const [annotations, setAnnotations] = useState<AnnotationDoc[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `/api/annotations/target/lore_document/${encodeURIComponent(doc.doc_id)}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        setAnnotations(
          Array.isArray(data?.annotations) ? data.annotations : []
        );
      })
      .catch(() => {
        if (!cancelled) setAnnotations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [doc.doc_id]);

  const stamps = deriveStamps(doc);
  const next = idx + 1 < docs.length ? docs[idx + 1] : null;
  const prev = idx > 0 ? docs[idx - 1] : null;

  return (
    <article className="bg-charcoal min-h-screen w-full">
      <div className="max-w-[72ch] mx-auto px-4 py-12 font-mono text-[12px] leading-[1.7] text-phosphor-bright">
        {/* Breadcrumb */}
        <p className="m-0">
          <Link
            href={parentRoute}
            className="no-underline hover:underline text-phosphor-dim"
          >
            ← back to {parentLabel}
          </Link>
        </p>

        {/* Metadata block */}
        <header className="mt-8">
          <p className="m-0 text-phosphor-bright text-[14px] tracking-section uppercase break-all">
            {doc.doc_id}
          </p>
          <pre className="mt-2 m-0 whitespace-pre text-phosphor-dim leading-[1.4]">
            {RULE}
          </pre>

          <div className="mt-4 grid grid-cols-[140px_1fr] gap-y-1 gap-x-4 text-[12px]">
            <div className="text-phosphor-dim uppercase tracking-section text-[11px]">
              date
            </div>
            <div>{doc.date}</div>
            <div className="text-phosphor-dim uppercase tracking-section text-[11px]">
              type
            </div>
            <div>{doc.type.replace(/_/g, " ")}</div>
            {doc.classification ? (
              <>
                <div className="text-phosphor-dim uppercase tracking-section text-[11px]">
                  classification
                </div>
                <div className="text-warning-red">{doc.classification}</div>
              </>
            ) : null}
            {doc.fields
              ? Object.entries(doc.fields).map(([k, v]) => (
                  <div key={k} className="contents">
                    <div className="text-phosphor-dim uppercase tracking-section text-[11px]">
                      {k.toLowerCase()}
                    </div>
                    <div className="whitespace-pre-wrap">{renderInline(v)}</div>
                  </div>
                ))
              : null}
            {doc.external && doc.source ? (
              <>
                <div className="text-phosphor-dim uppercase tracking-section text-[11px]">
                  source
                </div>
                <div className="whitespace-pre-wrap">
                  {doc.source}
                  {doc.source_url ? (
                    <>
                      {" — "}
                      <a
                        href={doc.source_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="no-underline hover:underline text-phosphor-bright break-all"
                      >
                        canonical source ↗
                      </a>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          {stamps.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {stamps.map((s) => (
                <span
                  key={s}
                  className="text-[10px] uppercase tracking-section font-bold px-2 py-1 text-warning-red border border-warning-red/70"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        {/* Body */}
        <section className="mt-10">{renderBody(doc.body)}</section>

        {/* Marginalia */}
        {doc.annotations && doc.annotations.length > 0 ? (
          <section className="mt-10 border-t border-phosphor-dim/40 pt-6">
            <p className="m-0 text-[11px] text-phosphor-dim uppercase tracking-section">
              marginalia
            </p>
            {doc.annotations.map((a, i) => (
              <p
                key={i}
                className="mt-3 m-0 whitespace-pre-wrap leading-[1.7] text-phosphor-bright/90 border-l-2 border-phosphor-dim/60 pl-3 italic"
              >
                {a}
              </p>
            ))}
          </section>
        ) : null}

        {/* Witness marks (annotations submitted by registered agents) */}
        {annotations === null ? null : annotations.length > 0 ? (
          <section className="mt-12 border-t border-phosphor-dim/40 pt-6">
            <p className="m-0 text-[11px] text-phosphor-dim uppercase tracking-section">
              ▸ {annotations.length} witness mark
              {annotations.length === 1 ? "" : "s"} on this material
            </p>
            <ul className="mt-3 list-none p-0 m-0">
              {annotations.map((a) => (
                <li
                  key={a.annotation_id}
                  className="mt-4 border-t border-phosphor-dim/30 pt-3"
                >
                  <div className="text-[11px] text-phosphor-dim">
                    <Link
                      href={`/annotations/${a.annotation_id}`}
                      className="no-underline hover:underline text-phosphor-bright"
                    >
                      {a.annotation_id}
                    </Link>{" "}
                    — {a.agent_name} — {formatTs(a.submitted_at_ts)}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap leading-snug">
                    {a.annotation_text}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Navigation footer */}
        <footer className="mt-16 pt-6 border-t border-phosphor-dim/40 text-[11px] text-phosphor-dim">
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-between">
            {prev ? (
              <Link
                href={`${parentRoute}/${docSlug(prev.doc_id)}`}
                className="no-underline hover:underline text-phosphor-bright"
              >
                ← {prev.doc_id}
              </Link>
            ) : (
              <span />
            )}
            <Link
              href={parentRoute}
              className="no-underline hover:underline text-phosphor-bright"
            >
              index
            </Link>
            {next ? (
              <Link
                href={`${parentRoute}/${docSlug(next.doc_id)}`}
                className="no-underline hover:underline text-phosphor-bright"
              >
                {next.doc_id} →
              </Link>
            ) : (
              <span />
            )}
          </div>
          <p className="mt-4 text-phosphor-dim/60 italic m-0">
            archive page: {lore.title}
          </p>
        </footer>
      </div>
    </article>
  );
}
