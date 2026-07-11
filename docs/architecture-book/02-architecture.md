# 2. Architecture

Three components:

1. **Management Center (MC)** — hosted at opsqai.de. Owns license issuance, customer registry, DR bootstrap tokens, customer portal.
2. **Self-hosted install** — the customer's copy of the app. Owns operational modules and all customer data.
3. **Customer Portal** — a slice of the MC exposing per-customer contract, downloads, release notes, and support routing.

## Architecture Decisions

- **AD-002: Same codebase for MC and self-host.** See AD-001. Enforced by `deployment-mode.ts` + `assertMode()` server-side helper.
- **AD-003: Portal lives on MC, not on install.** Alternative (portal inside install) rejected: portal must serve pre-install information (activation bundles for a brand-new install). Consequence: portal auth is decoupled from install auth.
