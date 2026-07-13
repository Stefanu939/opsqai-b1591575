# 11. Incident response

## Reporting to OPSQAI

- security@opsqai.de (PGP key on `/security` and in `SECURITY.md`).
- Response SLA: acknowledgement within 24 h; triage within 72 h; fix or mitigation on a severity-based schedule.
- Coordinated disclosure — see `SECURITY.md`.

## Inside a customer install

The customer runs their own IR process. OPSQAI's role is limited to:

- Issuing Bootstrap Recovery Tokens (only after out-of-band verification of the requester).
- Rotating signing keys and emitting new activation bundles when the compromise reaches the customer's license chain.
- Publishing security-relevant release manifests.

## What OPSQAI cannot do

- Access the customer's install without their action.
- Read customer operational data.
- Reset a customer's admin password remotely.

## Severity ladder

| Sev | Definition                    | Example                  |
| --- | ----------------------------- | ------------------------ |
| S0  | Confirmed active exploitation | Signing-key compromise   |
| S1  | High-likelihood exploit path  | RLS bypass in production |
| S2  | Meaningful weakness, no PoC   | Missing rate limit       |
| S3  | Hardening opportunity         | Log verbosity            |
