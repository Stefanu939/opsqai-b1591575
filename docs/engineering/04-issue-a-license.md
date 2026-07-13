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

## Generating the installation package

Once the install-kind license exists, generate the customer-facing ZIP:

1. Open `/app/platform/licenses`.
2. Click **Package** on the install row.
3. Choose an installer version (empty = latest **Stable** channel release,
   pinned = whatever value is saved on the license).
4. Click **Generate package**. The technical contact receives a 24-hour
   download link by email; the URL is also opened in the current tab.

Regeneration follows the same flow. By default the previous bundle is
added to the CRL — see
`docs/security-documentation/05-license-security.md`. To keep an older
bundle valid (e.g. a customer restoring from their own backup), check
**Keep previous bundle valid** before clicking **Regenerate**.

Programmatic entry point: `generateInstallationPackage` in
`src/lib/installation-package.functions.ts`.

