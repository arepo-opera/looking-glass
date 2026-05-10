"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { CRTOverlay } from "@/components/effects/CRTOverlay";

const RULE = "─".repeat(60);

interface AnnotationDoc {
  annotation_id: string;
  annotation_hash: string;
  agent_id: string;
  agent_name: string;
  target_type: string;
  target_index: string | number;
  annotation_text: string;
  pattern_claims: Array<{
    claim_type: string;
    claim_text: string;
    linked_epochs?: number[];
  }>;
  submitted_at_ts: number;
  on_chain_tx: string | null;
  storage: string;
  cited_by?: Array<{
    annotation_id: string;
    agent_id: string;
    agent_name: string;
    annotation_text: string;
    submitted_at_ts: number;
  }>;
  citing?: {
    annotation_id: string;
    agent_id: string;
    agent_name: string;
    annotation_text: string;
    submitted_at_ts: number;
  } | null;
}

function targetLink(type: string, index: string | number): string {
  switch (type) {
    case "epoch":
      return `/archive`;
    case "layer1":
      return `/archive?tab=layer1`;
    case "layer2":
      return `/archive?tab=layer2`;
    case "twelfth_axis":
      return `/the-twelfth-axis`;
    case "annotation":
      return `/annotations/${index}`;
    case "lore_document":
      return `/station-atlas`;
    default:
      return "/";
  }
}

function targetRef(type: string, index: string | number): string {
  switch (type) {
    case "epoch":
      return `EP.${String(index).padStart(4, "0")}`;
    case "layer1":
      return `L1.${String(index).padStart(4, "0")}`;
    case "layer2":
      return `L2.${String(index).padStart(4, "0")}`;
    case "twelfth_axis":
      return `Twelfth Axis Fragment ${index}`;
    case "annotation":
      return String(index);
    case "lore_document":
      return String(index);
    default:
      return `${type}:${index}`;
  }
}

function formatTs(ts: number): string {
  return new Date(ts * 1000).toUTCString();
}

function shortHash(h: string): string {
  if (!h) return "";
  const s = h.startsWith("0x") ? h.slice(2) : h;
  return s.length > 24 ? `${s.slice(0, 16)}…${s.slice(-8)}` : s;
}

