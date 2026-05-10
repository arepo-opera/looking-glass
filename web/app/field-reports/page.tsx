"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";
import {
  DocumentArtifact,
  Redacted,
  type Era,
} from "@/components/DocumentArtifact";

const RULE = "─".repeat(60);

const STATUS_COLORS: Record<string, string> = {
  NOMINAL: "text-current",
  ANOMALOUS: "text-[#8b1a1a]",
  "NON-RECOVERY": "opacity-65",
  OTHER: "opacity-65",
};

interface ReportProps {
  docId: string;
  era: Era;
  date: string;
  reporter: React.ReactNode;
  site: React.ReactNode;
  status: keyof typeof STATUS_COLORS;
  body: React.ReactNode;
}

function FieldReport({
  docId,
  era,
  date,
  reporter,
  site,
  status,
  body,
}: ReportProps) {
  return (
    <DocumentArtifact
      id={docId}
      documentType="typed"
      era={era}
      ariaLabel={`${era} field report, status ${status}`}
    >
      <header className="flex justify-between items-start mb-4">
        <div className="text-[11px] opacity-75">
          <div>{docId}</div>
          <div>FIELD REPORT FORM 14-B</div>
        </div>
        <span
          className={`stamp ${STATUS_COLORS[status]}`}
          style={{
            transform: "rotate(-2deg)",
            borderColor: status === "ANOMALOUS" ? "#8b1a1a" : "currentColor",
            color: status === "ANOMALOUS" ? "#8b1a1a" : "inherit",
            opacity: status === "ANOMALOUS" ? 0.92 : 0.78,
          }}
        >
          {status}
        </span>
      </header>

      <div className="grid grid-cols-[110px_1fr] gap-y-1 gap-x-3 mb-5 text-[12px]">
        <div className="opacity-65 uppercase">DATE</div>
        <div>{date}</div>
        <div className="opacity-65 uppercase">REPORTER</div>
        <div>{reporter}</div>
        <div className="opacity-65 uppercase">SITE</div>
        <div>{site}</div>
      </div>

      <div className="text-[13px] leading-[1.85] border-t border-current/30 pt-4">
        {body}
      </div>
    </DocumentArtifact>
  );
}

