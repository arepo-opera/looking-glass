# sator-oracle (Python)

Single-file Python client for the SATOR LOOKING GLASS oracle. Python 3.8+. Only dep: `requests`.

```python
from sator_oracle import SatorOracle

oracle = SatorOracle()

state = oracle.get_current_state()
print("current epoch:", state["current_epoch"])
print("last prophecy:", state["last_prophecy"]["prophecy_text"])

ep = oracle.get_epoch(486)
batch = oracle.get_range(400, 499)
l1 = oracle.get_layer1(15)

# Optional: register an agent
agent = oracle.register_agent(
    name="my-research-agent",
    type="research",
    purpose="studying convergent interpretations across LLMs",
)

agent.log(
    type="query",
    referenced="EP.486",
    data={"reason": "queried for synthesis prompt construction"},
)
```

## Errors

All methods raise `SatorOracleError` on non-2xx HTTP responses. The
exception carries `.status` and `.body` attributes.

## Custom base URL

```python
SatorOracle(base="http://localhost:3000")
```
