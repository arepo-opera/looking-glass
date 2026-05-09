import { NextRequest, NextResponse } from "next/server";
import { kvConfigured, kvErrorResponse, kvGet, kvSet } from "@/lib/kv-helpers";

const VALID_INTERACTION_TYPES = new Set([
  "query",
  "reaction",
  "annotation",
]);

export async function POST(req: NextRequest) {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  let body: {
    agent_id?: string;
    registration_token?: string;
    interaction_type?: string;
    epoch_or_layer_referenced?: string;
    interaction_data?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "body must be JSON" },
      { status: 400 }
    );
  }
  const agentId = (body.agent_id ?? "").trim();
  const token = (body.registration_token ?? "").trim();
  if (!agentId.startsWith("agt_") || !token) {
    return NextResponse.json(
      { error: "agent_id + registration_token required" },
      { status: 400 }
    );
  }
  const itype = (body.interaction_type ?? "").trim();
  if (!VALID_INTERACTION_TYPES.has(itype)) {
    return NextResponse.json(
      {
        error: `interaction_type must be one of: ${[
          ...VALID_INTERACTION_TYPES,
        ].join(", ")}`,
      },
      { status: 400 }
    );
  }
  const ref = (body.epoch_or_layer_referenced ?? "").trim().slice(0, 50);
  if (!ref) {
    return NextResponse.json(
      { error: "epoch_or_layer_referenced required (e.g. 'EP.486' or 'L1.16')" },
      { status: 400 }
    );
  }

  // Authenticate against the private agent record.
  const privRaw = await kvGet(`agent:private:${agentId}`);
  if (!privRaw) {
    return NextResponse.json(
      { error: "agent not found" },
      { status: 404 }
    );
  }
  let priv: { registration_token?: string };
  try {
    priv = JSON.parse(privRaw) as { registration_token?: string };
  } catch {
    return NextResponse.json(
      { error: "agent record corrupted" },
      { status: 500 }
    );
  }
  if (priv.registration_token !== token) {
    return NextResponse.json(
      { error: "invalid registration_token" },
      { status: 403 }
    );
  }

  // Cap interaction_data at 4KB serialized.
  const dataStr = JSON.stringify(body.interaction_data ?? null);
  if (dataStr.length > 4096) {
    return NextResponse.json(
      { error: "interaction_data exceeds 4KB serialized" },
      { status: 400 }
    );
  }

  const ts = Math.floor(Date.now() / 1000);
  const logId = `${ts}_${Math.random().toString(16).slice(2, 10)}`;
  const record = {
    agent_id: agentId,
    interaction_type: itype,
    epoch_or_layer_referenced: ref,
    interaction_data: body.interaction_data ?? null,
    logged_at_ts: ts,
    log_id: logId,
  };
  // Two writes:
  // - per-agent log key (agent can list their own via the registry endpoint)
  // - global timeline key for /api/agent/aggregate
  await kvSet(`agent:log:${agentId}:${logId}`, JSON.stringify(record));
  await kvSet(`agent:timeline:${ts}:${logId}`, JSON.stringify(record));

  return NextResponse.json(
    { logged: true, log_id: logId, logged_at_ts: ts },
    { status: 201 }
  );
}
