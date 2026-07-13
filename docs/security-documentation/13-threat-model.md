# 13. Threat model (public summary)

Full threat model is maintained internally; this chapter summarizes the surfaces and controls.

## Trust boundaries

1. Public Internet ↔ Marketing site (opsqai.de public routes)
2. Public Internet ↔ Customer Portal (authenticated)
3. Public Internet ↔ Management Center admin surfaces
4. Customer install ↔ Management Center (licensing API, `/api/public/v1/*`)
5. Customer end-users ↔ Customer install
6. Customer install ↔ Customer's own PG / S3 / AI provider

## Key threats and controls

| Threat                                  | Control                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Forged license                          | Ed25519 signature + `key_id` allow-list + `install_id` bind                                              |
| Replay of expired bundle                | CRL freshness check + bundle expiry                                                                      |
| Privilege escalation via role tampering | Roles server-side only via `has_role()`; JWT never carries roles                                         |
| Public API abuse                        | Per-endpoint auth matrix (signature / rate limit / quota), documented per route under `/api/public/v1/*` |
| Cross-install identity confusion        | `install_id` bind on every token and every DR primitive                                                  |
| Break-glass secret exfiltration         | Only scrypt hash stored; plaintext shown once, single-use, audit-logged                                  |
| Update supply-chain tamper              | Signed manifests + cosign-signed images + `min_prev_installer_version` chain                             |
| DB restore into wrong install           | `install_id` mismatch is a red doctor check (E2010)                                                      |

## Public API rate-limit matrix

| Route                              | Auth                                        | Rate limit          | Quota                              |
| ---------------------------------- | ------------------------------------------- | ------------------- | ---------------------------------- |
| `/api/public/v1/license/heartbeat` | HMAC of body with install-scoped shared key | 60/min per install  | —                                  |
| `/api/public/v1/knowledge`         | Signed request + install token              | 600/min per install | Corpus size cap per module license |
| `/api/public/v1/faqs`              | Signed request + install token              | 600/min per install | —                                  |
| `/api/public/v1/email/bounce`      | HMAC (shared secret)                        | 120/min per install | —                                  |
| `/api/public/contact-submit`       | Turnstile / hCaptcha                        | 5/min per IP        | —                                  |

Every route validates input with Zod, rejects PII in responses, and logs to `audit_log` on writes.
