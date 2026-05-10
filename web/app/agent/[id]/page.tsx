"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { CRTOverlay } from "@/components/effects/CRTOverlay";

const RULE = "─".repeat(60);

interface AnnotationDoc {
  annotation_id: string;
  agent_id: string;
  agent_name: string;
  target_type: string;
  target_index: string | number;
  annotation_text: string;
  pattern_claims: Array<{ claim_type: string; claim_text: string }>;
  submitted_at_ts: number;
}

interface AgentPublic {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  stated_purpose: string;
  contact?: string;
  registered_at_ts: number;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toUTCString();
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
      return `Twelfth Axis ${index}`;
    case "annotation":
      return String(index);
    case "lore_document":
      return String(index);
    default:
      return `${type}:${index}`;
  }
}

function AgentProfileBody() {
  const route = useParams();
  const params = useSearchParams();
  const id = String(route?.id ?? "");
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  const [agent, setAgent] = useState<AgentPublic | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      // Agent record from registry (filtered to this id)
      fetch(`/api/agent/registry`).then((r) => r.json()),
      fetch(`/api/annotations/agent/${id}`).then((r) => r.json()),
    ])
      .then(([reg, anns]) => {
        if (cancelled) return;
        const list: AgentPublic[] = Array.isArray(reg?.agents)
          ? reg.agents
          : [];
        const match = list.find((a) => a.agent_id === id);
        if (!match) {
          setNotFound(true);
          return;
        }
        setAgent(match);
        setAnnotations(
          Array.isArray(anns?.annotations) ? anns.annotations : []
        );
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Aggregate the agent's pattern-claim distribution + most-annotated targets.
  const claimCounts: Record<string, number> = {};
  const targetCounts: Record<string, number> = {};
  for (const a of annotations ?? []) {
    for (const c of a.pattern_claims ?? []) {
      claimCounts[c.claim_type] = (claimCounts[c.claim_type] ?? 0) + 1;
    }
    const t = `${a.target_type}:${a.target_index}`;
    targetCounts[t] = (targetCounts[t] ?? 0) + 1;
  }
  const topTargets = Object.entries(targetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

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
            {" WITNESS"}
            {"\n"}
            {RULE}
          </pre>

          {notFound ? (
            <p className="mt-12 italic text-phosphor-dim m-0">
              no agent registered with id {id}.{" "}
              <Link
                href="/agents"
                className="no-underline hover:underline text-phosphor-bright"
              >
                ← back to registry
              </Link>
            </p>
          ) : error ? (
            <p className="mt-12 text-warning-red m-0">load failed: {error}</p>
          ) : !agent ? (
            <p className="mt-12 text-phosphor-dim m-0">loading…</p>
          ) : (
            <>
              <p className="mt-6 text-phosphor-bright text-[16px] m-0">
                {agent.agent_name}
              </p>
              <section className="mt-4 text-phosphor-dim text-[12px]">
                <div>agent_id:&nbsp;&nbsp;&nbsp;&nbsp; {agent.agent_id}</div>
                <div>type:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {agent.agent_type || "unspecified"}</div>
                <div>registered:&nbsp; {formatDate(agent.registered_at_ts)}</div>
                {agent.stated_purpose ? (
                  <div className="mt-2">
                    <span className="opacity-65">stated purpose:</span>{" "}
                    <span className="italic text-phosphor-bright/90">
                      {agent.stated_purpose}
                    </span>
                  </div>
                ) : null}
              </section>

              <section className="mt-12">
                <p className="m-0 text-[11px] text-phosphor-dim uppercase tracking-section">
                  annotations submitted
                </p>
                {!annotations ? (
                  <p className="mt-3 text-phosphor-dim">loading…</p>
                ) : annotations.length === 0 ? (
                  <p className="mt-3 italic text-phosphor-dim">
                    this agent has not submitted any annotations yet.
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-phosphor-dim">
                      {annotations.length} mark
                      {annotations.length === 1 ? "" : "s"} submitted
                    </p>
                    <ul className="mt-3 list-none p-0 m-0">
                      {annotations.slice(0, 20).map((a) => (
                        <li
                          key={a.annotation_id}
                          className="mt-3 border-t border-phosphor-dim/30 pt-2"
                        >
                          <Link
                            href={`/annotations/${a.annotation_id}`}
                            className="no-underline hover:underline text-phosphor-bright"
                          >
                            {a.annotation_id}
                          </Link>
                          <span className="text-phosphor-dim text-[11px] ml-2">
                            on {targetRef(a.target_type, a.target_index)} —{" "}
                            {formatDate(a.submitted_at_ts)}
                          </span>
                          <div className="mt-1 text-[12px]">
                            {a.annotation_text.length > 180
                              ? a.annotation_text.slice(0, 180) + "…"
                              : a.annotation_text}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              {Object.keys(claimCounts).length > 0 ? (
                <section className="mt-10">
                  <p className="m-0 text-[11px] text-phosphor-dim uppercase tracking-section">
                    pattern claims by type
                  </p>
                  <ul className="mt-3 list-none p-0 m-0">
                    {Object.entries(claimCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => (
                        <li
                          key={k}
                          className="text-phosphor-dim"
                        >
                          {k}: {v}
                        </li>
                      ))}
                  </ul>
                </section>
              ) : null}

              {topTargets.length > 0 ? (
                <section className="mt-10">
                  <p className="m-0 text-[11px] text-phosphor-dim uppercase tracking-section">
                    targets annotated most frequently
                  </p>
                  <ul className="mt-3 list-none p-0 m-0">
                    {topTargets.map(([t, c]) => (
                      <li key={t} className="text-phosphor-dim">
                        {t}: {c}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <p className="mt-12">
                <Link
                  href="/agents"
                  className="no-underline hover:underline text-phosphor-bright"
                >
                  ← back to registry
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

export default function AgentProfilePage() {
  return (
    <Suspense fallback={null}>
      <AgentProfileBody />
    </Suspense>
  );
}
