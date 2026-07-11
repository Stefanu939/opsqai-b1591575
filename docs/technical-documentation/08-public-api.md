# 8. Public API — `/api/public/v1/*`

Bypasses the published-site auth wall by prefix. Every handler MUST:

1. Verify authenticity (HMAC signature on body OR install-scoped token).
2. Validate input with Zod.
3. Enforce rate limit (see Security chapter 13).
4. Never return PII or `licenses.token` bodies.
5. Log to `audit_log` on writes.

## Endpoints

- `POST /api/public/v1/license/heartbeat` — install pings MC, returns CRL freshness + release manifest hint.
- `GET  /api/public/v1/faqs` — internal cross-install lookup (behind install token).
- `GET  /api/public/v1/knowledge` — same.
- `POST /api/public/v1/email/bounce` — SMTP bounce webhook.
- `POST /api/public/contact-submit` — marketing contact form, Turnstile-gated.

Auth helpers live in `src/routes/api/public/v1/-_auth.ts` (the leading `-` excludes it from route generation).
