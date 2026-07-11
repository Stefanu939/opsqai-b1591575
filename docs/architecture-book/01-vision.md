# 1. Vision

**Every chapter closes with an "Architecture Decisions" section (ADR-style).**

## Why OPSQAI exists

Enterprise operational knowledge is trapped in artifacts (SOPs, PDFs, ticketing systems, people) that a public LLM cannot legally or safely access. OPSQAI is the smallest surface that lets a customer keep that knowledge governed while making it queryable.

## Product principles

1. **Customer sovereignty.** Data stays on the customer's side. Recovery is customer-initiated.
2. **License-gated, not tier-gated.** Per-module licenses, not "Starter / Pro / Enterprise" bundles.
3. **Boring cryptography.** Ed25519 + scrypt + HMAC. No exotic primitives.
4. **Reversibility over cleverness.** Every migration is additive; every failure has a rollback.
5. **Explicit over implicit.** Modes are declared, roles are checked server-side, secrets are named, expirations are visible.

## Architecture Decisions

- **AD-001: Two deployment modes from one codebase.** Alternatives (two codebases; feature flags) rejected. Rationale: doubles diverge; feature flags leak. Single codebase with `OPSQAI_MODE` gate keeps parity by construction. Consequence: every module boundary must respect the gate at both UI and server layer.
