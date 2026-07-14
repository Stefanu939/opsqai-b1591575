import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  evaluateModuleAccess,
  type LicenseRow,
} from "@/lib/license-enforcement.server";

/**
 * End-to-end proof that Analytics fns are actually gated by license state.
 *
 * We exercise the same pipe the server fn uses:
 *   handler -> assertModuleForCompany(company_id, "analytics")
 *           -> companies.install_id lookup (admin client)
 *           -> assertModule(install_id, "analytics")
 *           -> requireModule (admin licenses read)
 *           -> evaluateModuleAccess (pure)
 *
 * `@/integrations/supabase/client.server` is mocked so `supabaseAdmin`
 * returns the fixtures below, letting the assertion propagate a real 403
 * Response (or resolve successfully) exactly as it would in production.
 */

const state: {
  companyInstall: Record<string, string | null>;
  licensesByInstall: Record<string, LicenseRow[]>;
} = { companyInstall: {}, licensesByInstall: {} };

vi.mock("@/integrations/supabase/client.server", () => {
  const makeFromCompanies = () => ({
    select: (_cols: string) => ({
      eq: (_col: string, val: string) => ({
        maybeSingle: async () => ({
          data: { install_id: state.companyInstall[val] ?? null },
          error: null,
        }),
      }),
    }),
  });
  const makeFromLicenses = () => ({
    select: (_cols: string) => ({
      eq: (_col: string, val: string) => ({
        then: undefined,
        // supabase-js query builders resolve when awaited; provide a thenable
        // via an object with .data/.error is not enough — we emulate the
        // await directly by returning a Promise-like from eq().
      }),
    }),
  });
  const supabaseAdmin = {
    from: (table: string) => {
      if (table === "companies") return makeFromCompanies();
      if (table === "licenses") {
        return {
          select: (_cols: string) => ({
            eq: async (_col: string, val: string) => ({
              data: state.licensesByInstall[val] ?? [],
              error: null,
            }),
          }),
        };
      }
      throw new Error("unexpected table: " + table);
    },
  };
  return { supabaseAdmin };
});

async function callProtected(companyId: string): Promise<{ status: number; body: any }> {
  // Import lazily so the mock is in place first.
  const { assertModuleForCompany } = await import("@/lib/license-enforcement.server");
  try {
    await assertModuleForCompany(companyId, "analytics");
    // Simulate an Analytics server fn returning something on success.
    return { status: 200, body: { paths: [] } };
  } catch (e) {
    if (e instanceof Response) {
      const body = await e.json();
      return { status: e.status, body };
    }
    throw e;
  }
}

const COMPANY = "11111111-1111-1111-1111-111111111111";
const INSTALL = "acme-cloud";

describe("license enforcement — Analytics module (end-to-end via assertModuleForCompany)", () => {
  beforeEach(() => {
    state.companyInstall = {};
    state.licensesByInstall = {};
  });

  it("(a) NO module license → 403 with reason 'no_module_license'", async () => {
    state.companyInstall[COMPANY] = INSTALL;
    // Valid install license, but NO analytics module license.
    state.licensesByInstall[INSTALL] = [
      {
        kind: "install",
        module_key: null,
        revoked: false,
        suspended: false,
        expires_at: "2099-01-01T00:00:00Z",
      },
    ];
    const res = await callProtected(COMPANY);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "license_denied",
      reason: "no_module_license",
      module: "analytics",
    });
  });

  it("(b) valid, current, non-revoked analytics license → success (200)", async () => {
    state.companyInstall[COMPANY] = INSTALL;
    state.licensesByInstall[INSTALL] = [
      {
        kind: "install",
        module_key: null,
        revoked: false,
        suspended: false,
        expires_at: "2099-01-01T00:00:00Z",
      },
      {
        kind: "module",
        module_key: "analytics",
        revoked: false,
        suspended: false,
        expires_at: "2099-01-01T00:00:00Z",
      },
    ];
    const res = await callProtected(COMPANY);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ paths: [] });
  });

  it("(c) expired analytics license → 403 with reason 'module_expired'", async () => {
    state.companyInstall[COMPANY] = INSTALL;
    state.licensesByInstall[INSTALL] = [
      {
        kind: "install",
        module_key: null,
        revoked: false,
        suspended: false,
        expires_at: "2099-01-01T00:00:00Z",
      },
      {
        kind: "module",
        module_key: "analytics",
        revoked: false,
        suspended: false,
        expires_at: "2020-01-01T00:00:00Z",
      },
    ];
    const res = await callProtected(COMPANY);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "license_denied",
      reason: "module_expired",
      module: "analytics",
    });
  });

  it("revoked analytics license → 403 with reason 'module_revoked'", async () => {
    state.companyInstall[COMPANY] = INSTALL;
    state.licensesByInstall[INSTALL] = [
      {
        kind: "install",
        module_key: null,
        revoked: false,
        suspended: false,
        expires_at: "2099-01-01T00:00:00Z",
      },
      {
        kind: "module",
        module_key: "analytics",
        revoked: true,
        suspended: false,
        expires_at: "2099-01-01T00:00:00Z",
      },
    ];
    const res = await callProtected(COMPANY);
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe("module_revoked");
  });

  it("company with no install_id bridge → 403 'no_install_license'", async () => {
    // companies.install_id is NULL for this company.
    const res = await callProtected(COMPANY);
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe("no_install_license");
  });
});

describe("license enforcement — pure evaluator", () => {
  const now = new Date("2026-07-13T00:00:00Z");
  const valid = (extra: Partial<LicenseRow> = {}): LicenseRow => ({
    kind: "install",
    module_key: null,
    revoked: false,
    suspended: false,
    expires_at: "2099-01-01T00:00:00Z",
    ...extra,
  });

  it("basic modules require only a valid install license", () => {
    const r = evaluateModuleAccess([valid()], "acme", "chat", now);
    expect(r.ok).toBe(true);
  });

  it("unknown module key rejected", () => {
    const r = evaluateModuleAccess([valid()], "acme", "not_a_module", now);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("unknown_module");
  });

  it("suspended install blocks everything", () => {
    const r = evaluateModuleAccess([valid({ suspended: true })], "acme", "analytics", now);
    expect(r.reason).toBe("install_suspended");
  });
});
