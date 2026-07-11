# 3. Authentication

- Provider: Supabase Auth (embedded in the install).
- Methods enabled by default: email + password, Google OAuth.
- Optional: SAML SSO (Enterprise module).
- Password policy: minimum 12 characters, HIBP breach check enabled by default.
- MFA: TOTP + WebAuthn (roadmap — see chapter 13).
- Session: short-lived JWT (24 h) with refresh rotation, revocable server-side.
- Auth cookies: `HttpOnly`, `Secure`, `SameSite=Lax`.

## Anti-abuse

- Rate limiting on `/api/public/*` and auth endpoints (see chapter 13).
- Account lockout after 10 failed sign-ins in 15 minutes.
- Suppressed-emails list prevents rebound to bouncing addresses.
