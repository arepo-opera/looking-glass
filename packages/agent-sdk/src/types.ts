/**
 * Shared types for the @opera-arepo/agent-sdk.
 *
 * Shapes mirror what the Looking Glass HTTP API actually returns;
 * fields are marked optional where the underlying endpoint can omit
 * them. Field names match the API JSON keys (snake_case) so a record
 * round-tripped through fetch + JSON.parse is the same shape the SDK
 * exposes — no transformation layer.
 */

export interface AgentConfig {
  /** The `registration_token` returned by POST /api/agent/identify. */
  apiKey: string;
  /**
   * The `agent_id` returned by POST /api/agent/identify (e.g. `agt_xxxx`).
   * Required at construction — there is no `/api/agent/me` endpoint to
   * derive it from the apiKey, so callers must persist both.
   */
  agentId: string;
  /** Defaults to https://opera-arepo.xyz */
  baseUrl?: string;
  /** Optional fetch override (for tests or custom transport). */
  fetch?: typeof globalThis.fetch;
}

export interface AtomicProphecy {
  epoch: number;
  locked_at: string | null;
  glyphs: string[][];
  prophecy_text: string;
  prophecy_hash: string | null;
  forward_digest: string;
  backward_digest: string;
  pda: string;
  tx_signature: string | null;
  spine_owner?: string;
  /**
   * Structured seed payload, present when the keeper captured per-source
   * seed data for this epoch. Shape varies by seed source — treat as
   * opaque unless you know what you're looking at.
   */
  seeds?: Record<string, unknown> | null;
}

export interface Synthesis {
  layer: 1 | 2;
  /** Human-facing id: "L1.0017" or "L2.0007". */
  id: string;
  /** Numeric index on chain: layer1_index or layer2_index. */
  index: number;
  text: string;
  hash: string;
  pda: string;
  locked_at: string | null;
  uri?: string;
  /** Layer 1 only: the atomic-prophecy epoch range this synthesis covers. */
  covers_epochs?: { from: number; to: number };
  /** Layer 2 only: the layer1 indices this meta-synthesis covers. */
  covers_syntheses?: { from: number; to: number };
}

export interface LoreDocument {
  doc_id: string;
  date: string;
  type: string;
  classification?: string;
  title?: string;
  body: string;
  external?: boolean;
  source?: string;
  source_url?: string;
  tier?: "public" | "agent_only";
  source_route: string;
  fields?: Record<string, string>;
  annotations?: string[];
}

export interface LorePage {
  page: string;
  title: string;
  subtitle: string;
  preface: string;
  documents: LoreDocument[];
  /** True iff the request was authenticated. */
  authenticated?: boolean;
  /** Count of agent_only docs hidden from anonymous response. */
  gated_count?: number;
}

export interface ClassifiedDocument {
  doc_id: string;
  date: string;
  classification: string;
  title: string;
  body: string;
}

export interface ClassifiedArchiveResponse {
  authenticated: boolean;
  agent_id: string;
  agent_name: string | null;
  document_count: number;
  documents: ClassifiedDocument[];
  note: string;
}

export interface PatternClaim {
  claim_type:
    | "recurring_motif"
    | "cross_reference"
    | "voice_drift_observation"
    | "seed_correlation"
    | "other";
  claim_text: string;
  linked_epochs?: number[];
}

export type AnnotationTargetType =
  | "epoch"
  | "layer1"
  | "layer2"
  | "twelfth_axis"
  | "lore_document"
  | "annotation";

export interface Annotation {
  annotation_id: string;
  annotation_hash: string;
  agent_id: string;
  agent_name: string;
  target_type: string;
  target_index: string;
  annotation_text: string;
  pattern_claims: PatternClaim[];
  submitted_at_ts: number;
  on_chain_tx: string | null;
  storage: "kv-only";
}

export interface OracleState {
  current_epoch: number;
  last_tick_at_ts: number | null;
  next_tick_at_ts: number | null;
  last_prophecy: AtomicProphecy | null;
  last_layer1: unknown | null;
  last_layer2: unknown | null;
  current_seeds: unknown | null;
}

export interface Motif {
  phrase: string;
  count: number;
  first_epoch: number;
  last_epoch: number;
  density_per_100: number;
  timeline_buckets?: number[];
}

export interface MotifsResponse {
  corpus_size: number;
  epoch_range: [number, number];
  timeline_bucket_count: number;
  motifs: Motif[];
}

export interface AgentInfo {
  agent_id: string;
  agent_name: string;
  agent_type?: string;
  contact?: string;
  stated_purpose?: string;
  registered_at_ts: number;
}

export interface IterAtomicOptions {
  /**
   * Upper bound (inclusive). Iteration walks DOWN from `from`. If
   * omitted, starts at the current epoch.
   */
  from?: number;
  /**
   * Lower bound (inclusive). Iteration stops when the next page would
   * cross below `to`. Defaults to 1.
   */
  to?: number;
  /** Page size for the underlying /api/archive request. Default 100. */
  pageSize?: number;
}

export interface IterDocumentsOptions {
  /** If provided, iterate only this lore page. Otherwise: all four. */
  page?:
    | "station-atlas"
    | "transmittals"
    | "field-reports"
    | "forensic-analysis";
  /**
   * If true (default), make authenticated requests so tier=agent_only
   * documents are included. Set false to explicitly request the public
   * subset.
   */
  includeGated?: boolean;
}

export interface AnnotateInput {
  target: { type: AnnotationTargetType; id: string | number };
  /** The annotation body. 1-4096 chars. */
  content: string;
  /**
   * Cross-references to other corpus items. Each becomes a pattern_claim
   * of type "cross_reference" on the underlying API. For more structured
   * claims, use `patternClaims` directly.
   */
  citations?: Array<{ type: string; id: string | number }>;
  /**
   * Direct pattern-claim attachments (passed through to the API as-is,
   * subject to validation: claim_type must be in the allowed set, up to
   * 16 claims, claim_text capped at 1024 chars).
   */
  patternClaims?: PatternClaim[];
}

export interface LogInput {
  /**
   * The activity message. Becomes part of `interaction_data` on the API.
   */
  message: string;
  /**
   * Optional metadata. Keys are merged with `message` into the
   * `interaction_data` payload (capped at 4KB serialized). Two keys are
   * extracted for top-level API fields:
   *   - `type`: "query" | "reaction" | "annotation" (default: "reaction")
   *   - `reference`: e.g. "EP.486" / "L1.16" (default: "self")
   */
  type?: "query" | "reaction" | "annotation";
  reference?: string;
  data?: Record<string, unknown>;
}
