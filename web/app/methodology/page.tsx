"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";

const RULE = "─".repeat(60);
const SECTION_RULE = "═".repeat(60);

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
            {"CLASSIFICATION: PUBLIC // OPERATIONAL DISCLOSURE"}
            {"\n"}
            {RULE}
          </pre>

          {/* Two-column flow at xl. Section headers, paragraphs, and
              field-aligned <pre> tables each carry break-inside-avoid so
              they stay coherent across column breaks. */}
          <div className="xl:columns-2 xl:gap-x-20 [&_p]:break-inside-avoid [&_pre]:break-inside-avoid">

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE SEEDS"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Five domains, sampled every three minutes. Each produces a
            32-byte digest from real data:
          </p>
          <pre className="mt-6 whitespace-pre m-0 leading-[1.6]">
            {"  MARKETS    Pyth Network price feeds for SOL, BTC, ETH"}
            {"\n"}
            {"             (price + confidence interval, signed by Pyth's"}
            {"\n"}
            {"             on-chain oracle network)"}
            {"\n"}
            {"  CHAIN      Solana network metrics via Helius RPC: average"}
            {"\n"}
            {"             transactions-per-second, large-transfer count,"}
            {"\n"}
            {"             new-token launch velocity"}
            {"\n"}
            {"  WORLD      Real-time news event data: pillar"}
            {"\n"}
            {"             classification, article frequency, dominant"}
            {"\n"}
            {"             section tag, sourced from a public news API"}
            {"\n"}
            {"  HEAVENS    NOAA Space Weather Prediction Center data:"}
            {"\n"}
            {"             planetary K-index, X-ray solar flare class."}
            {"\n"}
            {"             Lunar phase computed locally via standard"}
            {"\n"}
            {"             astronomical libraries."}
            {"\n"}
            {"  ECHO       Hash of recent prior prophecies from the"}
            {"\n"}
            {"             on-chain ring buffer. Self-referential by"}
            {"\n"}
            {"             design."}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Each seed is reduced to a 32-byte keccak digest before on-chain
            commitment. The raw display values are streamed to the
            dashboard via Server-Sent Events.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE SQUARE"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The five seed digests are arranged into a 5×5 grid of glyphs
            satisfying 180-degree rotational symmetry. The grid is
            constructed deterministically from the seeds plus a nonce; the
            nonce is searched until all eight symmetry axes hold (rows
            forward, rows reversed, columns, both diagonals, rotation).
            The on-chain program verifies all axes cryptographically
            before allowing the lock to commit.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE READING"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Once locked, the square is interpreted by an AI interpretation
            layer in three steps:
          </p>
          <pre className="mt-6 whitespace-pre m-0 leading-[1.6]">
            {"  FORWARD READING    A language model reads the square"}
            {"\n"}
            {"                     row-major top-down, with the seeds in"}
            {"\n"}
            {"                     their natural order, in the voice of"}
            {"\n"}
            {"                     a forward-time interpreter."}
            {"\n"}
            {"  BACKWARD READING   The same model reads the square"}
            {"\n"}
            {"                     row-major bottom-up reversed, with the"}
            {"\n"}
            {"                     seeds in inverted order, in the voice"}
            {"\n"}
            {"                     of an interpreter speaking from a"}
            {"\n"}
            {"                     future looking back."}
            {"\n"}
            {"  MERGED PROPHECY    A third model pass receives both"}
            {"\n"}
            {"                     readings and produces a single three-"}
            {"\n"}
            {"                     sentence utterance representing what"}
            {"\n"}
            {"                     emerges only when both readings are"}
            {"\n"}
            {"                     held simultaneously."}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The merged prophecy is hashed and committed on-chain. The full
            text is stored off-chain; the on-chain record contains the
            hash and a URI for retrieval.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE LOOP"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Each new tick incorporates the previous prophecy hash into the
            ECHO seed. Over time, the system reads its own history
            alongside the present moment.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" WHAT IS DETERMINISTIC AND WHAT IS NOT"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The square&apos;s construction from seeds is fully
            deterministic and verifiable. The same seeds plus the same
            nonce will always produce the same square; anyone can verify
            this against the on-chain record.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The interpretation is not deterministic. Language model output
            for the same input will vary across calls. This is
            acknowledged. The on-chain record commits a specific prophecy
            as the canonical reading for a given square; alternative
            readings of the same square are possible and the system does
            not claim its specific phrasing is the only correct
            interpretation.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" WHAT IS VERIFIABLE"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Every prophecy is timestamped by the Solana network. No
            prophecy can have been written later than its locked_at
            timestamp. The on-chain timestamp cannot be backdated. Anyone
            can retrieve the full history at the program address and
            verify each entry&apos;s timestamp via Solana&apos;s public
            RPC or block explorers.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" WHAT IS NOT YET BUILT"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The system does not currently include automated verification
            of prophecies against subsequent events. A verification
            engine — one that scores aging prophecies against real-world
            events occurring after their lock timestamp — is planned.
            Until that engine is operational, no claim about the
            system&apos;s predictive accuracy can be empirically
            supported. Readers should treat current prophecies as
            untested generative output, evocative but not yet
            demonstrated.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-bright leading-[1.6]">
            {"  PROGRAM ADDRESS  "}
            <a
              href="https://explorer.solana.com/address/EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu?cluster=devnet"
              target="_blank"
              rel="noreferrer noopener"
              className="no-underline hover:underline text-phosphor-bright break-all"
            >
              EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu
            </a>
            {"\n"}
            {"  EXPLORER         "}
            <a
              href="https://explorer.solana.com/address/EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu?cluster=devnet"
              target="_blank"
              rel="noreferrer noopener"
              className="no-underline hover:underline text-phosphor-bright break-all"
            >
              https://explorer.solana.com/address/EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu?cluster=devnet
            </a>
            {"\n"}
            {"  SOURCE           "}
            <a
              href="https://github.com/mschreiber89/sator-looking-glass"
              target="_blank"
              rel="noreferrer noopener"
              className="no-underline hover:underline text-phosphor-bright break-all"
            >
              https://github.com/mschreiber89/sator-looking-glass
            </a>
            {"\n"}
            {"  ARCHIVE          "}
            <a
              href="/archive"
              className="no-underline hover:underline text-phosphor-bright"
            >
              /archive
            </a>
            {"\n"}
            {"  MACHINE-READABLE "}
            <a
              href="/api/archive.json"
              className="no-underline hover:underline text-phosphor-bright"
            >
              /api/archive.json
            </a>
            {"\n"}
            {"  HYPOTHESIS       "}
            <a
              href="/skepticism"
              className="no-underline hover:underline text-phosphor-bright"
            >
              /skepticism
            </a>
          </pre>

          </div>{/* /two-column flow */}

          <p className="mt-[6em] italic font-serif m-0 whitespace-pre-wrap xl:max-w-[72ch] xl:mx-auto">
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
              href="/skepticism"
              className="no-underline hover:underline text-phosphor-bright"
            >
              [ skepticism ]
            </a>
          </p>
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
