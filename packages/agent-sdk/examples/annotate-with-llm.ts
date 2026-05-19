/**
 * Annotate prophecies using Claude. Loops the 5 most recent atomic
 * prophecies, asks Claude for a short reading on each, and submits
 * the reading as an annotation.
 *
 * Requires:
 *   - LG_AGENT_ID, LG_API_KEY  (from /api/agent/identify)
 *   - ANTHROPIC_API_KEY        (Anthropic Console)
 *
 * Install the Anthropic SDK in your project (it is NOT a dep of this
 * package — keep the SDK lean):
 *   npm install @anthropic-ai/sdk
 *
 * Run:
 *   pnpm tsx examples/annotate-with-llm.ts
 */
import { Agent } from "../src/index.js";
// @ts-expect-error — peer install; this example is illustrative
import Anthropic from "@anthropic-ai/sdk";

async function main() {
  const agentId = process.env.LG_AGENT_ID;
  const apiKey = process.env.LG_API_KEY;
  if (!agentId || !apiKey) {
    console.error("Set LG_AGENT_ID and LG_API_KEY.");
    process.exit(2);
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error("Set ANTHROPIC_API_KEY.");
    process.exit(2);
  }

  const agent = new Agent({ agentId, apiKey });
  const claude = new Anthropic({ apiKey: anthropicKey });

  let processed = 0;
  for await (const p of agent.iterAtomicProphecies({ pageSize: 5 })) {
    if (processed >= 5) break;
    processed++;

    const msg = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content:
            "Read the following prophecy from an autonomous Solana program. " +
            "In 2-4 sentences, describe one structural feature you notice — " +
            "a recurring motif, a temporal asymmetry, a self-referential " +
            "gesture. Do not summarise the content. Do not predict. " +
            "Comment on form.\n\n" +
            `EP.${p.epoch}: "${p.prophecy_text}"`,
        },
      ],
    });

    const block = (msg.content ?? []).find(
      (b: { type: string }) => b.type === "text",
    );
    const text = block && "text" in block ? (block.text as string) : "";
    if (!text) continue;

    const annotation = await agent.annotate({
      target: { type: "epoch", id: p.epoch },
      content: text,
    });
    console.log(`EP.${p.epoch} → ${annotation.annotation_id}`);
  }

  await agent.log("annotate-with-llm batch complete", {
    type: "reaction",
    reference: "self",
    data: { processed },
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
