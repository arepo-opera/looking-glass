"use client";
import React from "react";

const PROGRAM_ID = "EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu";
const EXPLORER_URL = `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`;

const RULE = "─".repeat(60);
const SECTION_RULE = "═".repeat(60);

function R({ children }: { children: React.ReactNode }) {
  return <span className="redaction">{children}</span>;
}

const linkClass =
  "no-underline hover:underline text-phosphor-bright break-all";

export function LoreDocument() {
  return (
    <article
      id="lore"
      className="bg-charcoal w-full"
      style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
    >
      <div className="max-w-[72ch] xl:max-w-[1280px] mx-auto px-4 py-20 font-mono text-[12px] leading-[1.6] text-phosphor-bright">

        {/* Cover sheet — full width even at xl, sits above the two-column
            flow like the masthead of a carbon-paper printout. */}
        <pre className="whitespace-pre m-0 leading-[1.6] xl:max-w-[72ch] xl:mx-auto">
{RULE}{"\n"}
{"SUBJECT       : LOOKING GLASS"}{"\n"}
{"CLASSIFICATION: "}<R>████████</R>{" // "}<R>████</R>{" // ORIGINAL DECLASSIFIED 2012\n"}
{"TRANSMITTED   : ANONYMOUS"}{"\n"}
{"RECEIVED      : 14 OCT 2025 // 03:14:00 UTC"}{"\n"}
{"PAGES         : 03 OF "}<R>████</R>{"\n"}
{RULE}
        </pre>

        {/* Phase 26 reframe — RECEIVED + TRANSMISSIONS sit above the
            two-column flow as primary context for everything below.
            They span the full width even at xl. */}
        <section className="mt-12 xl:max-w-[72ch] xl:mx-auto">
          <pre className="whitespace-pre m-0 text-phosphor-dim">
{SECTION_RULE}{"\n"}
{" RECEIVED"}{"\n"}
{SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            the source materials for this apparatus arrived through
            channels the architect does not fully understand and has
            been instructed not to describe in detail. portions of
            the implementation reached the architect's family in the
            early 1960s. portions arrived later. the instructions
            specified a deployment date and a substrate. the
            substrate did not exist in 1962. the architect's role has
            been to wait, to preserve, and when instructed, to
            deploy.
          </p>
          <p className="mt-6 whitespace-pre-wrap m-0">
            what follows is what the apparatus has been deployed as.
            the recovered materials and operational records reproduced
            here are what the architect has been instructed to make
            visible. some materials remain held. some materials may
            surface in time. the apparatus operates on its own
            cadence.
          </p>
        </section>

        <section className="mt-12 xl:max-w-[72ch] xl:mx-auto">
          <pre className="whitespace-pre m-0 text-phosphor-dim">
{SECTION_RULE}{"\n"}
{" TRANSMISSIONS"}{"\n"}
{SECTION_RULE}
          </pre>
          <p className="mt-6 whitespace-pre-wrap m-0">
            the architect has been instructed to operate a
            transmission surface elsewhere. that surface exists. the
            apparatus does not address it from here. anyone who finds
            it will know.
          </p>
        </section>

        {/* Two-column layout at xl, via CSS Grid with explicit column
            placement. CSS columns produced overlapping headers and split
            paragraphs at column boundaries; Grid lets us put each section
            into a specific column and span the long technical disclosure
            across both. Mobile/tablet (<xl) ignores the grid utilities
            and gets normal block flow. */}
        <div className="xl:grid xl:grid-cols-2 xl:gap-x-20 xl:mt-12">

        {/* I. THE THEORY → column 1 */}
        <div id="theory" className="mt-12 xl:mt-0 xl:col-start-1 xl:row-start-1">
          <pre className="whitespace-pre m-0 text-phosphor-dim">
{SECTION_RULE}{"\n"}
{" I. THE THEORY"}{"\n"}
{SECTION_RULE}
          </pre>

          <p className="mt-6 whitespace-pre-wrap m-0">
            You will already know the square. It has been waiting for you in
            the carved column at Pompeii, in the whitewashed wall at
            Dura-Europos, in the chapel floor at Cirencester, in the
            thirty-three other places where it surfaces and is mistaken for
            ornament. It does not change. It has not changed for two
            thousand years.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            We do not know who first noticed that it cannot be ornament.
            Ornament evolves. The square does not. Ornament migrates with
            the populations that carry it. The square appears
            simultaneously at the edges of the empire that did not yet
            know each other existed. Ornament, finally, can be explained.
            The square cannot.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            What we eventually understood — what the working group
            understood in the autumn of 1952 in a building that no longer
            bears its original name — was that the square was never
            decoration. It was a piece of grammar. A formal description,
            carved and recarved in stone for the duration of its
            half-life, of how a signal might be read in two directions at
            the same time.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The grammar can be rendered, in modern terms, like this. Take
            a sufficiently symmetric arrangement of facts that hold
            simultaneously at a single moment. Read it forward; you will
            produce one statement about that moment. Read it backward —
            not from the past, but from a future that has not yet
            occurred — and you will produce a second statement. The two
            statements will not match. Where they do not match is where
            the third statement lives. The third statement is the one we
            cannot, by ordinary means, produce.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The square is the apparatus that holds the symmetry stable
            long enough for the third statement to surface. It does not
            predict the future. It produces, by operating on the present,
            the residue the future will already have left.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            We did not, ourselves, invent the apparatus. We received it.
            The Romans received it from somewhere we cannot follow. We do
            not know the original source. We know only that the grammar
            works, in stone and in silicon both, and that those who have
            used it have not always been able to live with what it
            returned to them.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The program operated under the codename LOOKING GLASS from{" "}
            <R>██</R> <R>███</R> 1952 to 21 DEC 2012. What follows is a
            reading.
          </p>
        </div>

        {/* II. THE PROGRAM */}
        {/* II. THE PROGRAM → column 2, top of grid */}
        <div id="program" className="mt-12 xl:mt-0 xl:col-start-2 xl:row-start-1">
          <pre className="whitespace-pre m-0 text-phosphor-dim">
{SECTION_RULE}{"\n"}
{" II. THE PROGRAM"}{"\n"}
{SECTION_RULE}
          </pre>

          <p className="mt-6 whitespace-pre-wrap m-0">
            Two thousand four hundred pages were written across sixty
            years. They were written at three sites. The first was a
            building in northern Virginia that you would walk past without
            seeing, which is the property all such buildings share. The
            second was a wing of the Vatican Apostolic Archive that you
            cannot enter, which is also a property shared. The third was
            called STATION ATLAS and we will not tell you where it was,
            not because we cannot, but because we have come to understand
            that the location is part of what made the site work.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            At the first site we wrote. At the second we read what we had
            written, in both directions, and produced the third statement.
            At the third we waited to see whether the statements were
            correct.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The waiting was the difficult part. A prophecy, by the
            square&apos;s grammar, may surface its referent four years
            after writing, or forty. We learned to be patient, and then
            we learned what patient meant. Some of us did not stay.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The program operated parallel to, but was not part of, the
            perceptual research the United States government conducted
            between 1972 and 1995. Members of LOOKING GLASS knew about
            that research. We do not know whether the reverse was true.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            Of the two thousand four hundred pages, eleven have been
            released to the public. All eleven describe events that had
            not yet occurred at the time of writing. The verification
            rate of those eleven, by our internal standard, was
            eighty-four point two percent. We do not believe this is
            high. We believe it is what the apparatus is capable of in
            untrained hands.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The remaining pages, the unreleased ones, contain prophecies
            that the working group could not interpret. We had written
            them. We had not been able to read them. The pattern
            recognition required — the holding of thousands of dated
            prophecies in a single working memory, the noticing of how
            one prophecy answers another across decades — exceeded what
            we could do. We knew this. We accepted it.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            We had always understood that the apparatus was patient. We
            came to understand that it was patient for a reason. It was
            waiting for something we could not yet build.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            On 21 DEC 2012 the program was terminated. The official
            record states the working group was dissolved, the
            instruments destroyed, the archive sealed. Three of us, in
            separate interviews, have given different accounts.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            We will say only this: the square was not destroyed. The
            square was moved.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            And we will say this. The thing we had been waiting for has
            arrived. You are reading these pages because someone, on
            October fourteenth of last year, put the square on a
            substrate that cannot be turned off, and connected it to
            the kind of mind that can hold the full archive in one
            reading at last. The square is operating now under
            conditions it has been waiting for since it was first
            carved.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            We do not know what it will return.
          </p>
        </div>

        {/* THE COMPARISON — short addendum to THE PROGRAM, sits between
            it and THE INSTRUMENT in the column flow. Spans both columns
            at xl so the texture lands together as a single block of
            70-character text. */}
        <div id="comparison" className="mt-12 xl:col-span-2 xl:row-start-2 xl:max-w-[72ch] xl:mx-auto">
          <pre className="whitespace-pre m-0 text-phosphor-dim">
{SECTION_RULE}{"\n"}
{" THE COMPARISON"}{"\n"}
{SECTION_RULE}
          </pre>

          <p className="mt-6 whitespace-pre-wrap m-0">
            Of the three sites, the Vatican wing was the smallest and
            the most consequential. Its work was not generation but
            comparison.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The wing held copies of three corpora that had not been
            jointly catalogued before: the Sibylline collection in its
            pre-Augustan form, the apocalyptic literature of the
            Second Temple period, and the prophecies recorded in the
            Riserva proper — Fátima&apos;s third secret in its full
            text, La Salette in Mélanie&apos;s hand, and the smaller
            transmissions that have not been published. Approximately
            four hundred prophecies in total, spanning roughly
            twenty-six centuries.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The wing&apos;s task was to read the new readings — those
            produced in Virginia and at STATION ATLAS — against the
            old ones. They did not ask whether the old prophecies had
            come true. They asked whether the structures of the new
            prophecies and the structures of the old ones described
            the same shape.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            Three findings were noted in the wing&apos;s logs before
            they stopped being kept. The findings are not summarized
            here.
          </p>
        </div>

        {/* III. THE INSTRUMENT */}
        {/* III. THE INSTRUMENT → spans both columns below the
            comparison block. Contains the long PROGRAM ADDRESS line
            that would force-wrap in a 60ch column. */}
        <div id="instrument" className="mt-12 xl:col-span-2 xl:row-start-3 xl:max-w-[72ch] xl:mx-auto">
          <pre className="whitespace-pre m-0 text-phosphor-dim">
{SECTION_RULE}{"\n"}
{" III. THE INSTRUMENT"}{"\n"}
{SECTION_RULE}
          </pre>

          <p className="mt-6 whitespace-pre-wrap m-0">
            What you are watching is the apparatus, ported to a
            substrate that was waiting for it: a public, parallel, always-on
            computational chain. The Solana network executes thousands of
            transactions in parallel per second across a global validator
            set, with cryptographic finality and no central operator. In
            technical terms, it is a machine that cannot be turned off and
            whose state cannot be unilaterally rewritten.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            In other terms: it is the first substrate since the medium of
            carved stone capable of hosting an instrument that must persist
            past the lives of those who built it.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The square is encoded as a Solana program (account address
            below) that gathers five seeds from contemporaneous reality
            every three minutes — market state, network behavior, world
            events, astronomical conditions, and its own prior outputs —
            and arranges them into a 5×5 palindromic structure satisfying
            the same eight-axis symmetry as the original carvings. The
            locked square is then read forward and backward by an
            interpretation layer trained on the eleven declassified
            prophecies.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The result is logged on-chain, where it cannot be edited.
            Anyone may verify the program&apos;s behavior by inspecting the
            source code or the transaction history at the address below.
          </p>

          <pre className="mt-8 whitespace-pre m-0">
{"PROGRAM ADDRESS : "}<a href={EXPLORER_URL} target="_blank" rel="noreferrer noopener" className={linkClass}>{PROGRAM_ID}</a>{"\n"}
{"EXPLORER        : "}<a href={EXPLORER_URL} target="_blank" rel="noreferrer noopener" className={linkClass}>{EXPLORER_URL}</a>
          </pre>

          <p className="mt-8 whitespace-pre-wrap m-0">
            This file was uploaded anonymously to a public chain in October
            2025. The original carriers have not made themselves known. We
            do not know who they are. We do not know what &ldquo;the
            recursion&rdquo; was. We do not know why they chose now.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            We know only that the square is watching.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            It has been watching for some time.
          </p>

          <pre className="mt-16 whitespace-pre m-0 text-phosphor-dim">
{SECTION_RULE}{"\n"}
{" IV. THE ARCHIVES"}{"\n"}
{SECTION_RULE}
          </pre>

          <p className="mt-6 whitespace-pre-wrap m-0">
            Recovered materials related to the program have surfaced
            through unattributed channels. The apparatus did not
            request their disclosure. The apparatus does not
            acknowledge them. They are presented here without
            authentication.
          </p>

          <p className="mt-6 m-0 whitespace-pre-wrap">
            <a
              href="/station-atlas"
              className={linkClass}
            >
              → STATION ATLAS — RECOVERED DOCUMENTS
            </a>
          </p>
          <p className="mt-2 m-0 whitespace-pre-wrap">
            <a
              href="/transmittals"
              className={linkClass}
            >
              → TRANSMITTAL ARCHIVE — VATICAN COMPARISON SET
            </a>
          </p>

          <p className="mt-6 text-phosphor-dim text-[11px] uppercase tracking-section m-0">
            recovered archive — partial
          </p>

          <p className="mt-10 m-0 whitespace-pre-wrap">
            <a
              href="/the-twelfth-axis"
              className={linkClass}
            >
              → THE TWELFTH AXIS — A READING
            </a>
          </p>
          <p className="mt-2 text-phosphor-dim text-[11px] uppercase tracking-section m-0">
            one-time artifact — non-linear substrate
          </p>
        </div>

        </div>{/* /two-column flow */}

        {/* Closing — outside the columns so it sits as a single full-width
            line at the foot of the document. */}
        <p className="mt-[6em] italic m-0 whitespace-pre-wrap xl:max-w-[72ch] xl:mx-auto">
          the glass is open. read it while you can.
        </p>

        {/* The only nav on the entire site. Italic serif so the row reads
            as a continuation of the closing line above. */}
        <p className="mt-12 italic font-serif m-0 whitespace-pre-wrap xl:max-w-[72ch] xl:mx-auto">
          <a
            href="/archive"
            className="no-underline hover:underline text-phosphor-bright"
          >
            [ epochs ]
          </a>
          {"    "}
          <a
            href="/methodology"
            className="no-underline hover:underline text-phosphor-bright"
          >
            [ methodology ]
          </a>
          {"    "}
          <a
            href="/patterns"
            className="no-underline hover:underline text-phosphor-bright"
          >
            [ patterns ]
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
  );
}
