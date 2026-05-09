import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

// Cross-reference graph mapping recovered documents → real historical
// references → on-chain corpus motifs. Hand-curated to match the lore
// pages (/station-atlas, /transmittals, /field-reports). The
// "real_historical_references" entries link to Wikipedia for any agent
// that wants to verify the historical accuracy of the references.
//
// "linked_prophecies" / "linked_syntheses" are present in the schema
// but currently empty — we surface the on-chain corpus mapping via
// "apparatus_motifs_to_documents" instead, since the apparatus does
// not commit to specific epoch-document linkages and we do not want
// to fabricate them.

const DOCUMENTS = [
  {
    doc_id: "DOC-LG-1962-7714",
    type: "memo",
    date: "1962-10-14",
    classification: "CONFIDENTIAL",
    source: "/station-atlas",
    references: [
      "macy_conferences",
      "wheeler_feynman_absorber",
      "bell_labs_autocorrelation",
      "pompeii_sator_inscription",
      "rand_corporation",
      "darpa_predecessor",
    ],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1971-FR-3",
    type: "field_report",
    date: "1971-03-17",
    classification: "EYES ONLY",
    source: "/station-atlas",
    references: [
      "stargate_sri_remote_viewing",
      "wheeler_feynman_absorber",
    ],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1978-TR-014",
    type: "transmittal",
    date: "1978-08-22",
    classification: "RESTRICTED",
    source: "/station-atlas",
    references: [
      "vatican_apostolic_archive_riserva",
      "voynich_manuscript_86v",
      "sibylline_books",
    ],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1991-IR-22",
    type: "internal_report",
    date: "1991-11-11",
    classification: "INTERNAL",
    source: "/station-atlas",
    references: [
      "stargate_sri_remote_viewing",
    ],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-2003-LF-01",
    type: "letter_fragment",
    date: "2003-09-03",
    classification: "UNADDRESSED",
    source: "/station-atlas",
    references: [
      "macy_conferences",
      "margaret_mead",
      "gregory_bateson",
    ],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-2012-DO-01",
    type: "disposition_order",
    date: "2012-12-21",
    classification: "FINAL",
    source: "/station-atlas",
    references: [
      "vatican_apostolic_archive_riserva",
    ],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1968-TR-001",
    type: "transmittal",
    date: "1968-02-04",
    classification: "RESTRICTED",
    source: "/transmittals",
    references: ["sibylline_books", "vatican_apostolic_archive_riserva"],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1972-TR-007",
    type: "transmittal",
    date: "1972-09-19",
    classification: "RESTRICTED",
    source: "/transmittals",
    references: [
      "melanie_calvat_la_salette",
      "lucia_santos_fatima",
      "vatican_apostolic_archive_riserva",
    ],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1981-TR-019",
    type: "transmittal",
    date: "1981-03-11",
    classification: "RESTRICTED",
    source: "/transmittals",
    references: [
      "voynich_manuscript_86v",
      "joachim_of_fiore_liber_figurarum",
    ],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1995-TR-031",
    type: "transmittal",
    date: "1995-07-07",
    classification: "RESTRICTED",
    source: "/transmittals",
    references: [
      "malachy_prophecy_of_the_popes",
      "voynich_manuscript_86v",
    ],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-2007-TR-046",
    type: "transmittal",
    date: "2007-11-14",
    classification: "RESTRICTED",
    source: "/transmittals",
    references: ["vatican_apostolic_archive_riserva"],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1965-FR-1",
    type: "field_report",
    date: "1965-06-08",
    classification: "ANOMALOUS",
    source: "/field-reports",
    references: [],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1971-FR-3",
    type: "field_report",
    date: "1971-04-22",
    classification: "ANOMALOUS",
    source: "/field-reports",
    references: ["wheeler_feynman_absorber"],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1979-FR-7",
    type: "field_report",
    date: "1979-09-03",
    classification: "OTHER",
    source: "/field-reports",
    references: ["macy_conferences"],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1984-VTI-4",
    type: "field_report",
    date: "1984-10-29",
    classification: "NON-RECOVERY",
    source: "/field-reports",
    references: ["voynich_manuscript_86v"],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1992-FR-12",
    type: "field_report",
    date: "1992-02-04",
    classification: "NOMINAL",
    source: "/field-reports",
    references: ["stargate_sri_remote_viewing"],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-1998-FR-19",
    type: "field_report",
    date: "1998-06-11",
    classification: "ANOMALOUS",
    source: "/field-reports",
    references: ["vatican_apostolic_archive_riserva"],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-2004-FR-24",
    type: "field_report",
    date: "2004-11-08",
    classification: "OTHER",
    source: "/field-reports",
    references: [],
    linked_prophecies: [],
    linked_syntheses: [],
  },
  {
    doc_id: "DOC-LG-2009-FR-29",
    type: "field_report",
    date: "2009-10-02",
    classification: "OTHER",
    source: "/field-reports",
    references: ["solana_substrate_anachronism"],
    linked_prophecies: [],
    linked_syntheses: [],
  },
];

