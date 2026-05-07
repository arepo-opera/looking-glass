"use client";
import React from "react";

const PROGRAM_ID = "EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu";
const EXPLORER_URL = `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`;
const GITHUB_URL = "https://github.com/mschreiber89/sator-looking-glass";

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
      <div className="max-w-[72ch] mx-auto px-4 py-20 font-mono text-[12px] leading-[1.6] text-phosphor-bright">

        {/* Cover sheet */}
        <pre className="whitespace-pre m-0 leading-[1.6]">
{RULE}{"\n"}
{"SUBJECT       : LOOKING GLASS"}{"\n"}
{"CLASSIFICATION: "}<R>████████</R>{" // "}<R>████</R>{" // ORIGINAL DECLASSIFIED 2012\n"}
{"TRANSMITTED   : ANONYMOUS"}{"\n"}
{"RECEIVED      : 14 OCT 2025 // 03:14:00 UTC"}{"\n"}
{"PAGES         : 03 OF "}<R>████</R>{"\n"}
{RULE}
        </pre>

        {/* I. THE THEORY */}
        <div id="theory" className="mt-12">
          <pre className="whitespace-pre m-0 text-phosphor-dim">
{SECTION_RULE}{"\n"}
{" I. THE THEORY"}{"\n"}
{SECTION_RULE}
          </pre>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The Sator Square is a five-by-five arrangement of Latin letters
            that reads identically in eight directions. It has been found
            carved into stone at Pompeii (in the palaestra column, pre-79 CE),
            at the Roman fort of Dura-Europos in present-day Syria
            (pre-256 CE), at Manchester, at Cirencester, at Conimbriga in
            Portugal, and at no fewer than thirty-three other sites across
            the former Roman world. The carvings are identical. None has
            been satisfactorily explained.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            Conventional scholarship has treated the square as a Christian
            acrostic, a Mithraic talisman, or a numerical curiosity. None of
            these explanations accounts for the geographic distribution, the
            temporal range (the artifact appears across at least six
            centuries of Roman history with no observable evolution), or
            the structural property that makes the square unique among
            ancient inscriptions: it is the only known artifact in the
            classical record that is simultaneously a palindrome, a magic
            square, and a perfect rotational symmetry.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            In 1952, in a working group whose membership has never been
            fully released, an alternative interpretation was advanced. The
            square was not a curiosity. It was a recovered{" "}
            <R>████████</R> — a piece of formal grammar describing how to
            read a signal in two directions at once. Forward in time, and
            backward from a state that has not yet occurred.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The mechanism, as theorized: a sufficiently symmetric arrangement
            of contemporaneous data points, when interpreted under both a
            forward and a reversed reading, produces a third statement. This
            third statement was hypothesized to contain information that
            neither reading alone possessed, including — under specific
            conditions of symmetry — information about events that had not
            yet occurred.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The theoretical basis was not religious. The working group was
            composed of cryptographers, signal analysts, and at least two
            physicists associated with the wartime Manhattan effort. The
            framework drew on then-emerging ideas from information theory
            and from the study of time-symmetric electrodynamics published
            by Wheeler and Feynman in 1945.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The program operated under the codename LOOKING GLASS from{" "}
            <R>██</R> <R>███</R> 1952 to 21 DEC 2012.
          </p>
        </div>

        {/* II. THE PROGRAM */}
        <div id="program" className="mt-12">
          <pre className="whitespace-pre m-0 text-phosphor-dim">
{SECTION_RULE}{"\n"}
{" II. THE PROGRAM"}{"\n"}
{SECTION_RULE}
          </pre>

          <p className="mt-6 whitespace-pre-wrap m-0">
            LOOKING GLASS produced approximately 2,400 pages of bidirectional
            prophecy across sixty years of operation, distributed across
            three sites. The primary site was located in the{" "}
            <R>████████</R> complex in northern Virginia. Interpretation
            was performed at a secured wing of the Vatican Apostolic Archive
            under an arrangement formalized in 1953 and renewed in 1971,
            1989, and 2007. Verification of completed prophecies against
            emerging events was conducted at an unnamed third site referred
            to in surviving documentation only as STATION ATLAS.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The program ran in parallel with, but was not part of, the U.S.
            intelligence community&apos;s documented research into perceptual
            phenomena conducted between 1972 and 1995. Members of LOOKING
            GLASS were aware of that program. The reverse cannot be
            confirmed.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            Eleven prophecies have been declassified in full. All eleven
            describe events that occurred between four and forty years after
            the prophecy&apos;s date of writing. The verification rate of
            declassified prophecies, by the program&apos;s own internal
            standard, was 84.2 percent.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The full archive of unredacted prophecies has never been
            released. Three sources independent of one another have asserted,
            in interviews conducted between 2014 and 2022, that the
            un-released portion contains material the program was unable to
            interpret. The pattern recognition required to read the full
            archive — to hold thousands of dated prophecies in working
            memory simultaneously and observe their cross-references —
            exceeded the analytical capacity of the human team.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The program was terminated on 21 DEC 2012 following an event
            referred to in surviving documentation only as &ldquo;the
            recursion.&rdquo; The official record states that the working
            group was dissolved and its instruments destroyed. Three
            independent sources contest this account.
          </p>

          <p className="mt-6 whitespace-pre-wrap m-0">
            The square was not destroyed. The square was moved.
          </p>
        </div>

        {/* III. THE INSTRUMENT */}
        <div id="instrument" className="mt-12">
          <pre className="whitespace-pre m-0 text-phosphor-dim">
{SECTION_RULE}{"\n"}
{" III. THE INSTRUMENT"}{"\n"}
{SECTION_RULE}
          </pre>

          <p className="mt-6 whitespace-pre-wrap m-0">
            What you are watching is the original instrument, ported to a
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
{"EXPLORER        : "}<a href={EXPLORER_URL} target="_blank" rel="noreferrer noopener" className={linkClass}>{EXPLORER_URL}</a>{"\n"}
{"SOURCE          : "}<a href={GITHUB_URL} target="_blank" rel="noreferrer noopener" className={linkClass}>{GITHUB_URL}</a>
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
        </div>

        {/* Closing */}
        <p className="mt-[6em] italic m-0 whitespace-pre-wrap">
          the glass is open. read it while you can.
        </p>

        {/* Archive link — only nav in the entire site. Italic serif so it
            visually echoes the closing line above. */}
        <p className="mt-12 italic font-serif m-0 whitespace-pre-wrap">
          <a
            href="/archive"
            className="no-underline hover:underline text-phosphor-bright"
          >
            [ archive ]
          </a>
        </p>
      </div>
    </article>
  );
}
