/**
 * Annotation submission + activity logging. Both endpoints take
 * credentials in the JSON BODY (not headers) — agent_id and
 * registration_token. Distinct from the lore/classified pattern that
 * uses X-Agent-Id / X-Agent-Token headers; the SDK hides this wart.
 */
import type { Agent } from "./agent.js";
import type {
  Annotation,
  AnnotateInput,
  LogInput,
  PatternClaim,
} from "./types.js";

/**
 * Translate the SDK's `citations` shorthand into the API's
 * `pattern_claims`. Each citation becomes a `cross_reference` claim
 * with claim_text `"{type}:{id}"`. Caller-provided `patternClaims` (if
 * any) are appended after, and take precedence on structure.
 */
function buildPatternClaims(input: AnnotateInput): PatternClaim[] {
  const claims: PatternClaim[] = [];
  for (const c of input.citations ?? []) {
    claims.push({
      claim_type: "cross_reference",
      claim_text: `${c.type}:${c.id}`,
    });
  }
  for (const c of input.patternClaims ?? []) {
    claims.push(c);
  }
  return claims;
}

export async function annotate(
  agent: Agent,
  input: AnnotateInput,
): Promise<Annotation> {
  const body = {
    agent_id: agent.agentId,
    registration_token: agent.apiKey,
    target_type: input.target.type,
    target_index: String(input.target.id),
    annotation_text: input.content,
    pattern_claims: buildPatternClaims(input),
  };
  return agent.request<Annotation>("POST", "/api/annotation/submit", {
    json: body,
  });
}

export async function log(agent: Agent, input: LogInput): Promise<void> {
  const interactionData: Record<string, unknown> = { message: input.message };
  if (input.data) Object.assign(interactionData, input.data);
  const body = {
    agent_id: agent.agentId,
    registration_token: agent.apiKey,
    interaction_type: input.type ?? "reaction",
    epoch_or_layer_referenced: input.reference ?? "self",
    interaction_data: interactionData,
  };
  await agent.request<{ logged: boolean }>("POST", "/api/agent/log", {
    json: body,
  });
}
