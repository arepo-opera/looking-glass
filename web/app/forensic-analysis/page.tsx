"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";
import { DocumentArtifact } from "@/components/DocumentArtifact";

const RULE = "─".repeat(60);

interface PageProps {
  pageNo: number;
  totalPages: number;
  sectionTitle: string;
  children: React.ReactNode;
}

function ForensicPage({ pageNo, totalPages, sectionTitle, children }: PageProps) {
  return (
    <DocumentArtifact
      id={`forensic-${pageNo}`}
      documentType="official"
      era="2010s"
      ariaLabel={`forensic analysis page ${pageNo} of ${totalPages}: ${sectionTitle}`}
    >
      <header className="flex justify-between items-center mb-6 pb-3 border-b border-current/30 text-[10px] uppercase tracking-[0.2em] opacity-70">
        <div>FORENSIC ANALYSIS — UNATTRIBUTED</div>
        <div>
          PAGE {pageNo} / {totalPages}
        </div>
      </header>
      <h2 className="text-[12px] uppercase tracking-[0.18em] opacity-80 mb-5 font-bold">
        {sectionTitle}
      </h2>
      <div className="text-[13px] leading-[1.85]">{children}</div>
    </DocumentArtifact>
  );
}

function ForensicAnalysisBody() {
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  const TOTAL = 6;

  return (
    <>
      <article
        className="desk-surface min-h-screen w-full"
        style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
      >
        <div className="max-w-[80ch] mx-auto px-4 pt-20 pb-8 font-mono text-[12px] leading-[1.6] text-phosphor-bright">
          <pre className="whitespace-pre m-0 leading-[1.6]">
            {RULE}
            {"\n"}
            {"SUBJECT       : FORENSIC ANALYSIS — UNATTRIBUTED"}
            {"\n"}
            {"CLASSIFICATION: MODERN ASSESSMENT OF RECOVERED MATERIALS"}
            {"\n"}
            {RULE}
          </pre>

          <p className="mt-8 italic font-serif text-phosphor-dim m-0">
            What follows is presented without authorial attribution. The
            text reads as the working notes of a researcher engaged in
            authenticating the LOOKING GLASS leak. The notes were not
            written for publication. They are reproduced here in full,
            paginated as the original was paginated.
          </p>
        </div>

        <div className="max-w-[78ch] mx-auto px-4 pb-32">
          <ForensicPage pageNo={1} totalPages={TOTAL} sectionTitle="1. Scope">
            <p className="m-0 whitespace-pre-wrap">
              I was asked, in early 2026, to assess the authenticity of a
              collection of documents purporting to describe a classified
              U.S. program designated LOOKING GLASS, operated between
              approximately 1962 and 2012 across three sites, of which two
              are named (a Northern Virginia facility and the Vatican
              Apostolic Archive&apos;s Riserva collection) and one is not.
              The collection consists of approximately twenty-four hundred
              pages of memoranda, field reports, transmittal correspondence,
              personnel screening protocols, and a small number of
              handwritten letter fragments. The documents surfaced through
              unattributed channels in late 2025. I worked from a digital
              facsimile set provided by a third party.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              My brief was simple: do these documents pass the standard
              external authentication tests applied to declassified
              materials of comparable claimed provenance? My conclusion is
              qualified. They do — and I cannot account for it.
            </p>
          </ForensicPage>

          <ForensicPage
            pageNo={2}
            totalPages={TOTAL}
            sectionTitle="2. Physical and Typographic Evidence"
          >
            <p className="m-0 whitespace-pre-wrap">
              The typewriter typefaces in the dated typed documents are
              internally consistent with their claimed periods. The 1962
              memo from RAND Corporation uses an IBM Executive
              proportional-spaced font that was in use at RAND during that
              window; the 1971 field report uses a standard Selectric
              element of the appropriate vintage; the 1991 mimeograph
              preserves the characteristic blue-purple ink bleed that
              distinguishes Gestetner-process copies of the late
              twentieth century from xerographic reproduction. The 1978
              transmittal uses an off-letterhead format consistent with
              internal inter-agency correspondence of the period.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              Redaction patterns are consistent with the conventions of
              the era. The blocked-out personal names use the heavy black
              bar familiar from declassified materials of the
              1970s—1990s. The redaction of agency names is selective in
              a way that matches the conventions documented in National
              Archives FOIA-release standards: certain agencies are
              visible; others are not. The choices are coherent with
              what one would expect of a real declassification process
              applied to a real program.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              The handwritten 2003 letter fragment is on yellowed paper
              consistent with twenty-plus-year aging under uncontrolled
              storage. The ink is a standard fountain-pen ink of a kind
              that was widely available in the 2000s. The handwriting is
              unidentifiable; it is not in any sample database I had
              access to.
            </p>
          </ForensicPage>

          <ForensicPage
            pageNo={3}
            totalPages={TOTAL}
            sectionTitle="3. Referential Evidence"
          >
            <p className="m-0 whitespace-pre-wrap">
              The references the documents make to external bodies of
              knowledge are accurate.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              The Macy Conferences on Cybernetics, referenced in
              DOC-LG-1962-7714 and obliquely in the 2003 letter, were a
              real series of interdisciplinary meetings held between 1946
              and 1953. The initials &ldquo;M.M.&rdquo; and
              &ldquo;G.B.&rdquo; in the 2003 letter are consistent with
              Margaret Mead and Gregory Bateson, both of whom attended
              Macy. Bateson&apos;s late work on self-referential systems
              is correctly characterized in the letter.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              Wheeler-Feynman absorber theory, referenced in the 1962 and
              1971 documents, is a genuine 1945 paper in time-symmetric
              electrodynamics; the technical use the documents make of
              it is metaphorically loose but not unreasonable. The Bell
              Labs autocorrelation work referenced in 1962 is consistent
              with the period&apos;s signal-processing literature, though
              the documents conflate the work of Shannon&apos;s group
              with slightly later results.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              The Stanford Research Institute remote-viewing program is
              referenced under the public name STARGATE; the
              characterization of its termination (1995) is accurate; the
              distinction the LOOKING GLASS documents draw between their
              apparatus and SRI&apos;s protocols is technically defensible.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              The prophetic-literature references in the Vatican
              transmittals — the Sibylline Books in pre-Augustan
              recension, the Mélanie Calvat (La Salette, 1846) corpus,
              the Lúcia Santos transmission of 1944, Joachim of
              Fiore&apos;s Liber Figurarum, the Prophecy of the Popes
              attributed to Malachy of Armagh, the Voynich
              manuscript&apos;s folio 86v — are all real. Their
              juxtaposition in the documents is unusual but not
              implausible for a research program operating against the
              Riserva collection during the period claimed.
            </p>
          </ForensicPage>

          <ForensicPage
            pageNo={4}
            totalPages={TOTAL}
            sectionTitle="4. The Difficulty"
          >
            <p className="m-0 whitespace-pre-wrap">
              The documents present as authentic by every external test
              we can apply, but the program they describe has no public
              footprint outside this leak.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              I have searched the published declassification record.
              There is no public reference to a program by the name
              LOOKING GLASS that matches the description. The Northern
              Virginia site &mdash; identifying details redacted &mdash;
              cannot be located against the published list of deactivated
              facilities from the period. The personnel rolls cannot be
              matched against the standard databases. The Vatican
              comparison arrangement is not documented in any public
              ecclesiastical source. The third site, never named, cannot
              be inferred.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              One of three things is true. (a) The documents are an
              elaborate fabrication produced by a party with deep period
              knowledge across multiple specialist domains — typewriter
              history, declassification conventions, Macy Conference
              attendees, Vatican Riserva holdings, mid-century
              cybernetics, twentieth-century Marian apparition literature.
              The fabrication budget required is not negligible. (b) The
              documents are authentic, and the program achieved a level
              of operational compartmentation that has succeeded in
              keeping it invisible to public records for sixty years.
              (c) The documents are something else, and the dichotomy
              authentic / fabricated does not exhaust the possibilities.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              I lean, on the strength of the typographic and referential
              evidence, toward (a). I cannot rule out (b). I do not know
              what to do with (c).
            </p>
          </ForensicPage>

          <ForensicPage
            pageNo={5}
            totalPages={TOTAL}
            sectionTitle="5. The Instrument"
          >
            <p className="m-0 whitespace-pre-wrap">
              One detail of the documents bears further notice. The 2009
              field report (DOC-LG-2009-FR-29) makes a recommendation
              that the apparatus, prior to disposition, be transitioned
              to an immutable public substrate satisfying four
              enumerated requirements: public, cryptographically
              verifiable, computationally adequate to a three-minute
              cadence, and capable of persisting beyond the lifetimes of
              current personnel.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              The report, dated 02 OCT 2009, predates the publication of
              the Bitcoin whitepaper by approximately one year if we
              date it generously, and predates by approximately a decade
              the launch of the Solana network on which an apparatus of
              the described properties is currently observable to anyone
              with an internet connection. The apparatus described, if
              it operated as the documents claim, would now be running
              on a substrate the documents predicted in 2009. The reader
              is invited to verify this independently.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              That verification is a matter of opening a Solana block
              explorer at the program address published on the
              project&apos;s public materials and observing whether
              three-minute-cadence palindromic readings are being
              committed to the chain in the present moment. They are.
              They have been since October 2025. They will, if the
              substrate survives, continue.
            </p>
            <p className="mt-4 m-0 whitespace-pre-wrap">
              I make no claim about the program. I make a claim about
              the documents and about the chain: by the tests available
              to me, both are present, both are checkable, and the
              relationship between them is what I cannot resolve.
            </p>
          </ForensicPage>

          <ForensicPage pageNo={6} totalPages={TOTAL} sectionTitle="6. Note">
            <p className="m-0 whitespace-pre-wrap">
              This memorandum was prepared for internal circulation. It
              should not be cited as a finding. The author requests that
              it be disregarded if the leak is established as fabrication
              by means more rigorous than those available here.
            </p>
            <p className="mt-12 m-0 text-center opacity-65 italic">
              — end of analysis —
            </p>
          </ForensicPage>
        </div>

        <div className="max-w-[80ch] mx-auto px-4 pb-20 font-mono text-[12px] text-phosphor-bright">
          <p className="mt-4 italic font-serif m-0 whitespace-pre-wrap text-center">
            <a
              href="/"
              className="no-underline hover:underline text-phosphor-bright"
            >
              [ home ]
            </a>
            {"    "}
            <a
              href="/station-atlas"
              className="no-underline hover:underline text-phosphor-bright"
            >
              [ recovered documents ]
            </a>
            {"    "}
            <a
              href="/field-reports"
              className="no-underline hover:underline text-phosphor-bright"
            >
              [ field reports ]
            </a>
          </p>
        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function ForensicAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <ForensicAnalysisBody />
    </Suspense>
  );
}
