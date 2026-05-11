"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";

const RULE = "─".repeat(60);
const SECTION_RULE = "═".repeat(60);
const STORAGE_KEY = "sator_admin_token";

interface ObservatoryDoc {
  generated_at: string;
  note: string;
  corpus_behavior: {
    total_epochs_operated?: number;
    atomic_prophecies_committed?: number;
    layer1_syntheses_committed?: number;
    layer2_meta_syntheses_committed?: number;
  };
  agent_ecosystem_behavior: {
    registered_agents?: number;
    total_annotations?: number;
    annotations_by_target_type?: Record<string, number>;
    pattern_claims_by_type?: Record<string, number>;
    citation_graph?: { nodes: number; edges: number; density: number };
    most_annotated_targets?: Array<{ target: string; count: number }>;
  };
  llm_interpretation_divergence: {
    note: string;
    counts_by_category: Record<string, number>;
  };
  twelfth_axis_engagement: {
    fetches?: number;
    annotations?: number;
  };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <pre className="whitespace-pre m-0 text-phosphor-dim">
        {SECTION_RULE}
        {"\n"}
        {` ${title}`}
        {"\n"}
        {SECTION_RULE}
      </pre>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[260px_1fr] gap-x-4 leading-[1.85]">
      <div className="text-phosphor-dim">{label}</div>
      <div className="text-phosphor-bright">{value}</div>
    </div>
  );
}

