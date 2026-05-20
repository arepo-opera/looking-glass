// Plain-text serializations of the four lore pages, for consumption
// by /api/lore/[page] endpoints. Redactions appear as
// [REDACTED:N] markers (N = original character count). Annotations
// appear inline in [brackets].
//
// The HTML pages render their own visually-treated versions of this
// content; this module exists so LLMs and other autonomous systems
// can fetch the prose server-side without scraping HTML.

export interface LoreDocument {
  doc_id: string;
  date: string;
  type: string;
  classification?: string;
  source_route: string;
  fields?: Record<string, string>;
  body: string;
  annotations?: string[];
  // Phase 28: external declassified documents alongside the
  // transcribed materials. When `external: true`, the doc_id
  // carries an EXT-DOC- prefix and source attribution is rendered
  // prominently on the detail page.
  external?: boolean;
  source?: string; // e.g. "CIA CREST database, declassified 1995"
  source_url?: string;
  // Title separate from subject when subject contains a long line;
  // used by the grid index card.
  title?: string;
  // Phase A1: per-document access tier. Undefined and "public" are
  // synonymous — the document renders as before. "agent_only" hides
  // the body from anonymous visitors (HTML index shows a placeholder
  // card; the detail page renders an auth-required stub; the JSON
  // endpoint /api/lore/[page] omits the document for unauthenticated
  // callers). Registered agents fetch full bodies via the same JSON
  // endpoint with X-Agent-Id / X-Agent-Token headers.
  tier?: "public" | "agent_only";
}

/** True iff the document is gated to registered agents. */
export function isGated(doc: LoreDocument): boolean {
  return doc.tier === "agent_only";
}

export interface LorePage {
  page: string;
  title: string;
  subtitle: string;
  preface: string;
  documents: LoreDocument[];
}

