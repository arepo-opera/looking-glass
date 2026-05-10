import { NextResponse } from "next/server";
import {
  kvConfigured,
  kvErrorResponse,
  kvMget,
  kvSmembers,
} from "@/lib/kv-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface Node {
  id: string;
  agent_id: string;
  agent_name: string;
  target: string; // "{type}:{index}"
}

interface Edge {
  from: string; // citing annotation_id
  to: string; // cited annotation_id
}

/**
 * Returns the directed citation graph between annotations whose
 * target_type is "annotation". Nodes are all annotations (cited or
 * not) so consumers can see the full corpus and detect orphan
 * citations. Edges are from→to where from cites to.
 */
export async function GET() {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const ids = await kvSmembers("annotation:all_set");
  if (ids.length === 0) {
    return NextResponse.json({ nodes: [], edges: [] });
  }
  const docKeys = ids.map((id) => `annotation:${id}`);
  const raws = await kvMget(docKeys);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  for (const raw of raws) {
    if (!raw) continue;
    let doc: any;
    try {
      doc = JSON.parse(raw);
    } catch {
      continue;
    }
    nodes.push({
      id: doc.annotation_id,
      agent_id: doc.agent_id,
      agent_name: doc.agent_name ?? "anon",
      target: `${doc.target_type}:${doc.target_index}`,
    });
    if (doc.target_type === "annotation") {
      edges.push({
        from: doc.annotation_id,
        to: String(doc.target_index),
      });
    }
  }
  // Sort for stable output.
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.from.localeCompare(b.from));
  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      node_count: nodes.length,
      edge_count: edges.length,
      nodes,
      edges,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=120",
      },
    }
  );
}