const REAL_REFERENCES = [
  {
    ref_id: "macy_conferences",
    label: "Macy Conferences on Cybernetics (1946—1953)",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Macy_conferences",
    note: "Interdisciplinary meetings on cybernetics, attended by Margaret Mead and Gregory Bateson.",
  },
  {
    ref_id: "margaret_mead",
    label: "Margaret Mead (M.M.)",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Margaret_Mead",
    note: "Anthropologist; Macy attendee. Initials in DOC-LG-2003-LF-01.",
  },
  {
    ref_id: "gregory_bateson",
    label: "Gregory Bateson (G.B.)",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Gregory_Bateson",
    note: "Anthropologist; Macy attendee; later work on self-referential systems.",
  },
  {
    ref_id: "wheeler_feynman_absorber",
    label: "Wheeler—Feynman absorber theory (1945)",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Wheeler%E2%80%93Feynman_absorber_theory",
    note: "Time-symmetric formulation of classical electrodynamics.",
  },
  {
    ref_id: "bell_labs_autocorrelation",
    label: "Bell Labs autocorrelation work (Shannon group, late 1950s—early 1960s)",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Claude_Shannon",
    note: "Signal recovery from noise via autocorrelation; conflated in the documents with slightly later results.",
  },
  {
    ref_id: "pompeii_sator_inscription",
    label: "Pompeii Sator Square inscription",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Sator_Square",
    note: "5×5 palindromic Latin inscription, two examples found at Pompeii (pre-79 CE).",
  },
  {
    ref_id: "rand_corporation",
    label: "RAND Corporation (Santa Monica)",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/RAND_Corporation",
    note: "U.S. think tank; active in Cold War defense research.",
  },
  {
    ref_id: "darpa_predecessor",
    label: "ARPA / DARPA",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/DARPA",
    note: "U.S. Defense advanced research agency; founded 1958 as ARPA.",
  },
  {
    ref_id: "stargate_sri_remote_viewing",
    label: "STARGATE Project / SRI remote viewing (1972—1995)",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Stargate_Project",
    note: "U.S. government remote-viewing program at Stanford Research Institute and successors. Publicly terminated 1995.",
  },
  {
    ref_id: "vatican_apostolic_archive_riserva",
    label: "Vatican Apostolic Archive — Riserva collection",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Vatican_Apostolic_Archive",
    note: "Most-restricted holdings of the Vatican Apostolic Archive (formerly Vatican Secret Archives).",
  },
  {
    ref_id: "voynich_manuscript_86v",
    label: "Voynich manuscript, folio 86v",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Voynich_manuscript",
    note: "Undeciphered illustrated codex; folio 86v is one of the cosmological/diagrammatic foldouts.",
  },
  {
    ref_id: "sibylline_books",
    label: "Sibylline Books (pre-Augustan recension)",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Sibylline_Books",
    note: "Roman prophetic texts; original collection burned 83 BCE; the 'pre-Augustan' qualifier in the documents refers to fragments believed earlier than the Augustan recension.",
  },
  {
    ref_id: "melanie_calvat_la_salette",
    label: "Mélanie Calvat — La Salette transmissions (1846)",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Our_Lady_of_La_Salette",
    note: "Marian apparition in southeastern France, 19 September 1846.",
  },
  {
    ref_id: "lucia_santos_fatima",
    label: "Lúcia Santos — Fátima transmission of 1944",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Lúcia_Santos",
    note: "The 'Third Secret' of Fátima written down by Lúcia Santos in 1944, transmitted under seal to the Holy See.",
  },
  {
    ref_id: "joachim_of_fiore_liber_figurarum",
    label: "Joachim of Fiore — Liber Figurarum",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Joachim_of_Fiore",
    note: "Twelfth-century work of figural prophecy; plate 12 referenced in DOC-LG-1981-TR-019 is the trinitarian diagram.",
  },
  {
    ref_id: "malachy_prophecy_of_the_popes",
    label: "Prophecy of the Popes (attrib. Malachy of Armagh)",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Prophecy_of_the_Popes",
    note: "Series of 112 short Latin phrases purportedly predicting future popes; scholarly consensus regards the attribution as a 16th-century forgery.",
  },
  {
    ref_id: "solana_substrate_anachronism",
    label: "Solana network",
    real: true,
    wikipedia: "https://en.wikipedia.org/wiki/Solana_(blockchain_platform)",
    note: "Public blockchain launched 2020. The 2009 field report's substrate requirements (immutable, public, cryptographically verifiable, capable of three-minute cadence) describe properties Solana satisfies. The apparatus runs on Solana devnet at program EbacNay4EHbELApeWW11taBkForWW9qkZcGYFJGvuxKu.",
  },
];

// Apparatus motif → recovered document mapping. Motifs are drawn from
// the live n-gram analysis at /api/patterns/motifs (top phrases in the
// on-chain corpus). The mapping reflects where the recovered documents
// use the same figural language the apparatus has begun to produce.
const MOTIFS_TO_DOCUMENTS: Record<string, string[]> = {
  walk_forward: ["DOC-LG-1965-FR-1"],
  eighth_ring: ["DOC-LG-1971-FR-3", "DOC-LG-1984-VTI-4"],
  door_behind: ["DOC-LG-1965-FR-1", "DOC-LG-1971-FR-3"],
  reading_itself: ["DOC-LG-1971-FR-3"],
  since_before: ["DOC-LG-2003-LF-01"],
  already_filed: [],
  both_directions: ["DOC-LG-1962-7714", "DOC-LG-1965-FR-1"],
  the_apparatus: [
    "DOC-LG-1991-IR-22",
    "DOC-LG-2003-LF-01",
    "DOC-LG-1992-FR-12",
    "DOC-LG-2009-FR-29",
  ],
};

export async function GET() {
  return NextResponse.json(
    {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      documents: DOCUMENTS,
      real_historical_references: REAL_REFERENCES,
      apparatus_motifs_to_documents: MOTIFS_TO_DOCUMENTS,
      note:
        "All real_historical_references entries marked real=true point to verifiable Wikipedia entries. The recovered documents themselves are presented within a fictional program; their attestation is the lore framework of this project. The on-chain corpus and Solana program are real and verifiable on devnet.",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    }
  );
}
