# 1. Security overview

**Audience:** Customer CISO, security architect, compliance officer.
**Scope:** How OPSQAI implements confidentiality, integrity and availability.
**Non-goals:** Certification claims. This document describes controls; certifications are handled separately per customer agreement.
**Version:** 1.0 · **Last updated:** 2026-07-11

## Architectural posture

- **Single-tenant per install.** No shared datastore between customers.
- **Vendor holds no customer secrets.** Enforced by schema review; recorded in the project's security memory.
- **Two mode-gated deployments** (`mc` vs `selfhost`) from one codebase, enforced client-side AND server-side.
- **Cryptographic root of trust:** Ed25519 signing keys held only in the Management Center. Keys are versioned (`key_id`) and rotatable without downtime for installs.

## Defense in depth

Every governance-relevant action passes at least two independent checks:

1. Route match (mode gate + auth guard).
2. RLS policy on the target table.
3. `has_role()` security-definer check in privileged server functions.
4. Audit-log write.

## What must never happen

- A customer secret (PG password, SMTP creds, AI key, MinIO keys) landing in the Management Center database.
- A privileged server function callable without authentication.
- A role check performed against a client-controlled field (localStorage, request header).
- A license accepted without full Ed25519 signature verification against a known `key_id`.
- A break-glass secret stored in plaintext.

Each of these is asserted by tests and monitored by the security-memory document.
