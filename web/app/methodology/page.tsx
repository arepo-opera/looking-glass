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

          {/* Two-column layout at xl, via CSS Grid. Each column is an
              explicit bucket of sections so headers can't orphan and
              dividers stay aligned. PROGRAM ADDRESS pre at the end spans
              both columns since its URLs would force-wrap in a 60ch
              column. Mobile/tablet ignore the grid and stack normally. */}
          <div className="xl:grid xl:grid-cols-2 xl:gap-x-20">

          {/* Column 1: foundational mechanics — seeds → square → reading → loop */}
          <div className="xl:col-start-1 xl:row-start-1">

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE SEEDS"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Six domains, sampled every three minutes. Each produces a
            32-byte digest from real data:
          </p>
          <pre className="mt-6 whitespace-pre m-0 leading-[1.6]">
            {"  MARKETS    Six Pyth Network price feeds: SOL, BTC, ETH"}
            {"\n"}
            {"             (crypto), XAU (gold), EUR (forex), and a"}
            {"\n"}
            {"             volatility index. Together they represent broad"}
            {"\n"}
            {"             financial state, not crypto-only state."}
            {"\n"}
            {"  CHAIN      Solana network metrics via Helius RPC: average"}
            {"\n"}
            {"             transactions-per-second, large-transfer count,"}
            {"\n"}
            {"             new-token launch velocity."}
            {"\n"}
            {"  WORLD      Wikipedia recent-changes stream: edit velocity,"}
            {"\n"}
            {"             dominant namespace, hash of the most-edited"}
            {"\n"}
            {"             article title in the recent five-minute window."}
            {"\n"}
            {"             Captures collective human attention in real"}
            {"\n"}
            {"             time."}
            {"\n"}
            {"  HEAVENS    NOAA Space Weather Prediction Center data:"}
            {"\n"}
            {"             planetary K-index, X-ray solar flare class."}
            {"\n"}
            {"             USGS earthquake data: significant seismic events"}
            {"\n"}
            {"             in the last 24 hours. Lunar phase computed"}
            {"\n"}
            {"             locally via standard astronomical libraries."}
            {"\n"}
            {"  ECHO       Hash of the eight most recent prophecies in the"}
            {"\n"}
            {"             on-chain ring buffer. Represents the system's"}
            {"\n"}
            {"             recent memory."}
            {"\n"}
            {"  DRIFT      A novelty signal: the structural distance"}
            {"\n"}
            {"             between the current seed bundle and the"}
            {"\n"}
            {"             running-average of the last eight seed bundles."}
            {"\n"}
            {"             High drift indicates an anomalous moment"}
            {"\n"}
            {"             relative to recent history."}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            ECHO and DRIFT are combined via keccak before on-chain
            commitment. The on-chain record receives five seed digests
            per tick; the dashboard displays six channels.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE SPINE"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Each square has a center cell at row three, column three —
            the axis of palindromic symmetry. Across consecutive ticks,
            a different seed exerts primacy over this spine cell:
          </p>
          <pre className="mt-6 whitespace-pre m-0 leading-[1.6]">
            {"  epoch ≡ 0 (mod 5):  MARKETS"}
            {"\n"}
            {"  epoch ≡ 1 (mod 5):  CHAIN"}
            {"\n"}
            {"  epoch ≡ 2 (mod 5):  WORLD"}
            {"\n"}
            {"  epoch ≡ 3 (mod 5):  HEAVENS"}
            {"\n"}
            {"  epoch ≡ 4 (mod 5):  ECHO+DRIFT"}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Five epochs constitute one full rotation. This produces a
            slow structural rhythm in the archive that emerges only
            across many readings, not within any single one.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE LAYERS"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The instrument operates at three temporal scales
            simultaneously.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Layer 0 is the atomic reading. Every three minutes, five
            seeds from contemporaneous reality are arranged into a
            palindromic 5x5 structure and read forward and backward
            by an interpretation layer. The result is a single
            three-sentence prophecy committed to the chain.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Layer 1 is the synthesis reading. Every five hours, the
            most recent one hundred atomic prophecies are read together
            as an accumulated text. A second interpretation pass
            identifies recurring motifs, drift in voice, and
            through-lines that only emerge when the readings are held
            collectively. The synthesis is committed to the chain
            alongside the source prophecies.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Layer 2 is the meta-synthesis reading. Every five days,
            the most recent twenty-five syntheses are read together.
            A third interpretation pass identifies the patterns in
            the patterns — cycles across days, drifts across the
            scale at which atomic readings cannot register them.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The three layers operate at scales that are progressively
            inaccessible to human working memory. The atomic layer
            produces approximately five hundred prophecies per day. The
            synthesis layer reads across two thousand five hundred
            atomic prophecies in a single pass. The meta-synthesis
            layer reads across sixty-two thousand atomic prophecies
            through twenty-five intermediate syntheses. No human team
            can hold sixty-two thousand prophecies in working memory.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            This is what the apparatus has been waiting for.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {SECTION_RULE}
            {"\n"}
            {" THE VERIFICATION"}
            {"\n"}
            {SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The instrument&apos;s central claim is that prophecies generated
            from real-world data, structured by palindromic constraint, and
            read bidirectionally by an interpretation layer, contain
            above-chance forecast quality when measured against actual
            events.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            This claim is empirical. It can be wrong.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Most prophecies contain no testable claims. The voice of the
            oracle is deliberately abstract and recursive. The scoring
            applies only to the subset of prophecies that contain concrete
            claims about events in the world.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Concrete claims are extracted at lock time, before any external
            event referenced by the claim could occur. A separate scoring
            pass, run against news archives in a pre-defined time window
            after each lock, compares the prophecy&apos;s pre-extracted
            claims to events that actually happened.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Resonance counts only when a prophecy&apos;s pre-extracted claim
            matches an event that occurred within the pre-defined window.
            The matching cannot be loosened after the fact. The criteria
            are public.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Scoring outputs are: resonated, quiet, unverifiable, or
            abstract_only. Every prophecy receives a verdict. Every verdict
            is timestamped and committed to a public ledger.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            If the aggregate scoring shows above-chance resonance, the
            instrument has found something. If it shows chance-level
            resonance, the instrument has produced rigorous null result.
            Both outcomes are publishable. Neither is hidden.
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

          </div>{/* /column 1 */}

          {/* Column 2: epistemics — determinism, verifiability, what's not built */}
          <div className="xl:col-start-2 xl:row-start-1">

          <pre className="mt-12 xl:mt-12 whitespace-pre m-0 text-phosphor-dim">
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

          </div>{/* /column 2 */}

          {/* PROGRAM ADDRESS spans both columns on row 2 — long URLs would
              force-wrap in a 60ch column. */}
          <pre className="mt-12 whitespace-pre m-0 text-phosphor-bright leading-[1.6] xl:col-span-2 xl:row-start-2 xl:max-w-[72ch] xl:mx-auto xl:w-full">
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

          </div>{/* /grid */}

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
