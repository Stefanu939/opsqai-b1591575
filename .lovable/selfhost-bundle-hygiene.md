# Self-Hosted Bundle Hygiene

Wave D introduced a strict boundary between Cloud and Self-Hosted (SH) code.
Wave E hardens that boundary with tests, CI wiring, and this runbook.

## The rule

Nothing under `@/integrations/supabase/*`, `@/lib/providers/cloud/*`, or
`@supabase/*` may end up in a Self-Hosted build's `dist/`. The bundle must
contain zero Supabase SDK code, zero service-role env references, and zero
OPSQAI Cloud identifiers (project ref, publishable key).

## How the boundary is enforced

1. **Aliasing** — `opsqai-windows/build/vite-selfhost-stub-plugin.ts`
   provides `opsqaiSelfhostAliases()`. `vite.config.ts` applies it when
   `VITE_OPSQAI_MODE=selfhost`, redirecting every Cloud import to
   `src/lib/providers/stubs/cloud-stub.ts`.
2. **Throwing stub** — `cloud-stub.ts` exports a `Proxy` that throws on
   any property access, call, or `new`. Any code path that survives
   tree-shaking and reaches it crashes with a clean actionable message
   instead of silently pretending Supabase exists.
3. **Runtime gate** — `getCloudSupabase()` and `getCloudSupabaseAdmin()`
   in `src/lib/providers/not-available.ts` throw
   `FeatureNotAvailableError` on SH BEFORE importing the Cloud module,
   so even a mistaken call from a Cloud-only server fn fails cleanly.
4. **Bundle scanner** — `opsqai-windows/build/verify-bundle.mjs` scans
   `dist/` for banned patterns after every SH build.
5. **Test coverage** —
   - `opsqai-windows/build/__tests__/verify-bundle.test.ts` proves the
     scanner catches every leak class on synthetic fixtures.
   - `src/lib/providers/__tests__/cloud-stub.test.ts` proves the stub
     throws on every access shape.
   - `src/lib/providers/__tests__/not-available.test.ts` proves the
     Cloud accessors throw on SH before touching `client.server`.

## Local verification

```bash
bun run build:selfhosted:verify   # build + scan; non-zero on any leak
bun run test                      # runs stub + scanner + everything else
```

## Adding a new feature

Before importing any Cloud module in a server fn or component:

1. Decide: is this Cloud-only, SH-only, or shared?
2. **Cloud-only** — call `getCloudSupabase(context, "feature-name")`
   inside the handler; never import `@/integrations/supabase/client`
   directly.
3. **SH-only** — use the provider registry
   (`getKnowledgeRepository()`, `getStorageProvider()`, etc.).
4. **Shared** — put the logic in a repository interface with a
   Cloud + SH implementation; expose it via the registry.

## Adding a new banned pattern

Edit `bannedPatterns` in `opsqai-windows/build/verify-bundle.mjs`.
Every rule must have:

- `id` — kebab-case slug used in error output and tests.
- `pattern` — global RegExp.
- `hint` — one-line remediation shown to the developer.
- `allowIn` — optional list of path substrings where the pattern is
  legitimately present (Cloud-only route handlers that don't execute in
  SH, the `not-available` dynamic-import site, etc.).

Then add a fixture test to `verify-bundle.test.ts` proving the pattern
fires — otherwise the rule can silently regress.
