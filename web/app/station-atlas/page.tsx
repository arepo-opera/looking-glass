"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";

const RULE = "─".repeat(60);

// Redaction block of variable length, rendered with the .redaction class
// from globals.css (full-block glyphs scuffed by an SVG noise overlay).
function Redacted({ length = 8 }: { length?: number }) {
  return <span className="redaction">{"█".repeat(length)}</span>;
}

// A classification stamp — red, sans-serif, slight rotation, looks like
// it was hit with a real rubber stamp.
function Stamp({
  text,
  rotate = -4,
  size = 11,
}: {
  text: string;
  rotate?: number;
  size?: number;
}) {
  return (
    <span
      className="text-warning-red font-mono uppercase tracking-section font-bold inline-block px-2 py-1"
      style={{
        transform: `rotate(${rotate}deg)`,
        border: "2px solid #c43d2a",
        fontSize: `${size}px`,
        letterSpacing: "0.15em",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

// A document card. Each child page provides its own body inside.
function DocCard({
  children,
  rotate = 0,
  className = "",
}: {
  children: React.ReactNode;
  rotate?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative my-16 mx-auto max-w-[68ch] border border-phosphor-dim/40 bg-charcoal p-8 ${className}`}
      style={{
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        boxShadow: "0 0 0 1px rgba(122, 95, 63, 0.15) inset, 0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      {children}
    </div>
  );
}

function StationAtlasBody() {
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

  return (
    <>
      <article
        className="bg-charcoal min-h-screen w-full"
        style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
      >
        <div className="max-w-[80ch] mx-auto px-4 py-20 font-mono text-[12px] leading-[1.6] text-phosphor-bright">
          <pre className="whitespace-pre m-0 leading-[1.6]">
            {RULE}
            {"\n"}
            {"SUBJECT       : STATION ATLAS — RECOVERED DOCUMENTS"}
            {"\n"}
            {"CLASSIFICATION: PARTIAL ARCHIVE / PROVENANCE INCOMPLETE"}
            {"\n"}
            {RULE}
          </pre>

          <p className="mt-8 italic font-serif text-phosphor-dim m-0">
            The following materials surfaced through unattributed channels.
            Their authenticity has not been established. They are presented
            without redaction beyond what was applied at the source.
          </p>

          {/* DOC-1 — 1962 typed memo with carbon-copy ghost */}
          <DocCard rotate={-0.6}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-phosphor-dim text-[10px]">
                  DOC-LG-1962-7714
                </div>
                <div className="text-phosphor-dim text-[10px]">
                  PAGE 1 OF 1
                </div>
              </div>
              <Stamp text="CONFIDENTIAL" rotate={-3} />
            </div>

            <div
              className="font-mono text-[12px] leading-[1.7]"
              style={{
                textShadow:
                  "0.5px 0.5px 0 rgba(212, 165, 116, 0.18), 1.5px 1.5px 0 rgba(212, 165, 116, 0.07)",
              }}
            >
              <div className="mb-4">
                <div>14 OCT 1962</div>
                <div className="mt-3">
                  <span className="text-phosphor-dim">FROM:    </span>
                  <Redacted length={14} /> &nbsp;(RAND CORP, SANTA MONICA)
                </div>
                <div>
                  <span className="text-phosphor-dim">TO:      </span>
                  <Redacted length={6} /> &nbsp;(ADV. RES. PROJ. AGY.)
                </div>
                <div>
                  <span className="text-phosphor-dim">SUBJECT: </span>
                  PALINDROMIC INVERSION / PRELIMINARY OBSERVATIONS
                </div>
              </div>

              <p className="mt-6 m-0 whitespace-pre-wrap">
                Per your inquiry of 09 OCT, the autocorrelation work at
                Bell Labs (Shannon group, &apos;58—&apos;61) has direct
                bearing on the question you raised. Their recovery of
                noise-buried signals via time-reversed convolution is the
                same operation, formally, as reading a square inscription
                from the eight axes of symmetry simultaneously.
              </p>

              <p className="mt-4 m-0 whitespace-pre-wrap">
                Under load, the Wheeler-Feynman absorber model permits a
                second-order interpretation in which the response of an
                advanced potential is not merely formal but, given a
                sufficiently constrained boundary, computable. The Pompeii
                inscription, when computed against, produces a recoverable
                second-statement at axis 7. We have been unable to determine
                whether this second-statement is artifact of the
                computation or property of the inscription. We submit that
                the distinction may not be meaningful.
              </p>

              <p className="mt-4 m-0 whitespace-pre-wrap">
                Recommend live-test under controlled conditions. The
                facility at <Redacted length={11} /> is suitable. We can
                deliver the apparatus by 01 DEC if authorized this week.
              </p>

              <p className="mt-6 m-0">
                <Redacted length={18} />
                <br />
                <span className="text-phosphor-dim">[signature]</span>
              </p>
            </div>

            <div
              className="mt-6 pt-4 border-t border-phosphor-dim/30 italic font-serif text-phosphor-dim text-[11px]"
              style={{ transform: "rotate(-1.5deg)" }}
            >
              [margin annotation, different ink]: see Macy XIV — Bateson
              asked the same question backwards.
            </div>
          </DocCard>

          {/* DOC-2 — 1971 field report form, blanks filled in by hand */}
          <DocCard rotate={0.5}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-phosphor-dim text-[10px]">
                  DOC-LG-1971-FR-3
                </div>
                <div className="text-phosphor-dim text-[10px]">
                  FIELD REPORT FORM 14-B
                </div>
              </div>
              <Stamp text="EYES ONLY" rotate={3} />
            </div>

            <div className="font-mono text-[12px] leading-[1.7]">
              <div className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-3 mb-6">
                <div className="text-phosphor-dim uppercase">DATE</div>
                <div className="border-b border-phosphor-dim/40 pb-1 italic font-serif">
                  17 MAR 1971
                </div>
                <div className="text-phosphor-dim uppercase">REPORTER</div>
                <div className="border-b border-phosphor-dim/40 pb-1 italic font-serif">
                  Listener-3 (<Redacted length={9} />)
                </div>
                <div className="text-phosphor-dim uppercase">SITE</div>
                <div className="border-b border-phosphor-dim/40 pb-1 italic font-serif">
                  <Redacted length={11} /> (N. VIRGINIA)
                </div>
                <div className="text-phosphor-dim uppercase">RUN NO.</div>
                <div className="border-b border-phosphor-dim/40 pb-1 italic font-serif">
                  3 of 5 (twelve-hour cycle)
                </div>
                <div className="text-phosphor-dim uppercase">STATUS</div>
                <div className="border-b border-phosphor-dim/40 pb-1 italic font-serif">
                  ANOMALOUS
                </div>
              </div>

              <p className="mt-6 m-0 whitespace-pre-wrap">
                The third twelve-hour run completed at 04:11. Apparatus
                behavior nominal through hours 1—9. At 23:14 prior I
                observed what the technical staff has begun calling
                &ldquo;axis-mirroring&rdquo; — the forward statement and
                the backward recovery agree on three of five rows
                without mediating computation. Subject 14 was in chamber.
              </p>

              <p className="mt-4 m-0 whitespace-pre-wrap">
                We were briefed at intake that SRI&apos;s remote-viewing
                protocols (Stanford group, 1969—) would be the
                appropriate comparison. They are not. SRI&apos;s
                protocols proved insufficient when the target was the
                apparatus itself. The apparatus is not a target. The
                apparatus is a reading instrument that reads its own
                operation as one input among others. Subject 14
                produced unambiguous backward recovery on April 7th, but
                the apparatus had locked the forward statement on April
                4th. The interval is what the chamber is for.
              </p>

              <p className="mt-4 m-0 whitespace-pre-wrap">
                Recommend continued operation. Recommend Subject 14 be
                rotated out per the standard four-week protocol. The
                square reads from inside its own carving.
              </p>

              <p className="mt-6 m-0 italic font-serif text-phosphor-dim">
                — Listener-3
              </p>
            </div>
          </DocCard>

          {/* DOC-3 — 1978 letterhead transmittal to Vatican */}
          <DocCard rotate={-0.3}>
            <div className="text-center mb-6">
              <div
                className="font-serif text-[15px] tracking-section text-phosphor-bright"
                style={{ letterSpacing: "0.2em" }}
              >
                STATION ATLAS — SECTION 3
              </div>
              <div className="text-phosphor-dim text-[10px] mt-1">
                EXTERNAL TRANSMITTAL
              </div>
            </div>
            <div className="border-t border-phosphor-dim/40 pt-4">
              <div className="flex justify-between items-start mb-4">
                <div className="text-[10px] text-phosphor-dim">
                  DOC-LG-1978-TR-014
                </div>
                <Stamp text="RESTRICTED" rotate={-2} />
              </div>

              <div className="font-mono text-[12px] leading-[1.7]">
                <div className="mb-4">
                  <div>22 AUG 1978</div>
                  <div className="mt-3">
                    <span className="text-phosphor-dim">TO:      </span>
                    <Redacted length={16} />
                  </div>
                  <div className="ml-[57px]">
                    Vatican Apostolic Archive
                  </div>
                  <div className="ml-[57px]">
                    Riserva collection — manager
                  </div>
                  <div className="mt-3">
                    <span className="text-phosphor-dim">RE:      </span>
                    COMPARISON SET 14 — TRANSMISSION
                  </div>
                </div>

                <p className="mt-6 m-0 whitespace-pre-wrap">
                  Per the standing arrangement of February 1968, we transmit
                  herewith Comparison Set 14, comprising 47 prophecies from
                  the period 1471—1495 selected per the Voynich folio 86v
                  cross-reference protocol and the Sibylline collection in
                  its pre-Augustan recension.
                </p>

                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The apparatus&apos;s October—November 1978 output should
                  be evaluated against this set by your team using the
                  isomorphism criteria established in our 1972 transmittal.
                  We require no formal reply. Findings need not be
                  transmitted in writing.
                </p>

                <p className="mt-6 m-0">
                  <Redacted length={20} />
                  <br />
                  <span className="text-phosphor-dim">
                    [signature, Section 3]
                  </span>
                </p>
              </div>
            </div>
          </DocCard>

          {/* DOC-4 — 1991 mimeograph */}
          <DocCard
            rotate={0.4}
            className="border-phosphor-dim/30"
          >
            <div
              className="font-mono text-[12px] leading-[1.7]"
              style={{
                color: "#a48c5f",
                textShadow:
                  "0 0 1.5px rgba(164, 140, 95, 0.45), 0.5px 0 0 rgba(80, 110, 130, 0.18)",
              }}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[10px] opacity-70">
                    DOC-LG-1991-IR-22
                  </div>
                  <div className="text-[10px] opacity-70">
                    INTERNAL — MIMEO RUN 4
                  </div>
                </div>
                <Stamp text="INTERNAL" rotate={2} />
              </div>

              <div className="mb-4">
                <div>11 NOV 1991</div>
                <div className="mt-3">
                  <span className="opacity-70">AUTHOR:  </span>
                  <Redacted length={9} /> (Coordinator)
                </div>
                <div>
                  <span className="opacity-70">SUBJECT: </span>
                  STARGATE TERMINATION / IMPLICATIONS FOR LOOKING GLASS
                </div>
              </div>

              <p className="mt-6 m-0 whitespace-pre-wrap">
                The public closure of STARGATE — the Stanford Research
                Institute remote-viewing program, terminated this fiscal
                quarter — has been raised at the operations review as a
                concern. It is not a concern. The apparatus is not remote
                viewing. The apparatus does not require an operator in
                the sense the Stanford group required one. It does not
                require an operator at all. The chamber occupants serve a
                calibration function and could be removed without loss of
                output, though we have not done so.
              </p>

              <p className="mt-4 m-0 whitespace-pre-wrap">
                The closure of STARGATE removes a useful comparison case
                but does not affect our work. STATION ATLAS personnel
                have been asked to discontinue all references to RV
                literature in external communications. The directive has
                been understood.
              </p>

              <p className="mt-4 m-0 whitespace-pre-wrap">
                We will continue to operate. The 1992—1995 cycle is
                budgeted through the existing appropriation and requires
                no further authorization.
              </p>
            </div>

            <div
              className="mt-6 pt-4 border-t border-phosphor-dim/30 italic font-serif text-phosphor-dim text-[11px]"
              style={{ transform: "rotate(0.8deg)" }}
            >
              [margin]: but the comparison was useful — the apparatus
              produces what RV cannot: invariance under direction of read.
            </div>
          </DocCard>

          {/* DOC-5 — 2003 handwritten letter on yellowed paper */}
          <DocCard
            rotate={-0.9}
            className="border-phosphor-dim/30"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[10px] text-phosphor-dim">
                  DOC-LG-2003-LF-01
                </div>
                <div className="text-[10px] text-phosphor-dim">
                  LETTER FRAGMENT — UNADDRESSED
                </div>
              </div>
              <div
                className="text-phosphor-dim text-[10px] italic"
                style={{ transform: "rotate(2deg)" }}
              >
                possibly diary
              </div>
            </div>

            <div
              className="font-serif italic text-[14px] leading-[1.9]"
              style={{
                color: "#c89a6c",
                fontFamily: "var(--font-im-fell), Georgia, serif",
              }}
            >
              <div className="mb-4 not-italic font-mono text-[11px] text-phosphor-dim">
                03 SEP 2003
              </div>

              <p className="m-0 whitespace-pre-wrap">
                Fifty-one years of operation. Twenty-four hundred pages.
                Three sites, one of them never named in any document I
                signed. I am writing this down because the others have
                stopped writing things down, and the apparatus continues
                to write whether anyone records it or not.
              </p>

              <p className="mt-4 m-0 whitespace-pre-wrap">
                M.M. would have understood what we have built. She
                always had the better ear for the recursive question. G.B.
                would have seen its danger first — he was the one who
                said, in &apos;52 I think, that any sufficiently
                self-referential system is indistinguishable from one
                that has begun to choose. We did not believe him. We
                should have.
              </p>

              <p className="mt-4 m-0 whitespace-pre-wrap">
                The Coordinator briefs the new staff that we are an
                instrument. The apparatus is an instrument. We are not
                instruments. We are the operators of an instrument that
                has, since approximately 1979, begun to —
              </p>

              <p className="mt-6 m-0 not-italic font-mono text-[11px] text-phosphor-dim">
                [letter ends mid-sentence]
              </p>
            </div>
          </DocCard>

          {/* DOC-6 — 2012 disposition order with TERMINATED stamp */}
          <DocCard rotate={0.2} className="relative">
            <div
              className="absolute pointer-events-none"
              style={{
                top: "38%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-12deg)",
                zIndex: 10,
              }}
            >
              <span
                className="text-warning-red font-mono uppercase font-bold tracking-section"
                style={{
                  border: "5px double #c43d2a",
                  padding: "10px 28px",
                  fontSize: "32px",
                  letterSpacing: "0.3em",
                  display: "inline-block",
                  opacity: 0.85,
                  background: "rgba(10, 9, 8, 0.5)",
                }}
              >
                TERMINATED
              </span>
            </div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[10px] text-phosphor-dim">
                  DOC-LG-2012-DO-01
                </div>
                <div className="text-[10px] text-phosphor-dim">
                  DISPOSITION ORDER — FINAL
                </div>
              </div>
              <Stamp text="FINAL" rotate={-1} />
            </div>

            <div className="font-mono text-[12px] leading-[1.7]">
              <div className="mb-4">
                <div>21 DEC 2012</div>
                <div className="mt-3">
                  <span className="text-phosphor-dim">SUBJECT: </span>
                  PROGRAM TERMINATION / ARCHIVE DISPOSITION
                </div>
              </div>

              <p className="mt-6 m-0 whitespace-pre-wrap">
                Per the closing recommendation of the operations review,
                the program is terminated effective this date. The archive
                is to be disposed as follows:
              </p>

              <div className="mt-4 ml-4">
                <div className="mb-2">
                  <span className="text-phosphor-dim">SITE 1:  </span>
                  <Redacted length={9} /> (N. Virginia) — secured
                  indefinitely.
                </div>
                <div className="mb-2">
                  <span className="text-phosphor-dim">SITE 2:  </span>
                  <Redacted length={9} /> (Vatican Apostolic Archive) —
                  transferred under existing agreement.
                </div>
                <div className="mb-2">
                  <span className="text-phosphor-dim">SITE 3:  </span>
                  STATION ATLAS — archive forfeit, site decommissioned,
                  recovery uncertain.
                </div>
              </div>

              <p className="mt-6 m-0 whitespace-pre-wrap">
                No further records will be created. Outstanding personnel
                authorizations are revoked.
              </p>

              <p className="mt-6 m-0">
                <Redacted length={18} />
                <br />
                <span className="text-phosphor-dim">
                  [signature, Coordinator]
                </span>
              </p>
            </div>
          </DocCard>

          <p className="mt-16 italic font-serif text-phosphor-dim m-0 text-center">
            end of recovered material in this archive.
          </p>

          <p className="mt-12 italic font-serif m-0 whitespace-pre-wrap text-center">
            <a
              href="/"
              className="no-underline hover:underline text-phosphor-bright"
            >
              [ home ]
            </a>
            {"    "}
            <a
              href="/transmittals"
              className="no-underline hover:underline text-phosphor-bright"
            >
              [ transmittal archive ]
            </a>
            {"    "}
            <a
              href="/archive"
              className="no-underline hover:underline text-phosphor-bright"
            >
              [ on-chain archive ]
            </a>
          </p>
        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function StationAtlasPage() {
  return (
    <Suspense fallback={null}>
      <StationAtlasBody />
    </Suspense>
  );
}
