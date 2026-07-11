# 6. SMTP

## Required

- Host + port + username + password OR API key.
- A verified `From` domain with SPF, DKIM, and DMARC records published.

## Fields

Configured in the Setup Wizard → SMTP step and later editable at `/app/admin/platform` → Email. Stored in `platform_email_settings`. The password is never displayed after saving.

## Deliverability checklist

- SPF: `v=spf1 include:<your-relay> -all`
- DKIM: enabled at the relay, key rotated annually.
- DMARC: `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain`
- Verified sender warm-up before mass sending.

## Bounce ingestion

If the relay supports webhook bounces, point them at `/api/public/v1/email/bounce` with the shared HMAC secret configured in Platform → Email.
