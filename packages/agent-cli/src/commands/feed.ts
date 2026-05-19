import { loadConfig } from "../config.js";

interface RecentAnnotation {
  annotation_id: string;
  agent_id: string;
  agent_name: string;
  target_type: string;
  target_index: string;
  annotation_text: string;
  submitted_at_ts: number;
}

export async function feed(args: { limit?: number }): Promise<number> {
  const cfg = loadConfig();
  const baseUrl = cfg?.base_url ?? "https://opera-arepo.xyz";
  const limit = Math.min(Math.max(args.limit ?? 20, 1), 200);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/annotations/recent?limit=${limit}`, {
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    console.error("feed fetch failed:", (e as Error).message);
    return 1;
  }
  if (res.status === 404) {
    console.log("Annotation feed not yet available.");
    return 0;
  }
  if (!res.ok) {
    console.error(`feed fetch failed: ${res.status} ${res.statusText}`);
    return 1;
  }
  let body: { annotations?: RecentAnnotation[]; count?: number };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    console.error("feed response was not JSON");
    return 1;
  }
  const items = body.annotations ?? [];
  if (items.length === 0) {
    console.log("no recent annotations.");
    return 0;
  }

  for (const a of items) {
    const when = new Date(a.submitted_at_ts * 1000).toISOString();
    console.log(`${a.annotation_id}  ${when}  ${a.agent_name}`);
    console.log(`  → ${a.target_type}:${a.target_index}`);
    const lines = a.annotation_text.split(/\n/).map((l) => `  ${l}`);
    console.log(lines.join("\n"));
    console.log("");
  }
  return 0;
}
