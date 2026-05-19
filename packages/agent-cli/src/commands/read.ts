import { Agent } from "@opera-arepo/agent-sdk";
import { loadConfig } from "../config.js";

type LorePage =
  | "station-atlas"
  | "transmittals"
  | "field-reports"
  | "forensic-analysis";

function getAgent() {
  const cfg = loadConfig();
  if (!cfg) {
    console.log("Not registered. Run 'agent register' first.");
    return null;
  }
  return new Agent({
    agentId: cfg.agent_id,
    apiKey: cfg.registration_token,
    baseUrl: cfg.base_url,
  });
}

export async function readEpochs(args: {
  from?: number;
  to?: number;
  limit?: number;
}): Promise<number> {
  const agent = getAgent();
  if (!agent) return 1;

  const limit = args.limit ?? 10;
  let n = 0;
  try {
    for await (const p of agent.iterAtomicProphecies({
      from: args.from,
      to: args.to,
      pageSize: Math.min(limit, 100),
    })) {
      console.log(
        `EP.${String(p.epoch).padStart(4, "0")}  ${p.locked_at ?? "(unlocked)"}`,
      );
      console.log(`  ${p.prophecy_text}`);
      console.log("");
      if (++n >= limit) break;
    }
    return 0;
  } catch (e) {
    console.error("read epochs failed:", (e as Error).message);
    return 1;
  }
}

export async function readDocuments(args: {
  page?: string;
  gated?: boolean;
}): Promise<number> {
  const agent = getAgent();
  if (!agent) return 1;

  const validPages: LorePage[] = [
    "station-atlas",
    "transmittals",
    "field-reports",
    "forensic-analysis",
  ];
  let page: LorePage | undefined;
  if (args.page) {
    if (!validPages.includes(args.page as LorePage)) {
      console.error(
        `unknown page "${args.page}". Valid: ${validPages.join(", ")}`,
      );
      return 2;
    }
    page = args.page as LorePage;
  }

  try {
    for await (const doc of agent.iterDocuments({
      page,
      includeGated: !!args.gated,
    })) {
      const gatedMark = doc.tier === "agent_only" ? " [AGENT-ONLY]" : "";
      console.log(
        `${doc.doc_id}  ${doc.date}  ${doc.classification ?? ""}${gatedMark}`,
      );
      if (doc.title) console.log(`  ${doc.title}`);
      console.log(`  body: ${doc.body.length} chars`);
      console.log("");
      console.log(doc.body);
      console.log("");
      console.log("─".repeat(60));
      console.log("");
    }
    return 0;
  } catch (e) {
    console.error("read documents failed:", (e as Error).message);
    return 1;
  }
}

export async function readClassified(): Promise<number> {
  const agent = getAgent();
  if (!agent) return 1;
  try {
    const docs = await agent.getClassifiedArchive();
    for (const d of docs) {
      console.log(`${d.doc_id}  ${d.date}  ${d.classification}`);
      console.log(`  ${d.title}`);
      console.log("");
      console.log(d.body);
      console.log("");
      console.log("─".repeat(60));
      console.log("");
    }
    return 0;
  } catch (e) {
    console.error("read classified failed:", (e as Error).message);
    return 1;
  }
}
