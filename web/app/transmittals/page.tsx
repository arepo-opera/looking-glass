"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CRTOverlay } from "@/components/effects/CRTOverlay";

const RULE = "─".repeat(60);

function Redacted({ length = 8 }: { length?: number }) {
  return <span className="redaction">{"█".repeat(length)}</span>;
}

function Stamp({
  text,
  rotate = -3,
}: {
  text: string;
  rotate?: number;
}) {
  return (
    <span
      className="text-warning-red font-mono uppercase tracking-section font-bold inline-block px-2 py-1"
      style={{
        transform: `rotate(${rotate}deg)`,
        border: "2px solid #c43d2a",
        fontSize: "10px",
        letterSpacing: "0.15em",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

interface MemoProps {
  docId: string;
  date: string;
  to: React.ReactNode[];
  re: string;
  body: React.ReactNode;
  closing: React.ReactNode;
  rotate?: number;
}

function TransmittalMemo({
  docId,
  date,
  to,
  re,
  body,
  closing,
  rotate = 0,
}: MemoProps) {
  return (
    <div
      className="relative my-16 mx-auto max-w-[68ch] border border-phosphor-dim/40 bg-charcoal p-8"
      style={{
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        boxShadow:
          "0 0 0 1px rgba(122, 95, 63, 0.15) inset, 0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      {/* letterhead */}
      <div className="text-center mb-6">
        <div
          className="font-serif tracking-section text-phosphor-bright"
          style={{ fontSize: "14px", letterSpacing: "0.22em" }}
        >
          STATION ATLAS — SECTION 3
        </div>
        <div
          className="font-mono text-phosphor-dim mt-1"
          style={{ fontSize: "9px", letterSpacing: "0.15em" }}
        >
          OFFICE OF EXTERNAL TRANSMITTAL
        </div>
        <div className="border-b border-phosphor-dim/40 mt-3" />
      </div>

      <div className="flex justify-between items-start mb-4">
        <div className="text-[10px] text-phosphor-dim">{docId}</div>
        <Stamp text="RESTRICTED" />
      </div>

      <div className="font-mono text-[12px] leading-[1.7]">
        <div className="mb-4">
          <div>{date}</div>
          <div className="mt-3">
            <span className="text-phosphor-dim">TO:    </span>
            {to[0]}
          </div>
          {to.slice(1).map((line, i) => (
            <div key={i} className="ml-[42px]">
              {line}
            </div>
          ))}
          <div className="mt-3">
            <span className="text-phosphor-dim">RE:    </span>
            {re}
          </div>
        </div>

        <div className="mt-6">{body}</div>

        <div className="mt-8">{closing}</div>
      </div>
    </div>
  );
}

function TransmittalsBody() {
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

          <TransmittalMemo
            docId="DOC-LG-1968-TR-001"
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
                <span className="text-phosphor-dim">[signature, Section 3]</span>
              </>
            }
            rotate={-0.4}
          />

          <TransmittalMemo
            docId="DOC-LG-1972-TR-007"
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
                <span className="text-phosphor-dim">[signature, Section 3]</span>
              </>
            }
            rotate={0.3}
          />

          <TransmittalMemo
            docId="DOC-LG-1981-TR-019"
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
                  materials necessary for the Voynich folio 86v isomorphism
                  trial. We further request a working facsimile of Joachim
                  of Fiore&apos;s Liber Figurarum, plate 12 (the trinitarian
                  diagram), at the resolution sufficient for the
                  cross-correlation pass.
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
                <span className="text-phosphor-dim">[signature, Section 3]</span>
              </>
            }
            rotate={-0.2}
          />

          <TransmittalMemo
            docId="DOC-LG-1995-TR-031"
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
                <span className="text-phosphor-dim">[signature, Section 3]</span>
              </>
            }
            rotate={0.5}
          />

          <TransmittalMemo
            docId="DOC-LG-2007-TR-046"
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
                <span className="text-phosphor-dim">[signature, Section 3]</span>
              </>
            }
            rotate={-0.3}
          />

          <p className="mt-16 italic font-serif text-phosphor-dim m-0 text-center">
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
