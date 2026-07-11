# 3. Setup Wizard

The Setup Wizard is **resumable**: progress is stored in `platform_config.setup_progress` as an array of step ids. **No secrets are ever written to this column** — only step markers.

## Steps

1. **Welcome + install-id confirm** — the wizard displays the generated `install_id`; write it down, it is your DR anchor.
2. **Database check** — verify PostgreSQL connectivity and required extensions.
3. **Object storage** — configure MinIO / S3.
4. **SMTP** — configure email.
5. **AI provider** — pick + verify.
6. **License activation** — paste Installation License, then any Module Licenses, then optional signed activation bundle.
7. **First admin** — create the initial platform admin account.
8. **Doctor pass** — run `opsqai doctor` and confirm all green.

Any step can be resumed by reopening `/app/platform/setup`.
