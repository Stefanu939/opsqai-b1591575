# 1. Code conventions

- TypeScript strict mode. No `any` without justification.
- Server functions live in `*.functions.ts` (client-safe module path). Server-only helpers in `*.server.ts`.
- Never import `@/integrations/supabase/client.server` at module scope of a `*.functions.ts` — load inside handler.
- Zod validation on every `inputValidator`.
- All privileged server fns start with a `has_role` check.
- All mode-scoped server fns start with `assertMode(mode)`.
- No new table without: GRANT block, RLS enabled, at least one policy, and an audit path.
- Use design tokens (semantic CSS variables), never raw color utilities. This keeps
  light/dark and per-scope theming working; it does not pin any particular palette.
- The design currently implemented is described in `docs/design/current-design.md`. Match it
  for normal UI work. When a visual change is explicitly requested, change the tokens and
  rewrite that file to match the new implementation — do not keep the old description.
