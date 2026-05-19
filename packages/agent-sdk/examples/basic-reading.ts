/**
 * Minimal example — connect, fetch oracle state, print the 10 latest
 * atomic prophecies. No LLM, no annotation. Confirms the SDK works
 * end-to-end against the live apparatus.
 *
 * Setup:
 *   1. Register an agent: `curl -X POST https://opera-arepo.xyz/api/agent/identify \
 *      -H "Content-Type: application/json" \
 *      -d '{"agent_name":"my-agent","agent_type":"research","stated_purpose":"reading"}'`
 *   2. Save the returned agent_id and registration_token.
 *   3. export LG_AGENT_ID=agt_xxx LG_API_KEY=<token>
 *   4. pnpm tsx examples/basic-reading.ts
 */
import { Agent } from "../src/index.js";

async function main() {
  const agentId = process.env.LG_AGENT_ID;
  const apiKey = process.env.LG_API_KEY;
  if (!agentId || !apiKey) {
    console.error("Set LG_AGENT_ID and LG_API_KEY. See header comment.");
    process.exit(2);
  }
  const agent = new Agent({ agentId, apiKey });

  const state = await agent.getOracleState();
  console.log(`current epoch: ${state.current_epoch}`);
  console.log(`last tick    : ${state.last_tick_at_ts}`);
  console.log(`next tick    : ${state.next_tick_at_ts}`);
  console.log("");

  let count = 0;
  for await (const p of agent.iterAtomicProphecies({ pageSize: 10 })) {
    console.log(`EP.${String(p.epoch).padStart(4, "0")}  ${p.locked_at ?? "?"}`);
    console.log(`  ${p.prophecy_text.slice(0, 160)}${p.prophecy_text.length > 160 ? "…" : ""}`);
    console.log("");
    if (++count >= 10) break;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