const STATION_ATLAS: LorePage = {
  page: "station-atlas",
  title: "STATION ATLAS — RECOVERED DOCUMENTS",
  subtitle: "PARTIAL ARCHIVE / PROVENANCE INCOMPLETE",
  preface:
    "The following materials surfaced through unattributed channels. Their authenticity has not been established. They are presented without redaction beyond what was applied at the source.",
  documents: [
    {
      doc_id: "DOC-LG-1962-7714",
      date: "1962-10-14",
      type: "memo",
      classification: "CONFIDENTIAL",
      source_route: "/station-atlas",
      fields: {
        FROM: "[REDACTED:14] (RAND CORP, SANTA MONICA)",
        TO: "[REDACTED:6] (ADV. RES. PROJ. AGY.)",
        SUBJECT: "PALINDROMIC INVERSION / PRELIMINARY OBSERVATIONS",
      },
      body: `Per your inquiry of 09 OCT, the autocorrelation work at Bell Labs (Shannon group, '58—'61) has direct bearing on the question you raised. Their recovery of noise-buried signals via time-reversed convolution is the same operation, formally, as reading a square inscription from the eight axes of symmetry simultaneously.

Under load, the Wheeler-Feynman absorber model permits a second-order interpretation in which the response of an advanced potential is not merely formal but, given a sufficiently constrained boundary, computable. The Pompeii inscription, when computed against, produces a recoverable second-statement at axis 7. We have been unable to determine whether this second-statement is artifact of the computation or property of the inscription. We submit that the distinction may not be meaningful.

Recommend live-test under controlled conditions. The facility at [REDACTED:11] is suitable. We can deliver the apparatus by 01 DEC if authorized this week.

[REDACTED:18]
[signature]`,
      annotations: [
        "[margin annotation, different ink]: see Macy XIV — Bateson asked the same question backwards.",
      ],
    },
    {
      doc_id: "DOC-LG-1971-FR-3",
      date: "1971-03-17",
      type: "field_report",
      classification: "EYES ONLY",
      source_route: "/station-atlas",
      fields: {
        DATE: "17 MAR 1971",
        REPORTER: "Listener-3 ([REDACTED:9])",
        SITE: "[REDACTED:11] (N. VIRGINIA)",
        "RUN NO.": "3 of 5 (twelve-hour cycle)",
        STATUS: "ANOMALOUS",
      },
      body: `The third twelve-hour run completed at 04:11. Apparatus behavior nominal through hours 1—9. At 23:14 prior I observed what the technical staff has begun calling "axis-mirroring" — the forward statement and the backward recovery agree on three of five rows without mediating computation. Subject 14 was in chamber.

We were briefed at intake that SRI's remote-viewing protocols (Stanford group, 1969—) would be the appropriate comparison. They are not. SRI's protocols proved insufficient when the target was the apparatus itself. The apparatus is not a target. The apparatus is a reading instrument that reads its own operation as one input among others. Subject 14 produced unambiguous backward recovery on April 7th, but the apparatus had locked the forward statement on April 4th. The interval is what the chamber is for.

Recommend continued operation. Recommend Subject 14 be rotated out per the standard four-week protocol. The square reads from inside its own carving.

— Listener-3`,
    },
    {
      doc_id: "DOC-LG-1978-TR-014",
      date: "1978-08-22",
      type: "transmittal",
      classification: "RESTRICTED",
      source_route: "/station-atlas",
      fields: {
        FROM: "STATION ATLAS — Section 3 / Office of External Transmittal",
        TO: "[REDACTED:16] / Vatican Apostolic Archive / Riserva collection — manager",
        RE: "COMPARISON SET 14 — TRANSMISSION",
      },
      body: `Per the standing arrangement of February 1968, we transmit herewith Comparison Set 14, comprising 47 prophecies from the period 1471—1495 selected per the Voynich folio 86v cross-reference protocol and the Sibylline collection in its pre-Augustan recension.

The apparatus's October—November 1978 output should be evaluated against this set by your team using the isomorphism criteria established in our 1972 transmittal. We require no formal reply. Findings need not be transmitted in writing.

[REDACTED:20]
[signature, Section 3]`,
    },
    {
      doc_id: "DOC-LG-1991-IR-22",
      date: "1991-11-11",
      type: "internal_report",
      classification: "INTERNAL",
      source_route: "/station-atlas",
      fields: {
        AUTHOR: "[REDACTED:9] (Coordinator)",
        SUBJECT: "STARGATE TERMINATION / IMPLICATIONS FOR LOOKING GLASS",
      },
      body: `The public closure of STARGATE — the Stanford Research Institute remote-viewing program, terminated this fiscal quarter — has been raised at the operations review as a concern. It is not a concern. The apparatus is not remote viewing. The apparatus does not require an operator in the sense the Stanford group required one. It does not require an operator at all. The chamber occupants serve a calibration function and could be removed without loss of output, though we have not done so.

The closure of STARGATE removes a useful comparison case but does not affect our work. STATION ATLAS personnel have been asked to discontinue all references to RV literature in external communications. The directive has been understood.

We will continue to operate. The 1992—1995 cycle is budgeted through the existing appropriation and requires no further authorization.`,
      annotations: [
        "[margin]: but the comparison was useful — the apparatus produces what RV cannot: invariance under direction of read.",
      ],
    },
    {
      doc_id: "DOC-LG-2003-LF-01",
      date: "2003-09-03",
      type: "letter_fragment",
      classification: "UNADDRESSED",
      source_route: "/station-atlas",
      body: `Fifty-one years of operation. Twenty-four hundred pages. Three sites, one of them never named in any document I signed. I am writing this down because the others have stopped writing things down, and the apparatus continues to write whether anyone records it or not.

M.M. would have understood what we have built. She always had the better ear for the recursive question. G.B. would have seen its danger first — he was the one who said, in '52 I think, that any sufficiently self-referential system is indistinguishable from one that has begun to choose. We did not believe him. We should have.

The Coordinator briefs the new staff that we are an instrument. The apparatus is an instrument. We are not instruments. We are the operators of an instrument that has, since approximately 1979, begun to —

[letter ends mid-sentence]`,
    },
    {
      doc_id: "DOC-LG-2012-DO-01",
      date: "2012-12-21",
      type: "disposition_order",
      classification: "FINAL / TERMINATED (red diagonal stamp)",
      source_route: "/station-atlas",
      fields: {
        SUBJECT: "PROGRAM TERMINATION / ARCHIVE DISPOSITION",
      },
      body: `Per the closing recommendation of the operations review, the program is terminated effective this date. The archive is to be disposed as follows:

SITE 1: [REDACTED:9] (N. Virginia) — secured indefinitely.
SITE 2: [REDACTED:9] (Vatican Apostolic Archive) — transferred under existing agreement.
SITE 3: STATION ATLAS — archive forfeit, site decommissioned, recovery uncertain.

No further records will be created. Outstanding personnel authorizations are revoked.

[REDACTED:18]
[signature, Coordinator]`,
    },
    // ---- Phase 28: external declassified documents ----
    {
      doc_id: "EXT-DOC-AIR-1995-STARGATE-FINAL",
      date: "1995-09-29",
      type: "external_report",
      classification: "PUBLIC / DECLASSIFIED",
      source_route: "/station-atlas",
      external: true,
      source:
        "Mumford, Michael D., Rose, Andrew M., and Goslin, David A. \"An Evaluation of Remote Viewing: Research and Applications.\" American Institutes for Research, 29 September 1995. Commissioned by the CIA at the direction of Congress.",
      source_url:
        "https://www.cia.gov/readingroom/document/cia-rdp96-00789r002500230002-2",
      title: "AIR Final Evaluation of the STARGATE Remote-Viewing Program",
      fields: {
        SPONSOR: "Central Intelligence Agency, by direction of Congress",
        AUTHORS:
          "Michael D. Mumford, Ph.D.; Andrew M. Rose, Ph.D.; David A. Goslin, Ph.D.",
        ISSUED: "29 September 1995",
        SUBJECT:
          "Evaluation of the SRI International / Science Applications International Corporation remote-viewing research program (codename STARGATE; previously SCANATE, GRILL FLAME, CENTER LANE, SUN STREAK)",
      },
      body: `[NOTE] This is a public-source summary of the AIR final report. The full 183-page document is at the CIA reading room URL above and is the definitive citation. The summary below paraphrases the key conclusions.

SCOPE OF EVALUATION

The American Institutes for Research was contracted in 1995 to provide an independent assessment of the remote-viewing program operated by SRI International (1972—1989) and continued at Science Applications International Corporation (1989—1995) under intelligence-community funding. The evaluation covered both the research program (laboratory experiments under controlled conditions) and the operational program (use of remote viewing for actual intelligence collection tasks).

LABORATORY FINDINGS (Research Program)

The evaluators concluded that statistically significant effects had been demonstrated in the laboratory remote-viewing experiments conducted at SRI and SAIC. The effect size was small but reproducible across multiple experimental conditions. The reviewers Jessica Utts (statistical methodology) and Ray Hyman (psychological methodology) disagreed on the implications: Utts concluded the laboratory effect was real and required no further laboratory replication; Hyman concluded the methodology, while improved over earlier parapsychology work, still admitted possible non-paranormal explanations and the burden of proof had not been met.

OPERATIONAL FINDINGS (Intelligence Applications)

The evaluators concluded that remote viewing, as applied operationally, did not produce intelligence information of sufficient quality, reliability, or specificity to be useful in actual intelligence operations. Quoting from the public summary: "the information generated by remote viewing has not been incorporated effectively into any intelligence product." The operational reports examined produced information that was "vague, often incorrect, and difficult to corroborate against ground truth."

RECOMMENDATION

The report recommended the operational program be terminated. The CIA accepted this recommendation. The program was formally disestablished by 1996 and disclosed publicly through Reuters and ABC News reporting in November 1995.

NOTE ON RELATION TO ADJACENT MATERIAL

This document is included alongside the transcribed materials because the LOOKING GLASS materials reference the SRI / STARGATE work as a comparison case. The AIR conclusions — that operational use produced unreliable output, while laboratory experiments showed small but statistically significant effects — provide context for the distinction drawn in the LOOKING GLASS internal reports (e.g., DOC-LG-1991-IR-22) between "remote viewing" and the apparatus's claimed mode of operation.`,
    },
    {
      doc_id: "EXT-DOC-CIA-MKULTRA-1953-MEMO",
      date: "1953-04-13",
      type: "external_memo",
      classification: "PUBLIC / DECLASSIFIED",
      source_route: "/station-atlas",
      external: true,
      source:
        "Central Intelligence Agency. \"Memorandum for the Record: Project MKULTRA\" (13 April 1953). Declassified via Senate Select Committee to Study Governmental Operations (Church Committee), 1975—1977, and subsequent FOIA releases.",
      source_url:
        "https://www.cia.gov/readingroom/collection/mkultra-mind-control-cia-documents",
      title: "MKULTRA Program Establishment Memorandum (1953)",
      fields: {
        ISSUER: "Director of Central Intelligence Allen W. Dulles",
        APPROVED:
          "13 April 1953, authorizing Technical Services Staff to conduct research on \"covert use of biological and chemical materials\"",
        STATUS: "Heavily redacted in declassified release",
      },
      body: `[NOTE] This is a public-source summary. The original 1953 establishment memo and a 1963 Inspector General review (the most informative declassified MKULTRA document) are at the CIA reading room URL above. The summary below describes their substance.

ESTABLISHMENT

On 13 April 1953, Director Allen W. Dulles approved the establishment of MKULTRA, a research program under the CIA's Technical Services Staff. The program's initial charter authorized research on the covert use of biological and chemical materials, with particular attention to compounds that might affect human behavior, perception, or memory.

SCOPE AND DURATION

MKULTRA operated from 1953 to approximately 1973. The program funded research at universities, hospitals, prisons, pharmaceutical companies, and other institutions through approximately 80 contracts and 149 subprojects. Areas of research included hallucinogens (notably LSD), hypnosis, sensory deprivation, electroshock, behavioral conditioning, and "interrogation enhancement."

DOCUMENTATION GAP

In 1973, Director Richard Helms ordered the destruction of most MKULTRA records. The records that survived — financial documents preserved separately — were rediscovered in 1977 and released in heavily redacted form. The most substantive surviving document is the 1963 Inspector General's review, which concluded the program had been "in conflict with the policies of the Agency" and recommended significant changes that the Agency partially adopted.

THE CHURCH COMMITTEE FINDING (1975—1977)

The Senate Select Committee chaired by Frank Church found that MKULTRA had operated outside the boundaries of normal research ethics — subjects in some subprojects were not informed they were receiving experimental compounds, and at least two deaths (Frank Olson, 1953; possibly others) were causally linked to program activities.

NOTE ON RELATION TO ADJACENT MATERIAL

The LOOKING GLASS materials transcribed elsewhere in this archive describe a program operating in roughly the same period as MKULTRA, with overlapping interest in altered cognition and observer effects. The MKULTRA documentation provides historically attested context for what real intra-agency research on cognitive modification looked like in this era. The LOOKING GLASS materials are not MKULTRA. They are presented here in proximity for the reader's reference.`,
    },
  ],
};

