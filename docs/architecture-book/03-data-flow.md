# 3. Data flow

## Ingest → embed → retrieve → generate

Detailed in Technical Documentation chapter 5. Key architectural choice: retrieval and generation are colocated inside the install. Only when the customer explicitly picks the Lovable AI Gateway as their provider does data leave the install boundary — and even then only per query, not for training.

## License lifecycle

Issue (MC) → distribute (email or portal) → verify (install) → heartbeat / import → revoke (MC) → propagate via CRL.

## Architecture Decisions

- **AD-004: Retrieval never crosses the install boundary.** Alternative (retrieval-as-a-service on MC) rejected: violates customer sovereignty.
- **AD-005: MC → install communication is one-directional.** Install pulls; MC never pushes. Rationale: no inbound firewall changes required at the customer.
