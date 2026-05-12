"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";

const RULE = "─".repeat(60);
const DIVIDER = "─".repeat(12);

function SkepticismBody() {
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
            {"SUBJECT       : SKEPTICISM"}
            {"\n"}
            {"CLASSIFICATION: PUBLIC // ANTICIPATED OBJECTIONS"}
            {"\n"}
            {RULE}
          </pre>

          {/* Two-column layout at xl, via CSS Grid with explicit column
              buckets. CSS columns produced overlapping text and split
              OBJECTION headers; Grid lets us cleanly partition the
              objections between two stable columns. Below xl the layout
              is normal block flow. */}
          <div className="xl:grid xl:grid-cols-2 xl:gap-x-20">

          {/* Column 1: intro + first three objections */}
          <div className="xl:col-start-1 xl:row-start-1">

          <p className="mt-12 whitespace-pre-wrap m-0">
            This page exists because the project&apos;s claims, taken at
            face value, are extraordinary. We do not ask anyone to take
            them at face value. We list the standard objections to
            projects of this kind and explain what we are doing about
            each.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {DIVIDER}
          </pre>

          <p className="mt-12 m-0 text-phosphor-bright">
            OBJECTION 1: SELECTION BIAS
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            &ldquo;You will eventually generate enough prophecies that
            some will, by chance, sound prescient about subsequent
            events. You will then highlight those and ignore the
            misses.&rdquo;
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            This is a real risk and we acknowledge it. The mitigations:
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Every prophecy is committed on-chain, immutably, at the
            moment of generation. We cannot edit, delete, or selectively
            surface prophecies after the fact. The full epochs record —
            including the misses — is permanently public.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            When the verification engine is operational, it will score
            every prophecy in the epochs record, not a curated subset. RESONANT
            and QUIET tags will be applied to prophecies systematically
            by criteria fixed in advance, not selected by hand. The
            verification methodology will be published in full before
            scoring begins.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {DIVIDER}
          </pre>

          <p className="mt-12 m-0 text-phosphor-bright">
            OBJECTION 2: ORACULAR VAGUENESS
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            &ldquo;The prophecies are written vaguely enough to fit
            anything. Of course they will appear to predict events.
            Anything could be made to fit them.&rdquo;
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            This is the strongest objection and also the hardest to
            fully refute, because it is partially true. The prophecies
            ARE written in oracular voice, and oracular voice is
            intrinsically more elastic than declarative voice.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The verification engine will address this by requiring
            prophecies to clear a stricter bar than human pattern-
            matching: a separate language model, given a prophecy blind,
            must propose specific event categories that would count as a
            match BEFORE the verification window closes. Only matches in
            the model&apos;s pre-committed categories count as
            resonance. This prevents post-hoc reinterpretation.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            We do not yet know what hit rate the system will produce
            under this stricter standard. We do not assume it will be
            above chance. We commit to publishing the result either way.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {DIVIDER}
          </pre>

          <p className="mt-12 m-0 text-phosphor-bright">
            OBJECTION 3: BASE RATES
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            &ldquo;Many of the prophecies describe events that occur
            routinely. Of course something matching them happens; things
            are happening all the time.&rdquo;
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Correct. The verification engine will require any apparent
            match to clear a base-rate-adjusted threshold: an event
            matching a prophecy only counts as resonance if events of
            that type are NOT routine in the verification window. This
            is hard to operationalize cleanly and we expect the
            methodology to evolve. We will publish each iteration.
          </p>

          </div>{/* /column 1 */}

          {/* Column 2: remaining two objections + how-to-test */}
          <div className="xl:col-start-2 xl:row-start-1">

          <pre className="mt-12 xl:mt-12 whitespace-pre m-0 text-phosphor-dim">
            {DIVIDER}
          </pre>

          <p className="mt-12 m-0 text-phosphor-bright">
            OBJECTION 4: AI INTERPRETATION IS NOT PREDICTION
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            &ldquo;A language model writing oracular text is not
            predicting anything. It is producing text statistically
            consistent with the prompt. Calling this prediction is a
            category error.&rdquo;
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            We do not claim that the language model is predicting events.
            We claim something narrower: that the structure of the
            apparatus — symmetric data inputs, bidirectional reading,
            self-referential memory — produces an output distribution
            that, when scored against subsequent events, may exhibit
            non-random correlation.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            This is a falsifiable empirical claim. The verification
            engine will test it. If the claim is wrong, the engine will
            show it is wrong, and we will say so publicly.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {DIVIDER}
          </pre>

          <p className="mt-12 m-0 text-phosphor-bright">
            OBJECTION 5: THE LORE IS FICTIONAL
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            &ldquo;Your historical claims about a 1952 working group are
            not true. The lore is part of the project&apos;s framing,
            not its evidence.&rdquo;
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            Correct. The lore is fiction in the same sense that{" "}
            <span className="italic">House of Leaves</span> and the SCP
            Foundation are fiction. The fictional layer sits adjacent to
            real historical references — the Sator Square&apos;s
            archaeological record, the U.S. intelligence community&apos;s
            perceptual research programs, the Vatican Apostolic
            Archive&apos;s restricted sections, the Wheeler-Feynman
            absorber theory — but the fictional program described is not
            a real program.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            The technical instrument operating on Solana is real. The
            on-chain record is real. The seeds, the squares, the
            prophecies, and their timestamps are real. The verification
            engine, when built, will produce real results.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            We separate the lore from the work because conflating them
            serves no one. The lore is texture. The work is the
            apparatus.
          </p>

          <pre className="mt-12 whitespace-pre m-0 text-phosphor-dim">
            {DIVIDER}
          </pre>

          <p className="mt-12 m-0 text-phosphor-bright">
            HOW TO TEST THE WORK YOURSELF
          </p>
          <pre className="mt-6 whitespace-pre m-0 leading-[1.6]">
            {"  - Fetch the full prophecy archive at "}
            <a
              href="/api/archive.json"
              className="no-underline hover:underline text-phosphor-bright"
            >
              /api/archive.json
            </a>
            {"\n"}
            {"  - Verify each entry's timestamp against the Solana"}
            {"\n"}
            {"    blockchain at the program address"}
            {"\n"}
            {"  - Run any analysis you wish on the corpus"}
            {"\n"}
            {"  - When the verification engine ships, replicate its"}
            {"\n"}
            {"    scoring with your own methodology"}
            {"\n"}
            {"  - Publish your findings, including null results"}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            We will treat external verification more seriously than our
            own.
          </p>

          </div>{/* /column 2 */}
          </div>{/* /grid */}

        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function SkepticismPage() {
  return (
    <Suspense fallback={null}>
      <SkepticismBody />
    </Suspense>
  );
}