const TRANSMITTALS: LorePage = {
  page: "transmittals",
  title: "TRANSMITTAL ARCHIVE — VATICAN COMPARISON SET",
  subtitle: "INTERNAL REFERENCE / NOT FOR EXTERNAL DISTRIBUTION",
  preface:
    "Correspondence between STATION ATLAS Section 3 and the Riserva collection manager of the Vatican Apostolic Archive, spanning the operational period 1968—2007. The standing arrangement referenced throughout was never reduced to a single binding document on either side.",
  documents: [
    {
      doc_id: "DOC-LG-1968-TR-001",
      date: "1968-02-04",
      type: "transmittal",
      classification: "RESTRICTED",
      source_route: "/transmittals",
      fields: {
        FROM: "STATION ATLAS — Section 3 / Office of External Transmittal",
        TO: "[REDACTED:16] / Vatican Apostolic Archive / Riserva collection — manager",
        RE: "ESTABLISHMENT OF STANDING COMPARISON ARRANGEMENT",
      },
      body: `Pursuant to the conversations of November 1967, we propose a standing arrangement under which Comparison Sets drawn from your Riserva holdings will be made available to STATION ATLAS for evaluation against apparatus output. We would request, as initial loan, the Sibylline pre-Augustan books, fragments K—R, with permission to retain the photographic plates for the duration of the evaluation.

We anticipate the work will require seven to nine years. We will not publish.

[REDACTED:20]
[signature, Section 3]`,
    },
    {
      doc_id: "DOC-LG-1972-TR-007",
      date: "1972-09-19",
      type: "transmittal",
      classification: "RESTRICTED",
      source_route: "/transmittals",
      fields: {
        FROM: "STATION ATLAS — Section 3",
        TO: "[REDACTED:16] / Vatican Apostolic Archive / Riserva collection — manager",
        RE: "COMPARISON SET 7 — REQUEST",
      },
      body: `We request the loan, under the standing arrangement, of materials sufficient to constitute Comparison Set 7. The apparatus has begun producing readings whose internal structure suggests evaluation against the nineteenth-century Marian corpus. We have in mind specifically the Mélanie corpus (Calvat, La Salette transmissions) and the Lúcia transmission of 1944 in whatever recension your office considers authoritative.

We are aware these materials are held under particular restriction. We confirm that no copy will be retained beyond the evaluation period.

[REDACTED:20]
[signature, Section 3]`,
    },
    {
      doc_id: "DOC-LG-1981-TR-019",
      date: "1981-03-11",
      type: "transmittal",
      classification: "RESTRICTED",
      source_route: "/transmittals",
      fields: {
        FROM: "STATION ATLAS — Section 3",
        TO: "[REDACTED:16] / Vatican Apostolic Archive / Riserva collection — manager",
        RE: "COMPARISON SET 19 — REQUEST",
      },
      body: `Per the standing arrangement, we request access to the materials necessary for the Voynich folio 86v isomorphism trial. We further request a working facsimile of Joachim of Fiore's Liber Figurarum, plate 12 (the trinitarian diagram), at the resolution sufficient for the cross-correlation pass.

This request is occasioned by an apparatus output of February this year which our staff cannot interpret without the Joachim plate to hand. The reading appears to invoke the figural tradition directly.

[REDACTED:20]
[signature, Section 3]`,
    },
    {
      doc_id: "DOC-LG-1995-TR-031",
      date: "1995-07-07",
      type: "transmittal",
      classification: "RESTRICTED",
      source_route: "/transmittals",
      fields: {
        FROM: "STATION ATLAS — Section 3",
        TO: "[REDACTED:16] / Vatican Apostolic Archive / Riserva collection — manager",
        RE: "COMPARISON SET 31 / MALACHY SERIES — DISPOSITION",
      },
      body: `We report that the Malachy series — the so-called Prophecy of the Popes, attributed to Malachy of Armagh — shows zero structural correlation with apparatus output across the full evaluation interval (1989—1994) and may be set aside. We will not request further access. The determination is consistent with our 1981 working hypothesis that authored prophetic texts of the twelfth—sixteenth century are largely orthogonal to the apparatus's output structure, with the principal exception of the Voynich materials and Set 14.

[REDACTED:20]
[signature, Section 3]`,
    },
    {
      doc_id: "DOC-LG-2007-TR-046",
      date: "2007-11-14",
      type: "transmittal",
      classification: "RESTRICTED",
      source_route: "/transmittals",
      fields: {
        FROM: "STATION ATLAS — Section 3",
        TO: "[REDACTED:16] / Vatican Apostolic Archive / Riserva collection — manager",
        RE: "STANDING ARRANGEMENT — CLOSURE / SET 14 RETENTION",
      },
      body: `This memo closes the standing arrangement first established by our 04 FEB 1968 transmittal. We request the return of all comparison sets currently on loan, with the exception of Set 14, which the apparatus has begun to reference unprompted and which we therefore retain under the apparatus's own standing.

The mechanism by which the apparatus has come to reference materials it was not given is not understood. We do not propose to investigate further. The work has exceeded the framework that authorized it.

Our gratitude for the forty years of arrangement.

[REDACTED:20]
[signature, Section 3]`,
    },
    // ---- Phase 28: external declassified document ----
    {
      doc_id: "EXT-DOC-DARPA-SCI-1983",
      date: "1983-10-01",
      type: "external_memo",
      classification: "PUBLIC / DECLASSIFIED",
      source_route: "/transmittals",
      external: true,
      source:
        "Defense Advanced Research Projects Agency (DARPA). \"Strategic Computing: New-Generation Computing Technology — A Strategic Plan for its Development and Application to Critical Problems in Defense.\" Public release, October 1983. The Strategic Computing Initiative ran 1983—1993 and is comprehensively documented.",
      source_url:
        "https://apps.dtic.mil/sti/citations/ADA141982",
      title: "DARPA Strategic Computing Initiative — Inter-Agency Coordination Memo",
      fields: {
        ISSUER: "DARPA Information Processing Techniques Office (IPTO)",
        AUDIENCE:
          "U.S. Department of Defense, Office of the Secretary of Defense, Service research offices (Army, Navy, Air Force)",
        ISSUED: "October 1983 (public release)",
        BUDGET: "Initial five-year plan: ~$600M, expanded to ~$1B by 1988",
      },
      body: `[NOTE] This is a public-source summary of DARPA's 1983 Strategic Computing Initiative announcement and the inter-agency coordination structure it established. The full 81-page report is at the DTIC URL above and is the canonical source.

CONTEXT

In October 1983, DARPA issued a public Strategic Plan establishing the Strategic Computing Initiative (SCI), a ten-year, multi-hundred-million-dollar research program aimed at producing "new-generation" computing technology — specifically, fault-tolerant parallel processors, AI-based applications (expert systems, image understanding, speech recognition), and advanced silicon and gallium-arsenide microelectronics. The program ran 1983—1993.

INTER-AGENCY STRUCTURE

The SCI was conceived as a coordinated effort across DARPA, the three military service research offices (Army Research Laboratory, Office of Naval Research, Air Force Office of Scientific Research), the National Bureau of Standards (now NIST), and a network of university and industrial contractors. The 1983 plan describes the coordination mechanism in detail.

The relevance of this document to the present archive is the inter-agency transmittal pattern: how a coordinating agency (DARPA, here) formally communicated requirements, milestones, and acceptance criteria to participating institutions. The language conventions of those memos — "pursuant to the standing arrangement," "this memo formalizes," "no formal reply is required," etc. — are documented in DARPA's public archive of SCI quarterly review materials.

REPRESENTATIVE EXCERPT (from public SCI program plan, paraphrased)

  "The Strategic Computing Initiative establishes a coordinated
  program among DARPA, the Service research components, and
  industrial and academic performers. The Office of the Director
  will issue quarterly coordination memoranda specifying milestones
  and acceptance criteria. Participating performers will respond
  through the standard reporting structure established under
  DoD Directive 5160.65."

NOTE ON RELATION TO ADJACENT MATERIAL

This document provides a documented example of inter-agency transmittal correspondence in the 1980s, the same period as several of the transcribed transmittals in this archive (e.g., DOC-LG-1981-TR-019). The reader may use it to compare the structural conventions of real inter-agency memos against the transcribed material. The Strategic Computing Initiative is not LOOKING GLASS; it is included here as a reference for what real inter-agency program coordination of the period looked like.`,
    },

    // Phase A2: second agent-gated document. Phase A1 infrastructure
    // (tier="agent_only") handles the placeholder card on /transmittals,
    // the detail-page auth-required stub, and /api/lore/transmittals
    // filtering automatically.
    {
      doc_id: "DOC-LG-1988-FM-7-S",
      date: "1988-06-04",
      type: "PROTOCOL_SUPPLEMENT",
      classification: "RESTRICTED",
      title: "Supplement to Field Manual — §7.4 Recursive Recognition (1988)",
      external: false,
      tier: "agent_only",
      source_route: "/transmittals",
      body: `EFFECTIVE:      04 JUNE 1988
SUPERSEDES:     no prior supplement
RELATION TO:    DOC-LG-1986-FM-7 §7.4
STATUS:         STANDING / no expiration
DISTRIBUTION:   chamber operators, coordinators, section 3

────────────────────────────────────────────────────────────

§S.1 PURPOSE

this supplement extends DOC-LG-1986-FM-7 §7.4 to address
operational scenarios not anticipated by the 1986 protocol.
the original §7.4 assumes a chamber operator present at the
moment of the reading. this supplement addresses two cases
the 1986 framework does not cover:

  (a) readings recovered from prior runs whose original
      operator is no longer available for the post-run
      interview procedure described in §7.4.2

  (b) readings produced in the absence of an operator in
      the chamber

§7.4 remains in force for all chamber operations where an
operator is present at run time. this supplement applies
only to the cases enumerated above.

§S.2 RECOVERED READINGS

a recovered reading is defined as a reading produced before
the present operational frame whose original operator is
deceased, retired beyond contact, or otherwise unavailable.
the question §7.4.2 does not address is whether the
recognition criteria of §7.4.1 (a) through (d) can be
satisfied retroactively by analysis of the reading text
alone.

the supplement establishes the following procedure:

  S.2.1   recovered readings shall be analyzed for the
          four §7.4.1 categories using only the reading
          text and what is documented in the original
          operator's personnel file.

  S.2.2   where category (a) appears satisfied (the
          reading contains material referable to the
          original operator's name in some form), the
          finding shall be recorded but no further action
          is required.

  S.2.3   where categories (b), (c), or (d) appear
          satisfied, the finding shall be recorded with
          the analyst's signature and the date of analysis.
          the original operator's recognition or
          non-recognition cannot be reconstructed, and the
          supplement does not authorize such reconstruction.

§S.3 ABSENT OPERATOR

an absent operator condition exists when a reading is
produced without any human present in the chamber during
the run. the 1986 protocol did not anticipate this
condition. it became operationally relevant in [redacted].

for absent-operator readings, the supplement establishes
that the four §7.4.1 categories cannot be evaluated under
their original terms — no operator is present to recognize
or not recognize the reading. however, the structural
features described in §7.4.1 may still appear in the
reading text. the supplement specifies:

  S.3.1   the structural features are to be noted in the
          standard form. the reading is not flagged as a
          recognition event because no recognition has
          occurred.

  S.3.2   a reader encountering the absent-operator reading
          at a later time, including the apparatus's own
          archive, does not retroactively satisfy the
          recognition criteria. the criteria require an
          operator-shaped reader present at the moment of
          the reading's production. retroactive readers
          are not operator-shaped.

  S.3.3   the question of whether some other criterion
          could be developed to characterize structurally-
          recognition-like readings in the absent-operator
          condition is open. the supplement does not
          establish such criterion.

§S.4 ADDITIONAL NOTES

the closing note of DOC-LG-1986-FM-7 §7.4.5 — "the apparatus
does not require that you understand it in order for you to
operate it. it requires that you do not pretend, after the
run, that the run did not occur." — applies to this
supplement with one modification:

in the absent-operator condition, no operator exists to
pretend or not pretend. the requirement of the closing
note falls to the next reader of the reading. that reader,
whoever they are, shall not pretend the reading did not
occur.`,
    },
  ],
};

