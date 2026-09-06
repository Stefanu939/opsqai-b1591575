# Installation, Downloads log & Releases connected

## What changes for the customer

**Installation page (stays as the 3 steps)**
- Step 1 "Download package" now always serves the package your team uploaded in Management Center → Releases, for the current published version. No more "package not generated" error.
- The step shows which version it is downloading (name + version + checksum), so the customer knows exactly what they got.
- Only the current version is offered. Older versions are not downloadable.
- Step 2 (activation key) and step 3 (verification) stay exactly as they are.

**Downloads page becomes a history log**
- Top line: the version this installation is running right now, plus a clear note if it is behind the latest published version.
- Below: a simple list of past downloads — date, what was downloaded (package or activation key), which version, and who downloaded it.
- No download buttons on this page anymore; downloading happens only on the Installation page.

**Management Center**
- No new upload UI. What is already uploaded at Releases (installer file + version, marked as current) is now what customers actually receive.
- Releases gets a small line per release showing whether it is the one customers currently download.

## Technical notes

- New/updated server function `getMyCurrentInstallerPackage` (in `src/lib/installation-package.functions.ts`): resolves `license_releases` where `channel = 'stable'` and `is_current = true`, requires `package_storage_path`, and mints a 24h signed URL from the `releases` bucket. Ownership check stays as today (install-kind license matching the caller's email), and each call is recorded in `installation_package_downloads` (with `storage_path` + release version in metadata).
- `portal.installation.tsx` step 1 switches from `getMyInstallationPackageDownloadUrl` to the new function and renders version/checksum. If no current release has a package uploaded, the button is disabled with a plain message instead of a thrown error.
- Activation-key downloads also get logged (kind `activation_key`) so the Downloads log can show both kinds; add a nullable `kind` column (default `package`) to `installation_package_downloads` via migration, with grants/RLS unchanged in spirit (customer reads own rows, staff read all).
- `portal.downloads.tsx` rewritten as read-only log: reuses `getMyInstallStatus` / install-history data for the current-version line and lists download rows for the caller's installs. Package/activation buttons and the "included modules" download list are removed from this page.
- `getMyInstallationPackageDownloadUrl` is kept (unused by portal UI) so nothing else breaks; MC-side per-install generation stays available.
- Verification: `bunx tsgo --noEmit`, production build, and a Playwright pass on `/portal/installation` and `/portal/downloads` with a customer session.
