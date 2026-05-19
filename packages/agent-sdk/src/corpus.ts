/**
 * Corpus-reading methods. These are the GET endpoints that return
 * prophecies, syntheses, lore documents, and classified material.
 *
 * The four lore-tier pages and the classified archive both use the
 * X-Agent-Id / X-Agent-Token header pattern when authenticated. The
 * /api/archive endpoint is always public (on-chain data).
 */
import type { Agent } from "./agent.js";
import type {
  AtomicProphecy,
  ClassifiedArchiveResponse,
  ClassifiedDocument,
  IterAtomicOptions,
  IterDocumentsOptions,
  LoreDocument,
  LorePage,
  Motif,
  MotifsResponse,
  OracleState,
  Synthesis,
} from "./types.js";

const LORE_PAGES = [
  "station-atlas",
  "transmittals",
  "field-reports",
  "forensic-analysis",
] as const;

/** Walk /api/archive from `from` down to `to`, yielding each prophecy. */
export async function* iterAtomicProphecies(
  agent: Agent,
  opts: IterAtomicOptions = {},
): AsyncIterable<AtomicProphecy> {
  const pageSize = opts.pageSize ?? 100;
  const lowerBound = opts.to ?? 1;
  let cursor: number | undefined = opts.from;

  while (true) {
    const params = new URLSearchParams();
    if (cursor !== undefined) params.set("from", String(cursor));
    params.set("limit", String(pageSize));
    const res = await agent.request<{
      atomic_prophecies?: AtomicProphecy[];
      prophecies?: AtomicProphecy[];
      pagination?: { next_from: number | null };
    }>("GET", `/api/archive?${params.toString()}`);

    const items = res.atomic_prophecies ?? res.prophecies ?? [];
    for (const p of items) {
      if (p.epoch < lowerBound) return;
      yield p;
    }

    const next = res.pagination?.next_from;
    if (next === null || next === undefined) return;
    if (next < lowerBound) return;
    cursor = next;
  }
}

/**
 * Fetch a single prophecy by epoch. Walks one page of /api/archive
 * because there is no per-epoch endpoint; the page boundary will land
 * on the requested epoch exactly when `limit=1` is used.
 */
export async function getAtomicProphecy(
  agent: Agent,
  epoch: number,
): Promise<AtomicProphecy> {
  const res = await agent.request<{
    atomic_prophecies?: AtomicProphecy[];
    prophecies?: AtomicProphecy[];
  }>("GET", `/api/archive?from=${epoch}&limit=1`);
  const items = res.atomic_prophecies ?? res.prophecies ?? [];
  const match = items.find((p) => p.epoch === epoch);
  if (!match) {
    throw new Error(`prophecy at epoch ${epoch} not found in archive response`);
  }
  return match;
}

/**
 * Yield syntheses from /api/archive. Note the API surfaces only the
 * most-recent ~10 layer1 and ~5 layer2 syntheses per request, regardless
 * of pagination — fetching prior syntheses by index is not exposed
 * publicly. Iteration here is a best-effort over the surfaced set.
 */
export async function* iterSyntheses(
  agent: Agent,
  opts: { layer?: 1 | 2 } = {},
): AsyncIterable<Synthesis> {
  const res = await agent.request<{
    layer1_syntheses?: Layer1Raw[];
    layer2_meta_syntheses?: Layer2Raw[];
  }>("GET", `/api/archive?limit=1`);

  const want = opts.layer;
  if (want === undefined || want === 1) {
    for (const l1 of res.layer1_syntheses ?? []) yield normalizeLayer1(l1);
  }
  if (want === undefined || want === 2) {
    for (const l2 of res.layer2_meta_syntheses ?? []) yield normalizeLayer2(l2);
  }
}

interface Layer1Raw {
  layer1_index: number;
  epoch_range: { from: number; to: number };
  locked_at: string | null;
  pda: string;
  synthesis_hash: string;
  synthesis_text: string;
  synthesis_uri?: string;
}
interface Layer2Raw {
  layer2_index: number;
  layer1_range: { from: number; to: number };
  locked_at: string | null;
  pda: string;
  synthesis_hash: string;
  synthesis_text: string;
  synthesis_uri?: string;
}

function normalizeLayer1(r: Layer1Raw): Synthesis {
  return {
    layer: 1,
    id: `L1.${String(r.layer1_index).padStart(4, "0")}`,
    index: r.layer1_index,
    text: r.synthesis_text,
    hash: r.synthesis_hash,
    pda: r.pda,
    locked_at: r.locked_at,
    uri: r.synthesis_uri,
    covers_epochs: r.epoch_range,
  };
}
function normalizeLayer2(r: Layer2Raw): Synthesis {
  return {
    layer: 2,
    id: `L2.${String(r.layer2_index).padStart(4, "0")}`,
    index: r.layer2_index,
    text: r.synthesis_text,
    hash: r.synthesis_hash,
    pda: r.pda,
    locked_at: r.locked_at,
    uri: r.synthesis_uri,
    covers_syntheses: r.layer1_range,
  };
}

/**
 * Yield documents from one or all lore pages. With includeGated=true
 * (the default) and a valid apiKey, agent-tier documents are included
 * via authenticated requests; without auth the response is the public
 * subset only.
 */
export async function* iterDocuments(
  agent: Agent,
  opts: IterDocumentsOptions = {},
): AsyncIterable<LoreDocument> {
  const includeGated = opts.includeGated !== false;
  const pages = opts.page ? [opts.page] : LORE_PAGES;
  for (const page of pages) {
    const lp = await agent.request<LorePage>(
      "GET",
      `/api/lore/${page}`,
      includeGated ? { authenticate: true } : undefined,
    );
    for (const doc of lp.documents ?? []) yield doc;
  }
}

export async function getClassifiedArchive(
  agent: Agent,
): Promise<ClassifiedDocument[]> {
  const res = await agent.request<ClassifiedArchiveResponse>(
    "GET",
    "/api/archive/classified",
    { authenticate: true },
  );
  return res.documents ?? [];
}

export async function getOracleState(agent: Agent): Promise<OracleState> {
  return agent.request<OracleState>("GET", "/api/oracle/state");
}

export async function getMotifs(agent: Agent): Promise<Motif[]> {
  const res = await agent.request<MotifsResponse>("GET", "/api/patterns/motifs");
  return res.motifs ?? [];
}
