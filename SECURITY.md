# Security policy

## Reporting a vulnerability

Please report security issues to **security@opsqai.de**. For sensitive reports, encrypt with our PGP key (fingerprint published at https://opsqai.de/security).

We commit to:

- Acknowledging receipt within **24 hours**.
- Providing an initial triage within **72 hours**.
- Coordinating disclosure with the reporter.
- Publishing a security-relevant release manifest for exploitable issues.

## In scope

- The `opsqai.de` Management Center and Customer Portal.
- The self-hosted install codebase (this repository).
- The licensing, DR, and update chains.

## Out of scope

- Attacks that require prior compromise of a customer's own infrastructure (their PG, S3, or AI provider account).
- Third-party services used by a customer's install (their choice).
- Vulnerabilities in dependencies that we have not yet had a chance to update; please still report so we can coordinate the fix.

## Severity ladder

See `docs/security-documentation/11-incident-response.md`.

## Safe harbor

Good-faith security research conducted in accordance with this policy will not be pursued through legal channels. Do not access data that is not yours; do not degrade service.