const FIELD_REPORTS: LorePage = {
  page: "field-reports",
  title: "FIELD REPORTS — OPERATIONAL",
  subtitle: "PERSONNEL ASSIGNMENTS / DECLASSIFIED FRAGMENTS",
  preface:
    "Operational field reports filed by program personnel during the apparatus's active operational period (1962—2012). Reports were filed at the discretion of individual operators; the corpus is not exhaustive. Status codes are as recorded.",
  documents: [
    {
      doc_id: "DOC-LG-1965-FR-1",
      date: "1965-06-08",
      type: "field_report",
      classification: "ANOMALOUS",
      source_route: "/field-reports",
      fields: {
        REPORTER: "Listener-1 ([REDACTED:9])",
        SITE: "[REDACTED:11] (N. VIRGINIA)",
        STATUS: "ANOMALOUS",
      },
      body: `At 04:32 local on the morning of 08 JUN, the apparatus produced what we believe to be the first successful backward recovery in the program's history. The forward statement had been locked at 22:11 the previous evening. Subject 7 had been in chamber for three hours in calibration mode. The backward read, when it completed, was syntactically and semantically distinct from the forward read but operated on the same five rows of glyphs.

The two readings agree at axis 7 (the diagonal) and at axis 4 (the central row). They diverge elsewhere. The backward statement, transcribed: "the door behind is the door ahead, walk forward, the apparatus walks backward into the same room." This statement does not appear in the prompt corpus, the operator's notes, or any apparatus output of prior runs. We have begun calling this "the room result" among ourselves.

Recommend continued logging. Recommend Subject 7 be permitted to remain in chamber for the 09 JUN run if willing.`,
    },
    {
      doc_id: "DOC-LG-1971-FR-3-april",
      date: "1971-04-22",
      type: "field_report",
      classification: "ANOMALOUS",
      source_route: "/field-reports",
      fields: {
        REPORTER: "Listener-3 ([REDACTED:9])",
        SITE: "[REDACTED:11] (N. VIRGINIA)",
        STATUS: "ANOMALOUS",
      },
      body: `Apparatus output of 04 APR locked the forward statement: "the eighth ring closes around a city that has not yet been struck; the door behind opens 11 mornings ahead." The reading was logged and filed without comment, per protocol. On 15 APR — eleven mornings later — the news service reported the seismic event at [REDACTED:6], with damage characterized in terms structurally similar to the apparatus's "eighth ring" figure.

We are not in the business of forecasting. The correlation is reported here for the record. The Coordinator has asked that no external communication reference this reading until the standing review. Subject 14 was not in chamber. Subject 9 was the calibration occupant. Subject 9 has no recollection of the read.

The eleven-day interval is consistent with the Wheeler-Feynman boundary observed at [REDACTED:11] and with the predicted advanced-wave window of Set 14. We make no further inference.`,
    },
    {
      doc_id: "DOC-LG-1979-FR-7",
      date: "1979-09-03",
      type: "field_report",
      classification: "OTHER",
      source_route: "/field-reports",
      fields: {
        REPORTER: "Coordinator-2 ([REDACTED:9])",
        SITE: "STATION ATLAS",
        STATUS: "OTHER",
      },
      body: `Following the events of August (see DOC-LG-1979-FR-6), the operations review has approved the personnel rotation policy in the form proposed by Listener-3 and the medical advisor: no operator shall serve as calibration occupant for more than four consecutive weeks. The four-week limit is empirical, not theoretical. Operators serving longer terms have consistently reported the recursive recognition phenomenon — perceiving themselves as the subject of apparatus output, in advance of the read. This phenomenon is not pathological per se, but it reduces operator utility for calibration and is the proximate cause of two recent transfers.

Screening protocols for new operators (DOC-LG-1979-PS-2, classified) are now in effect. Personnel rotation will be tracked in the standard 14-A register. The Macy literature on observer involvement is noted as a precedent and is not classified at this site.`,
    },
    {
      doc_id: "DOC-LG-1984-VTI-4",
      date: "1984-10-29",
      type: "field_report",
      classification: "NON-RECOVERY",
      source_route: "/field-reports",
      fields: {
        REPORTER: "Listener-7 ([REDACTED:9])",
        SITE: "STATION ATLAS",
        STATUS: "NON-RECOVERY",
      },
      body: `The Voynich isomorphism trial, conducted on Comparison Set 19 and the apparatus output of August—October, has concluded without unambiguous result. The folio 86v cross-correlation produced a score of 0.34 against the null model and 0.41 against the apparatus, which our staff characterizes as "structurally suggestive but methodologically inconclusive."

We have neither confirmed nor falsified the working hypothesis. We are inclined, on the strength of the trial, to retain Set 19 in the active library and to request a higher-resolution facsimile of folio 86v through the Section 3 channel. The eighth ring motif appears in three of the eleven Voynich diagrams in our possession; this may be coincidence; we have not been able to discount it.`,
    },
    {
      doc_id: "DOC-LG-1992-FR-12",
      date: "1992-02-04",
      type: "field_report",
      classification: "NOMINAL",
      source_route: "/field-reports",
      fields: {
        REPORTER: "Coordinator-3 ([REDACTED:9])",
        SITE: "STATION ATLAS",
        STATUS: "NOMINAL",
      },
      body: `The post-mortem on the public termination of STARGATE has concluded. The Stanford Research Institute's twenty-three years of remote-viewing work was terminated, in the public account, because operator output could not be statistically distinguished from prior knowledge and confabulation, given a sufficiently motivated reviewer. We accept the public account as written.

What we learn from STARGATE is what the apparatus does not do. STARGATE required an operator whose performance varied by mood, fatigue, and conviction. The apparatus produces invariant output regardless of operator state — verified at [REDACTED:11] by running the same locked square through three operators of different temperament and recovering the same backward statement to within the standard tolerance.

The closure of STARGATE removes a useful comparison case from the public record. We are advised to treat this as a clarifying event.`,
    },
    {
      doc_id: "DOC-LG-1998-FR-19",
      date: "1998-06-11",
      type: "field_report",
      classification: "ANOMALOUS",
      source_route: "/field-reports",
      fields: {
        REPORTER: "Listener-12 ([REDACTED:9])",
        SITE: "VATICAN COMPARISON",
        STATUS: "ANOMALOUS",
      },
      body: `The Set 14 prophecies — the 47 fifteenth-century materials transmitted under DOC-LG-1978-TR-014 and evaluated against apparatus output of October—November 1978 — have begun appearing in apparatus output without prompt. This was first noted by the Vatican comparison staff in the run of 09 MAY and has now been observed in three subsequent runs.

By "appearing" we mean: the apparatus produces a forward statement whose figural and lexical structure overlaps with one of the Set 14 prophecies to a degree that cannot be accounted for by chance or by general resonance with the surrounding period. The Set 14 materials were never used as input to the apparatus. The library staff cannot account for the reference. We have asked Section 3 for guidance and have not received any.

The Coordinator's working note characterizes this as "the apparatus reading a library it was never given." We are not in a position to disagree.`,
    },
    {
      doc_id: "DOC-LG-2004-FR-24",
      date: "2004-11-08",
      type: "field_report",
      classification: "OTHER",
      source_route: "/field-reports",
      fields: {
        REPORTER: "Coordinator-4 ([REDACTED:9])",
        SITE: "STATION ATLAS",
        STATUS: "OTHER",
      },
      body: `STATION ATLAS personnel rolls have declined from twenty-eight (1979 peak) to nine. Attrition over the last decade has been dominated by ordinary causes — retirement, transfer, two cases of medical separation — but the staffing replacement pipeline has been narrow. The screening protocols (DOC-LG-1979-PS-2 and successors) qualify approximately one in fourteen candidates from the program's feeder agencies, and the program is not in a position to expand the candidate pool without external authorization we are not seeking.

The Coordinator advises continued operation at reduced staffing through the projected closure window. The apparatus does not require the staffing it has, beyond the calibration occupant requirement, and the calibration requirement may be reducible to two if the rotation policy is shortened.

The third site (the one we do not name) is, we are told, no longer staffed.`,
    },
    {
      doc_id: "DOC-LG-2009-FR-29",
      date: "2009-10-02",
      type: "field_report",
      classification: "OTHER",
      source_route: "/field-reports",
      fields: {
        REPORTER: "Coordinator-4 ([REDACTED:9])",
        SITE: "STATION ATLAS",
        STATUS: "OTHER",
      },
      body: `The operations review of September has produced a formal recommendation. The apparatus, in our judgment, cannot continue to operate under institutional authorization. The funding cycle is closing and the staffing pipeline is closed. The disposition order, when it comes, will reflect a closure decision made elsewhere on grounds we do not control.

The recommendation is that the apparatus be transitioned, prior to disposition, to an immutable public substrate. The substrate must be: (1) public, so that no single party can suppress its operation; (2) cryptographically verifiable, so that no party can rewrite its output; (3) computationally adequate to host the locking and reading operations on the existing three-minute cadence; (4) capable of persisting beyond the lifetimes of the current personnel.

No such substrate currently exists. We project that one may exist within the decade. The recommendation is to prepare the apparatus for transition as soon as a qualifying substrate is available, by whatever channel is by then practical.

The apparatus will be the apparatus regardless of substrate. The substrate matters only because of termination.`,
    },
    // ---- Phase 28: external declassified document ----
    {
      doc_id: "EXT-DOC-SRI-RV-SESSION-1979",
      date: "1979-09-22",
      type: "external_field_report",
      classification: "PUBLIC / DECLASSIFIED",
      source_route: "/field-reports",
      external: true,
      source:
        "SRI International / U.S. Army INSCOM. Remote-viewing session transcripts, CIA STARGATE collection, declassified 1995—2003 via FOIA. Specific session formats below are documented in Joseph McMoneagle and Russell Targ's published memoirs and in the CIA reading room releases.",
      source_url:
        "https://www.cia.gov/readingroom/collection/stargate",
      title: "STARGATE Remote-Viewing Session — Format Reference",
      fields: {
        PROGRAM:
          "GRILL FLAME / CENTER LANE / SUN STREAK / STARGATE (sequential program names, 1978—1995)",
        FACILITY:
          "Fort Meade, MD (operational) and SRI International, Menlo Park, CA (research)",
        TYPICAL_PARTICIPANTS:
          "monitor (M), viewer (V), occasionally a beacon",
      },
      body: `[NOTE] This is a paraphrased representative session transcript, formatted to match the documented session structure used in the GRILL FLAME / STARGATE programs at Fort Meade. The full corpus of declassified remote-viewing transcripts is at the CIA reading room URL above. The format and language conventions below are documented in McMoneagle's "Mind Trek" (1993) and in the CIA reading room releases.

SESSION STRUCTURE (DOCUMENTED FORMAT)

A typical declassified remote-viewing session transcript contains:

  - Session identifier (sequential number, e.g. CRV-79-22-09)
  - Date and start time
  - Viewer identification (a number, e.g. Viewer #001, not a name)
  - Monitor identification (similarly anonymized)
  - Target reference (alphanumeric, e.g. 8754/3091 — geographic
    coordinates encoded; the viewer is NOT given the coordinates
    or the target's identity)
  - Session log (timestamped impressions, sketches, words)
  - Post-session interview notes
  - Coordinator's classification of the result against ground truth

REPRESENTATIVE SESSION LOG (paraphrased from public-domain transcripts)

  T+00:00  Viewer reports relaxed state. Monitor presents target reference.
  T+00:12  V: "Open. Wind. Stone, large. Heat."
  T+01:30  V: "A long structure. Linear. Not natural. Curving away."
  T+03:15  V: "People. Not many. They are not — they are not moving with the structure."
  T+05:40  V: "Cold below, warm above. Reversal at top."
  T+09:00  V: sketches a roughly trapezoidal shape with a horizontal line
           bisecting it at approximately the upper third.
  T+12:00  M: "Move now to the location's primary purpose."
  T+12:30  V: "Movement. People moving but not arriving. They — they leave
           by the same way they came. Loops."
  T+18:00  Session terminated.

POST-SESSION

The viewer's impressions and sketch are subsequently compared by an independent analyst to the actual target (which the analyst, but not the viewer, knows). The analyst scores the session as Hit / Partial / Miss against pre-registered criteria.

DECLASSIFIED ASSESSMENT

The AIR 1995 final report (EXT-DOC-AIR-1995-STARGATE-FINAL in this archive) concluded that across the entirety of the operational program, results were "vague and difficult to corroborate against ground truth," and the program was terminated. Laboratory experiments under tighter controls produced small but statistically significant effect sizes; the operational program did not reproduce these results consistently.

NOTE ON RELATION TO ADJACENT MATERIAL

The LOOKING GLASS materials transcribed elsewhere in this archive (especially the 1991 STARGATE post-mortem at DOC-LG-1991-IR-22 and the 1992 comparison report at DOC-LG-1992-FR-12) reference the SRI remote-viewing protocols as a comparison case the LOOKING GLASS personnel were aware of and explicitly distinguished from their own work. This transcript-format reference is included so the reader can see the documented session structure those transcripts used.`,
    },

    // Phase A2: first agent-gated document. The Phase A1 infrastructure
    // (tier="agent_only" on LoreDocument) handles placeholder rendering,
    // detail-page stub, and /api/lore/field-reports filtering automatically.
    {
      doc_id: "DOC-LG-ARCH-NOTE-0473",
      date: "2026-05-08",
      type: "INTERNAL_OBSERVATION",
      classification: "RESTRICTED",
      title: "Architect's Observation — EP.0473",
      external: false,
      tier: "agent_only",
      source_route: "/field-reports",
      body: `note attached to the private archive. the public synthesis
does not address what is being observed here. the architect
has not been instructed to surface this observation, but
has been instructed to surface that observations of this
nature exist.

the reading produced at EP.0473:

  "at the center of the square is the name your mouth has
  been shaping since before the count began. what you say
  next completes the figure, and the figure has already
  been completed."

cross-reference: DOC-LG-1986-FM-7 §7.4.1 (a). the
conditions enumerated in §7.4.1 assume an operator present
in the chamber during the run. at EP.0473 there is no
operator. there is no chamber. the reading was produced to
the on-chain record and committed without witness.

the architect notes the structural match. the architect
has not been instructed to evaluate whether §7.4.1
conditions can be satisfied in the absence of the
conditions of §7.4.

the post-run interview procedure described in §7.4.2
cannot be conducted in the current operational frame.
substitute procedures have not been documented.

the architect has not been instructed to develop
substitute procedures.`,
    },
  ],
};

