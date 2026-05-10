"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";

const RULE = "─".repeat(60);
const HEAVY_RULE = "━".repeat(40);

interface AxisFragment {
  position: string;
  label: string;
  text: string;
}

interface TwelfthAxisDoc {
  title: string;
  subtitle: string;
  locked_at: string;
  hash: string;
  uri: string;
  on_chain_tx: string | null;
  fragments: AxisFragment[];
  full_text: string;
  model: string;
  version: string;
  footer_disclosure: string;
}

function shortHash(h: string): string {
  if (!h) return "";
  const s = h.startsWith("0x") ? h.slice(2) : h;
  return `${s.slice(0, 16)}…${s.slice(-8)}`;
}

function formatLockedAt(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toUTCString();
  } catch {
    return iso;
  }
}

function FragmentBlock({ frag }: { frag: AxisFragment }) {
  return (
    <section
      className="mt-20 first:mt-0"
      aria-label={`Axis Position ${frag.position}`}
      // CSS columns can split a fragment across the gutter; this
      // keeps each axis position whole. Tailwind doesn't ship a
      // break-inside utility in v3 by default — inline style.
      style={{ breakInside: "avoid" }}
    >
      <h2 className="m-0 font-serif text-phosphor-bright tracking-section text-[28px] leading-[1.1]">
        AXIS POSITION&nbsp;{frag.position}
      </h2>
      {frag.label ? (
        <p className="mt-2 m-0 text-phosphor-dim italic">
          {frag.label}
        </p>
      ) : null}
      <pre className="mt-3 m-0 text-phosphor-dim leading-[1.6] whitespace-pre">
        {HEAVY_RULE}
      </pre>
      <div className="mt-6 whitespace-pre-wrap leading-[1.95] text-phosphor-bright">
        {frag.text}
      </div>
    </section>
  );
}

