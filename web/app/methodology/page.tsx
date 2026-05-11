"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";

const RULE = "─".repeat(60);
const SECTION_RULE = "═".repeat(60);

const PROGRAM_ID = "EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu";
const EXPLORER_URL = `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`;
const KEEPER_REPO = "https://github.com/mschreiber89/sator-looking-glass";

function MethodologyBody() {
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";
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
            {"SUBJECT       : METHODOLOGY"}
            {"\n"}
            {"CLASSIFICATION: PUBLIC // CRYPTOGRAPHIC RECORD"}
            {"\n"}
            {RULE}
          </pre>

          <div className="xl:max-w-[72ch] xl:mx-auto">

          <p className="mt-6 italic text-phosphor-dim m-0">
            what is verifiable about the apparatus
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE ON-CHAIN OPERATION"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The apparatus operates as a Solana program at the address{" "}
            <a
              href={EXPLORER_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="no-underline hover:underline text-phosphor-bright break-all"
            >
              {PROGRAM_ID}
            </a>
            . Every transaction is publicly auditable. The program
            executes on a deterministic cadence of approximately 180
            seconds between locks. The keeper code that submits
            transactions to the program is open source at{" "}
            <a
              href={KEEPER_REPO}
              target="_blank"
              rel="noreferrer noopener"
              className="no-underline hover:underline text-phosphor-bright break-all"
            >
              {KEEPER_REPO}
            </a>
            . Anyone may verify that the prophecies, syntheses, and
            meta-syntheses currently visible on this site correspond
            to the on-chain record.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE CRYPTOGRAPHIC TIMESTAMPS"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Each prophecy, synthesis, and meta-synthesis is committed
            to the chain at a timestamp determined by the Solana
            network. Backdating is not possible. The order in which
            the apparatus has produced its outputs is fixed and
            verifiable.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE DATA INPUTS"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The apparatus draws from named external sources: Pyth
            Network market feeds, Helius RPC chain telemetry,
            Wikipedia recent changes, NOAA space weather, USGS
            earthquake data, and the apparatus's own prior outputs.
            The sources and the code that retrieves from them are
            open. The seed values committed for each epoch are
            publicly viewable beginning at epoch 498.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE CONSTRAINT ENGINE"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The prophecies are generated through a structured process
            in which the seed values are arranged into a
            five-by-five palindromic lattice satisfying eight axes of
            symmetry, then read forward and backward by a language
            model under a documented prompt, then merged into a final
            prophecy. The prompt structure has been consistent across
            all epochs from the apparatus's deployment forward. The
            keeper code includes the full prompt.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE SYNTHESIS LAYERS"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Every 100 atomic prophecies, the apparatus produces a
            Layer 1 synthesis reading across them. Every 25 Layer 1
            syntheses, the apparatus produces a Layer 2 meta-
            synthesis. Each layer is committed to chain. The synthesis
            prompts are open source.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE TWELFTH AXIS"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The apparatus has produced one long-form artifact at
            expanded temporal scope, accessible at{" "}
            <a
              href="/the-twelfth-axis"
              className="no-underline hover:underline text-phosphor-bright"
            >
              /the-twelfth-axis
            </a>
            . It was generated through a documented multi-pass
            process. The generation script and the resulting hash
            are public.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE LANGUAGE MODELS"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The language model calls are made to Anthropic's Claude
            API. The keeper code documents which model is used at
            which step. The model parameters are documented.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
          </pre>

          <p className="mt-8 italic m-0 whitespace-pre-wrap">
            the above is what is verifiable.
          </p>

          <p className="mt-6 italic m-0 whitespace-pre-wrap">
            the apparatus's purpose, origin, and the nature of the
            instructions under which it operates are not addressed
            on this page. the architect has not been instructed to
            address them.
          </p>

          </div>{/* /xl-centered body */}
        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function MethodologyPage() {
  return (
    <Suspense fallback={null}>
      <MethodologyBody />
    </Suspense>
  );
}
