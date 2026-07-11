// Management Center secrets blacklist (Phase 3).
//
// The Management Center MUST NEVER store customer infrastructure secrets
// (PostgreSQL passwords, SMTP credentials, AI provider API keys, MinIO
// credentials, SSH keys, OS credentials). These live exclusively inside
// the customer's Self-Hosted installation.
//
// This module is the *runtime gate* — every server function that writes to
// MC-owned tables (licenses, license_installs, license_orders, companies,
// customer_profiles, customer_*) must funnel the payload through
// `assertNoBlacklistedSecrets(payload)` before hitting the DB. That way
// even an accidental schema drift or a typo in an admin form cannot get
// customer secrets into the MC.

/**
 * Field-name substrings that indicate an infrastructure secret.
 * Lowercase, matched case-insensitively as substrings on the flattened
 * key path (`config.smtp_password` matches `smtp_password`).
 * Excludes "token" because our own signed license tokens are legitimate.
 */
export const BLACKLISTED_KEY_SUBSTRINGS: readonly string[] = [
  "password",
  "passwd",
  "secret_key",
  "api_key",
  "apikey",
  "access_key",
  "private_key",
  "privkey",
  "ssh_key",
  "ssh_private",
  "smtp_pass",
  "smtp_user",
  "smtp_host",
  "smtp_port",
  "minio_",
  "s3_secret",
  "s3_access",
  "postgres_password",
  "pg_password",
  "db_password",
  "database_url",
  "connection_string",
  "dsn",
  "openai_api",
  "anthropic_api",
  "azure_openai_api",
  "gemini_api",
  "lovable_api_key", // MC-side value stays server-only; must never be persisted in a customer-facing row
];

/**
 * Explicit allow-list of key names that would otherwise trip the substring
 * scan but are legitimate (they identify a secret, they don't carry one).
 */
const ALLOWED_KEYS = new Set<string>([
  "key_id", // Ed25519 signing key identifier — safe metadata
  "public_key_pem", // signing PUBLIC key — safe to store
  "signed_token", // our own license token (payload, not a secret credential)
]);

function matchesBlacklist(keyPath: string): string | null {
  const lower = keyPath.toLowerCase();
  const leaf = lower.split(".").pop() ?? lower;
  if (ALLOWED_KEYS.has(leaf)) return null;
  for (const needle of BLACKLISTED_KEY_SUBSTRINGS) {
    if (lower.includes(needle)) return needle;
  }
  return null;
}

/**
 * Recursively walk an object/array payload and collect any keys whose
 * name matches the blacklist. Values are never inspected — only the
 * schema shape. Returns an array of `{ path, matched }` violations.
 */
export function findBlacklistedSecretKeys(
  value: unknown,
  path = "",
): Array<{ path: string; matched: string }> {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => findBlacklistedSecretKeys(v, `${path}[${i}]`));
  }
  if (typeof value !== "object") return [];

  const out: Array<{ path: string; matched: string }> = [];
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const p = path ? `${path}.${k}` : k;
    const matched = matchesBlacklist(k);
    if (matched) out.push({ path: p, matched });
    out.push(...findBlacklistedSecretKeys(v, p));
  }
  return out;
}

/**
 * Throwing gate. Call this at the top of any MC server function that
 * writes a payload to an MC-owned table. Rejects the request with a
 * clear error if any blacklisted key name appears.
 */
export function assertNoBlacklistedSecrets(payload: unknown, context = "payload"): void {
  const hits = findBlacklistedSecretKeys(payload);
  if (hits.length === 0) return;
  const summary = hits.map((h) => `${h.path} (matches "${h.matched}")`).join(", ");
  throw new Error(
    `Management Center refuses to store customer infrastructure secrets. ` +
      `Blacklisted field(s) in ${context}: ${summary}. ` +
      `These belong exclusively inside the customer's Self-Hosted installation.`,
  );
}
