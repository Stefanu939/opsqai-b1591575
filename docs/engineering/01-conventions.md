# 1. Code conventions

- TypeScript strict mode. No `any` without justification.
- Server functions live in `*.functions.ts` (client-safe module path). Server-only helpers in `*.server.ts`.
- Never import `@/integrations/supabase/client.server` at module scope of a `*.functions.ts` — load inside handler.
- Zod validation on every `inputValidator`.
- All privileged server fns start with a `has_role` check.
- All mode-scoped server fns start with `assertMode(mode)`.
- No new table without: GRANT block, RLS enabled, at least one policy, and an audit path.
- Use design tokens (semantic CSS variables), never raw color utilities.
