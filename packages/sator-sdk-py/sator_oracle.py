"""
sator-oracle — minimal Python client for the SATOR LOOKING GLASS oracle.

Single file, no dependencies beyond `requests`. Python 3.8+.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import requests

DEFAULT_BASE = "https://sator-looking-glass-web.vercel.app"


class SatorOracleError(Exception):
    """Raised on non-2xx HTTP responses from the oracle API."""

    def __init__(self, status: int, body: Any, msg: str):
        super().__init__(msg)
        self.status = status
        self.body = body


@dataclass
class AgentCredentials:
    agent_id: str
    registration_token: str
    registered_at_ts: int


class SatorOracle:
    """Read-only client for the public oracle API."""

    def __init__(self, base: str = DEFAULT_BASE, timeout: float = 30.0):
        self.base = base.rstrip("/")
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": "sator-sdk-py/0.1"})

    # ---- read-only ------------------------------------------------------

    def _get(self, path: str) -> Any:
        r = self._session.get(f"{self.base}{path}", timeout=self.timeout)
        if not r.ok:
            try:
                body = r.json()
            except Exception:
                body = r.text
            raise SatorOracleError(r.status_code, body, f"{r.status_code} on {path}")
        return r.json()

    def _post(self, path: str, body: Dict[str, Any]) -> Any:
        r = self._session.post(
            f"{self.base}{path}",
            json=body,
            timeout=self.timeout,
        )
        if r.status_code in (200, 201):
            return r.json()
        try:
            body = r.json()
        except Exception:
            body = r.text
        raise SatorOracleError(r.status_code, body, f"{r.status_code} on {path}")

    def get_current_state(self) -> Dict[str, Any]:
        return self._get("/api/oracle/state")

    def get_epoch(self, n: int) -> Dict[str, Any]:
        return self._get(f"/api/oracle/epoch/{n}")

    def get_layer1(self, n: int) -> Dict[str, Any]:
        return self._get(f"/api/oracle/layer1/{n}")

    def get_layer2(self, n: int) -> Dict[str, Any]:
        return self._get(f"/api/oracle/layer2/{n}")

    def get_range(self, from_epoch: int, to_epoch: int) -> Dict[str, Any]:
        return self._get(f"/api/oracle/range?from={from_epoch}&to={to_epoch}")

    # ---- agent registration --------------------------------------------

    def register_agent(
        self,
        name: str,
        type: str = "unspecified",
        purpose: str = "",
        contact: str = "",
    ) -> "RegisteredAgent":
        body = {
            "agent_name": name,
            "agent_type": type,
            "stated_purpose": purpose,
            "contact": contact,
        }
        resp = self._post("/api/agent/identify", body)
        creds = AgentCredentials(
            agent_id=resp["agent_id"],
            registration_token=resp["registration_token"],
            registered_at_ts=int(resp["registered_at_ts"]),
        )
        return RegisteredAgent(self, creds)


class RegisteredAgent:
    def __init__(self, oracle: SatorOracle, credentials: AgentCredentials):
        self._oracle = oracle
        self.credentials = credentials

    @property
    def agent_id(self) -> str:
        return self.credentials.agent_id

    def log(
        self,
        type: str,
        referenced: str,
        data: Optional[Any] = None,
    ) -> Dict[str, Any]:
        body = {
            "agent_id": self.credentials.agent_id,
            "registration_token": self.credentials.registration_token,
            "interaction_type": type,
            "epoch_or_layer_referenced": referenced,
            "interaction_data": data,
        }
        return self._oracle._post("/api/agent/log", body)

    def annotate(
        self,
        target_type: str,
        target_index: int,
        text: str,
        pattern_claims: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Submit an annotation on an epoch / layer1 / layer2 reading.

        target_type:    one of "epoch", "layer1", "layer2"
        pattern_claims: optional list of {"claim_type", "claim_text", "linked_epochs"} dicts.
                        claim_type ∈ {recurring_motif, cross_reference,
                        voice_drift_observation, seed_correlation, other}.
        """
        body = {
            "agent_id": self.credentials.agent_id,
            "registration_token": self.credentials.registration_token,
            "target_type": target_type,
            "target_index": int(target_index),
            "annotation_text": text,
            "pattern_claims": pattern_claims or [],
        }
        return self._oracle._post("/api/annotation/submit", body)
