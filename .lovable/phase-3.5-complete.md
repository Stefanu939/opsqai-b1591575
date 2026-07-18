# Phase 3.5 — Migration Complete

Waves A through F of the Self-Hosted / Cloud provider migration are done.
This doc is the operator-facing summary and the ongoing developer contract.

## What each wave delivered

| Wave | Scope | Outcome |
|------|-------|---------|
| A | Provider surface expansion | Interfaces + registries for auth, users, storage, KB, backup, cipher, notifications, licensing, telemetry |
| B | Auth & users (browser) | `AuthContext` + auth routes go through `getBrowserAuthProvider()` |
| C | Server-side data (40+ server fns) | `.functions.ts` files route through repositories; Cloud-only features gated via `getCloudSupabase` / `getCloudSupabaseAdmin` |
| D | Build-time aliasing | `VITE_OPSQAI_MODE=selfhost` rewrites `@/integrations/supabase/*`, `@supabase/*`, `@/lib/providers/cloud/*` to a throwing stub. SDK is tree-shaken out. |
| E | Runtime + CI guardrails | Stub/gate unit tests, `bun run test`, hygiene doc, phase-10 runbook |
| F | Regression guard | `verify:source-imports` static check keeps the direct-import surface shrinking |

## Developer contract

Adding a feature that touches data or auth:

1. Define / extend a provider interface in `src/lib/providers/**` (never in a feature file).
2. Implement the Self-Hosted binding under `src/lib/providers/selfhost/`.
3. Implement the Cloud binding under `src/lib/providers/cloud/`.
4. Consume via `getXxxProvider()` from feature code — never `import { supabase }` directly.

If the feature is Cloud-only (no SH parity yet):

- Server: gate with `getCloudSupabase(context, "<feature>")` or `getCloudSupabaseAdmin("<feature>")` from `src/lib/providers/not-available.ts`.
- UI: wrap with `<CapabilityGate capability="…">`.
- Do NOT add the file to `LEGACY_ALLOWED` in `verify-source-imports.mjs`.

## Guards in the pipeline

`bun run build:selfhosted:verify` runs three checks:

1. `verify:source-imports` — no new direct SDK imports outside allow-listed Cloud-only files.
2. `build:selfhosted` — Vite build with the aliasing plugin.
3. `verify:selfhost-bundle` — post-build scan of `dist/` for banned strings and vendor chunks.

All three must pass before an installer is cut. `build.ps1` chains them.

## The `LEGACY_ALLOWED` list

`opsqai-windows/build/verify-source-imports.mjs` tracks 40 files that still
name `@/integrations/supabase/*` or `@supabase/*` directly. They are safe
today because Wave D aliases those imports to the throwing stub in the SH
bundle — the code exists but never executes.

The list is a shrinking backlog:

- Never grow it. New violations fail CI.
- When you migrate a file off the direct SDK, remove it from the set. The
  verifier warns about stale entries so this stays honest.
