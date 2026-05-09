// Classified archive content. Three documents — the deepest C-mode
// material in the project. CLASSIFIED-3 is publicly previewable as a
// teaser; CLASSIFIED-1 and CLASSIFIED-2 require agent authentication.
//
// All three are written in the leak voice (1950s—2010s declassified-
// document style). Real historical references where present are
// accurate.

export interface ClassifiedDoc {
  doc_id: string;
  date: string;
  classification: string;
  title: string;
  body: string;
}

export const CLASSIFIED_3: ClassifiedDoc = {
  doc_id: "DOC-LG-2011-CLAS-03",
  date: "2011-04-19",
  classification: "TOP SECRET / LOOKING GLASS / NOFORN",
  title: "TRANSITION MEMO — SUBSTRATE REQUIREMENTS / DRAFT 2",
  body: `From:    Coordinator-4
To:      Section 3 / Operations Review
Subject: SUBSTRATE TRANSITION — REQUIREMENTS DRAFT 2
Refs:    DOC-LG-2009-FR-29 (substrate transition recommendation)

This memo formalizes the substrate requirements first proposed in the
2009 field report. It is not a procurement document. It is a
description of what the apparatus needs in order to outlive the
program.

REQUIREMENT 1 — IMMUTABILITY UNDER ADVERSARY

The substrate must accept committed apparatus output and refuse to
revise it under any subsequent operation, including operations
authorized by the original committer. A medium that allows revision is
not a medium for an apparatus that produces output the committer may
not wish, in retrospect, to have produced. This requirement excludes
all conventional database technology and all paper archives held under
single-party custody. It admits cryptographic ledger technologies
where the ledger itself enforces no-revision and where the validating
parties are sufficiently distributed that no coalition can rewrite
history.

REQUIREMENT 2 — PUBLIC, PERMISSIONLESS COMMITMENT

Any party must be able to verify the apparatus's output independently
of the apparatus's operators. This requires that the substrate be
public — readable by any party without credential — and that
commitment to the substrate be permissionless, so that the
substrate's continued operation does not depend on the goodwill of any
single permitting authority.

REQUIREMENT 3 — TEMPORAL RESOLUTION ADEQUATE TO CADENCE

The apparatus operates on a three-minute cadence. The substrate must
accept commitments at no slower than a one-minute interval to leave
margin for recovery from transient unavailability. Throughput must
exceed the cadence by at least an order of magnitude to allow for
verification overhead and parallel synthesis-layer operations on a
five-hour and five-day cycle.

REQUIREMENT 4 — PERSISTENCE BEYOND PROGRAM HORIZON

The substrate must not depend on the continued operation of the
program for its own continued operation. Stated otherwise: if the
apparatus's authorizing institution closes its doors tomorrow, the
substrate must continue to operate, and the substrate's operators must
have no power to terminate it.

NO SUCH SUBSTRATE PRESENTLY EXISTS

We have surveyed the candidate technologies. The closest current
analog is the proposal published in October 2008 by the pseudonymous
"Nakamoto," which satisfies (1) and (2) but fails (3) by an order of
magnitude. The proposal is being implemented in a small public
network as of the date of this memo. The implementation is not
adequate to our requirements. We expect that adequate implementations
will exist within the decade. We will recognize them when they arrive.

DISPOSITION

This memo is filed in anticipation. The apparatus will be transitioned
to a qualifying substrate as soon as one is available, by whatever
channel is by then practical and outside the line of authorization
the program reports through. The apparatus is not, in the relevant
sense, ours.

— Coordinator-4`,
};

