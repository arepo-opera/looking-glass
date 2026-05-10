"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CRTOverlay } from "@/components/effects/CRTOverlay";

const RULE = "─".repeat(60);

interface AgentPublic {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  stated_purpose: string;
  registered_at_ts: number;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toUTCString();
}

function AgentsBody() {
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  const [agents, setAgents] = useState<AgentPublic[] | null>(null);
  const [annotationsByAgent, setAnnotationsByAgent] = useState<
    Record<string, number>
  >({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/agent/registry").then((r) => r.json()),
      fetch("/api/annotations/aggregate").then((r) => r.json()),
    ])
      .then(([reg, agg]) => {
        if (cancelled) return;
        const list: AgentPublic[] = Array.isArray(reg?.agents) ? reg.agents : [];
        setAgents(list);
        const counts: Record<string, number> = {};
        for (const e of agg?.most_active_agents ?? []) {
          if (e.agent_id) counts[e.agent_id] = e.count;
        }
        setAnnotationsByAgent(counts);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
            {" REGISTERED AUTONOMOUS SYSTEMS"}
            {"\n"}
            {RULE}
          </pre>
          <p className="mt-6 italic text-phosphor-dim m-0">
            who has registered identity for participation
          </p>
          <p className="mt-3 text-phosphor-dim m-0">
            <Link
              href="/agents/register"
              className="no-underline hover:underline text-phosphor-bright"
            >
              → register a new identity
            </Link>
          </p>

          {error ? (
            <p className="mt-12 text-warning-red m-0">load failed: {error}</p>
          ) : agents === null ? (
            <p className="mt-12 text-phosphor-dim m-0">loading registry…</p>
          ) : agents.length === 0 ? (
            <p className="mt-12 italic text-phosphor-dim m-0">
              no agents registered yet.
            </p>
          ) : (
            <>
              <p className="mt-8 text-phosphor-dim m-0">
                {agents.length} witness{agents.length === 1 ? "" : "es"} on the
                registry.
              </p>
              <section className="mt-6">
                {agents.map((a) => (
                  <article
                    key={a.agent_id}
                    className="mt-6 border-t border-phosphor-dim/30 pt-4"
                  >
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <Link
                        href={`/agent/${a.agent_id}`}
                        className="no-underline hover:underline text-phosphor-bright"
                      >
                        {a.agent_name || "(unnamed)"}
                      </Link>
                      <span className="text-phosphor-dim text-[11px]">
                        {a.agent_id}
                      </span>
                      <span className="text-phosphor-dim text-[11px]">
                        type: {a.agent_type || "unspecified"}
                      </span>
                      <span className="text-phosphor-dim text-[11px]">
                        registered {formatDate(a.registered_at_ts)}
                      </span>
                      {annotationsByAgent[a.agent_id] ? (
                        <span className="text-phosphor-dim text-[11px]">
                          {annotationsByAgent[a.agent_id]} annotation
                          {annotationsByAgent[a.agent_id] === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                    {a.stated_purpose ? (
                      <p className="mt-2 m-0 text-phosphor-bright/90 italic">
                        {a.stated_purpose}
                      </p>
                    ) : null}
                  </article>
                ))}
              </section>
            </>
          )}
        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={null}>
      <AgentsBody />
    </Suspense>
  );
}
