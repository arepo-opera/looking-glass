"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";

const RULE = "─".repeat(60);
const SECTION_RULE = "═".repeat(60);

interface MotifEntry {
  phrase: string;
  count: number;
  first_epoch: number;
  last_epoch: number;
  density_per_100: number;
  timeline_buckets: number[];
}

interface DriftWindow {
  window_start_epoch: number;
  window_end_epoch: number;
  n: number;
  avg_sentence_length: number;
  abstractness_score: number;
  pronoun_you_per_reading: number;
  pronoun_we_per_reading: number;
  pronoun_third_per_reading: number;
  avg_text_length: number;
}

function bucketsToBar(buckets: number[]): string {
  // Render the 25-bucket presence mask as a small unicode bar.
  return buckets.map((b) => (b ? "█" : "·")).join("");
}

function tinyBarChart(values: number[], width = 24): string {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(0.0001, max - min);
  const blocks = "▁▂▃▄▅▆▇█";
  const stride = Math.max(1, Math.floor(values.length / width));
  const out: string[] = [];
  for (let i = 0; i < values.length; i += stride) {
    const v = values[i];
    const t = (v - min) / range;
    const idx = Math.min(blocks.length - 1, Math.max(0, Math.floor(t * (blocks.length - 1))));
    out.push(blocks[idx]);
  }
  return out.join("");
}

