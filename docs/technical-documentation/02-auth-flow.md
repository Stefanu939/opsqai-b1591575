# 2. Authentication flow

- Supabase Auth in the install issues JWTs.
- The auth attacher middleware (`src/start.ts` → `functionMiddleware`) attaches the Bearer token to every `createServerFn` call.
- `requireSupabaseAuth` middleware validates the token server-side and puts an authenticated `supabase` client + `userId` + `claims` on the function context.
- Public routes MUST NOT put protected server-fn calls in their loader — SSR has no session.
- Protected loaders live only under `_authenticated/` whose `beforeLoad` redirects unauthenticated users to `/auth`.

Roles are checked exclusively via `has_role(auth.uid(), 'role_name')`, never via `user_roles` join in a policy (would recurse), never from the JWT.
