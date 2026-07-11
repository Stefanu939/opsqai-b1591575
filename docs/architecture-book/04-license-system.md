# 4. License system

Two axes: Installation License + Module License. See Product Doc chapter 5.

## Architecture Decisions

- **AD-006: Per-module signed tokens, NOT a `modules[]` array.** Alternative rejected: a `modules[]` array on one Installation License couples every module renewal to the install token and forces re-issue of the whole envelope on any per-module change. Consequence: verifier must accept multiple tokens; heartbeat and bundle carry a set, not a single token.
- **AD-007: `license_version: 1` on day one.** Every token carries an explicit version so the verifier can reject future formats without ambiguity. Consequence: any future protocol change requires a bump, tested with a dual-verifier window.
- **AD-008: `key_id` on every token.** Enables rotation without breaking outstanding tokens.
- **AD-009: MC holds NO customer infrastructure secrets.** Enforced by schema review gate and security memory. Consequence: DR anchor is `install_id` + customer-held backups, not vendor-held infrastructure state.