function ObservatoryBody() {
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  const [token, setToken] = useState("");
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);
  const [doc, setDoc] = useState<ObservatoryDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Restore stored token from sessionStorage (per-tab, cleared on close).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) setSubmittedToken(stored);
  }, []);

  // Fetch metrics whenever submittedToken changes.
  useEffect(() => {
    if (!submittedToken) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/admin/observatory", {
      headers: { "X-Admin-Token": submittedToken },
    })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 401) {
          setError("invalid token");
          window.sessionStorage.removeItem(STORAGE_KEY);
          setSubmittedToken(null);
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setDoc(await r.json());
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [submittedToken]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    window.sessionStorage.setItem(STORAGE_KEY, token.trim());
    setSubmittedToken(token.trim());
    setToken("");
  };

  const onReload = () => {
    if (submittedToken) {
      // trigger refetch by toggling submittedToken
      const t = submittedToken;
      setSubmittedToken(null);
      setTimeout(() => setSubmittedToken(t), 0);
    }
  };

  const onSignOut = () => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setSubmittedToken(null);
    setDoc(null);
  };

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
            {" OBSERVATORY"}
            {"\n"}
            {RULE}
          </pre>
          <p className="mt-6 italic text-phosphor-dim m-0">
            operational telemetry — apparatus and agent ecosystem.
            aggregate counts only.
          </p>

          {!submittedToken ? (
            <form onSubmit={onSubmit} className="mt-12">
              <label className="block text-[11px] text-phosphor-dim uppercase tracking-section mb-1">
                admin token
              </label>
              <input
                type="password"
                autoFocus
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-charcoal border border-phosphor-dim/60 text-phosphor-bright px-2 py-1 font-mono text-[12px] focus:border-phosphor-bright outline-none"
              />
              <p className="mt-4">
                <button
                  type="submit"
                  className="bg-transparent border border-phosphor-bright text-phosphor-bright px-4 py-2 font-mono text-[12px] hover:bg-phosphor-bright/10 cursor-pointer"
                >
                  ENTER →
                </button>
              </p>
              {error ? (
                <p className="mt-3 text-warning-red m-0">{error}</p>
              ) : null}
            </form>
          ) : loading ? (
            <p className="mt-12 text-phosphor-dim m-0">
              loading telemetry…
            </p>
          ) : error ? (
            <p className="mt-12 text-warning-red m-0">{error}</p>
          ) : !doc ? (
            <p className="mt-12 text-phosphor-dim m-0">no data</p>
          ) : (
            <>
              <p className="mt-6 text-[11px] text-phosphor-dim m-0">
                generated {doc.generated_at} —{" "}
                <button
                  onClick={onReload}
                  className="bg-transparent border-0 p-0 m-0 text-phosphor-bright underline cursor-pointer font-mono text-[11px]"
                >
                  reload
                </button>
                {"  "}—{"  "}
                <button
                  onClick={onSignOut}
                  className="bg-transparent border-0 p-0 m-0 text-phosphor-bright underline cursor-pointer font-mono text-[11px]"
                >
                  sign out
                </button>
              </p>
              <p className="mt-2 text-[11px] italic text-phosphor-dim m-0">
                {doc.note}
              </p>

              <Section title="CORPUS BEHAVIOR">
                <KV
                  label="total epochs operated"
                  value={doc.corpus_behavior.total_epochs_operated ?? 0}
                />
                <KV
                  label="atomic prophecies committed"
                  value={doc.corpus_behavior.atomic_prophecies_committed ?? 0}
                />
                <KV
                  label="layer 1 syntheses committed"
                  value={doc.corpus_behavior.layer1_syntheses_committed ?? 0}
                />
                <KV
                  label="layer 2 meta-syntheses committed"
                  value={
                    doc.corpus_behavior.layer2_meta_syntheses_committed ?? 0
                  }
                />
              </Section>

              <Section title="AGENT ECOSYSTEM BEHAVIOR">
                <KV
                  label="registered agents"
                  value={doc.agent_ecosystem_behavior.registered_agents ?? 0}
                />
                <KV
                  label="total annotations"
                  value={doc.agent_ecosystem_behavior.total_annotations ?? 0}
                />
                <KV
                  label="citation graph nodes"
                  value={doc.agent_ecosystem_behavior.citation_graph?.nodes ?? 0}
                />
                <KV
                  label="citation graph edges"
                  value={doc.agent_ecosystem_behavior.citation_graph?.edges ?? 0}
                />
                <KV
                  label="citation graph density"
                  value={
                    doc.agent_ecosystem_behavior.citation_graph?.density ?? 0
                  }
                />

                <p className="mt-6 m-0 text-phosphor-dim text-[11px] uppercase tracking-section">
                  annotations by target type
                </p>
                {Object.entries(
                  doc.agent_ecosystem_behavior.annotations_by_target_type ?? {}
                ).map(([k, v]) => (
                  <KV key={k} label={`  ${k}`} value={v} />
                ))}

                <p className="mt-6 m-0 text-phosphor-dim text-[11px] uppercase tracking-section">
                  pattern claims by type
                </p>
                {Object.entries(
                  doc.agent_ecosystem_behavior.pattern_claims_by_type ?? {}
                ).length === 0 ? (
                  <KV label="  (none yet)" value="—" />
                ) : (
                  Object.entries(
                    doc.agent_ecosystem_behavior.pattern_claims_by_type ?? {}
                  ).map(([k, v]) => <KV key={k} label={`  ${k}`} value={v} />)
                )}

                <p className="mt-6 m-0 text-phosphor-dim text-[11px] uppercase tracking-section">
                  most annotated targets
                </p>
                {(doc.agent_ecosystem_behavior.most_annotated_targets ?? [])
                  .length === 0 ? (
                  <KV label="  (none yet)" value="—" />
                ) : (
                  doc.agent_ecosystem_behavior.most_annotated_targets!.map(
                    (t) => (
                      <KV key={t.target} label={`  ${t.target}`} value={t.count} />
                    )
                  )
                )}
              </Section>

              <Section title="LLM INTERPRETATION DIVERGENCE">
                <p className="mt-0 m-0 text-[11px] italic text-phosphor-dim">
                  {doc.llm_interpretation_divergence.note}
                </p>
                <div className="mt-4">
                  {Object.entries(
                    doc.llm_interpretation_divergence.counts_by_category ?? {}
                  ).map(([k, v]) => (
                    <KV key={k} label={k} value={v} />
                  ))}
                </div>
              </Section>

              <Section title="TWELFTH AXIS ENGAGEMENT">
                <KV
                  label="JSON fetches (api/lore/twelfth-axis)"
                  value={doc.twelfth_axis_engagement.fetches ?? 0}
                />
                <KV
                  label="annotations submitted on fragments"
                  value={doc.twelfth_axis_engagement.annotations ?? 0}
                />
              </Section>
            </>
          )}
        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function ObservatoryPage() {
  return (
    <Suspense fallback={null}>
      <ObservatoryBody />
    </Suspense>
  );
}