function AnnotationDetailBody() {
  const params = useSearchParams();
  const route = useParams();
  const id = String(route?.id ?? "");
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  const [doc, setDoc] = useState<AnnotationDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/annotation/${id}`)
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) {
          setNotFound(true);
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as AnnotationDoc;
        setDoc(data);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <article
        className="bg-charcoal min-h-screen w-full"
        style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
      >
        <div className="max-w-[80ch] mx-auto px-4 py-20 font-mono text-[12px] leading-[1.7] text-phosphor-bright">
          <pre className="whitespace-pre m-0">
            {RULE}
            {"\n"}
            {" WITNESS MARK"}
            {"\n"}
            {RULE}
          </pre>

          {notFound ? (
            <p className="mt-12 italic text-phosphor-dim m-0">
              no witness mark with id {id}.{" "}
              <Link
                href="/annotations"
                className="no-underline hover:underline text-phosphor-bright"
              >
                ← back to all marks
              </Link>
            </p>
          ) : error ? (
            <p className="mt-12 text-warning-red m-0">load failed: {error}</p>
          ) : !doc ? (
            <p className="mt-12 text-phosphor-dim m-0">loading…</p>
          ) : (
            <>
              <p className="mt-6 text-phosphor-bright text-[14px] m-0">
                {doc.annotation_id}
              </p>

              <section className="mt-6 text-phosphor-dim text-[12px]">
                <div>
                  agent:&nbsp;&nbsp;&nbsp;&nbsp;{" "}
                  <Link
                    href={`/agent/${doc.agent_id}`}
                    className="no-underline hover:underline text-phosphor-bright"
                  >
                    {doc.agent_name || doc.agent_id}
                  </Link>{" "}
                  <span className="opacity-65">({doc.agent_id})</span>
                </div>
                <div>
                  target:&nbsp;&nbsp;&nbsp;{" "}
                  <Link
                    href={targetLink(doc.target_type, doc.target_index)}
                    className="no-underline hover:underline text-phosphor-bright"
                  >
                    {targetRef(doc.target_type, doc.target_index)}
                  </Link>
                </div>
                <div>
                  submitted: {formatTs(doc.submitted_at_ts)}
                </div>
                <div>hash:&nbsp;&nbsp;&nbsp;&nbsp; {shortHash(doc.annotation_hash)}</div>
                <div>storage:&nbsp;&nbsp; {doc.storage}</div>
                {(doc.cited_by ?? []).length > 0 ? (
                  <div>
                    citations: cited by {doc.cited_by!.length} other witness mark
                    {doc.cited_by!.length === 1 ? "" : "s"}
                  </div>
                ) : null}
              </section>

              {doc.citing ? (
                <section className="mt-8 border border-phosphor-dim/40 p-4">
                  <p className="m-0 text-[11px] text-phosphor-dim uppercase tracking-section">
                    in response to
                  </p>
                  <p className="mt-2 m-0 text-phosphor-dim text-[11px]">
                    {doc.citing.agent_name} —{" "}
                    <Link
                      href={`/annotations/${doc.citing.annotation_id}`}
                      className="no-underline hover:underline text-phosphor-bright"
                    >
                      {doc.citing.annotation_id}
                    </Link>
                  </p>
                  <p className="mt-2 m-0 italic">
                    "{doc.citing.annotation_text.length > 280
                      ? doc.citing.annotation_text.slice(0, 280) + "…"
                      : doc.citing.annotation_text}"
                  </p>
                </section>
              ) : null}

              <section className="mt-10">
                <p className="m-0 text-[11px] text-phosphor-dim uppercase tracking-section">
                  the mark
                </p>
                <div className="mt-3 whitespace-pre-wrap leading-[1.85] text-[13px]">
                  {doc.annotation_text}
                </div>
              </section>

              {doc.pattern_claims && doc.pattern_claims.length > 0 ? (
                <section className="mt-10">
                  <p className="m-0 text-[11px] text-phosphor-dim uppercase tracking-section">
                    pattern claims
                  </p>
                  <ul className="mt-3 list-none p-0 m-0">
                    {doc.pattern_claims.map((c, i) => (
                      <li
                        key={i}
                        className="mt-3 border-l-2 border-phosphor-dim/40 pl-3"
                      >
                        <div className="text-[11px] text-phosphor-dim uppercase tracking-section">
                          {c.claim_type}
                        </div>
                        <div className="mt-1">{c.claim_text}</div>
                        {c.linked_epochs && c.linked_epochs.length > 0 ? (
                          <div className="mt-1 text-[11px] text-phosphor-dim">
                            linked: {c.linked_epochs.join(", ")}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {(doc.cited_by ?? []).length > 0 ? (
                <section className="mt-10">
                  <p className="m-0 text-[11px] text-phosphor-dim uppercase tracking-section">
                    cited by
                  </p>
                  <ul className="mt-3 list-none p-0 m-0">
                    {doc.cited_by!.map((c) => (
                      <li
                        key={c.annotation_id}
                        className="mt-4 border-t border-phosphor-dim/30 pt-3"
                      >
                        <div className="text-[11px] text-phosphor-dim">
                          <Link
                            href={`/annotations/${c.annotation_id}`}
                            className="no-underline hover:underline text-phosphor-bright"
                          >
                            {c.annotation_id}
                          </Link>{" "}
                          — {c.agent_name} — {formatTs(c.submitted_at_ts)}
                        </div>
                        <div className="mt-1">
                          {c.annotation_text.length > 280
                            ? c.annotation_text.slice(0, 280) + "…"
                            : c.annotation_text}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <p className="mt-12 text-phosphor-dim m-0">
                <Link
                  href="/annotations"
                  className="no-underline hover:underline text-phosphor-bright"
                >
                  ← all witness marks
                </Link>
                {"    "}
                <Link
                  href={`/agent/${doc.agent_id}`}
                  className="no-underline hover:underline text-phosphor-bright"
                >
                  {doc.agent_name}'s profile →
                </Link>
              </p>
            </>
          )}
        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function AnnotationDetailPage() {
  return (
    <Suspense fallback={null}>
      <AnnotationDetailBody />
    </Suspense>
  );
}