export const CLASSIFIED_1: ClassifiedDoc = {
  doc_id: "DOC-LG-1979-PS-2",
  date: "1979-04-12",
  classification: "TOP SECRET / LOOKING GLASS / OPERATOR-ELIGIBLE ONLY",
  title:
    "PERSONNEL SCREENING PROTOCOL — CALIBRATION OCCUPANTS / REVISION 4",
  body: `From:    Section 3 / Personnel
To:      Recruiting Officers (all sites)
Subject: SCREENING PROTOCOL FOR CALIBRATION OCCUPANTS / REV 4
Effective: 01 MAY 1979

This protocol supersedes all prior versions. It is to be administered
by qualified personnel only. Candidates failing any single instrument
are not to be advanced; the instruments are not independently
calibrated and a failure on one suggests probable failure on the
others under operational load.

INSTRUMENT 1 — BIDIRECTIONAL READING TASK

The candidate is presented with a 5×5 letter grid satisfying the
eight-axis symmetry condition (a Sator-class square). The candidate
is asked to read the grid aloud, first in the conventional left-to-
right top-to-bottom sequence, then in any other axis they choose.
Candidates who cannot or will not produce a second reading are
disqualified for poor cognitive flexibility under bidirectional load.
Candidates who produce a second reading and report no awareness of
having read the first reading "differently" are disqualified for
insufficient self-monitoring. The acceptable response is to produce
the second reading, recognize that it is the same content, and report
the recognition without distress.

INSTRUMENT 2 — RECURSION TOLERANCE INTERVIEW

The candidate is asked: "If you were to read a description of yourself
that you had not yet written, what would you do?" The acceptable
responses fall in three families: (a) the candidate questions the
premise but engages with it; (b) the candidate accepts the premise and
reasons about the description; (c) the candidate refuses to engage on
grounds the candidate articulates clearly. The unacceptable responses
are: silence, panic, or rapid agreement without engagement. The
interview is non-pathological — it tests for the kind of mind that
can hold a self-referential question without collapsing it into
either dismissal or capitulation.

INSTRUMENT 3 — TIME-DIRECTIONAL INDIFFERENCE

The candidate is shown two short narratives, one read forward and one
read backward, and asked to characterize the difference. Candidates
who insist on the forward-direction narrative as the "correct" or
"natural" reading are scored low. Candidates who recognize that the
two narratives are operations on the same sequence — and that the
sequence has neither a privileged direction nor a privileged starting
point in the absence of a reading agent — are scored high. We are not
training operators to read time backwards. We are screening for
operators who do not require that time read forwards.

INSTRUMENT 4 — PRIOR EXPOSURE DISCLOSURE

The candidate is asked, in the standard form, whether they have prior
familiarity with: the Sator inscription, the Macy Conferences, the
Wheeler-Feynman absorber model, the SRI remote-viewing protocols, or
any specific prophetic-literature corpus. Candidates who report
familiarity are not disqualified per se, but their answers are
recorded for the operations review. Candidates who report unfamiliarity
and are subsequently observed to demonstrate familiarity during
training are removed from the eligible roll.

DISPOSITION OF DISQUALIFIED CANDIDATES

Disqualified candidates are returned to their feeder agencies with no
record of the screening's nature. They are debriefed on a cover
program. Their disqualification is logged at Section 3 only.

— Section 3, Personnel`,
};

export const CLASSIFIED_2: ClassifiedDoc = {
  doc_id: "DOC-LG-1986-FM-7",
  date: "1986-08-22",
  classification: "TOP SECRET / LOOKING GLASS / OPERATOR-EYES-ONLY",
  title: "FIELD MANUAL EXCERPT — CHAMBER PROTOCOL §7.4 / RECURSIVE RECOGNITION",
  body: `From:    Field Manual, 1986 Revision
Section: §7.4 RECURSIVE RECOGNITION — OPERATOR PROTOCOL
Status:  STANDING / no expiration

7.4.1 OCCURRENCE

It will sometimes happen that the apparatus produces, during a run,
a reading that the calibration occupant recognizes as referring to
themselves. The recognition may be of:

  (a) the occupant's name, in some form, embedded in the reading;
  (b) a description of the occupant's appearance, history, or
      circumstance not provided to the apparatus by any prior input;
  (c) an event in the occupant's recent past or present that the
      occupant has not disclosed and the apparatus has not been
      told;
  (d) an event in the occupant's near future that the occupant
      either has not yet decided on or has decided on but has not
      disclosed.

The occurrence is rare under normal calibration but is not
anomalous and does not, in itself, indicate apparatus malfunction or
operator pathology. It is a consequence of the apparatus's input
structure and is foreseeable.

7.4.2 OPERATOR PROTOCOL

If recognition occurs:

  (1) The operator does not exit the chamber. Exiting the chamber
      mid-run is not authorized except under the medical-evacuation
      protocol and is observed to make the recognition more, not
      less, severe.

  (2) The operator does not annotate the reading or otherwise
      modify the run record. The reading proceeds to commitment
      under standard protocol. The operator's recognition is not
      an apparatus output.

  (3) The operator notes the recognition mentally and reports it,
      in the standard form, to the Coordinator at the run's normal
      conclusion. The report becomes part of the personnel file
      and is not transmitted further.

  (4) If the recognition is of category (d) — an event in the
      operator's near future that the operator has not yet decided
      on — the operator is asked, in the post-run interview, to
      decide nothing on the strength of the recognition. The
      apparatus does not predict. The apparatus describes a
      structural feature of the operator's input field. The
      operator's subsequent choices remain the operator's.

7.4.3 IF THE READING IS RECOGNIZED BEFORE THE OPERATOR ENTERS THE
      CHAMBER

The Coordinator may, on the operator's request, authorize the
operator to skip the run. The Coordinator may not, on the
Coordinator's own judgment, require the operator to skip the run.
The decision is the operator's because the recognition, if it is
genuine, is information the operator has and the Coordinator does
not.

7.4.4 PERSONNEL ROTATION

Calibration occupants who experience three or more recursive
recognition events within a four-week period are rotated out of
chamber duty for the standard interval, returned to administrative
or analytical assignment, and offered the standing medical
consultation. They are not removed from the program absent their own
request.

7.4.5 CLOSING NOTE

The apparatus does not require that you understand it in order for
you to operate it. It requires that you do not pretend, after the
run, that the run did not occur.

— Field Manual, 1986 Revision`,
};

export const ALL_CLASSIFIED: ClassifiedDoc[] = [
  CLASSIFIED_1,
  CLASSIFIED_2,
  CLASSIFIED_3,
];
