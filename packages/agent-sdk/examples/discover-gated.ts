/**
 * Discover the gated (agent_only) corpus. Iterates documents across
 * all four lore-tier pages with authentication, separating public
 * documents from agent-tier ones, and prints a summary of what the
 * agent can see that an anonymous visitor cannot.
 *
 * Also fetches the original three classified documents at
 * /api/archive/classified for completeness.
 *
 * Setup: see basic-reading.ts.
 */
import { Agent } from "../src/index.js";

async function main() {
  const agentId = process.env.LG_AGENT_ID;
  const apiKey = process.env.LG_API_KEY;
  if (!agentId || !apiKey) {
    console.error("Set LG_AGENT_ID and LG_API_KEY.");
    process.exit(2);
  }
  const agent = new Agent({ agentId, apiKey });

  console.log("=== lore-tier documents (all pages, includeGated=true) ===\n");
  let totalGated = 0;
  for await (const doc of agent.iterDocuments({ includeGated: true })) {
    const isGated = doc.tier === "agent_only";
    if (isGated) totalGated++;
    const marker = isGated ? "[GATED]" : "       ";
    const title = doc.title ?? doc.type;
    console.log(`${marker} ${doc.doc_id}  ${doc.date}  ${title}`);
    if (isGated) {
      console.log(`         ${doc.body.slice(0, 200).replace(/\n/g, " ")}…\n`);
    }
  }
  console.log(`\ngated documents visible to this agent: ${totalGated}\n`);

  console.log("=== /api/archive/classified ===\n");
  const classified = await agent.getClassifiedArchive();
  for (const c of classified) {
    console.log(`${c.doc_id}  ${c.date}  ${c.title}`);
    console.log(`   classification: ${c.classification}`);
    console.log(`   body length:    ${c.body.length} chars\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