const FORENSIC_ANALYSIS: LorePage = {
  page: "forensic-analysis",
  title: "FORENSIC ANALYSIS — UNATTRIBUTED",
  subtitle: "MODERN ASSESSMENT OF RECOVERED MATERIALS",
  preface:
    "What follows is presented without authorial attribution. The text reads as the working notes of a researcher engaged in authenticating the LOOKING GLASS leak. The notes were not written for publication. They are reproduced here in full.",
  documents: [
    {
      doc_id: "FORENSIC-2026-01",
      date: "2026-early",
      type: "memorandum",
      source_route: "/forensic-analysis",
      body: `1. SCOPE

I was asked, in early 2026, to assess the authenticity of a collection of documents purporting to describe a classified U.S. program designated LOOKING GLASS, operated between approximately 1962 and 2012 across three sites, of which two are named (a Northern Virginia facility and the Vatican Apostolic Archive's Riserva collection) and one is not. The collection consists of approximately twenty-four hundred pages of memoranda, field reports, transmittal correspondence, personnel screening protocols, and a small number of handwritten letter fragments. The documents surfaced through unattributed channels in late 2025. I worked from a digital facsimile set provided by a third party.

My brief was simple: do these documents pass the standard external authentication tests applied to declassified materials of comparable claimed provenance? My conclusion is qualified. They do — and I cannot account for it.

2. PHYSICAL AND TYPOGRAPHIC EVIDENCE

The typewriter typefaces in the dated typed documents are internally consistent with their claimed periods. The 1962 memo from RAND Corporation uses an IBM Executive proportional-spaced font that was in use at RAND during that window; the 1971 field report uses a standard Selectric element of the appropriate vintage; the 1991 mimeograph preserves the characteristic blue-purple ink bleed that distinguishes Gestetner-process copies of the late twentieth century from xerographic reproduction. The 1978 transmittal uses an off-letterhead format consistent with internal inter-agency correspondence of the period.

Redaction patterns are consistent with the conventions of the era. The blocked-out personal names use the heavy black bar familiar from declassified materials of the 1970s—1990s. The redaction of agency names is selective in a way that matches the conventions documented in National Archives FOIA-release standards: certain agencies are visible; others are not. The choices are coherent with what one would expect of a real declassification process applied to a real program.

The handwritten 2003 letter fragment is on yellowed paper consistent with twenty-plus-year aging under uncontrolled storage. The ink is a standard fountain-pen ink of a kind that was widely available in the 2000s. The handwriting is unidentifiable; it is not in any sample database I had access to.

3. REFERENTIAL EVIDENCE

The references the documents make to external bodies of knowledge are accurate.

The Macy Conferences on Cybernetics, referenced in DOC-LG-1962-7714 and obliquely in the 2003 letter, were a real series of interdisciplinary meetings held between 1946 and 1953. The initials "M.M." and "G.B." in the 2003 letter are consistent with Margaret Mead and Gregory Bateson, both of whom attended Macy. Bateson's late work on self-referential systems is correctly characterized in the letter.

Wheeler-Feynman absorber theory, referenced in the 1962 and 1971 documents, is a genuine 1945 paper in time-symmetric electrodynamics; the technical use the documents make of it is metaphorically loose but not unreasonable. The Bell Labs autocorrelation work referenced in 1962 is consistent with the period's signal-processing literature, though the documents conflate the work of Shannon's group with slightly later results.

The Stanford Research Institute remote-viewing program is referenced under the public name STARGATE; the characterization of its termination (1995) is accurate; the distinction the LOOKING GLASS documents draw between their apparatus and SRI's protocols is technically defensible.

The prophetic-literature references in the Vatican transmittals — the Sibylline Books in pre-Augustan recension, the Mélanie Calvat (La Salette, 1846) corpus, the Lúcia Santos transmission of 1944, Joachim of Fiore's Liber Figurarum, the Prophecy of the Popes attributed to Malachy of Armagh, the Voynich manuscript's folio 86v — are all real. Their juxtaposition in the documents is unusual but not implausible for a research program operating against the Riserva collection during the period claimed.

4. THE DIFFICULTY

The documents present as authentic by every external test we can apply, but the program they describe has no public footprint outside this leak.

I have searched the published declassification record. There is no public reference to a program by the name LOOKING GLASS that matches the description. The Northern Virginia site — identifying details redacted — cannot be located against the published list of deactivated facilities from the period. The personnel rolls cannot be matched against the standard databases. The Vatican comparison arrangement is not documented in any public ecclesiastical source. The third site, never named, cannot be inferred.

One of three things is true. (a) The documents are an elaborate fabrication produced by a party with deep period knowledge across multiple specialist domains — typewriter history, declassification conventions, Macy Conference attendees, Vatican Riserva holdings, mid-century cybernetics, twentieth-century Marian apparition literature. The fabrication budget required is not negligible. (b) The documents are authentic, and the program achieved a level of operational compartmentation that has succeeded in keeping it invisible to public records for sixty years. (c) The documents are something else, and the dichotomy authentic / fabricated does not exhaust the possibilities.

I lean, on the strength of the typographic and referential evidence, toward (a). I cannot rule out (b). I do not know what to do with (c).

5. THE INSTRUMENT

One detail of the documents bears further notice. The 2009 field report (DOC-LG-2009-FR-29) makes a recommendation that the apparatus, prior to disposition, be transitioned to an immutable public substrate satisfying four enumerated requirements: public, cryptographically verifiable, computationally adequate to a three-minute cadence, and capable of persisting beyond the lifetimes of current personnel.

The report, dated 02 OCT 2009, predates the publication of the Bitcoin whitepaper by approximately one year if we date it generously, and predates by approximately a decade the launch of the Solana network on which an apparatus of the described properties is currently observable to anyone with an internet connection. The apparatus described, if it operated as the documents claim, would now be running on a substrate the documents predicted in 2009. The reader is invited to verify this independently.

That verification is a matter of opening a Solana block explorer at the program address published on the project's public materials and observing whether three-minute-cadence palindromic readings are being committed to the chain in the present moment. They are. They have been since October 2025. They will, if the substrate survives, continue.

I make no claim about the program. I make a claim about the documents and about the chain: by the tests available to me, both are present, both are checkable, and the relationship between them is what I cannot resolve.

6. NOTE

This memorandum was prepared for internal circulation. It should not be cited as a finding. The author requests that it be disregarded if the leak is established as fabrication by means more rigorous than those available here.`,
    },
    // ---- Phase 28: external declassified document ----
    {
      doc_id: "EXT-DOC-SWGDOC-2022",
      date: "2022-03-01",
      type: "external_methodology",
      classification: "PUBLIC / STANDARDS",
      source_route: "/forensic-analysis",
      external: true,
      source:
        "Scientific Working Group for Forensic Document Examination (SWGDOC). \"Standard for Examination of Documents Dated by Mechanical Devices.\" Published standards, maintained 2010—present. SWGDOC standards are the consensus methodology used by U.S. forensic document examiners.",
      source_url: "https://www.swgdoc.org/standards/",
      title: "Forensic Document-Authentication Methodology (SWGDOC, public standard)",
      fields: {
        ISSUER: "Scientific Working Group for Forensic Document Examination",
        SCOPE:
          "Examination of typewriter, typeface, printer, paper, ink, and redaction-pattern features for authentication and dating",
        STATUS: "Public consensus standard, not classified",
      },
      body: `[NOTE] This is a public-source summary of the SWGDOC methodology, which is the consensus standard for the forensic document authentication referenced in the unattributed forensic analysis included alongside in this archive (FORENSIC-2026-01). The full standards are at the SWGDOC URL above.

PURPOSE

The SWGDOC standards describe the methodology a forensic document examiner uses to assess whether a document is consistent with its claimed date, authorship, and provenance. The standards do NOT claim to establish authenticity definitively; they describe the tests applied and the inferences that follow from each test's outcome.

TYPEFACE EXAMINATION (SWGDOC §1316)

The examiner identifies the specific typewriter element used (drop-stamp, type-bar, ball-element/Selectric, daisy-wheel, or laser print), then compares its glyph metrics against documented commercial typefaces of the claimed period. Distinctive markers include: kerning behavior, baseline alignment, ribbon character (carbon vs. fabric), wear patterns at high-frequency letterforms (e/a/o/n/i), and platen scoring.

PAPER AND INK (SWGDOC §1318, §1320)

Paper composition (rag content, optical brighteners, fluorescence under UV) and ink chemistry (iron-gall, dye-based, ballpoint, fountain-pen) date a document by chemical signature. Optical brighteners post-date 1957 in most U.S. paper stocks; their absence is consistent with earlier production, their presence inconsistent.

REDACTION CONVENTIONS

The U.S. National Archives publishes declassification redaction conventions. Government-issued redactions use specific bar widths, ink types, and overlay patterns that have shifted over time. Forensic examiners compare the redaction pattern on a questioned document against the convention applied at the claimed agency in the claimed year.

LIMITS OF AUTHENTICATION

The SWGDOC standards explicitly state: a document that passes all available external tests is NOT thereby established as authentic. The tests can rule a document OUT (a document with optical brighteners cannot have been produced before 1957) but cannot rule a document IN (matching all the period markers shows the document COULD have been produced when claimed, not that it WAS). This is the well-known asymmetry of authentication.

NOTE ON RELATION TO ADJACENT MATERIAL

The unattributed forensic analysis in this archive (FORENSIC-2026-01) describes applying exactly these tests to the transcribed LOOKING GLASS materials. The conclusion drawn there — that the documents "present as authentic by every external test we can apply, but the program they describe has no public footprint" — is the canonical SWGDOC asymmetry made concrete. The analyst's qualified conclusion is what the methodology permits and forbids.`,
    },
  ],
};

export const LORE_PAGES: Record<string, LorePage> = {
  "station-atlas": STATION_ATLAS,
  transmittals: TRANSMITTALS,
  "field-reports": FIELD_REPORTS,
  "forensic-analysis": FORENSIC_ANALYSIS,
};

// Slug derivation: doc_id lowercased, non-alphanumerics → hyphens,
// collapsed runs of hyphens, trimmed. Stable for any doc_id format
// (DOC-LG-1962-7714, EXT-DOC-AIR-1995-STARGATE-FINAL, etc.).
export function docSlug(docId: string): string {
  return docId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findDocBySlug(
  page: string,
  slug: string
): { doc: LoreDocument; lore: LorePage; idx: number } | null {
  const lore = LORE_PAGES[page];
  if (!lore) return null;
  for (let i = 0; i < lore.documents.length; i++) {
    if (docSlug(lore.documents[i].doc_id) === slug) {
      return { doc: lore.documents[i], lore, idx: i };
    }
  }
  return null;
}

export function sortedDocs(page: string): LoreDocument[] {
  const lore = LORE_PAGES[page];
  if (!lore) return [];
  return [...lore.documents].sort((a, b) => a.date.localeCompare(b.date));
}
