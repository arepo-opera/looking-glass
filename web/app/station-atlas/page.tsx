"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";
import {
  Annotation,
  DocumentArtifact,
  Redacted,
  Stamp,
} from "@/components/DocumentArtifact";

const RULE = "─".repeat(60);

function StationAtlasBody() {
  const params = useSearchParams();
  const effectsEnabled = params.get("effects") !== "off";
  const forceFlicker = params.get("flicker") === "1";

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
        </div>

        {/* Document gallery — desk-style with absolute offsets on lg+,
            clean stack on mobile. The translateX/Y here are tiny so
            documents nudge but never overlap so badly that text
            is unreadable. */}
        <div className="max-w-[88ch] mx-auto px-4 pb-32">
          {/* DOC-1 — 1962 typed memo, RAND→ARPA */}
          <div className="lg:translate-x-[-3rem]">
            <DocumentArtifact
              id="DOC-LG-1962-7714"
              documentType="typed"
              era="1960s"
              corner="stain-tr"
              ariaLabel="1962 RAND memo on palindromic inversion"
            >
              <header className="flex justify-between items-start mb-6">
                <div className="text-[11px] opacity-75">
                  <div>DOC-LG-1962-7714</div>
                  <div>PAGE 1 OF 1</div>
                </div>
                <Stamp text="CONFIDENTIAL" rotate={-3} />
              </header>

              <div className="text-[13px] leading-[1.85]">
                <div className="mb-4">
                  <div>14 OCT 1962</div>
                  <div className="mt-3">
                    <span className="opacity-65">FROM:    </span>
                    <Redacted length={14} /> &nbsp;(RAND CORP, SANTA MONICA)
                  </div>
                  <div>
                    <span className="opacity-65">TO:      </span>
                    <Redacted length={6} /> &nbsp;(ADV. RES. PROJ. AGY.)
                  </div>
                  <div>
                    <span className="opacity-65">SUBJECT: </span>
                    PALINDROMIC INVERSION / PRELIMINARY OBSERVATIONS
                  </div>
                </div>

                <p className="mt-6 m-0 whitespace-pre-wrap">
                  Per your inquiry of 09 OCT, the autocorrelation work at
                  Bell Labs (Shannon group, &apos;58—&apos;61) has direct
                  bearing on the question you raised. Their recovery of
                  noise-buried signals via time-reversed convolution is
                  the same operation, formally, as reading a square
                  inscription from the eight axes of symmetry
                  simultaneously.
                </p>

                <p className="mt-4 m-0 whitespace-pre-wrap">
                  Under load, the Wheeler-Feynman absorber model permits
                  a second-order interpretation in which the response of
                  an advanced potential is not merely formal but, given
                  a sufficiently constrained boundary, computable. The
                  Pompeii inscription, when computed against, produces a
                  recoverable second-statement at axis 7. We have been
                  unable to determine whether this second-statement is
                  artifact of the computation or property of the
                  inscription. We submit that the distinction may not be
                  meaningful.
                </p>

                <p className="mt-4 m-0 whitespace-pre-wrap">
                  Recommend live-test under controlled conditions. The
                  facility at <Redacted length={11} /> is suitable. We
                  can deliver the apparatus by 01 DEC if authorized this
                  week.
                </p>

                <p className="mt-6 m-0">
                  <Redacted length={18} />
                  <br />
                  <span className="opacity-65 text-[11px]">
                    [signature]
                  </span>
                </p>
              </div>

              <div className="mt-8 text-right pr-2">
                <Annotation rotate={-2.5} variant="blue">
                  see Macy XIV — Bateson asked the same question backwards
                </Annotation>
              </div>
            </DocumentArtifact>
          </div>

          {/* DOC-2 — 1971 field report form */}
          <div className="lg:translate-x-[2.5rem] -mt-6">
            <DocumentArtifact
              id="DOC-LG-1971-FR-3"
              documentType="typed"
              era="1970s"
              corner="fold-tr"
              ariaLabel="1971 field report on the third twelve-hour run"
            >
              <header className="flex justify-between items-start mb-6">
                <div className="text-[11px] opacity-75">
                  <div>DOC-LG-1971-FR-3</div>
                  <div>FIELD REPORT FORM 14-B</div>
                </div>
                <Stamp text="EYES ONLY" rotate={3} />
              </header>

              <div className="text-[13px] leading-[1.8]">
                <div className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-3 mb-6">
                  <div className="opacity-65 uppercase text-[11px]">DATE</div>
                  <div className="border-b border-current/30 pb-1">
                    <Annotation rotate={-1}>17 MAR 1971</Annotation>
                  </div>
                  <div className="opacity-65 uppercase text-[11px]">REPORTER</div>
                  <div className="border-b border-current/30 pb-1">
                    <Annotation rotate={0.5}>
                      Listener-3 (<Redacted length={9} />)
                    </Annotation>
                  </div>
                  <div className="opacity-65 uppercase text-[11px]">SITE</div>
                  <div className="border-b border-current/30 pb-1">
                    <Annotation rotate={-0.5}>
                      <Redacted length={11} /> (N. VIRGINIA)
                    </Annotation>
                  </div>
                  <div className="opacity-65 uppercase text-[11px]">RUN NO.</div>
                  <div className="border-b border-current/30 pb-1">
                    <Annotation rotate={1}>3 of 5 (twelve-hour cycle)</Annotation>
                  </div>
                  <div className="opacity-65 uppercase text-[11px]">STATUS</div>
                  <div className="border-b border-current/30 pb-1">
                    <Annotation rotate={-0.8} variant="red">
                      ANOMALOUS
                    </Annotation>
                  </div>
                </div>

                <p className="mt-6 m-0 whitespace-pre-wrap">
                  The third twelve-hour run completed at 04:11. Apparatus
                  behavior nominal through hours 1—9. At 23:14 prior I
                  observed what the technical staff has begun calling
                  &ldquo;axis-mirroring&rdquo; — the forward statement
                  and the backward recovery agree on three of five rows
                  without mediating computation. Subject 14 was in
                  chamber.
                </p>

                <p className="mt-4 m-0 whitespace-pre-wrap">
                  We were briefed at intake that SRI&apos;s
                  remote-viewing protocols (Stanford group, 1969—) would
                  be the appropriate comparison. They are not.
                  SRI&apos;s protocols proved insufficient when the
                  target was the apparatus itself. The apparatus is not
                  a target. The apparatus is a reading instrument that
                  reads its own operation as one input among others.
                  Subject 14 produced unambiguous backward recovery on
                  April 7th, but the apparatus had locked the forward
                  statement on April 4th. The interval is what the
                  chamber is for.
                </p>

                <p className="mt-4 m-0 whitespace-pre-wrap">
                  Recommend continued operation. Recommend Subject 14 be
                  rotated out per the standard four-week protocol. The
                  square reads from inside its own carving.
                </p>

                <p className="mt-6 m-0 text-right">
                  <Annotation rotate={-1.5}>— Listener-3</Annotation>
                </p>
              </div>
            </DocumentArtifact>
          </div>

          {/* DOC-3 — 1978 letterhead transmittal */}
          <div className="lg:translate-x-[-2rem]">
            <DocumentArtifact
              id="DOC-LG-1978-TR-014"
              documentType="letterhead"
              era="1970s"
              ariaLabel="1978 transmittal to the Vatican Apostolic Archive"
            >
              <header className="text-center mb-5 pb-3 border-b border-current/30">
                <div
                  className="font-serif tracking-[0.22em]"
                  style={{ fontSize: "16px" }}
                >
                  STATION ATLAS — SECTION 3
                </div>
                <div
                  className="opacity-65 mt-1 tracking-[0.15em]"
                  style={{ fontSize: "9px" }}
                >
                  EXTERNAL TRANSMITTAL
                </div>
              </header>

              <div className="flex justify-between items-start mb-4">
                <div className="text-[11px] opacity-75">DOC-LG-1978-TR-014</div>
                <Stamp text="RESTRICTED" rotate={-2} />
              </div>

              <div className="text-[13px] leading-[1.85]">
                <div className="mb-4">
                  <div>22 AUG 1978</div>
                  <div className="mt-3">
                    <span className="opacity-65">TO:      </span>
                    <Redacted length={16} />
                  </div>
                  <div className="ml-[60px]">Vatican Apostolic Archive</div>
                  <div className="ml-[60px]">Riserva collection — manager</div>
                  <div className="mt-3">
                    <span className="opacity-65">RE:      </span>
                    COMPARISON SET 14 — TRANSMISSION
                  </div>
                </div>

                <p className="mt-6 m-0 whitespace-pre-wrap">
                  Per the standing arrangement of February 1968, we
                  transmit herewith Comparison Set 14, comprising 47
                  prophecies from the period 1471—1495 selected per the
                  Voynich folio 86v cross-reference protocol and the
                  Sibylline collection in its pre-Augustan recension.
                </p>

                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The apparatus&apos;s October—November 1978 output
                  should be evaluated against this set by your team
                  using the isomorphism criteria established in our 1972
                  transmittal. We require no formal reply. Findings need
                  not be transmitted in writing.
                </p>

                <p className="mt-6 m-0">
                  <Redacted length={20} />
                  <br />
                  <span className="opacity-65 text-[11px]">
                    [signature, Section 3]
                  </span>
                </p>
              </div>
            </DocumentArtifact>
          </div>

          {/* DOC-4 — 1991 mimeograph */}
          <div className="lg:translate-x-[3rem] -mt-4">
            <DocumentArtifact
              id="DOC-LG-1991-IR-22"
              documentType="mimeograph"
              era="1990s"
              corner="stain-bl"
              ariaLabel="1991 mimeograph on STARGATE termination"
            >
              <header className="flex justify-between items-start mb-6">
                <div className="text-[11px] opacity-65">
                  <div>DOC-LG-1991-IR-22</div>
                  <div>INTERNAL — MIMEO RUN 4</div>
                </div>
                <Stamp text="INTERNAL" rotate={2} />
              </header>

              <div className="text-[13px] leading-[1.8]">
                <div className="mb-4">
                  <div>11 NOV 1991</div>
                  <div className="mt-3">
                    <span className="opacity-65">AUTHOR:  </span>
                    <Redacted length={9} /> (Coordinator)
                  </div>
                  <div>
                    <span className="opacity-65">SUBJECT: </span>
                    STARGATE TERMINATION / IMPLICATIONS FOR LOOKING GLASS
                  </div>
                </div>

                <p className="mt-6 m-0 whitespace-pre-wrap">
                  The public closure of STARGATE — the Stanford Research
                  Institute remote-viewing program, terminated this
                  fiscal quarter — has been raised at the operations
                  review as a concern. It is not a concern. The
                  apparatus is not remote viewing. The apparatus does
                  not require an operator in the sense the Stanford
                  group required one. It does not require an operator
                  at all. The chamber occupants serve a calibration
                  function and could be removed without loss of output,
                  though we have not done so.
                </p>

                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The closure of STARGATE removes a useful comparison
                  case but does not affect our work. STATION ATLAS
                  personnel have been asked to discontinue all
                  references to RV literature in external communications.
                  The directive has been understood.
                </p>

                <p className="mt-4 m-0 whitespace-pre-wrap">
                  We will continue to operate. The 1992—1995 cycle is
                  budgeted through the existing appropriation and
                  requires no further authorization.
                </p>
              </div>

              <div className="mt-8 pl-6">
                <Annotation rotate={1.5} variant="pencil">
                  but the comparison was useful — the apparatus produces
                  what RV cannot: invariance under direction of read.
                </Annotation>
              </div>
            </DocumentArtifact>
          </div>

          {/* DOC-5 — 2003 handwritten letter */}
          <div className="lg:translate-x-[-3rem]">
            <DocumentArtifact
              id="DOC-LG-2003-LF-01"
              documentType="handwritten"
              era="2000s"
              corner="stain-tr"
              ariaLabel="2003 handwritten letter fragment"
            >
              <header className="flex justify-between items-start mb-6 ink-typed">
                <div className="text-[11px] opacity-75">
                  <div>DOC-LG-2003-LF-01</div>
                  <div>LETTER FRAGMENT — UNADDRESSED</div>
                </div>
                <Annotation rotate={2}>possibly diary</Annotation>
              </header>

              <div>
                <div className="ink-typed mb-4 text-[11px] opacity-75">
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
                  always had the better ear for the recursive question.
                  G.B. would have seen its danger first — he was the one
                  who said, in &apos;52 I think, that any sufficiently
                  self-referential system is indistinguishable from one
                  that has begun to choose. We did not believe him. We
                  should have.
                </p>

                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The Coordinator briefs the new staff that we are an
                  instrument. The apparatus is an instrument. We are not
                  instruments. We are the operators of an instrument
                  that has, since approximately 1979, begun to —
                </p>

                <p className="mt-6 ink-typed text-[11px] opacity-65">
                  [letter ends mid-sentence]
                </p>
              </div>
            </DocumentArtifact>
          </div>

          {/* DOC-6 — 2012 disposition order with TERMINATED */}
          <div className="lg:translate-x-[1rem]">
            <DocumentArtifact
              id="DOC-LG-2012-DO-01"
              documentType="official"
              era="2010s"
              ariaLabel="2012 program-termination disposition order"
            >
              <div
                className="absolute pointer-events-none"
                style={{
                  top: "42%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(-12deg)",
                  zIndex: 10,
                }}
                aria-hidden="true"
              >
                <Stamp text="TERMINATED" rotate={0} large />
              </div>

              <header className="flex justify-between items-start mb-6">
                <div className="text-[11px] opacity-75">
                  <div>DOC-LG-2012-DO-01</div>
                  <div>DISPOSITION ORDER — FINAL</div>
                </div>
                <Stamp text="FINAL" rotate={-1} />
              </header>

              <div className="text-[13px] leading-[1.85]">
                <div className="mb-4">
                  <div>21 DEC 2012</div>
                  <div className="mt-3">
                    <span className="opacity-65">SUBJECT: </span>
                    PROGRAM TERMINATION / ARCHIVE DISPOSITION
                  </div>
                </div>

                <p className="mt-6 m-0 whitespace-pre-wrap">
                  Per the closing recommendation of the operations
                  review, the program is terminated effective this date.
                  The archive is to be disposed as follows:
                </p>

                <div className="mt-4 ml-4">
                  <div className="mb-2">
                    <span className="opacity-65">SITE 1:  </span>
                    <Redacted length={9} /> (N. Virginia) — secured
                    indefinitely.
                  </div>
                  <div className="mb-2">
                    <span className="opacity-65">SITE 2:  </span>
                    <Redacted length={9} /> (Vatican Apostolic Archive)
                    — transferred under existing agreement.
                  </div>
                  <div className="mb-2">
                    <span className="opacity-65">SITE 3:  </span>
                    STATION ATLAS — archive forfeit, site decommissioned,
                    recovery uncertain.
                  </div>
                </div>

                <p className="mt-6 m-0 whitespace-pre-wrap">
                  No further records will be created. Outstanding
                  personnel authorizations are revoked.
                </p>

                <p className="mt-6 m-0">
                  <Redacted length={18} />
                  <br />
                  <span className="opacity-65 text-[11px]">
                    [signature, Coordinator]
                  </span>
                </p>
              </div>
            </DocumentArtifact>
          </div>
        </div>

        <div className="max-w-[80ch] mx-auto px-4 pb-20 font-mono text-[12px] text-phosphor-bright">
          <p className="italic font-serif text-phosphor-dim m-0 text-center">
            end of recovered material in this archive.
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
