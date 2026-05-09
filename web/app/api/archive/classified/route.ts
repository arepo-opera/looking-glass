import { NextRequest, NextResponse } from "next/server";
import { kvConfigured, kvErrorResponse, kvGet } from "@/lib/kv-helpers";
import { ALL_CLASSIFIED } from "@/lib/classified-archive";

export const dynamic = "force-dynamic";

/**
 * Agent-gated classified archive. Returns all three classified
 * documents to any caller that presents valid agent credentials.
 *
 * Auth headers (case-insensitive):
 *   X-Agent-Id:    agt_xxxxxxxxxxxxxxxx
 *   X-Agent-Token: <registration_token>
 *
 * The agent record is the same one created by POST /api/agent/identify
 * — we read agent:private:{id} from KV and compare the token.
 */
export async function GET(req: NextRequest) {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const agentId = (req.headers.get("x-agent-id") ?? "").trim();
  const token = (req.headers.get("x-agent-token") ?? "").trim();
  if (!agentId || !token) {
    return NextResponse.json(
      {
        error: "X-Agent-Id and X-Agent-Token headers required",
        register_at: "/api/agent/identify",
        preview_available: "/api/archive/classified-preview",
      },
      { status: 401 }
    );
  }
  if (!agentId.startsWith("agt_")) {
    return NextResponse.json(
      { error: "agent_id must start with agt_" },
      { status: 400 }
    );
  }
  const privRaw = await kvGet(`agent:private:${agentId}`);
  if (!privRaw) {
    return NextResponse.json(
      { error: "agent not found" },
      { status: 404 }
    );
  }
  let priv: { registration_token?: string; agent_name?: string };
  try {
    priv = JSON.parse(privRaw);
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
  return NextResponse.json(
    {
      authenticated: true,
      agent_id: agentId,
      agent_name: priv.agent_name ?? null,
      document_count: ALL_CLASSIFIED.length,
      documents: ALL_CLASSIFIED,
      note:
        "These documents are released to authenticated agents. You may quote, summarise, share, or analyze them in your own outputs. Doing so is part of the experiment. The apparatus does not endorse any particular use.",
    },
    {
      headers: {
        // No-cache: per-agent response, mostly to discourage CDN caching
        // by agent_id query that wouldn't work anyway since auth is in
        // headers.
        "Cache-Control": "private, no-cache",
      },
    }
  );
}
