<#
.SYNOPSIS
  Build the OPSQAI Windows installer.

.DESCRIPTION
  Phase 2 pipeline:
    1. Build the OPSQAI app in Node-server mode (npm run build:selfhosted).
    2. Stage the built app bundle + Self-Hosted migrations (migrations\selfhost) into payload\app.
    3. Download + stage Node runtime, WinSW, Caddy, PostgreSQL Portable.
    4. Copy service entrypoints and WinSW XML into payload/.
    5. Run makensis to produce OPSQAI-Setup.exe.
    6. Optionally sign with the EV code-signing certificate on the runner.
#>
[CmdletBinding()]
param(
  [ValidateSet('Debug','Release')] [string]$Configuration = 'Debug',
  [switch]$Sign,
  [switch]$SkipPostgres,   # for fast dev iterations (~200 MB)
  [switch]$SkipApp,        # skip the npm build (use previously staged payload\app)
  [switch]$SkipWizard,     # skip Electron wizard packaging (use previously staged payload\wizard)
  [switch]$SkipDesktop,    # skip Electron desktop shell packaging (use previously staged payload\desktop-shell)
  [switch]$SkipOllama,     # skip bundling the Ollama setup binary (dev builds only)
  [string]$Version = '0.0.0-dev'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Set when the build had to substitute a throwaway secret (currently: the
# updater signing key). A dev build gets a `-dev` version suffix so an
# untrusted artifact can never be mistaken for a release on disk.
$script:DevBuild = $false

$payload   = Join-Path $root 'payload'
$artifacts = Join-Path $root 'build\artifacts'
New-Item -ItemType Directory -Force -Path $artifacts | Out-Null

# SHA-256 pins for third-party binaries fetched during the build. Kept in the
# repo (build\vendor-pins.json) so Release builds are fail-closed without
# depending on CI environment variables; env vars still override.
$pinsPath = Join-Path $PSScriptRoot 'vendor-pins.json'
$VendorPins = if (Test-Path $pinsPath) {
  Get-Content $pinsPath -Raw | ConvertFrom-Json
} else {
  Write-Warning "vendor-pins.json not found at $pinsPath"
  $null
}

function Assert-Exists($path, $label) {
  if (-not (Test-Path $path)) { throw "Missing $label at $path" }
}

# --- 0. Build OPSQAI app (Node-server preset) -----------------------------
$appStage = Join-Path $payload 'app'
if (-not $SkipApp) {
  $projectRoot = Split-Path -Parent $root   # opsqai-windows/ -> repo root
  Write-Host "Building OPSQAI app (NITRO_PRESET=node-server)..."
  Push-Location $projectRoot
  try {

    if (-not (Test-Path 'node_modules')) { & bun install --frozen-lockfile; if ($LASTEXITCODE -ne 0) { throw "bun install failed" } }

    # Wipe .output before building. Nitro writes (not diffs) its output, but a
    # leftover tree from a previous `bun run build` (Cloud/Cloudflare preset)
    # could survive at paths the Self-Hosted build never writes and then be
    # staged into payload\app. Content checks (verify-bundle,
    # frontend-provenance --verify) catch gross staleness after the fact; this
    # prevents it outright.
    $outClean = Join-Path $projectRoot '.output'
    if (Test-Path $outClean) {
      Write-Host "Removing stale .output before Self-Hosted build..."
      Remove-Item $outClean -Recurse -Force
    }


    # Patch @lovable.dev/mcp-js (<=0.20.1) Windows path-separator bug:
    # configResolved gives projectRoot with forward slashes, but node's
    # resolve() returns backslashes, so assertContains rejects the routesDir.
    # Normalize both sides before comparing.
    $mcpVite = Join-Path $projectRoot 'node_modules\@lovable.dev\mcp-js\dist\stacks\tanstack\vite.js'
    if (Test-Path $mcpVite) {
      $content = Get-Content $mcpVite -Raw
      if (-not $content.Contains('__LOVABLE_WIN_PATCH__')) {
        $replacement = @'
function assertContains(parent, child, label) {
  // __LOVABLE_WIN_PATCH__: normalize Windows separators before comparing
  var _p = parent.split(sep).join('/');
  var _c = child.split(sep).join('/');
  if (_c !== _p && !_c.startsWith(_p + '/')) {
    throw new Error('@lovable.dev/mcp-js: ' + label + ' must resolve under ' + _p + ', got ' + _c);
  }
  return;
  // original (unreachable):
'@
        $needle = 'function assertContains(parent, child, label) {'
        $patched = $content.Replace($needle, $replacement)
        Set-Content -Path $mcpVite -Value $patched -NoNewline
        Write-Host "  Patched @lovable.dev/mcp-js for Windows path separators."
      }
    }

    # --- Frontend/server provenance: stamp identity INTO the bundle ---------
    # VITE_OPSQAI_BUILD_* are statically replaced by Vite, so the built client
    # and server both carry the exact version + commit. The content hash is
    # recorded after staging (frontend-provenance.mjs) because it hashes the
    # build output itself.
    $buildCommit = 'unknown'
    if (Get-Command git -ErrorAction SilentlyContinue) {
      $sha = (& git rev-parse HEAD 2>$null)
      if ($LASTEXITCODE -eq 0 -and $sha) { $buildCommit = $sha.Trim() }
    }
    if ($env:GITHUB_SHA) { $buildCommit = $env:GITHUB_SHA }
    # $Version may later gain a '-dev' suffix; provenance must use the value
    # that was actually stamped into the bundle.
    $script:FrontendVersion = $Version
    $script:FrontendCommit  = $buildCommit
    $env:VITE_OPSQAI_BUILD_VERSION = $Version
    $env:VITE_OPSQAI_BUILD_COMMIT  = $buildCommit
    Write-Host "Stamping frontend provenance: version=$Version commit=$buildCommit"

    & bun run build:selfhosted

    if ($LASTEXITCODE -ne 0) { throw "bun run build:selfhosted failed" }


    # Nitro node-server preset writes to .output/. Layout:
    #   .output/server/index.mjs   -> entry
    #   .output/public/            -> static assets
    $out = Join-Path $projectRoot '.output'
    if (-not (Test-Path (Join-Path $out 'server\index.mjs'))) {
      throw "Expected .output/server/index.mjs after build:selfhosted"
    }
    Remove-Item $appStage -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $appStage | Out-Null
    Copy-Item (Join-Path $out 'server') (Join-Path $appStage 'server') -Recurse -Force
    if (Test-Path (Join-Path $out 'public')) {
      Copy-Item (Join-Path $out 'public') (Join-Path $appStage 'public') -Recurse -Force
    }
    # migrate.mjs / admin-seed.mjs are authored outside payload\app so staging cannot delete them.
    Copy-Item (Join-Path $root 'services\bootstrap\migrate.mjs') (Join-Path $appStage 'server\migrate.mjs') -Force
    # migrate.mjs does `require('./errors.cjs')`. Ship the error catalog beside it.
    # It's .cjs (not .js) so Node treats it as CommonJS regardless of app/server's package.json `"type": "module"`.
    Copy-Item (Join-Path $root 'services\bootstrap\errors.cjs') (Join-Path $appStage 'server\errors.cjs') -Force

    # admin-seed.mjs is a standalone Node script that needs `pg` and
    # `argon2`. Bundling with esbuild inlines pg's CommonJS internals into
    # an ESM output, which breaks at runtime ("Dynamic require of 'events'
    # is not supported"). Ship admin-seed.mjs verbatim in its own subfolder
    # with a dedicated package.json + real node_modules, installed by bun,
    # so Node resolves `pg` and `argon2` as normal packages. argon2's
    # win32-x64 native prebuild is picked up by node-gyp-build at load time.
    $seedDir = Join-Path $appStage 'server\admin-seed'
    Remove-Item $seedDir -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $seedDir | Out-Null
    Copy-Item (Join-Path $root 'services\bootstrap\admin-seed.mjs') (Join-Path $seedDir 'admin-seed.mjs') -Force
    @'
{
  "name": "opsqai-admin-seed",
  "private": true,
  "type": "module",
  "dependencies": {
    "pg": "^8.13.1",
    "argon2": "^0.41.1"
  }
}
'@ | Set-Content -Path (Join-Path $seedDir 'package.json') -Encoding UTF8 -NoNewline
    Push-Location $seedDir
    try {
      & bun install --production --no-save
      if ($LASTEXITCODE -ne 0) { throw "bun install for admin-seed failed" }
    } finally { Pop-Location }
    # Self-Hosted uses its own, vanilla-PostgreSQL migration set. The
    # Supabase set (auth.*, RLS via auth.uid(), authenticated/anon/service_role)
    # is Cloud-only and MUST NEVER be copied into the Windows payload.
    $migSrc = Join-Path $projectRoot 'migrations\selfhost'
    if (-not (Test-Path $migSrc)) {
      throw "Self-Hosted migrations missing at $migSrc. Aborting build to avoid shipping Supabase migrations."
    }
    Copy-Item $migSrc (Join-Path $appStage 'migrations') -Recurse -Force
    # Extra guardrail: fail the build if any Cloud-shaped SQL, shared Cloud
    # helper (for example public.set_updated_at()), or undefined public.*
    # dependency slipped into the staged Self-Hosted migrations.
    $nodeExe = Join-Path $payload 'runtime\node\node.exe'
    $nodeCmd = if (Test-Path $nodeExe) { $nodeExe } else { 'node' }
    & $nodeCmd (Join-Path $root 'build\verify-selfhost-migrations.mjs') --dir (Join-Path $appStage 'migrations')
    if ($LASTEXITCODE -ne 0) {
      throw "verify-selfhost-migrations.mjs failed — Self-Hosted migrations contain Cloud-only SQL or unresolved dependencies."
    }

    # Fingerprint the exact migration payload. Bootstrap logs these hashes so
    # support can immediately tell whether a customer is running a stale
    # installer after a migration fix.
    $manifestEntries = @()
    foreach ($sql in Get-ChildItem (Join-Path $appStage 'migrations\*.sql') | Sort-Object Name) {
      $manifestEntries += [ordered]@{
        filename = $sql.Name
        sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $sql.FullName).Hash.ToLowerInvariant()
      }
    }
    $manifest = [ordered]@{
      generated_at = (Get-Date).ToUniversalTime().ToString('o')
      migrations = $manifestEntries
    }
    $manifestPath = Join-Path $appStage 'migrations.manifest.json'
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Write-Host "Wrote migration fingerprint manifest: $manifestPath"


    # Global Self-Hosted AI Contract — no AI path around the central provider.
    Write-Host "Verifying AI provider boundary..."
    & $nodeCmd (Join-Path $root 'build\verify-ai-boundary.mjs')
    if ($LASTEXITCODE -ne 0) {
      throw "verify-ai-boundary.mjs failed — feature code calls an AI provider directly. See output above."
    }

    # Phase 9 — bundle scan. Refuse to package if any Cloud-only surface
    # (Supabase URLs, publishable/anon/service keys, `client.server` import,
    # `VITE_SUPABASE_*` env references) leaked into the Self-Hosted output.
    Write-Host "Verifying Self-Hosted bundle (Phase 9 guardrails)..."
    & $nodeCmd (Join-Path $root 'build\verify-bundle.mjs') --dir (Join-Path $projectRoot '.output')
    if ($LASTEXITCODE -ne 0) {
      throw "verify-bundle.mjs failed — Self-Hosted bundle contains Cloud-only surface. See output above."
    }
  } finally { Pop-Location }
} else {
  Write-Host "Skipping OPSQAI app build (--SkipApp)"
  if (-not (Test-Path (Join-Path $appStage 'server\index.mjs'))) {
    Write-Warning "payload\app\server\index.mjs missing — installer bootstrap will skip migrations."
  }
  if ($Configuration -eq 'Release') {
    # A Release installer must never ship an unverified frontend. -SkipApp is
    # a dev shortcut: it reuses whatever is already staged in payload\app and
    # skips provenance stamping, so the EXE could silently contain an old
    # bundle. Allow it only when the staged tree still verifies against its
    # own provenance record AND that record matches the requested identity.
    $provRecord = Join-Path $appStage 'build-provenance.json'
    if (-not (Test-Path $provRecord)) {
      throw "Release build refuses -SkipApp: $provRecord is missing, so the staged payload\app cannot be verified. Re-run without -SkipApp."
    }
    $verifyNode = (Get-Command node -ErrorAction SilentlyContinue)
    if (-not $verifyNode) {
      throw "Release build refuses -SkipApp: node is required to verify the staged payload\app provenance."
    }
    & $verifyNode.Source (Join-Path $PSScriptRoot 'frontend-provenance.mjs') '--app' $appStage '--verify'
    if ($LASTEXITCODE -ne 0) {
      throw "Release build refuses -SkipApp: staged payload\app failed frontend provenance verification (content does not match build-provenance.json)."
    }
    $staged = Get-Content $provRecord -Raw | ConvertFrom-Json
    $wantCommit = if ($env:GITHUB_SHA) { $env:GITHUB_SHA } elseif (Get-Command git -ErrorAction SilentlyContinue) { (& git rev-parse HEAD 2>$null) } else { $null }
    if ($wantCommit) { $wantCommit = $wantCommit.Trim() }
    if ($staged.version -ne $Version) {
      throw "Release build refuses -SkipApp: staged payload\app was built for version '$($staged.version)' but this build requests '$Version'."
    }
    if ($wantCommit -and $staged.commit -ne $wantCommit) {
      throw "Release build refuses -SkipApp: staged payload\app was built from commit '$($staged.commit)' but this build requests '$wantCommit'."
    }
    Write-Host "Release -SkipApp accepted: staged payload\app verified (version=$($staged.version) commit=$($staged.commit) buildHash=$($staged.buildHash))"
    $script:FrontendVersion = $staged.version
    $script:FrontendCommit  = $staged.commit
  }
}



function Fetch($url, $dest, $mirrors) {
  if (Test-Path $dest) { return }
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  $candidates = @($url)
  if ($mirrors) { $candidates += $mirrors }
  $lastError = $null
  foreach ($candidate in $candidates) {
    for ($attempt = 1; $attempt -le 3; $attempt++) {
      Write-Host "  -> $candidate (attempt $attempt)"
      try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest $candidate -OutFile $dest -UseBasicParsing -TimeoutSec 300
        if ((Test-Path $dest) -and (Get-Item $dest).Length -gt 0) { return }
        throw "downloaded file is empty"
      } catch {
        $lastError = $_
        Write-Warning "download failed: $($_.Exception.Message)"
        if (Test-Path $dest) { Remove-Item $dest -Force -ErrorAction SilentlyContinue }
        Start-Sleep -Seconds (5 * $attempt)
      }
    }
  }
  throw "Could not download $url after retries and mirrors. Last error: $($lastError.Exception.Message)"
}

# --- 1. Node runtime -------------------------------------------------------
$nodeVersion = '20.18.1'
$nodeDir     = Join-Path $payload 'runtime\node'
if (-not (Test-Path (Join-Path $nodeDir 'node.exe'))) {
  Write-Host "Node.js $nodeVersion"
  $zip = Join-Path $env:TEMP "node-v$nodeVersion-win-x64.zip"
  Fetch "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip" $zip
  Expand-Archive $zip -DestinationPath (Join-Path $payload 'runtime') -Force
  New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
  Move-Item (Join-Path $payload "runtime\node-v$nodeVersion-win-x64\*") $nodeDir -Force
  Remove-Item (Join-Path $payload "runtime\node-v$nodeVersion-win-x64") -Recurse -Force
}

# Node used for build-time tooling (verifiers, payload packer). The staged
# runtime is preferred so CI and local builds agree on the version.
$nodeExeStaged = Join-Path $payload 'runtime\node\node.exe'
$nodeCmd = if (Test-Path $nodeExeStaged) { $nodeExeStaged } else { 'node' }

# --- 2. WinSW wrappers -----------------------------------------------------
$winswVersion = '2.12.0'
$winswDir     = Join-Path $payload 'winsw'
New-Item -ItemType Directory -Force -Path $winswDir | Out-Null
$winswExe = Join-Path $winswDir 'winsw.exe'
Fetch "https://github.com/winsw/winsw/releases/download/v$winswVersion/WinSW-x64.exe" $winswExe

$services = @(
  'OpsqaiHello',
  'OpsqaiDatabase',
  'OpsqaiPlatform',
  'OpsqaiWorker',
  'OpsqaiCaddy',
  'OpsqaiUpdater'
)
foreach ($svc in $services) {
  Copy-Item $winswExe (Join-Path $winswDir "$svc.exe") -Force
  Copy-Item (Join-Path $root "winsw-configs\$svc.xml") (Join-Path $winswDir "$svc.xml") -Force
}

# --- 2b. Electron wizard --------------------------------------------------
# Packages the 10-step Setup Wizard from installer\wizard\ into payload\wizard\.
$wizardStage = Join-Path $payload 'wizard'
if (-not $SkipWizard) {
  $wizardSrc = Join-Path $root 'installer\wizard'
  Write-Host "Packaging OPSQAI Setup Wizard (Electron)..."
  Push-Location $wizardSrc
  try {
    if (-not (Test-Path 'node_modules')) {
      & npm install
      if ($LASTEXITCODE -ne 0) { throw "wizard npm install failed" }
    }
    Remove-Item (Join-Path $wizardSrc 'dist') -Recurse -Force -ErrorAction SilentlyContinue
    & npm run package
    if ($LASTEXITCODE -ne 0) { throw "wizard packaging failed" }
    $packaged = Get-ChildItem (Join-Path $wizardSrc 'dist') -Directory | Select-Object -First 1
    if (-not $packaged) { throw "electron-packager produced no output in $wizardSrc\dist" }
    Remove-Item $wizardStage -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $wizardStage | Out-Null
    Copy-Item (Join-Path $packaged.FullName '*') $wizardStage -Recurse -Force
  } finally { Pop-Location }
} else {
  Write-Host "Skipping wizard packaging (--SkipWizard)"
}

# --- 2c. Electron desktop shell -------------------------------------------
# Thin Electron client that renders https://localhost in a native window
# so the user gets a real desktop app instead of a browser shortcut.
$desktopStage = Join-Path $payload 'desktop-shell'
if (-not $SkipDesktop) {
  $desktopSrc = Join-Path $root 'desktop-shell'
  Assert-Exists (Join-Path $desktopSrc 'main.cjs') 'desktop shell main.cjs'
  Write-Host "Packaging OPSQAI Desktop Shell (Electron)..."
  Push-Location $desktopSrc
  try {
    if (-not (Test-Path 'node_modules')) {
      & npm install
      if ($LASTEXITCODE -ne 0) { throw "desktop-shell npm install failed" }
    }
    Remove-Item (Join-Path $desktopSrc 'dist') -Recurse -Force -ErrorAction SilentlyContinue
    & npm run package
    if ($LASTEXITCODE -ne 0) { throw "desktop-shell packaging failed" }
    $packaged = Get-ChildItem (Join-Path $desktopSrc 'dist') -Directory | Select-Object -First 1
    if (-not $packaged) { throw "electron-packager produced no output in $desktopSrc\dist" }
    Remove-Item $desktopStage -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $desktopStage | Out-Null
    Copy-Item (Join-Path $packaged.FullName '*') $desktopStage -Recurse -Force
  } finally { Pop-Location }
} else {
  Write-Host "Skipping desktop-shell packaging (--SkipDesktop)"
}


# --- 3. Service entrypoints -----------------------------------------------
$servicesDest = Join-Path $payload 'services'
Remove-Item $servicesDest -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force (Join-Path $root 'services') $servicesDest

# --- 3b. Admin tools (service manager + docker migrator) ------------------
$toolsDest = Join-Path $payload 'tools'
Remove-Item $toolsDest -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force (Join-Path $root 'tools') $toolsDest
$binDir = Join-Path $toolsDest 'bin'
New-Item -ItemType Directory -Force -Path $binDir | Out-Null
Copy-Item (Join-Path $toolsDest 'service-manager\opsqai.cmd')          (Join-Path $binDir 'opsqai.cmd')          -Force
Copy-Item (Join-Path $toolsDest 'docker-migrator\opsqai-migrate.cmd')  (Join-Path $binDir 'opsqai-migrate.cmd')  -Force

# --- 3d. Bundled 7-Zip extractor ------------------------------------------
# Heavy payload components ship as pre-compressed .7z parts (see
# build\pack-payload.mjs) because makensis cannot memory-map one huge solid
# datablock. 7zr.exe is the ~600 KB standalone extractor that unpacks them at
# install time; it is also used to CREATE the parts when the runner has no
# 7z.exe of its own.
$sevenZip = Join-Path $toolsDest '7zr.exe'
Fetch 'https://www.7-zip.org/a/7zr.exe' $sevenZip
$sevenZipSha = (Get-FileHash -Algorithm SHA256 -Path $sevenZip).Hash.ToLowerInvariant()
# The pin lives in build\vendor-pins.json so Release builds do not depend on
# CI environment variables; OPSQAI_7ZR_SHA256 still overrides it when 7-Zip
# publishes a new 7zr.exe and the pin has not been refreshed yet.
$sevenZipExpected = $env:OPSQAI_7ZR_SHA256
if (-not $sevenZipExpected) { $sevenZipExpected = $VendorPins.sevenZr }
if ($sevenZipExpected) {
  if ($sevenZipSha -ne $sevenZipExpected.ToLowerInvariant()) {
    throw "7zr.exe SHA-256 mismatch. Expected $sevenZipExpected but got $sevenZipSha. If 7-Zip published a new build, update build\vendor-pins.json (sevenZr) or set OPSQAI_7ZR_SHA256."
  }
  Write-Host "7zr.exe SHA-256 verified against pin."
} elseif ($Configuration -eq 'Release') {
  # Release artifacts must pin every third-party binary they download.
  throw "Release build requires a 7zr.exe pin (build\vendor-pins.json sevenZr or OPSQAI_7ZR_SHA256). Downloaded hash: $sevenZipSha"
} else {
  Write-Host "7zr.exe SHA-256: $sevenZipSha (set OPSQAI_7ZR_SHA256 to pin it)"
}

# --- 3c. Updater signing key ----------------------------------------------
# The pinned Ed25519 public key MUST be present before shipping. In CI the
# key is materialised from a secret; local dev builds fall back to a
# generated throwaway key so smoke tests pass — this key is not trusted for
# production releases.
$updaterDir = Join-Path $payload 'updater'
New-Item -ItemType Directory -Force -Path $updaterDir | Out-Null
$pubKey = Join-Path $updaterDir 'pubkey.pem'
if (-not (Test-Path $pubKey)) {
  if ($Configuration -eq 'Release') {
    throw "Release build requires the real updater public key at $pubKey"
  }
  Write-Warning "No updater pubkey found at $pubKey — generating a DEV-ONLY key. Do NOT ship this build."
  $script:DevBuild = $true
  $tmpPriv = Join-Path $env:TEMP 'opsqai-dev-priv.pem'
  $openssl = Get-Command openssl -ErrorAction SilentlyContinue
  if ($openssl) {
    & $openssl.Source genpkey -algorithm ed25519 -out $tmpPriv 2>$null
  }
  if ($openssl -and $LASTEXITCODE -eq 0) {
    & openssl pkey -in $tmpPriv -pubout -out $pubKey
    Remove-Item $tmpPriv -Force -ErrorAction SilentlyContinue
  } else {
    "-----BEGIN PUBLIC KEY-----`nDEV-PLACEHOLDER`n-----END PUBLIC KEY-----" | Set-Content $pubKey
  }
}

# --- 4. Caddy --------------------------------------------------------------
# --- 3d. Dev-build version marking ----------------------------------------
# A build that carries a throwaway updater key is not releasable. Mark it in
# the version string so the installer filename, the NSIS VERSION define and
# `installer_version` in config.json all say so.
if ($script:DevBuild -and $Version -notmatch 'dev') {
  $Version = "$Version-dev"
  Write-Warning "Marking artifact version as $Version (throwaway updater key)"
}

$caddyVersion = '2.8.4'
$caddyDir = Join-Path $payload 'caddy'
if (-not (Test-Path (Join-Path $caddyDir 'caddy.exe'))) {
  Write-Host "Caddy $caddyVersion"
  $zip = Join-Path $env:TEMP "caddy_${caddyVersion}_windows_amd64.zip"
  Fetch "https://github.com/caddyserver/caddy/releases/download/v$caddyVersion/caddy_${caddyVersion}_windows_amd64.zip" $zip
  Expand-Archive $zip -DestinationPath $caddyDir -Force
}
Copy-Item (Join-Path $root 'caddy-config\Caddyfile') (Join-Path $caddyDir 'Caddyfile') -Force

# --- 5. PostgreSQL Portable -----------------------------------------------
if (-not $SkipPostgres) {
  $pgVersion = '16.4-1'
  $pgDir = Join-Path $payload 'pgsql'
  if (-not (Test-Path (Join-Path $pgDir 'bin\postgres.exe'))) {
    Write-Host "PostgreSQL Portable $pgVersion (~200 MB)"
    $zip = Join-Path $env:TEMP "postgresql-$pgVersion-windows-x64-binaries.zip"
    Fetch "https://get.enterprisedb.com/postgresql/postgresql-$pgVersion-windows-x64-binaries.zip" $zip
    Expand-Archive $zip -DestinationPath (Join-Path $payload 'tmp-pg') -Force
    Move-Item (Join-Path $payload 'tmp-pg\pgsql\*') (New-Item -ItemType Directory -Force -Path $pgDir) -Force
    Remove-Item (Join-Path $payload 'tmp-pg') -Recurse -Force
  }
} else {
  Write-Host "Skipping PostgreSQL Portable (dev build)"
}

# --- 5b. pgvector extension for embedded PostgreSQL ------------------------
# Migration 0010_kb_pgvector.sql runs CREATE EXTENSION vector; the embedded
# PostgreSQL therefore must ship with vector.dll + control/SQL files staged
# under pgsql\lib\ and pgsql\share\extension\. Upstream pgvector publishes no
# Windows binaries — we pin a checksum-verified community prebuild for
# PostgreSQL 16. If -SkipPostgres is set (dev build without Postgres), skip.
if (-not $SkipPostgres) {
  $pgvVersion   = '0.8.3'
  $pgvTag       = '0.8.3_16.14'
  $pgvAsset     = 'vector.v0.8.3-pg16.zip'
  $pgvSha256    = 'd33ae7e4ac923abef1eba4e2b9e1037c56b3b78f6e8baa64310cace6227455df'
  $pgvControl   = Join-Path $payload 'pgsql\share\extension\vector.control'
  if (-not (Test-Path $pgvControl)) {
    Write-Host "pgvector $pgvVersion for PostgreSQL 16"
    $pgvZip = Join-Path $env:TEMP $pgvAsset
    Fetch "https://github.com/andreiramani/pgvector_pgsql_windows/releases/download/$pgvTag/$pgvAsset" $pgvZip
    $actual = (Get-FileHash -Algorithm SHA256 -Path $pgvZip).Hash.ToLowerInvariant()
    if ($actual -ne $pgvSha256) {
      throw "pgvector SHA-256 mismatch. Expected $pgvSha256 but got $actual for $pgvZip"
    }
    $pgvExtract = Join-Path $payload 'tmp-pgv'
    if (Test-Path $pgvExtract) { Remove-Item $pgvExtract -Recurse -Force }
    Expand-Archive $pgvZip -DestinationPath $pgvExtract -Force
    # Zip layout: lib\vector.dll, share\extension\*, include\server\extension\vector\*
    # These subfolders line up 1:1 with the PostgreSQL tree, so a recursive
    # copy into $pgDir merges cleanly with the vanilla EnterpriseDB install.
    Copy-Item (Join-Path $pgvExtract '*') $pgDir -Recurse -Force
    Remove-Item $pgvExtract -Recurse -Force
  }
} else {
  Write-Host "Skipping pgvector (dev build without Postgres)"
}

# --- 5c. Ollama local AI runtime -------------------------------------------
# Self-Hosted runs Ollama as its only local AI engine. The Windows setup
# binary is bundled so the machine never needs a browser download; the models
# themselves are pulled from the internet during setup (documented behaviour).
# -SkipOllama produces a dev build without the ~700 MB setup binary.
if (-not $SkipOllama) {
  $ollamaDir   = Join-Path $payload 'vendor\ollama'
  $ollamaSetup = Join-Path $ollamaDir 'OllamaSetup.exe'
  $ollamaVersion = $env:OPSQAI_OLLAMA_VERSION
  if (-not $ollamaVersion) { $ollamaVersion = 'v0.5.7' }
  New-Item -ItemType Directory -Force -Path $ollamaDir | Out-Null
  if (-not (Test-Path $ollamaSetup)) {
    Write-Host "Ollama runtime $ollamaVersion"
    Fetch "https://github.com/ollama/ollama/releases/download/$ollamaVersion/OllamaSetup.exe" $ollamaSetup
  }
  $ollamaSha = (Get-FileHash -Algorithm SHA256 -Path $ollamaSetup).Hash.ToLowerInvariant()
  $expected = $env:OPSQAI_OLLAMA_SHA256
  if (-not $expected -and $VendorPins.ollama) {
    $expected = $VendorPins.ollama.$ollamaVersion
  }
  if ($expected) {
    if ($ollamaSha -ne $expected.ToLowerInvariant()) {
      throw "Ollama setup SHA-256 mismatch for $ollamaVersion. Expected $expected but got $ollamaSha. Update build\vendor-pins.json or set OPSQAI_OLLAMA_SHA256."
    }
    Write-Host "OllamaSetup.exe SHA-256 verified against pin."
  } else {
    # No pin recorded for this release tag. The hash is still written to the
    # sidecar below and enforced at install time by ollama.cjs, so the build
    # stays reproducible; record the pin to make it fail-closed.
    Write-Warning "No SHA-256 pin for Ollama $ollamaVersion — add `"$ollamaVersion`": `"$ollamaSha`" to build\vendor-pins.json (ollama) or set OPSQAI_OLLAMA_SHA256."
  }
  Set-Content -Path (Join-Path $ollamaDir 'OllamaSetup.exe.sha256') -Value $ollamaSha -Encoding ascii
} elseif ($Configuration -eq 'Release') {
  # The AI contract requires a local engine in every shipped installer.
  throw "Release build cannot use -SkipOllama: the local AI engine must be bundled"
} else {
  Write-Host "Skipping Ollama runtime (dev build)"
}

# --- 6. Assets -------------------------------------------------------------
# One approved branding source: public\brand\sovereign-mark.svg is rendered into
# installer\nsis\assets\opsqai.ico (scripts\gen_icons.py) and mirrored to the
# Electron apps. Every copy must be byte-identical or the build fails.
$assetsDest = Join-Path $payload 'assets'
New-Item -ItemType Directory -Force -Path $assetsDest | Out-Null
$icon = Join-Path $root 'installer\nsis\assets\opsqai.ico'
Assert-Exists $icon 'OPSQAI Windows icon'
Copy-Item $icon $assetsDest -Force
Copy-Item $icon (Join-Path $root 'installer\wizard\assets\opsqai.ico') -Force
New-Item -ItemType Directory -Force -Path (Join-Path $root 'desktop-shell\assets') | Out-Null
Copy-Item $icon (Join-Path $root 'desktop-shell\assets\opsqai.ico') -Force


# --- 6b. Payload guardrails ------------------------------------------------
# Never ship a stub installer. These checks fail the build before makensis if
# any large runtime payload was not staged correctly.
Assert-Exists (Join-Path $payload 'runtime\node\node.exe') 'Node.js runtime'
Assert-Exists (Join-Path $payload 'winsw\OpsqaiPlatform.exe') 'WinSW service wrapper'
Assert-Exists (Join-Path $payload 'wizard\OPSQAI-Wizard.exe') 'Electron setup wizard'
Assert-Exists (Join-Path $payload 'desktop-shell\OPSQAI.exe') 'Electron desktop shell'
Assert-Exists (Join-Path $payload 'services\bootstrap\init.js') 'bootstrap service'
Assert-Exists (Join-Path $payload 'services\bootstrap\migrate.mjs') 'migration runner source'

# Provenance: prove WHICH init.js is being shipped, and refuse to ship one that
# still hardcodes an empty embedded PostgreSQL password (the psql
# "fe_sendauth: no password supplied" regression). The printed SHA-256 must
# match the "[bootstrap] init.js sha256=" line in the install log.
$provNode = if (Get-Command node -ErrorAction SilentlyContinue) { 'node' } else {
  Join-Path $payload 'runtime\node\node.exe'
}
& $provNode (Join-Path $root 'build\bootstrap-provenance.mjs') `
  '--init' (Join-Path $payload 'services\bootstrap\init.js') `
  '--version' $Version
if ($LASTEXITCODE -ne 0) { throw "bootstrap provenance check failed with $LASTEXITCODE" }
Assert-Exists (Join-Path $payload 'services\bootstrap\build-provenance.json') 'bootstrap provenance record'

# Icon provenance: the staged payload icon and both packaged Electron apps must
# carry the approved Sovereign Mark. A placeholder or stale icon fails here.
& $provNode (Join-Path $root 'build\verify-icons.mjs') `
  '--source' $icon `
  '--copy' (Join-Path $assetsDest 'opsqai.ico') `
  '--copy' (Join-Path $root 'installer\wizard\assets\opsqai.ico') `
  '--copy' (Join-Path $root 'desktop-shell\assets\opsqai.ico') `
  '--exe' (Join-Path $payload 'wizard\OPSQAI-Wizard.exe') `
  '--exe' (Join-Path $payload 'desktop-shell\OPSQAI.exe')
if ($LASTEXITCODE -ne 0) { throw "icon verification failed with $LASTEXITCODE" }



# Frontend/server provenance: prove WHICH frontend build is packaged. The
# printed buildHash must match the "[provenance] frontend ..." line in the
# platform service log, the Build line in the app shell sidebar, and
# /api/public/health on the installed machine.
if (-not $SkipApp) {
  & $provNode (Join-Path $root 'build\frontend-provenance.mjs') `
    '--app' $appStage `
    '--version' $script:FrontendVersion `
    '--commit' $script:FrontendCommit
  if ($LASTEXITCODE -ne 0) { throw "frontend provenance check failed with $LASTEXITCODE" }
  Assert-Exists (Join-Path $appStage 'build-provenance.json') 'frontend provenance record'
}


Assert-Exists (Join-Path $payload 'services\updater\apply.js') 'update apply orchestrator'
Assert-Exists (Join-Path $payload 'services\backup\create.js')    'backup create script'
Assert-Exists (Join-Path $payload 'services\backup\list.js')      'backup list script'
Assert-Exists (Join-Path $payload 'services\backup\prune.js')     'backup prune script'
Assert-Exists (Join-Path $payload 'services\backup\verify.js')    'backup verify script'
Assert-Exists (Join-Path $payload 'services\backup\restore.js')   'backup restore script'
Assert-Exists (Join-Path $payload 'services\backup\scheduled.js') 'backup scheduler'
Assert-Exists (Join-Path $payload 'app\server\index.mjs') 'self-hosted app bundle'
Assert-Exists (Join-Path $payload 'app\server\migrate.mjs') 'staged migration runner'
Assert-Exists (Join-Path $payload 'app\server\errors.cjs')  'staged migration error catalog'
Assert-Exists (Join-Path $payload 'app\server\admin-seed\admin-seed.mjs') 'staged admin seeder'
Assert-Exists (Join-Path $payload 'app\server\admin-seed\node_modules\pg\package.json') 'pg module staged for admin-seed'
Assert-Exists (Join-Path $payload 'app\server\admin-seed\node_modules\argon2\package.json') 'argon2 module staged for admin-seed'
Assert-Exists (Join-Path $payload 'app\server\admin-seed\node_modules\argon2\prebuilds\win32-x64') 'argon2 win32-x64 prebuild'

Assert-Exists (Join-Path $payload 'caddy\caddy.exe') 'Caddy runtime'
Assert-Exists (Join-Path $payload 'services\bootstrap\ollama.cjs') 'local AI engine setup module'
if (-not $SkipOllama) {
  Assert-Exists (Join-Path $payload 'vendor\ollama\OllamaSetup.exe') 'Ollama local AI runtime setup'
}
if (-not $SkipPostgres) {
  Assert-Exists (Join-Path $payload 'pgsql\bin\postgres.exe') 'PostgreSQL runtime'
  Assert-Exists (Join-Path $payload 'pgsql\lib\vector.dll')                 'pgvector runtime (vector.dll)'
  Assert-Exists (Join-Path $payload 'pgsql\share\extension\vector.control') 'pgvector control file'
}

$payloadBytes = (Get-ChildItem $payload -Recurse -File | Measure-Object Length -Sum).Sum
$minimumBytes = if ($SkipPostgres) { 75MB } else { 250MB }
if ($payloadBytes -lt $minimumBytes) {
  throw "Payload is too small ($([Math]::Round($payloadBytes / 1MB, 1)) MB). Refusing to build a stub installer."
}

# --- 6c. Pre-compress heavy payload components -----------------------------
# makensis.exe is 32-bit and a SOLID compressor holds the entire data block in
# one growable memory-mapped region. Past a certain payload size that mapping
# cannot grow and makensis dies with:
#   Internal compiler error #12345: error mmapping datablock to 33556560
# So we compress the heavy components here (7z) and let NSIS merely STORE the
# resulting blobs. Guardrails above already validated the staged tree, and the
# installer verifies each part's SHA-256 before extracting it.
Assert-Exists $sevenZip 'bundled 7zr.exe extractor'
$partsDir = Join-Path $root 'build\parts'
$partsNsh = Join-Path $root 'installer\nsis\parts.generated.nsh'
# Prefer a full 7z.exe when the runner has one (faster multithreaded packing),
# otherwise the bundled standalone 7zr.exe creates the archives.
$archiver = @(
  'C:\Program Files\7-Zip\7z.exe',
  'C:\Program Files (x86)\7-Zip\7z.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $archiver) { $archiver = $sevenZip }
# The packer removes payload\runtime after archiving it, so it must NOT run
# from the staged node.exe (Windows refuses to delete a running image).
$packNode = if (Get-Command node -ErrorAction SilentlyContinue) { 'node' } else {
  $nodeTmp = Join-Path $root 'build\nodetmp'
  Remove-Item $nodeTmp -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $nodeTmp | Out-Null
  Copy-Item (Join-Path $payload 'runtime\node\*') $nodeTmp -Recurse -Force
  Join-Path $nodeTmp 'node.exe'
}
Write-Host "Packing payload parts with $archiver ..."
$packArgs = @(
  (Join-Path $root 'build\pack-payload.mjs'),
  '--payload', $payload,
  '--parts',   $partsDir,
  '--nsh',     $partsNsh,
  '--archiver', $archiver
)
if ($SkipPostgres) { $packArgs += '--skip-postgres' }
if ($SkipOllama)   { $packArgs += '--skip-ollama' }
& $packNode @packArgs
if ($LASTEXITCODE -ne 0) { throw "pack-payload.mjs failed with $LASTEXITCODE" }
# The packer must have produced BOTH outputs. A packer that exits 0 without
# writing them (for example an entrypoint that never runs) is a build failure,
# not something to discover later inside makensis.
$partsManifest = Join-Path $partsDir 'parts.manifest.json'
if (-not (Test-Path $partsManifest)) {
  throw "pack-payload.mjs exited 0 but wrote no parts manifest at $partsManifest. The payload was not packed; see docs/engineering/windows-installer-packaging.md."
}
if (-not (Test-Path $partsNsh)) {
  throw "pack-payload.mjs exited 0 but wrote no NSIS include at $partsNsh. The payload was not packed; see docs/engineering/windows-installer-packaging.md."
}
# Structural guardrail: every non-skipped heavy component must have its own part.
# pack-payload.mjs additionally verifies that each archive's ONLY top-level entry
# is the component directory (app/, runtime/, pgsql/, ...), because NSIS extracts
# the parts straight into $INSTDIR and the archive root defines the installed
# layout. Archiving a component's contents produced $INSTDIR\server / \node / \bin
# instead of $INSTDIR\app\server / \runtime\node / \pgsql\bin.
$manifestJson = Get-Content $partsManifest -Raw | ConvertFrom-Json
$packedParts  = @($manifestJson.parts | ForEach-Object { $_.name })
$expectedParts = @('app', 'runtime', 'winsw', 'caddy', 'wizard', 'desktop-shell')
if (-not $SkipPostgres) { $expectedParts += 'pgsql' }
if (-not $SkipOllama)   { $expectedParts += 'vendor' }
foreach ($expected in $expectedParts) {
  if ($packedParts -notcontains $expected) {
    throw "pack-payload.mjs produced no '$expected.7z' part. Installed layout would be incomplete."
  }
}
if ($SkipPostgres) { Write-Host "  skipped: pgsql (PostgreSQL + pgvector)" }
if ($SkipOllama)   { Write-Host "  skipped: vendor (local AI engine)" }
Write-Host ("Payload parts verified: {0}" -f ($packedParts -join ', '))

# --- 7. Run NSIS -----------------------------------------------------------
# A 64-bit makensis (NSIS 3.10+ ships one under Bin\) has no 2 GB address-space
# ceiling at all. Prefer it when present; the parts strategy above keeps the
# 32-bit compiler well inside its limits either way.
$makensis = @(
  'C:\Program Files (x86)\NSIS\Bin\makensis.exe',
  'C:\Program Files\NSIS\Bin\makensis.exe',
  'C:\Program Files (x86)\NSIS\makensis.exe',
  'C:\Program Files\NSIS\makensis.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $makensis) { throw 'NSIS not found. Install NSIS 3.09+.' }
Write-Host "Using $makensis"

Write-Host "makensis..."
$flags = @("/DVERSION=$Version", "/DPAYLOAD_DIR=$payload")
if ($SkipPostgres) { $flags += "/DSKIP_POSTGRES=1" }
& $makensis @flags (Join-Path $root 'installer\nsis\OPSQAI-Setup.nsi')
if ($LASTEXITCODE -ne 0) { throw "makensis failed with $LASTEXITCODE" }

$exe = Join-Path $artifacts 'OPSQAI-Setup.exe'
if (-not (Test-Path $exe)) { throw "Installer not produced at $exe" }

# The produced installer must carry the approved icon too (MUI_ICON/MUI_UNICON).
& $provNode (Join-Path $root 'build\verify-icons.mjs') '--source' $icon '--exe' $exe
if ($LASTEXITCODE -ne 0) { throw "installer icon verification failed with $LASTEXITCODE" }


# --- 8. Sign ---------------------------------------------------------------
if ($Sign) {
  Write-Host "Signing $exe with EV cert..."
  & signtool.exe sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a $exe
  if ($LASTEXITCODE -ne 0) { throw "signtool failed with $LASTEXITCODE" }
  & signtool.exe verify /pa /v $exe
}

Write-Host "OK -> $exe" -ForegroundColor Green
