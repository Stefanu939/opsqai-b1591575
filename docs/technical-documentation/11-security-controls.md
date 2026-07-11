# 11. Security controls (technical)

See Security Documentation for the customer-facing view. Engineering-level controls:

- Zod validation on every server-fn `inputValidator`.
- HMAC + constant-time comparison on all webhook verifiers.
- `timingSafeEqual` on every credential comparison.
- No `dangerouslySetInnerHTML` outside a whitelisted, sanitized renderer.
- CSP: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' <ai-provider>; frame-ancestors 'none'`.
- CORS: same-origin only for server functions; `/api/public/v1/*` accepts specific origins per install config.
- Cookies: `HttpOnly; Secure; SameSite=Lax`.
- All privileged server functions require `has_role('platform_admin')`. Negative tests assert 403 for non-admins.
- Optimistic locking on `platform_config`: every mutation carries `expected_updated_at`; concurrent editors receive 409.
