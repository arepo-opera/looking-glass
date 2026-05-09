// @sator/oracle — minimal client for the SATOR LOOKING GLASS oracle.
// No transitive deps; uses fetch (built-in to Node 18+ and all
// modern browsers).

const DEFAULT_BASE = "https://sator-looking-glass-web.vercel.app";

export type AgentType =
  | "research"
  | "trading"
  | "creative"
  | "other"
  | "unspecified";

export type InteractionType = "query" | "reaction" | "annotation";

export interface SeedRecord {
  captured_at_ts: number;
  markets: Record<string, { price: string; confidence: string }>;
  chain: Record<string, string | number>;
  world: Record<string, string | number>;
  heavens: Record<string, string | number>;
  echo: Record<string, string | number>;
  drift: Record<string, string | number>;
  spine_owner: string;
}

export interface EpochRecord {
  epoch: number;
  locked_at: string | null;
  glyphs: string[][];
  prophecy_text: string;
  prophecy_hash: string | null;
  forward_digest: string;
  backward_digest: string;
  pda: string;
  tx_signature: string | null;
  seeds: SeedRecord | null;
}

export interface Layer1Record {
  layer1_index: number;
  locked_at: string | null;
  epoch_range: [number, number];
  synthesis_text: string;
  synthesis_hash: string | null;
  synthesis_uri: string;
  pda: string;
}

export interface Layer2Record {
  layer2_index: number;
  locked_at: string | null;
  layer1_range: [number, number];
  synthesis_text: string;
  synthesis_hash: string | null;
  synthesis_uri: string;
  pda: string;
}

export interface OracleState {
  current_epoch: number;
  last_tick_at_ts: number | null;
  next_tick_at_ts: number | null;
  last_prophecy: EpochRecord | null;
  last_layer1: Layer1Record | null;
  last_layer2: Layer2Record | null;
  current_seeds: SeedRecord | null;
}

export interface RegisterAgentRequest {
  name: string;
  type?: AgentType;
  contact?: string;
  purpose?: string;
}

export interface AgentCredentials {
  agent_id: string;
  registration_token: string;
  registered_at_ts: number;
}

export interface LogInteractionRequest {
  type: InteractionType;
  referenced: string; // e.g. "EP.486", "L1.16", "L2.8"
  data?: unknown;
}

export class SatorOracleError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, msg: string) {
    super(msg);
    this.status = status;
    this.body = body;
  }
}

async function jsonFetch<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) {
    let body: unknown = null;
    try {
      body = await r.json();
    } catch {
      /* swallow */
    }
    throw new SatorOracleError(r.status, body, `${r.status} on ${url}`);
  }
  return (await r.json()) as T;
}

export class SatorOracle {
  readonly base: string;
  constructor(opts: { base?: string } = {}) {
    this.base = (opts.base ?? DEFAULT_BASE).replace(/\/+$/, "");
  }
  async getCurrentState(): Promise<OracleState> {
    return jsonFetch(`${this.base}/api/oracle/state`);
  }
  async getEpoch(n: number): Promise<EpochRecord> {
    return jsonFetch(`${this.base}/api/oracle/epoch/${n}`);
  }
  async getLayer1(n: number): Promise<Layer1Record> {
    return jsonFetch(`${this.base}/api/oracle/layer1/${n}`);
  }
  async getLayer2(n: number): Promise<Layer2Record> {
    return jsonFetch(`${this.base}/api/oracle/layer2/${n}`);
  }
  async getRange(
    from: number,
    to: number
  ): Promise<{ from: number; to: number; count: number; records: EpochRecord[] }> {
    return jsonFetch(`${this.base}/api/oracle/range?from=${from}&to=${to}`);
  }
  async registerAgent(req: RegisterAgentRequest): Promise<RegisteredAgent> {
    const body = {
      agent_name: req.name,
      agent_type: req.type ?? "unspecified",
      contact: req.contact ?? "",
      stated_purpose: req.purpose ?? "",
    };
    const creds = await jsonFetch<AgentCredentials>(
      `${this.base}/api/agent/identify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    return new RegisteredAgent(this.base, creds);
  }
}

export class RegisteredAgent {
  constructor(
    private base: string,
    public readonly credentials: AgentCredentials
  ) {}
  get agentId(): string {
    return this.credentials.agent_id;
  }
  async log(req: LogInteractionRequest): Promise<{ logged: boolean; log_id: string; logged_at_ts: number }> {
    const body = {
      agent_id: this.credentials.agent_id,
      registration_token: this.credentials.registration_token,
      interaction_type: req.type,
      epoch_or_layer_referenced: req.referenced,
      interaction_data: req.data ?? null,
    };
    return jsonFetch(`${this.base}/api/agent/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
}

export default SatorOracle;
