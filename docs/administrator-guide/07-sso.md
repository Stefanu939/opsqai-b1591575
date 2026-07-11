# 7. Single Sign-On

OPSQAI supports:

- **Email + password** (default).
- **Google OAuth** — configured in Platform → Auth Providers.
- **SAML SSO** — Enterprise module.

## SAML

1. In `/app/admin/platform` → SSO, click **Add SAML configuration**.
2. Provide Entity ID, ACS URL, and paste the IdP metadata XML.
3. Map claims: `email`, `given_name`, `family_name`.
4. Test with an IdP-initiated login before enforcing.
5. Optionally require SSO for a specific email domain.

## Session behavior

- JWT stored in localStorage (SPA) and same-origin cookie (SSR).
- Refresh rotation is on.
- Session lifetime: 24 h; refreshable up to 30 days.
