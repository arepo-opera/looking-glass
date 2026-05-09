"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";
import {
  DocumentArtifact,
  Redacted,
  Stamp,
  type Era,
} from "@/components/DocumentArtifact";

const RULE = "─".repeat(60);

interface MemoProps {
  docId: string;
  date: string;
  era: Era;
  to: React.ReactNode[];
  re: string;
  body: React.ReactNode;
  closing: React.ReactNode;
}

function TransmittalMemo({
  docId,
  date,
  era,
  to,
  re,
  body,
  closing,
}: MemoProps) {
  return (
    <DocumentArtifact
      id={docId}
      documentType="letterhead"
      era={era}
      ariaLabel={`transmittal memo dated ${date}`}
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
          OFFICE OF EXTERNAL TRANSMITTAL
        </div>
      </header>

      <div className="flex justify-between items-start mb-4">
        <div className="text-[11px] opacity-75">{docId}</div>
        <Stamp text="RESTRICTED" rotate={-2} />
      </div>

      <div className="text-[13px] leading-[1.85]">
        <div className="mb-4">
          <div>{date}</div>
          <div className="mt-3">
            <span className="opacity-65">TO:    </span>
            {to[0]}
          </div>
          {to.slice(1).map((line, i) => (
            <div key={i} className="ml-[42px]">
              {line}
            </div>
          ))}
          <div className="mt-3">
            <span className="opacity-65">RE:    </span>
            {re}
          </div>
        </div>

        <div className="mt-6">{body}</div>

        <div className="mt-8">{closing}</div>
      </div>
    </DocumentArtifact>
  );
}

