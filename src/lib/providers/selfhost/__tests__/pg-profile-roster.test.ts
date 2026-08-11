// Self-Hosted Users page regression: a freshly created local user must be
// listed even when its `company_id` column does not match the synthetic
// single-tenant id (the old COALESCE filter hid those rows).

import { describe, it, expect } from "vitest";

import { createPgProfileRepository } from "../pg-profile-repository.server";

const TENANT = "00000000-0000-0000-0000-000000000001";

function fakePool(rows: Array<Record<string, unknown>>) {
  const queries: string[] = [];
  return {
    queries,
    pool: {
      async query(sql: string) {
        queries.push(sql);
        return { rows, rowCount: rows.length };
      },
    } as never,
  };
}

function row(id: string, companyId: string | null) {
  return {
    id,
    email: `${id}@local`,
    company_id: companyId,
    first_name: "A",
    last_name: "B",
    full_name: "A B",
    avatar_url: null,
    phone: null,
    position: null,
    department: null,
    department_id: null,
    is_active: true,
    language_pref: "en",
    dashboard_layout: null,
    created_at: new Date("2026-01-01T00:00:00Z"),
    updated_at: new Date("2026-01-01T00:00:00Z"),
  };
}

describe("pg profile repository — single-tenant roster", () => {
  it("lists every local user regardless of the stored company_id", async () => {
    const { pool, queries } = fakePool([
      row("admin", TENANT),
      row("fresh", "11111111-1111-1111-1111-111111111111"),
      row("nullco", null),
    ]);
    const repo = createPgProfileRepository({ pool, tenantCompanyId: TENANT });

    const list = await repo.listByCompany(TENANT);

    expect(list.map((p) => p.userId)).toEqual(["admin", "fresh", "nullco"]);
    // No company filter is applied in SQL any more.
    expect(queries.join("\n")).not.toContain("COALESCE(company_id");
  });

  it("reports the synthetic tenant id for rows without a company", async () => {
    const { pool } = fakePool([row("nullco", null)]);
    const repo = createPgProfileRepository({ pool, tenantCompanyId: TENANT });
    const [p] = await repo.listByCompany(TENANT);
    expect(p.companyId).toBe(TENANT);
  });
});
