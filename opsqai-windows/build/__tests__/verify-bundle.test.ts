// Phase 10 — verify-bundle.mjs behaviour.
//
// Exercises the Self-Hosted bundle scanner against synthetic .output fixtures
// so we know it actually catches Cloud-only leakage before the Windows build
// pipeline ships an installer.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT = resolve(__dirname, "..", "verify-bundle.mjs");

function runVerifier(dir: string) {
  const res = spawnSync(process.execPath, [SCRIPT, "--dir", dir], {
    encoding: "utf8",
  });
  return {
    code: res.status ?? -1,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

describe("verify-bundle.mjs", () => {
  let scratch: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "opsqai-verify-"));
    mkdirSync(join(scratch, "server"), { recursive: true });
  });

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("passes on a clean Self-Hosted-shaped bundle", () => {
    writeFileSync(
      join(scratch, "server", "index.mjs"),
      "// Self-Hosted app entry.\nconst mode='selfhost';\nconsole.log('ok', mode);\n",
    );
    const r = runVerifier(scratch);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/OK — no banned/);
  });

  it("fails when the OPSQAI Cloud project URL leaks in", () => {
    writeFileSync(
      join(scratch, "server", "index.mjs"),
      "const u = 'https://klisqgrabmwqijbmjzsb.supabase.co';\n",
    );
    const r = runVerifier(scratch);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/opsqai-cloud-project-ref/);
  });

  it("fails on the OPSQAI Cloud publishable key", () => {
    writeFileSync(
      join(scratch, "server", "chunk.mjs"),
      "const k = 'sb_publishable_jNON1nS79Q9dcrUHJKCE9w_xN7c56E5';\n",
    );
    const r = runVerifier(scratch);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/opsqai-cloud-publishable-key/);
  });

  it("passes on generic Supabase library boilerplate (no Cloud identity)", () => {
    // A vendored @supabase/* asset may reference the string `service_role`
    // in a JWT role enum, or `example-project.supabase.co` in default URL
    // docs. Those must NOT count as leaks.
    writeFileSync(
      join(scratch, "server", "vendor.mjs"),
      [
        "export const Roles = { ANON: 'anon', SERVICE: 'service_role' };",
        "const DEFAULT_URL = 'https://example-project.supabase.co';",
        "const ENV_NAME = 'VITE_SUPABASE_URL';",
        "export { DEFAULT_URL, ENV_NAME };",
      ].join("\n"),
    );
    const r = runVerifier(scratch);
    expect(r.code).toBe(0);
  });

  it("fails when client.server is imported into the bundle", () => {
    writeFileSync(
      join(scratch, "server", "bad.mjs"),
      "import { supabaseAdmin } from '@/integrations/supabase/client.server';\n",
    );
    const r = runVerifier(scratch);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/supabase-client-server-import/);
  });

  it("fails when SUPABASE_SERVICE_ROLE_KEY env is referenced outside client.server", () => {
    writeFileSync(
      join(scratch, "server", "env.mjs"),
      "const k = process.env.SUPABASE_SERVICE_ROLE_KEY;\n",
    );
    const r = runVerifier(scratch);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/supabase-service-role-env/);
  });

  it("exits 2 when the scan directory is missing", () => {
    rmSync(scratch, { recursive: true, force: true });
    const r = runVerifier(scratch);
    expect(r.code).toBe(2);
  });
});
