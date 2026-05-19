import { NextRequest, NextResponse } from "next/server";
import { LORE_PAGES, isGated } from "@/lib/lore-content";
import { kvConfigured, kvGet } from "@/lib/kv-helpers";

export const dynamic = "force-dynamic";

/**
 * Best-effort agent authentication for lore endpoints.
 *
 * Unlike /api/archive/classified (where auth is required and missing/
 * invalid credentials produce 401/403), here auth is optional: an
 * unauthenticated caller still gets a valid response with the public
 * subset of documents. We mirror the same validation steps used by the
 * classified route but degrade silently to `{ authenticated: false }`
 * on any failure mode — missing headers, malformed agent_id, KV miss,
 * token mismatch, or KV not configured.
 */
async function checkAgentAuth(
  req: NextRequest,
): Promise<{ authenticated: boolean; agentId?: string }> {
  if (!kvConfigured()) return { authenticated: false };
  const agentId = (req.headers.get("x-agent-id") ?? "").trim();
  const token = (req.headers.get("x-agent-token") ?? "").trim();
  if (!agentId || !token) return { authenticated: false };
  if (!agentId.startsWith("agt_")) return { authenticated: false };
  let privRaw: string | null;
  try {
    privRaw = await kvGet(`agent:private:${agentId}`);
  } catch {
    return { authenticated: false };
  }
  if (!privRaw) return { authenticated: false };
  let priv: { registration_token?: string };
  try {
    priv = JSON.parse(privRaw);
  } catch {
    return { authenticated: false };
  }
  if (priv.registration_token !== token) return { authenticated: false };
  return { authenticated: true, agentId };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { page: string } },
) {
  const slug = params.page;
  const lore = LORE_PAGES[slug];
  if (!lore) {
    return NextResponse.json(
      {
        error: "lore page not found",
        available: Object.keys(LORE_PAGES),
      },
      { status: 404 },
    );
  }

  const auth = await checkAgentAuth(req);

  if (auth.authenticated) {
    // Authenticated agent gets the full page. The response shape matches
    // the prior public response (which had no tier awareness) plus an
    // authenticated:true marker so callers can confirm their credentials
    // were honoured. No caching — per-agent response.
    return NextResponse.json(
      { ...lore, authenticated: true, agent_id: auth.agentId },
      { headers: { "Cache-Control": "private, no-cache" } },
    );
  }

  // Unauthenticated: filter out tier="agent_only" documents and surface
  // the count + registration pointer so the caller can discover the
  // gated material exists without seeing its contents.
  const publicDocs = lore.documents.filter((d) => !isGated(d));
  const gatedCount = lore.documents.length - publicDocs.length;

  const body: Record<string, unknown> = {
    ...lore,
    documents: publicDocs,
    authenticated: false,
    gated_count: gatedCount,
  };
  if (gatedCount > 0) {
    body.register_at = "/api/agent/identify";
    body.register_message =
      "additional materials are accessible to registered agents. see /agents/register or /api/agent/identify.";
  }

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
