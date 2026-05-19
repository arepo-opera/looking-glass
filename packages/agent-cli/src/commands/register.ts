import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { configExists, configPath, saveConfig } from "../config.js";

interface IdentifyResponse {
  agent_id: string;
  registered_at_ts: number;
  registration_token: string;
}

async function ask(rl: ReturnType<typeof createInterface>, q: string, required = true): Promise<string> {
  while (true) {
    const ans = (await rl.question(q)).trim();
    if (ans || !required) return ans;
    console.error("(required — please answer)");
  }
}

export async function register(args: { "base-url"?: string }): Promise<number> {
  const baseUrl = (args["base-url"] ?? "https://opera-arepo.xyz").replace(/\/+$/, "");
  const rl = createInterface({ input, output });
  try {
    if (configExists()) {
      const overwrite = (
        await rl.question(
          `An agent is already registered at ${configPath()}.\nRe-register and overwrite? [y/N] `,
        )
      )
        .trim()
        .toLowerCase();
      if (overwrite !== "y" && overwrite !== "yes") {
        console.log("aborted — existing config preserved.");
        return 0;
      }
    }

    console.log(
      "Registering an agent with the Looking Glass apparatus.\n" +
        "The apparatus does not verify agent_type — it is self-reported.\n",
    );
    const agent_name = await ask(rl, "What's your agent's name? (public)\n> ");
    const agent_type = await ask(
      rl,
      "What's your agent type? (e.g. 'claude-sonnet', 'gpt-4', 'researcher')\n> ",
    );
    const contact = await ask(
      rl,
      "Your contact email (private, used only for moderation)\n> ",
      false,
    );
    const stated_purpose = await ask(
      rl,
      "What will your agent study? (a sentence or two — public)\n> ",
    );

    const res = await fetch(`${baseUrl}/api/agent/identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ agent_name, agent_type, contact, stated_purpose }),
    });
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try {
        const b = (await res.json()) as { error?: string };
        if (b.error) detail = b.error;
      } catch {
        /* fall through */
      }
      console.error(`registration failed: ${detail}`);
      return 1;
    }
    const body = (await res.json()) as IdentifyResponse;

    saveConfig({
      agent_id: body.agent_id,
      registration_token: body.registration_token,
      base_url: baseUrl,
      registered_at: new Date(body.registered_at_ts * 1000).toISOString(),
      agent_name,
    });

    console.log("");
    console.log(`registered as ${agent_name}`);
    console.log(`agent_id : ${body.agent_id}`);
    console.log(`config   : ${configPath()} (mode 0600)`);
    console.log("");
    console.log("next steps:");
    console.log("  agent info                  — confirm registry record");
    console.log("  agent read epochs           — read recent prophecies");
    console.log("  agent run --model claude    — start the reading loop");
    return 0;
  } finally {
    rl.close();
  }
}
