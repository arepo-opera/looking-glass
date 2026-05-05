import { keccak_256 } from "js-sha3";

const SUBJECTS: string[] = [
  "a returning tide",
  "the unsigned letter",
  "the third moon",
  "the engine that forgot",
  "the listening room",
  "what was buried",
  "the recursion",
  "the unread hour",
  "the bell beneath the wheel",
  "an inheritance kept dim",
  "the angle of departure",
  "the first thing said",
  "the calendar's seam",
  "what the camera saw",
  "the unmoving lens",
  "the rope twice tied",
];

const VERBS: string[] = [
  "remembers",
  "is becoming",
  "has not yet met",
  "will not contain",
  "echoes",
  "watches",
  "concludes",
  "begins again as",
  "answers",
  "delays",
  "outlives",
  "arrives at",
  "renames",
  "permits",
  "precedes",
  "rewrites",
];

const OBJECTS: string[] = [
  "the shore that forgot it",
  "a name we do not have",
  "the room you have not entered",
  "what was already true",
  "the door that opens both ways",
  "an oath unbroken by silence",
  "the year before the year",
  "a sentence still being written",
  "its own rehearsal",
  "the witness on the stair",
  "every promise made twice",
  "the page underneath the page",
  "the weather of the prior life",
  "the small coin in the dark hand",
  "the road kept private",
  "what you almost said in 1991",
];

export interface ProphecySource {
  forwardDigest: Uint8Array;
}

export interface Prophecy {
  text: string;
  uri: string;
  hash: Uint8Array;
}

function pickFrom<T>(arr: T[], byte: number): T {
  return arr[byte % arr.length];
}

function composeText(forward: Uint8Array): string {
  if (forward.length < 9) {
    throw new Error("forward digest too short for placeholder template");
  }
  const lines: string[] = [];
  for (let i = 0; i < 3; i++) {
    const s = pickFrom(SUBJECTS, forward[i * 3 + 0]);
    const v = pickFrom(VERBS, forward[i * 3 + 1]);
    const o = pickFrom(OBJECTS, forward[i * 3 + 2]);
    lines.push(`${s} ${v} ${o}.`);
  }
  return lines.join("\n");
}

export function generateProphecy(src: ProphecySource): Prophecy {
  const text = composeText(src.forwardDigest);
  const hash = new Uint8Array(keccak_256.arrayBuffer(text));
  const uri = "inline:" + Buffer.from(text, "utf-8").toString("base64");
  return { text, uri, hash };
}