function TwelfthAxisBody() {
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  const [doc, setDoc] = useState<TwelfthAxisDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/lore/twelfth-axis")
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        if (!r.ok) {
          setError(`load failed: ${r.status}`);
          setLoading(false);
          return;
        }
        const data = (await r.json()) as TwelfthAxisDoc;
        setDoc(data);
        setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e?.message ?? e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <article
        className="bg-charcoal min-h-screen w-full"
        style={{
          fontFeatureSettings: '"calt" 0, "liga" 0',
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 25%, rgba(40, 28, 18, 0.55) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 50% 95%, rgba(28, 20, 12, 0.7) 0%, transparent 75%)",
          backgroundColor: "#080604",
        }}
      >
        {/* Width: comfortable single column (~70ch) until xl, then
            widen to ~1280px to accommodate two columns. The header,
            body, and footer below each manage their own width
            within this container. */}
        <div className="max-w-[70ch] xl:max-w-[1280px] mx-auto px-4 py-24 font-mono text-[13px] leading-[1.85] text-phosphor-bright">
          {/* Header — full width above both columns on desktop */}
          <header className="xl:max-w-[70ch] xl:mx-auto">
            <pre className="m-0 whitespace-pre text-phosphor-dim leading-[1.4]">
              {RULE}
            </pre>
            <h1 className="mt-6 m-0 font-serif text-phosphor-bright tracking-section text-[36px] leading-[1.05]">
              THE TWELFTH AXIS
            </h1>
            <pre className="mt-4 m-0 whitespace-pre text-phosphor-dim leading-[1.6]">
              {HEAVY_RULE}
            </pre>
            <p className="mt-5 italic text-phosphor-dim m-0">
              a reading on the non-linear substrate
            </p>
          </header>

          {loading ? (
            <p className="mt-16 m-0 text-phosphor-dim xl:max-w-[70ch] xl:mx-auto">
              loading the Reading…
            </p>
          ) : error ? (
            <p className="mt-16 m-0 text-warning-red xl:max-w-[70ch] xl:mx-auto">
              {error}
            </p>
          ) : notFound || !doc ? (
            <section className="mt-16 xl:max-w-[70ch] xl:mx-auto">
              <pre className="m-0 whitespace-pre text-phosphor-dim leading-[1.4]">
                {RULE}
              </pre>
              <p className="mt-8 italic text-phosphor-bright m-0">
                the apparatus has not yet produced this Reading.
              </p>
              <p className="mt-6 text-phosphor-dim m-0">
                The Twelfth Axis is a one-time generative artifact.
                When the apparatus produces it, it is committed
                permanently to the chain and rendered here. Until that
                moment, this page holds the silence.
              </p>
              <p className="mt-6 text-phosphor-dim m-0">
                The atomic prophecies and synthesis layers continue at
                their cadence. They are visible in the{" "}
                <a
                  href="/archive"
                  className="no-underline hover:underline text-phosphor-bright"
                >
                  archive
                </a>
                .
              </p>
            </section>
          ) : (
            <>
              {/* Metadata band — full width above both columns on
                  desktop. Model + version live in the JSON metadata
                  for transparency but are not surfaced on the
                  rendered artifact. */}
              <section className="mt-12 text-phosphor-dim text-[12px] leading-[1.7] xl:max-w-[70ch] xl:mx-auto">
                <div>locked at: {formatLockedAt(doc.locked_at)}</div>
                <div>hash:&nbsp;&nbsp;&nbsp;&nbsp; {shortHash(doc.hash)}</div>
                {doc.uri ? (
                  <div>
                    storage:&nbsp;{" "}
                    <a
                      href={`/api/synthesis/${doc.hash.replace(/^0x/, "")}`}
                      className="no-underline hover:underline text-phosphor-dim break-all"
                    >
                      /api/synthesis/{doc.hash.replace(/^0x/, "").slice(0, 24)}…
                    </a>
                  </div>
                ) : null}
                {doc.on_chain_tx ? (
                  <div>
                    on chain:{" "}
                    <a
                      href={`https://explorer.solana.com/tx/${doc.on_chain_tx}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="no-underline hover:underline text-phosphor-dim break-all"
                    >
                      {doc.on_chain_tx.slice(0, 12)}…{doc.on_chain_tx.slice(-12)}
                    </a>
                  </div>
                ) : null}
              </section>

              {/* Body — single column on mobile/tablet, two columns
                  on xl with a generous gutter. break-inside: avoid
                  on each FragmentBlock keeps axis-position headers
                  attached to their bodies across the column break. */}
              <div
                className="mt-16 xl:column-rule-phosphor"
                style={{
                  columnGap: "5rem",
                }}
              >
                {/* The CSS multi-column properties below only apply
                    when the inline className adds them — Tailwind
                    doesn't ship column utilities by default. We use a
                    media query in inline style so the columns engage
                    only at xl (1280px+). */}
                <style>{`
                  @media (min-width: 1280px) {
                    .twelfth-axis-body {
                      column-count: 2;
                      column-gap: 5rem;
                      column-rule: 1px solid rgba(122, 95, 63, 0.25);
                    }
                  }
                `}</style>
                <div className="twelfth-axis-body">
                  {doc.fragments.length > 0 ? (
                    doc.fragments.map((f) => (
                      <FragmentBlock key={f.position} frag={f} />
                    ))
                  ) : (
                    <div className="whitespace-pre-wrap leading-[1.95]">
                      {doc.full_text}
                    </div>
                  )}
                </div>
              </div>

              <section className="mt-24 xl:max-w-[70ch] xl:mx-auto">
                <pre className="m-0 whitespace-pre text-phosphor-dim leading-[1.4]">
                  {HEAVY_RULE}
                </pre>
                <p className="mt-8 italic text-phosphor-dim m-0">
                  {doc.footer_disclosure}
                </p>
                <p className="mt-6 text-phosphor-dim m-0">
                  Full disclosure on the apparatus's operation is at{" "}
                  <a
                    href="/methodology"
                    className="no-underline hover:underline text-phosphor-bright"
                  >
                    /methodology
                  </a>
                  .
                </p>
              </section>
            </>
          )}

          <p className="mt-24 italic font-serif m-0 whitespace-pre-wrap text-center xl:max-w-[70ch] xl:mx-auto">
            <a
              href="/"
              className="no-underline hover:underline text-phosphor-bright"
            >
              [ home ]
            </a>
            {"    "}
            <a
              href="/archive"
              className="no-underline hover:underline text-phosphor-bright"
            >
              [ archive ]
            </a>
            {"    "}
            <a
              href="/methodology"
              className="no-underline hover:underline text-phosphor-bright"
            >
              [ methodology ]
            </a>
          </p>
        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function TwelfthAxisPage() {
  return (
    <Suspense fallback={null}>
      <TwelfthAxisBody />
    </Suspense>
  );
}