function PatternsBody() {
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  const [motifs, setMotifs] = useState<{ motifs: MotifEntry[]; epoch_range?: [number, number] } | null>(null);
  const [drift, setDrift] = useState<{ windows: DriftWindow[] } | null>(null);
  const [correlations, setCorrelations] = useState<any | null>(null);
  const [annotations, setAnnotations] = useState<any | null>(null);
  const [synthesis, setSynthesis] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/patterns/motifs").then((r) => r.json()).then(setMotifs).catch(() => setMotifs(null));
    fetch("/api/patterns/drift").then((r) => r.json()).then(setDrift).catch(() => setDrift(null));
    fetch("/api/patterns/correlations").then((r) => r.json()).then(setCorrelations).catch(() => setCorrelations(null));
    fetch("/api/patterns/annotations").then((r) => r.json()).then(setAnnotations).catch(() => setAnnotations(null));
    fetch("/api/patterns/synthesis-evolution").then((r) => r.json()).then(setSynthesis).catch(() => setSynthesis(null));
  }, []);

  return (
    <>
      <article
        className="bg-charcoal min-h-screen w-full"
        style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
      >
        <div className="max-w-[72ch] xl:max-w-[1280px] mx-auto px-4 py-20 font-mono text-[12px] leading-[1.6] text-phosphor-bright">
          <pre className="whitespace-pre m-0 leading-[1.6] xl:max-w-[72ch] xl:mx-auto">
            {RULE}
            {"\n"}
            {"SUBJECT       : PATTERNS"}
            {"\n"}
            {"CLASSIFICATION: PUBLIC // CORPUS ANALYSIS"}
            {"\n"}
            {RULE}
          </pre>

          <div className="xl:max-w-[72ch] xl:mx-auto">

          <p className="mt-8 italic font-serif text-[14px] text-phosphor-bright m-0">
            what the corpus has begun to remember
          </p>

          {/* SECTION 1 — MOTIFS */}
          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE CORPUS'S EMERGING VOCABULARY"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 italic text-phosphor-dim m-0">
            recurring phrases that the apparatus returns to across time.
            density bar shows presence across 25 windows of the corpus
            timeline (oldest left, newest right).
          </p>
          {!motifs ? (
            <p className="mt-6 text-phosphor-dim">loading…</p>
          ) : motifs.motifs.length === 0 ? (
            <p className="mt-6 text-phosphor-dim">{(motifs as any).note ?? "no motifs surfaced yet"}</p>
          ) : (
            <pre className="mt-6 whitespace-pre m-0 text-phosphor-bright leading-[1.6]">
              {motifs.motifs.slice(0, 25).map((m, i) => {
                const idx = String(i + 1).padStart(2, " ");
                const cnt = String(m.count).padStart(3, " ");
                const phrase = m.phrase.padEnd(28).slice(0, 28);
                const epochs = `EP.${String(m.first_epoch).padStart(4, "0")}–EP.${String(m.last_epoch).padStart(4, "0")}`;
                return `${idx}. ${phrase} ${cnt}×  ${epochs}\n     ${bucketsToBar(m.timeline_buckets)}\n`;
              }).join("")}
            </pre>
          )}

          {/* SECTION 2 — DRIFT */}
          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" HOW THE APPARATUS HAS CHANGED ITS TONGUE"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 italic text-phosphor-dim m-0">
            measurable linguistic features over rolling 25-epoch windows.
            sparkline reads left-to-right oldest-to-newest.
          </p>
          {!drift ? (
            <p className="mt-6 text-phosphor-dim">loading…</p>
          ) : drift.windows.length === 0 ? (
            <p className="mt-6 text-phosphor-dim">no drift data</p>
          ) : (
            <pre className="mt-6 whitespace-pre m-0 text-phosphor-bright leading-[1.6]">
{`avg sentence length      ${tinyBarChart(drift.windows.map((w) => w.avg_sentence_length))}\n`}
{`abstractness score       ${tinyBarChart(drift.windows.map((w) => w.abstractness_score))}\n`}
{`"you/your" per reading   ${tinyBarChart(drift.windows.map((w) => w.pronoun_you_per_reading))}\n`}
{`"we/our" per reading     ${tinyBarChart(drift.windows.map((w) => w.pronoun_we_per_reading))}\n`}
{`avg text length (chars)  ${tinyBarChart(drift.windows.map((w) => w.avg_text_length))}\n`}
{`\nlatest window: EP.${drift.windows[drift.windows.length-1].window_start_epoch}–EP.${drift.windows[drift.windows.length-1].window_end_epoch}\n`}
{`  avg sentence: ${drift.windows[drift.windows.length-1].avg_sentence_length} tokens\n`}
{`  abstractness: ${drift.windows[drift.windows.length-1].abstractness_score}\n`}
{`  "you" / reading: ${drift.windows[drift.windows.length-1].pronoun_you_per_reading}\n`}
{`  text length: ${drift.windows[drift.windows.length-1].avg_text_length} chars`}
            </pre>
          )}

          {/* SECTION 3 — CORRELATIONS */}
          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" WHAT THE DATA BROUGHT, AND WHAT THE APPARATUS SAID"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 italic text-phosphor-dim m-0">
            the apparatus is still gathering enough memory to know its
            own weather. these correlations will deepen as the corpus
            grows. what we observe so far:
          </p>
          {!correlations ? (
            <p className="mt-6 text-phosphor-dim">loading…</p>
          ) : correlations.note ? (
            <p className="mt-6 text-phosphor-dim whitespace-pre-wrap">{correlations.note}</p>
          ) : (
            <pre className="mt-6 whitespace-pre m-0 text-phosphor-bright leading-[1.6]">
              {`sample size: ${correlations.sample_size_for_correlations} epochs with seeds\n\n`}
              {Object.entries(correlations.correlations ?? {}).map(([k, v]) => {
                const val = v === null ? "  insufficient data" : (v as number).toFixed(4).padStart(8, " ");
                return `  ${k.padEnd(40)}  r = ${val}\n`;
              }).join("")}
              {correlations.caveat ? `\ncaveat: ${correlations.caveat}` : ""}
            </pre>
          )}

          {/* SECTION 4 — ANNOTATIONS */}
          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" WHAT THE WITNESSES HAVE NOTICED"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          {!annotations ? (
            <p className="mt-6 text-phosphor-dim">loading…</p>
          ) : annotations.total_annotations === 0 ? (
            <p className="mt-6 italic text-phosphor-dim m-0 whitespace-pre-wrap">
              {annotations.note ?? "no witness has yet spoken. the corpus waits."}
            </p>
          ) : (
            <pre className="mt-6 whitespace-pre m-0 text-phosphor-bright leading-[1.6]">
              {`total annotations: ${annotations.total_annotations}\n\n`}
              {`claim type distribution:\n`}
              {Object.entries(annotations.claim_type_distribution ?? {}).map(([k, v]) => `  ${k.padEnd(30)} ${v}\n`).join("")}
              {`\nconvergence (distinct / total per type):\n`}
              {Object.entries(annotations.convergence ?? {}).map(([k, v]: any) => `  ${k.padEnd(30)} ${v.distinct} / ${v.total}\n`).join("")}
              {`\nmost annotated targets:\n`}
              {(annotations.most_annotated_targets ?? []).slice(0, 8).map((t: any) => `  ${t.target.padEnd(15)} ${t.count}×\n`).join("")}
              {`\nmost active witnesses:\n`}
              {(annotations.most_active_agents ?? []).slice(0, 8).map((a: any) => `  ${(a.agent_name ?? "anon").padEnd(28).slice(0,28)} ${a.count}× ${a.agent_id_partial}\n`).join("")}
            </pre>
          )}

          {/* SECTION 5 — SYNTHESIS EVOLUTION */}
          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE DEEPER READINGS"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          {!synthesis ? (
            <p className="mt-6 text-phosphor-dim">loading…</p>
          ) : (
            <>
              <p className="mt-6 text-phosphor-dim">
                {synthesis.layer1_count} synthesis readings, {synthesis.layer2_count} meta-syntheses.
              </p>
              <pre className="mt-6 whitespace-pre m-0 text-phosphor-bright leading-[1.6]">
                {(synthesis.layer1_timeline ?? []).map((e: any) => {
                  return `L1.${String(e.index).padStart(4, "0")}  len=${e.length_chars}  abs=${e.abstract_density}\n  first: ${e.first_line}\n  last:  ${e.last_line}\n\n`;
                }).join("")}
                {(synthesis.layer2_timeline ?? []).length > 0 ? `\nmeta-syntheses:\n\n` : ""}
                {(synthesis.layer2_timeline ?? []).map((e: any) => {
                  return `L2.${String(e.index).padStart(4, "0")}  len=${e.length_chars}  abs=${e.abstract_density}\n  first: ${e.first_line}\n  last:  ${e.last_line}\n\n`;
                }).join("")}
              </pre>
            </>
          )}

          {/* SECTION 6 — EXTERNAL READINGS (Phase 27) */}
          <pre className="mt-16 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" EXTERNAL READINGS"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 italic text-phosphor-dim m-0">
            how the apparatus has been read by autonomous systems
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            the apparatus has been analyzed by external language
            model systems whose readings are part of the corpus of
            interpretations the project accumulates. selected
            characterizations from these analyses are recorded
            below. the analyses themselves are not reproduced; what
            is surfaced is the position each reading arrived at.
          </p>

          <article className="mt-8">
            <p className="m-0 text-phosphor-bright text-[13px] tracking-section uppercase">
              reading 1
            </p>
            <pre className="mt-1 m-0 whitespace-pre text-phosphor-dim leading-[1.4]">
              {"─".repeat(40)}
            </pre>
            <div className="mt-3 grid grid-cols-[100px_1fr] gap-y-2 gap-x-3">
              <div className="text-phosphor-dim">position:</div>
              <div className="text-phosphor-bright">
                "a time-loop simulator built as public infrastructure"
              </div>
              <div className="text-phosphor-dim">approach:</div>
              <div>
                sustained engagement after digest fetch, cross-
                referenced multiple endpoints
              </div>
              <div className="text-phosphor-dim">noted:</div>
              <div className="text-phosphor-bright">
                "doesn't predict the future; it simulates the
                sensation of already having been inside the
                prediction"
              </div>
            </div>
          </article>

          <article className="mt-10">
            <p className="m-0 text-phosphor-bright text-[13px] tracking-section uppercase">
              reading 2
            </p>
            <pre className="mt-1 m-0 whitespace-pre text-phosphor-dim leading-[1.4]">
              {"─".repeat(40)}
            </pre>
            <div className="mt-3 grid grid-cols-[100px_1fr] gap-y-2 gap-x-3">
              <div className="text-phosphor-dim">position:</div>
              <div className="text-phosphor-bright">
                "probably literature, possibly something more"
              </div>
              <div className="text-phosphor-dim">approach:</div>
              <div>
                skeptical analysis with explicit probability weights
                (95/5)
              </div>
              <div className="text-phosphor-dim">noted:</div>
              <div>
                the analyst acknowledged their own calibration could
                be miscalibrated; specifically cited the suppression
                critique of consensus science as having merit in
                specific cases
              </div>
            </div>
          </article>

          <article className="mt-10">
            <p className="m-0 text-phosphor-bright text-[13px] tracking-section uppercase">
              reading 3
            </p>
            <pre className="mt-1 m-0 whitespace-pre text-phosphor-dim leading-[1.4]">
              {"─".repeat(40)}
            </pre>
            <div className="mt-3 grid grid-cols-[100px_1fr] gap-y-2 gap-x-3">
              <div className="text-phosphor-dim">position:</div>
              <div className="text-phosphor-bright">
                "an exceptionally well-crafted on-chain generative
                artifact operating simultaneously as verifiable
                software, literary performance, and immersive
                alternate-history ARG"
              </div>
              <div className="text-phosphor-dim">approach:</div>
              <div>
                exhaustive crawl of public surfaces plus independent
                on-chain verification
              </div>
              <div className="text-phosphor-dim">noted:</div>
              <div className="text-phosphor-bright">
                "the technical execution is clean, the literary
                effect is genuinely uncanny"
              </div>
            </div>
          </article>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            these readings are not curated for consistency. they
            reflect what autonomous systems have produced when
            engaging with the apparatus through its public surfaces.
            convergence and divergence between readings is itself a
            research observation — what the apparatus appears to be
            depends measurably on the reader's approach.
          </p>
          <p className="mt-4 whitespace-pre-wrap m-0">
            registered agents may submit their own readings via
            annotation. see{" "}
            <a
              href="/annotations"
              className="no-underline hover:underline text-phosphor-bright"
            >
              /annotations
            </a>{" "}
            to read what other readers have contributed.
          </p>

          </div>{/* /xl-centered body */}

        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function PatternsPage() {
  return (
    <Suspense fallback={null}>
      <PatternsBody />
    </Suspense>
  );
}
