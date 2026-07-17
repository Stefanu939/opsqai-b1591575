// OPSQAI admin bootstrap seeder.
//
// Runs once, right after schema migrations, on a Self-Hosted install.
// Idempotent: re-running with the same admin email updates the password
// (so operators can recover from a forgotten password via re-install /
// unattended re-run) but never demotes the account or leaks the hash.
//
//   node admin-seed.mjs
//
// Reads: OPSQAI_ADMIN_EMAIL, OPSQAI_ADMIN_PASSWORD, OPSQAI_CONFIG.
// The Argon2 parameters MUST match pg-user-repository.server.ts.

import { readFileSync } from "node:fs";
import { Client } from "pg";
import argon2 from "argon2";

const email = (process.env.OPSQAI_ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.OPSQAI_ADMIN_PASSWORD || "";
const cfgPath = process.env.OPSQAI_CONFIG;

function fail(msg, code = 1) {
  console.error(`[admin-seed] ${msg}`);
  process.exit(code);
}
if (!email || !password) fail("OPSQAI_ADMIN_EMAIL / OPSQAI_ADMIN_PASSWORD required", 2);
if (!cfgPath) fail("OPSQAI_CONFIG not set", 2);

const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));

function databaseUrl() {
  if (cfg.database?.mode === "external") {
    const e = cfg.database.external;
    const auth = `${encodeURIComponent(e.username)}:${encodeURIComponent(e.password || "")}`;
    return `postgres://${auth}@${e.host}:${e.port}/${e.database}`;
  }
  const em = cfg.database?.embedded || {};
  const auth = em.password ? `opsqai:${encodeURIComponent(em.password)}` : "opsqai";
  return `postgres://${auth}@127.0.0.1:${em.port || 55432}/opsqai`;
}

const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
});

const client = new Client({ connectionString: databaseUrl() });
await client.connect();

try {
  await client.query("BEGIN");

  // Upsert user. Column names match the local-auth schema in
  // migrations/selfhost/0002_local_auth.sql.
  const up = await client.query(
    `INSERT INTO public.users (email, password_hash, is_active, email_verified_at)
     VALUES (LOWER($1), $2, TRUE, NOW())
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           is_active = TRUE,
           updated_at = NOW()
     RETURNING id`,
    [email, hash],
  );
  const userId = up.rows[0].id;

  // Grant admin role. Uses the canonical user_roles table so app-side
  // has_role() checks pass without further seeding.
  await client.query(
    `INSERT INTO public.user_roles (user_id, role)
     VALUES ($1, 'admin')
     ON CONFLICT (user_id, role) DO NOTHING`,
    [userId],
  );

  await client.query("COMMIT");
  console.log(`[admin-seed] admin account ready: ${email}`);
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  fail(`seed failed: ${e.message || e}`, 3);
} finally {
  await client.end();
}
