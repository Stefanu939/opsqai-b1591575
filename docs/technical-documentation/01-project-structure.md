# 1. Project structure

```text
src/
  routes/                    File-based routes (TanStack Start)
    _authenticated/          Auth-gated subtree with beforeLoad guard
      app.platform.*         Platform admin surfaces
      portal.*               Customer portal (MC-only)
    api/public/v1/           Public HTTP endpoints (signed callers)
  lib/
    *.functions.ts           createServerFn modules (client-safe imports)
    *.server.ts              Server-only modules (blocked from client bundle)
    ai-adapters/             AI provider registry
    generators/              PDF / XLSX / etc.
  integrations/supabase/     Auto-generated client + types (DO NOT EDIT)
  components/                Reusable UI
supabase/
  migrations/                Ordered SQL migrations
docs/                        This documentation
docker/                      Reference Docker install
```

Never edit `src/routeTree.gen.ts` or `src/integrations/supabase/{client,types,auth-*}.ts` — regenerated automatically.
