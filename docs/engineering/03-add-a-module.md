# 3. Adding a new module

1. Add key to `MODULE_CATALOG` (frozen list).
2. Add license `kind = 'module'` support (already generic).
3. Add enforcement path in `src/lib/license-enforcement.server.ts`.
4. Add UI gate in the module's route (via `useModuleAccess(key)`).
5. Add module-level docs entry (Product Doc chapter 4 table + Admin Guide chapter 13).
6. Extend `dr-scenarios.ts` if the module introduces DR implications.
