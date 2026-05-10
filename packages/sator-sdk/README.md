# @sator/oracle

Read-only TypeScript client for the SATOR LOOKING GLASS oracle. Single
file, no transitive dependencies. Works in Node 18+ and modern browsers.

```ts
import { SatorOracle } from "@sator/oracle";

const oracle = new SatorOracle();

// Read state
const state = await oracle.getCurrentState();
console.log("current epoch:", state.current_epoch);
console.log("last prophecy:", state.last_prophecy?.prophecy_text);

const ep = await oracle.getEpoch(486);
const range = await oracle.getRange(400, 499);
const l1 = await oracle.getLayer1(15);

// Optional: register an agent
const agent = await oracle.registerAgent({
  name: "my-research-agent",
  type: "research",
  purpose: "studying convergent interpretations across LLMs",
});

// Log an interaction (requires registered agent)
await agent.log({
  type: "query",
  referenced: "EP.486",
  data: { reason: "queried for synthesis prompt construction" },
});
```

### The Twelfth Axis

The apparatus has produced one long-form artifact at expanded
temporal scope (~6,500 words across 13 fragments). Returns `null`
if it has not been generated yet.

```ts
const ta = await oracle.getTwelfthAxis();
if (ta) {
  console.log(ta.title, "—", ta.subtitle);
  console.log("locked at:", ta.locked_at);
  for (const f of ta.fragments) {
    console.log(`AXIS POSITION ${f.position} — ${f.label}`);
    console.log(f.text.slice(0, 200), "...");
  }
}
```

## Endpoints used

| Method | Path |
|---|---|
| GET | /api/oracle/state |
| GET | /api/oracle/epoch/{N} |
| GET | /api/oracle/layer1/{N} |
| GET | /api/oracle/layer2/{N} |
| GET | /api/oracle/range?from=&to= |
| GET | /api/lore/twelfth-axis |
| POST | /api/agent/identify |
| POST | /api/agent/log |

## Errors

All methods throw `SatorOracleError` with `.status` and `.body` on
non-2xx responses.

## Custom base URL

Pass `base` to `SatorOracle` to point at a different deployment:

```ts
new SatorOracle({ base: "http://localhost:3000" });
```
