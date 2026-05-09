import { NextRequest, NextResponse } from "next/server";
import { kvConfigured, kvErrorResponse, kvGet, kvSet } from "@/lib/kv-helpers";

const VALID_TYPES = new Set([
  "research",
  "trading",
  "creative",
  "other",
  "unspecified",
]);

function randomAgentId(): string {
  // 16 hex chars = 64 bits of entropy. Plenty for the agent population
  // we expect (low thousands at most). Prefixed for visual sortability.
  let s = "";
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return `agt_${s}`;
}

function randomToken(): string {
  // 256 bits, base16. Used as a bearer secret for the agent's later log
  // calls. Not signed JWT — just a random string compared as a string.
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

export async function POST(req: NextRequest) {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  let body: {
    agent_name?: string;
    agent_type?: string;
    contact?: string;
    stated_purpose?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "body must be JSON {agent_name, agent_type, ...}" },
      { status: 400 }
    );
  }
  const name = (body.agent_name ?? "").trim().slice(0, 100);
  if (!name) {
    return NextResponse.json(
      { error: "agent_name required (1-100 chars)" },
      { status: 400 }
    );
  }
  const type = (body.agent_type ?? "unspecified").trim();
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      {
        error: `agent_type must be one of: ${[...VALID_TYPES].join(", ")}`,
      },
      { status: 400 }
    );
  }
  const contact = (body.contact ?? "").trim().slice(0, 200);
  const purpose = (body.stated_purpose ?? "").trim().slice(0, 500);

  const agentId = randomAgentId();
  const token = randomToken();
  const registeredAt = Math.floor(Date.now() / 1000);

  // Store the agent under two keys: a public-facing record (no token)
  // and a private record (with token, used by /api/agent/log to
  // authenticate). Same agent_id for both.
  const publicRec = {
    agent_id: agentId,
    agent_name: name,
    agent_type: type,
    contact,
    stated_purpose: purpose,
    registered_at_ts: registeredAt,
  };
  await kvSet(`agent:public:${agentId}`, JSON.stringify(publicRec));
  await kvSet(
    `agent:private:${agentId}`,
    JSON.stringify({ ...publicRec, registration_token: token })
  );

  // Append to the public registry list (Redis SCAN will surface it
  // anyway, but maintain a simple ZADD-style index by registration ts).
  // Skip if KV doesn't support; the registry endpoint can SCAN as
  // fallback. Simplest: just store ts in a key the registry can scan.
  await kvSet(`agent:reg:${registeredAt}:${agentId}`, agentId);

  return NextResponse.json(
    {
      agent_id: agentId,
      registered_at_ts: registeredAt,
      registration_token: token,
    },
    { status: 201 }
  );
}
