# 4. Issuing a license

## From the MC UI

`/app/platform/licenses` → Issue.

## Offline (CLI)

```bash
opsqai-mc license issue \
  --install-id <uuid> --kind install \
  --seats 100 --maintenance 2027-07-11
```

## Programmatic

`issueLicense` server function under `src/lib/licenses.functions.ts`. Requires `platform_admin`.
