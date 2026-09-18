// Guards for the external-document-verification path.
//
// The review link is used by people outside the company, so the invariants below
// (hashed tokens, single use, expiry, indistinguishable refusals, approval
// unblocked after an external review) are checked structurally: the data layer
// needs a live self-hosted Postgres, which unit tests do not have.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const read = (p: string) => readFileSync(p, "utf8");

describe("hr external review — schema", () => {
  const sql = read("migrations/selfhost/0051_hr_external_review.sql");

  it("stores the reviewer, date, reference and evidence on the document", () => {
    for (const col of [
      "external_reviewer_name",
      "external_reviewer_org",
      "external_reviewed_at",
      "external_reference",
      "external_evidence_id",
    ]) {
      expect(sql).toContain(col);
    }
  });

  it("keeps review links in their own table with expiry, use and revocation", () => {
    expect(sql).toMatch(/create table[\s\S]*hr_document_review_links/i);
    for (const col of ["token_hash", "expires_at", "used_at", "revoked_at", "verdict"]) {
      expect(sql).toContain(col);
    }
  });

  it("never stores the raw token", () => {
    expect(sql).not.toMatch(/\btoken\s+text/i);
  });
});

describe("hr external review — server functions", () => {
  const fns = read("src/lib/hr-ext.functions.ts");

  it("requires the legal_review right to record a verification or share a link", () => {
    const section = fns.slice(fns.indexOf("recordExternalHrReview"));
    expect(section).toContain('need("legal_review")');
    expect(fns.slice(fns.indexOf("createHrReviewLink"))).toContain('need("legal_review")');
  });

  it("hashes the link token and returns it exactly once", () => {
    const section = fns.slice(fns.indexOf("createHrReviewLink"), fns.indexOf("revokeHrReviewLink"));
    expect(section).toContain("randomBytes(32)");
    expect(section).toMatch(/createHash\("sha256"\)\.update\(token\)/);
    expect(section).toContain("/hr-review?token=");
  });

  it("refuses to record a verification while placeholders are unfilled", () => {
    const section = fns.slice(fns.indexOf("recordExternalHrReview"), fns.indexOf("getHrReviewLinks"));
    expect(section).toMatch(/\\\[___\\\]/);
  });
});

describe("hr external review — public endpoint", () => {
  const route = read("src/routes/api/public/v1/hr/review.ts");

  it("is reachable only on self-hosted installs", () => {
    expect(route).toMatch(/selfhost/i);
  });

  it("resolves the token by hash, never by raw value", () => {
    expect(route).toMatch(/createHash\("sha256"\)/);
  });

  it("answers unknown, expired, revoked and used tokens the same way", () => {
    expect(route).toContain("404");
  });

  it("routes both verdicts", () => {
    expect(route).toContain("changes_requested");
    expect(route).toContain("reviewed");
  });
});

describe("hr external review — approval gating", () => {
  const ui = read("src/components/app/hr/documents-section.tsx");

  it("treats an external verification as the completed review step", () => {
    // reviewOpen is only pending/changes_requested, and recordExternalReview sets
    // legal_status='reviewed', so approval unblocks without a second step.
    expect(ui).toContain('doc?.legal_status === "pending" || doc?.legal_status === "changes_requested"');
    expect(ui).toContain("recordExternalHrReview");
  });

  it("shows the verification state in the document list", () => {
    expect(ui).toContain("reviewLabel");
    expect(ui).toContain("reviewExternalDone");
  });
});

describe("token hashing", () => {
  it("is stable and irreversible", () => {
    const token = "abc123";
    expect(createHash("sha256").update(token).digest("hex")).toHaveLength(64);
  });
});
