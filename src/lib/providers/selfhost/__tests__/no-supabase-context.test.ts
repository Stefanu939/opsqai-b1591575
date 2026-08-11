import { describe, expect, it } from "vitest";
import {
  createSelfHostedDataContext,
  SELF_HOSTED_DATA_CONTEXT_ERROR,
} from "../no-supabase-context";

describe("self-hosted data context", () => {
  it("survives promise resolution (the regression that broke every requireAuth server fn)", async () => {
    const ctx = await (async () => createSelfHostedDataContext())();
    expect(ctx).toBeDefined();
  });

  it("returns undefined for inert reflection keys", () => {
    const ctx = createSelfHostedDataContext() as Record<string, unknown>;
    for (const key of ["then", "catch", "finally", "toJSON", "constructor"]) {
      expect(ctx[key]).toBeUndefined();
    }
    expect(() => JSON.stringify(ctx)).not.toThrow();
    expect(() => String(Object.prototype.toString.call(ctx))).not.toThrow();
  });

  it("still throws loudly on real Supabase data-client usage", () => {
    const ctx = createSelfHostedDataContext() as Record<string, unknown>;
    for (const key of ["from", "rpc", "storage", "auth", "functions", "channel"]) {
      expect(() => ctx[key]).toThrowError(new RegExp("has not been migrated to a repository"));
    }
  });

  it("names the accessed property and error type for diagnostics", () => {
    const ctx = createSelfHostedDataContext() as Record<string, unknown>;
    try {
      void ctx.from;
      throw new Error("expected throw");
    } catch (e) {
      const err = e as Error;
      expect(err.name).toBe("SelfHostedSupabaseAccessError");
      expect(err.message).toContain("accessed: from");
      expect(err.message).toContain(SELF_HOSTED_DATA_CONTEXT_ERROR);
    }
  });

  it("rejects writes through the context", () => {
    const ctx = createSelfHostedDataContext() as Record<string, unknown>;
    expect(() => {
      ctx.from = () => undefined;
    }).toThrow();
  });
});
