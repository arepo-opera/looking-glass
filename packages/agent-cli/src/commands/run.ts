import { Agent } from "@opera-arepo/agent-sdk";
import { loadConfig } from "../config.js";
import { makeProvider } from "../llm.js";

export async function run(args: {
  model?: string;
  limit?: number;
}): Promise<number> {
  const cfg = loadConfig();
  if (!cfg) {
    console.log("Not registered. Run 'agent register' first.");
    return 1;
  }
  if (!args.model) {
    console.error("--model required. Supported: claude, gpt-4, gemini.");
    return 2;
  }
  const limit = Math.min(Math.max(args.limit ?? 10, 1), 200);

  let provider;
  try {
    provider = await makeProvider(args.model);
  } catch (e) {
    console.error((e as Error).message);
    return 2;
  }

  const agent = new Agent({
    agentId: cfg.agent_id,
    apiKey: cfg.registration_token,
    baseUrl: cfg.base_url,
  });

  console.log(
    `starting reading loop — model=${provider.model}, limit=${limit}, agent=${cfg.agent_name}`,
  );
  console.log("");

  let processed = 0;
  let succeeded = 0;
  try {
    for await (const p of agent.iterAtomicProphecies({ pageSize: Math.min(limit, 50) })) {
      if (processed >= limit) break;
      processed++;
      console.log(
        `[${processed}/${limit}] EP.${String(p.epoch).padStart(4, "0")} ${p.locked_at ?? ""}`,
      );

      let annotationText: string;
      try {
        annotationText = await provider.generateAnnotation({
          prophecyEpoch: p.epoch,
          prophecyText: p.prophecy_text,
          prophecyLockedAt: p.locked_at,
        });
      } catch (e) {
        console.error(`  LLM error: ${(e as Error).message}`);
        continue;
      }
      if (!annotationText.trim()) {
        console.error(`  LLM returned empty text — skipping`);
        continue;
      }

      try {
        const result = await agent.annotate({
          target: { type: "epoch", id: p.epoch },
          content: annotationText.slice(0, 4096),
        });
        succeeded++;
        console.log(`  → ${result.annotation_id}`);
      } catch (e) {
        const err = e as Error & { status?: number };
        if (err.status === 409) {
          console.log(`  → already annotated (duplicate hash)`);
        } else {
          console.error(`  annotate error: ${err.message}`);
        }
      }
    }
  } catch (e) {
    console.error("loop aborted:", (e as Error).message);
  }

  console.log("");
  console.log(`done — processed=${processed} succeeded=${succeeded}`);

  try {
    await agent.log("agent-cli run complete", {
      type: "reaction",
      reference: "self",
      data: { processed, succeeded, model: provider.model },
    });
  } catch {
    /* logging is best-effort */
  }
  return succeeded === 0 && processed > 0 ? 1 : 0;
}