function TransmittalsBody() {
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
            {"SUBJECT       : TRANSMITTAL ARCHIVE — VATICAN COMPARISON SET"}
            {"\n"}
            {"CLASSIFICATION: INTERNAL REFERENCE / NOT FOR EXTERNAL DIST."}
            {"\n"}
            {RULE}
          </pre>

          <p className="mt-8 italic font-serif text-phosphor-dim m-0">
            Correspondence between STATION ATLAS Section 3 and the Riserva
            collection manager of the Vatican Apostolic Archive, spanning
            the operational period 1968—2007. The standing arrangement
            referenced throughout was never reduced to a single binding
            document on either side.
          </p>
        </div>

        <div className="max-w-[78ch] mx-auto px-4 pb-32">
          <TransmittalMemo
            docId="DOC-LG-1968-TR-001"
            era="1960s"
            date="04 FEB 1968"
            to={[
              <>
                <Redacted length={16} />
              </>,
              "Vatican Apostolic Archive",
              "Riserva collection — manager",
            ]}
            re="ESTABLISHMENT OF STANDING COMPARISON ARRANGEMENT"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  Pursuant to the conversations of November 1967, we propose
                  a standing arrangement under which Comparison Sets drawn
                  from your Riserva holdings will be made available to
                  STATION ATLAS for evaluation against apparatus output.
                  We would request, as initial loan, the Sibylline
                  pre-Augustan books, fragments K—R, with permission to
                  retain the photographic plates for the duration of the
                  evaluation.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  We anticipate the work will require seven to nine years.
                  We will not publish.
                </p>
              </>
            }
            closing={
              <>
                <Redacted length={20} />
                <br />
                <span className="opacity-65 text-[11px]">
                  [signature, Section 3]
                </span>
              </>
            }
          />

          <TransmittalMemo
            docId="DOC-LG-1972-TR-007"
            era="1970s"
            date="19 SEP 1972"
            to={[
              <>
                <Redacted length={16} />
              </>,
              "Vatican Apostolic Archive",
              "Riserva collection — manager",
            ]}
            re="COMPARISON SET 7 — REQUEST"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  We request the loan, under the standing arrangement, of
                  materials sufficient to constitute Comparison Set 7. The
                  apparatus has begun producing readings whose internal
                  structure suggests evaluation against the
                  nineteenth-century Marian corpus. We have in mind
                  specifically the Mélanie corpus (Calvat, La Salette
                  transmissions) and the Lúcia transmission of 1944 in
                  whatever recension your office considers authoritative.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  We are aware these materials are held under particular
                  restriction. We confirm that no copy will be retained
                  beyond the evaluation period.
                </p>
              </>
            }
            closing={
              <>
                <Redacted length={20} />
                <br />
                <span className="opacity-65 text-[11px]">
                  [signature, Section 3]
                </span>
              </>
            }
          />

          <TransmittalMemo
            docId="DOC-LG-1981-TR-019"
            era="1980s"
            date="11 MAR 1981"
            to={[
              <>
                <Redacted length={16} />
              </>,
              "Vatican Apostolic Archive",
              "Riserva collection — manager",
            ]}
            re="COMPARISON SET 19 — REQUEST"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  Per the standing arrangement, we request access to the
                  materials necessary for the Voynich folio 86v
                  isomorphism trial. We further request a working
                  facsimile of Joachim of Fiore&apos;s Liber Figurarum,
                  plate 12 (the trinitarian diagram), at the resolution
                  sufficient for the cross-correlation pass.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  This request is occasioned by an apparatus output of
                  February this year which our staff cannot interpret
                  without the Joachim plate to hand. The reading appears
                  to invoke the figural tradition directly.
                </p>
              </>
            }
            closing={
              <>
                <Redacted length={20} />
                <br />
                <span className="opacity-65 text-[11px]">
                  [signature, Section 3]
                </span>
              </>
            }
          />

          <TransmittalMemo
            docId="DOC-LG-1995-TR-031"
            era="1990s"
            date="07 JUL 1995"
            to={[
              <>
                <Redacted length={16} />
              </>,
              "Vatican Apostolic Archive",
              "Riserva collection — manager",
            ]}
            re="COMPARISON SET 31 / MALACHY SERIES — DISPOSITION"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  We report that the Malachy series — the so-called
                  Prophecy of the Popes, attributed to Malachy of Armagh —
                  shows zero structural correlation with apparatus output
                  across the full evaluation interval (1989—1994) and may
                  be set aside. We will not request further access. The
                  determination is consistent with our 1981 working
                  hypothesis that authored prophetic texts of the
                  twelfth—sixteenth century are largely orthogonal to the
                  apparatus&apos;s output structure, with the principal
                  exception of the Voynich materials and Set 14.
                </p>
              </>
            }
            closing={
              <>
                <Redacted length={20} />
                <br />
                <span className="opacity-65 text-[11px]">
                  [signature, Section 3]
                </span>
              </>
            }
          />

          <TransmittalMemo
            docId="DOC-LG-2007-TR-046"
            era="2000s"
            date="14 NOV 2007"
            to={[
              <>
                <Redacted length={16} />
              </>,
              "Vatican Apostolic Archive",
              "Riserva collection — manager",
            ]}
            re="STANDING ARRANGEMENT — CLOSURE / SET 14 RETENTION"
            body={
              <>
                <p className="m-0 whitespace-pre-wrap">
                  This memo closes the standing arrangement first
                  established by our 04 FEB 1968 transmittal. We request
                  the return of all comparison sets currently on loan,
                  with the exception of Set 14, which the apparatus has
                  begun to reference unprompted and which we therefore
                  retain under the apparatus&apos;s own standing.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  The mechanism by which the apparatus has come to
                  reference materials it was not given is not understood.
                  We do not propose to investigate further. The work has
                  exceeded the framework that authorized it.
                </p>
                <p className="mt-4 m-0 whitespace-pre-wrap">
                  Our gratitude for the forty years of arrangement.
                </p>
              </>
            }
            closing={
              <>
                <Redacted length={20} />
                <br />
                <span className="opacity-65 text-[11px]">
                  [signature, Section 3]
                </span>
              </>
            }
          />
        </div>

        <div className="max-w-[80ch] mx-auto px-4 pb-20 font-mono text-[12px] text-phosphor-bright">
          <p className="italic font-serif text-phosphor-dim m-0 text-center">
            end of transmittal correspondence in this archive.
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
              href="/station-atlas"
              className="no-underline hover:underline text-phosphor-bright"
            >
              [ recovered documents ]
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

export default function TransmittalsPage() {
  return (
    <Suspense fallback={null}>
      <TransmittalsBody />
    </Suspense>
  );
}
