# Unattended (silent) installation

For fleet rollouts:

```powershell
OPSQAI-Setup.exe /S /CONFIG=C:\path\to\answers.json
```

## `answers.json` schema

```json
{
  "installId": "optional-uuid",
  "company":   { "name": "Acme GmbH", "contactEmail": "it@acme.com", "timezone": "Europe/Berlin" },
  "admin":     { "email": "admin@acme.com", "password": "GeneratedStrongPassword!" },
  "database":  { "mode": "embedded" },
  "storage":   { "mode": "local" },
  "ai":        { "provider": "openai", "apiKey": "sk-…" }
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
+ SYSTEM only).
