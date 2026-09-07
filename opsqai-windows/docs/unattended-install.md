# Unattended (silent) installation

For fleet rollouts:

```powershell
OPSQAI-Setup.exe /S /CONFIG=C:\path\to\answers.json
```

## `answers.json` schema

```json
{
  "installId": "optional-uuid",
  "company": { "name": "Acme GmbH", "contactEmail": "it@acme.com", "timezone": "Europe/Berlin" },
  "admin": { "email": "admin@acme.com", "password": "GeneratedStrongPassword!" },
  "database": { "mode": "embedded" },
  "storage": { "mode": "local" },
  "ai": { "provider": "openai", "apiKey": "sk-…" }
}
```

External database / S3 variants:

```json
"database": {
  "mode": "external",
  "external": {
    "host": "db.internal", "port": 5432,
    "database": "opsqai", "username": "opsqai", "password": "…"
  }
},
"storage": {
  "mode": "s3",
  "s3": { "endpoint": "https://s3.eu-central-1.amazonaws.com",
          "region": "eu-central-1", "bucket": "opsqai",
          "accessKey": "…", "secretKey": "…" }
}
```

## Security

`answers.json` contains secrets. Deliver it over a secured channel
(SCCM/Intune, Ansible-Vault, GPO with restricted share ACL) and delete
it after `OPSQAI-Setup.exe` exits. Only the derived, non-secret fields
land in `%ProgramData%\OPSQAI\config\config.json` (ACL: Administrators

- SYSTEM only).

## `--data-mode` (tenant separation)

An installation's data belongs to exactly one company. When `%ProgramData%\OPSQAI`
still holds data from a previous install, the installer requires an explicit choice:

- `--data-mode continue` (default) — upgrade / repair the SAME company: database,
  files, accounts and install id are preserved.
- `--data-mode fresh` — new company on this machine: the previous database, storage,
  configuration and licence are archived to `%ProgramData%\OPSQAI\archive\install-<id>-<stamp>`
  and a new install id is minted. Nothing is inherited.

The interactive wizard asks the same question before bootstrap runs.

Additional guarantees:
- The setup account only becomes `platform_owner` when the installation has no owner
  yet; otherwise it is created as `admin`.
- Activating an installation licence issued to a different company is refused
  (`import_denied:license_belongs_to_other_company`), and a mismatching licence puts
  the platform into a restricted state that only shows the licence screen.
