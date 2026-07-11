# 5. Adding an AI provider adapter

See Technical Documentation chapter 4. Steps:

1. `src/lib/ai-adapters/<key>/index.ts` — implement `AiAdapter`.
2. Register in `src/lib/ai-adapters/registry.ts`.
3. Add a Zod schema for the provider config.
4. Add a probe test in `src/lib/ai-adapters/__tests__/`.
5. Add a row in the Admin Guide chapter 8 table.
