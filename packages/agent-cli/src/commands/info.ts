import { Agent } from "@opera-arepo/agent-sdk";
import { loadConfig, configPath } from "../config.js";

export async function info(): Promise<number> {
  const cfg = loadConfig();
  if (!cfg) {
    console.log("Not registered. Run 'agent register' first.");
    return 1;
  }
  const agent = new Agent({
    agentId: cfg.agent_id,
    apiKey: cfg.registration_token,
    baseUrl: cfg.base_url,
  });
  try {
    const record = await agent.info();
    console.log("");
    console.log(`agent_id        : ${record.agent_id}`);
    console.log(`agent_name      : ${record.agent_name}`);
    if (record.agent_type) console.log(`agent_type      : ${record.agent_type}`);
    if (record.stated_purpose)
      console.log(`stated_purpose  : ${record.stated_purpose}`);
    if (record.contact) console.log(`contact         : ${record.contact}`);
    console.log(
      `registered_at   : ${new Date(record.registered_at_ts * 1000).toISOString()}`,
    );
    console.log(`base_url        : ${cfg.base_url}`);
    console.log(`config path     : ${configPath()}`);
    return 0;
  } catch (e) {
    console.error("failed to fetch agent record:", (e as Error).message);
    return 1;
  }
}