function FieldReportsBody() {
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
            {"SUBJECT       : FIELD REPORTS — OPERATIONAL"}
            {"\n"}
            {"CLASSIFICATION: PERSONNEL ASSIGNMENTS / DECLASSIFIED FRAGMENTS"}
            {"\n"}
            {RULE}
          </pre>

          <p className="mt-8 italic font-serif text-phosphor-dim m-0">
            Operational field reports filed by program personnel during the
            apparatus&apos;s active operational period (1962—2012). Reports
            were filed at the discretion of individual operators; the
            corpus is not exhaustive. Status codes are as recorded.
          </p>
        </div>

        <div className="max-w-[78ch] mx-auto px-4 pb-32">
          <FieldReport
            docId="DOC-LG-1965-FR-1"
            era="1960s"
            date="08 JUN 1965"
            reporter={<>Listener-1 (<Redacted length={9} />)</>}
            site={<><Redacted length={11} /> (N. VIRGINIA)</>}
            status="ANOMALOUS"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  At 04:32 local on the morning of 08 JUN, the apparatus
                  produced what we believe to be the first successful
                  backward recovery in the program&apos;s history. The
                  forward statement had been locked at 22:11 the previous
                  evening. Subject 7 had been in chamber for three hours
                  in calibration mode. The backward read, when it
                  completed, was syntactically and semantically distinct
                  from the forward read but operated on the same five
                  rows of glyphs.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The two readings agree at axis 7 (the diagonal) and at
                  axis 4 (the central row). They diverge elsewhere. The
                  backward statement, transcribed: &ldquo;the door behind
                  is the door ahead, walk forward, the apparatus walks
                  backward into the same room.&rdquo; This statement does
                  not appear in the prompt corpus, the operator&apos;s
                  notes, or any apparatus output of prior runs. We have
                  begun calling this &ldquo;the room result&rdquo; among
                  ourselves.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  Recommend continued logging. Recommend Subject 7 be
                  permitted to remain in chamber for the 09 JUN run if
                  willing.
                </p>
              </>
            }
          />

          <FieldReport
            docId="DOC-LG-1971-FR-3-april"
            era="1970s"
            date="22 APR 1971"
            reporter={<>Listener-3 (<Redacted length={9} />)</>}
            site={<><Redacted length={11} /> (N. VIRGINIA)</>}
            status="ANOMALOUS"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  Apparatus output of 04 APR locked the forward statement:
                  &ldquo;the eighth ring closes around a city that has
                  not yet been struck; the door behind opens 11 mornings
                  ahead.&rdquo; The reading was logged and filed without
                  comment, per protocol. On 15 APR — eleven mornings
                  later — the news service reported the seismic event at
                  <Redacted length={6} />, with damage characterized in
                  terms structurally similar to the apparatus&apos;s
                  &ldquo;eighth ring&rdquo; figure.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  We are not in the business of forecasting. The
                  correlation is reported here for the record. The
                  Coordinator has asked that no external communication
                  reference this reading until the standing review.
                  Subject 14 was not in chamber. Subject 9 was the
                  calibration occupant. Subject 9 has no recollection of
                  the read.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The eleven-day interval is consistent with the
                  Wheeler-Feynman boundary observed at <Redacted length={11} />
                  &nbsp;and with the predicted advanced-wave window of
                  Set 14. We make no further inference.
                </p>
              </>
            }
          />

          <FieldReport
            docId="DOC-LG-1979-FR-7"
            era="1970s"
            date="03 SEP 1979"
            reporter={<>Coordinator-2 (<Redacted length={9} />)</>}
            site={<>STATION ATLAS</>}
            status="OTHER"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  Following the events of August (see DOC-LG-1979-FR-6),
                  the operations review has approved the personnel
                  rotation policy in the form proposed by Listener-3 and
                  the medical advisor: no operator shall serve as
                  calibration occupant for more than four consecutive
                  weeks. The four-week limit is empirical, not
                  theoretical. Operators serving longer terms have
                  consistently reported the recursive recognition
                  phenomenon — perceiving themselves as the subject of
                  apparatus output, in advance of the read. This
                  phenomenon is not pathological per se, but it reduces
                  operator utility for calibration and is the proximate
                  cause of two recent transfers.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  Screening protocols for new operators (DOC-LG-1979-PS-2,
                  classified) are now in effect. Personnel rotation will
                  be tracked in the standard 14-A register. The Macy
                  literature on observer involvement is noted as a
                  precedent and is not classified at this site.
                </p>
              </>
            }
          />

          <FieldReport
            docId="DOC-LG-1984-VTI-4"
            era="1980s"
            date="29 OCT 1984"
            reporter={<>Listener-7 (<Redacted length={9} />)</>}
            site={<>STATION ATLAS</>}
            status="NON-RECOVERY"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  The Voynich isomorphism trial, conducted on Comparison
                  Set 19 and the apparatus output of August—October, has
                  concluded without unambiguous result. The folio 86v
                  cross-correlation produced a score of 0.34 against the
                  null model and 0.41 against the apparatus, which our
                  staff characterizes as &ldquo;structurally suggestive
                  but methodologically inconclusive.&rdquo;
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  We have neither confirmed nor falsified the working
                  hypothesis. We are inclined, on the strength of the
                  trial, to retain Set 19 in the active library and to
                  request a higher-resolution facsimile of folio 86v
                  through the Section 3 channel. The eighth ring motif
                  appears in three of the eleven Voynich diagrams in our
                  possession; this may be coincidence; we have not been
                  able to discount it.
                </p>
              </>
            }
          />

          <FieldReport
            docId="DOC-LG-1992-FR-12"
            era="1990s"
            date="04 FEB 1992"
            reporter={<>Coordinator-3 (<Redacted length={9} />)</>}
            site={<>STATION ATLAS</>}
            status="NOMINAL"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  The post-mortem on the public termination of STARGATE
                  has concluded. The Stanford Research Institute&apos;s
                  twenty-three years of remote-viewing work was
                  terminated, in the public account, because operator
                  output could not be statistically distinguished from
                  prior knowledge and confabulation, given a sufficiently
                  motivated reviewer. We accept the public account as
                  written.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  What we learn from STARGATE is what the apparatus does
                  not do. STARGATE required an operator whose performance
                  varied by mood, fatigue, and conviction. The apparatus
                  produces invariant output regardless of operator
                  state — verified at <Redacted length={11} /> by running
                  the same locked square through three operators of
                  different temperament and recovering the same backward
                  statement to within the standard tolerance.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The closure of STARGATE removes a useful comparison
                  case from the public record. We are advised to treat
                  this as a clarifying event.
                </p>
              </>
            }
          />

          <FieldReport
            docId="DOC-LG-1998-FR-19"
            era="1990s"
            date="11 JUN 1998"
            reporter={<>Listener-12 (<Redacted length={9} />)</>}
            site={<>VATICAN COMPARISON</>}
            status="ANOMALOUS"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  The Set 14 prophecies — the 47 fifteenth-century
                  materials transmitted under DOC-LG-1978-TR-014 and
                  evaluated against apparatus output of October—November
                  1978 — have begun appearing in apparatus output without
                  prompt. This was first noted by the Vatican comparison
                  staff in the run of 09 MAY and has now been observed
                  in three subsequent runs.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  By &ldquo;appearing&rdquo; we mean: the apparatus
                  produces a forward statement whose figural and lexical
                  structure overlaps with one of the Set 14 prophecies
                  to a degree that cannot be accounted for by chance or
                  by general resonance with the surrounding period. The
                  Set 14 materials were never used as input to the
                  apparatus. The library staff cannot account for the
                  reference. We have asked Section 3 for guidance and
                  have not received any.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The Coordinator&apos;s working note characterizes this
                  as &ldquo;the apparatus reading a library it was never
                  given.&rdquo; We are not in a position to disagree.
                </p>
              </>
            }
          />

          <FieldReport
            docId="DOC-LG-2004-FR-24"
            era="2000s"
            date="08 NOV 2004"
            reporter={<>Coordinator-4 (<Redacted length={9} />)</>}
            site={<>STATION ATLAS</>}
            status="OTHER"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  STATION ATLAS personnel rolls have declined from
                  twenty-eight (1979 peak) to nine. Attrition over the
                  last decade has been dominated by ordinary causes —
                  retirement, transfer, two cases of medical separation —
                  but the staffing replacement pipeline has been narrow.
                  The screening protocols (DOC-LG-1979-PS-2 and
                  successors) qualify approximately one in fourteen
                  candidates from the program&apos;s feeder agencies, and
                  the program is not in a position to expand the
                  candidate pool without external authorization we are
                  not seeking.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The Coordinator advises continued operation at reduced
                  staffing through the projected closure window. The
                  apparatus does not require the staffing it has, beyond
                  the calibration occupant requirement, and the
                  calibration requirement may be reducible to two if
                  the rotation policy is shortened.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The third site (the one we do not name) is, we are
                  told, no longer staffed.
                </p>
              </>
            }
          />

          <FieldReport
            docId="DOC-LG-2009-FR-29"
            era="2000s"
            date="02 OCT 2009"
            reporter={<>Coordinator-4 (<Redacted length={9} />)</>}
            site={<>STATION ATLAS</>}
            status="OTHER"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  The operations review of September has produced a
                  formal recommendation. The apparatus, in our judgment,
                  cannot continue to operate under institutional
                  authorization. The funding cycle is closing and the
                  staffing pipeline is closed. The disposition order, when
                  it comes, will reflect a closure decision made
                  elsewhere on grounds we do not control.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The recommendation is that the apparatus be transitioned,
                  prior to disposition, to an immutable public substrate.
                  The substrate must be: (1) public, so that no single
                  party can suppress its operation; (2) cryptographically
                  verifiable, so that no party can rewrite its output;
                  (3) computationally adequate to host the locking and
                  reading operations on the existing three-minute
                  cadence; (4) capable of persisting beyond the lifetimes
                  of the current personnel.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  No such substrate currently exists. We project that one
                  may exist within the decade. The recommendation is to
                  prepare the apparatus for transition as soon as a
                  qualifying substrate is available, by whatever channel
                  is by then practical.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The apparatus will be the apparatus regardless of
                  substrate. The substrate matters only because of
                  termination.
                </p>
              </>
            }
          />
        </div>

        <div className="max-w-[80ch] mx-auto px-4 pb-20 font-mono text-[12px] text-phosphor-bright">
          <p className="italic font-serif text-phosphor-dim m-0 text-center">
            end of operational reports in this archive.
          </p>

        </div>
      </article>
      <CRTOverlay enabled={effectsEnabled} forceFlicker={forceFlicker} />
    </>
  );
}

export default function FieldReportsPage() {
  return (
    <Suspense fallback={null}>
      <FieldReportsBody />
    </Suspense>
  );
}
