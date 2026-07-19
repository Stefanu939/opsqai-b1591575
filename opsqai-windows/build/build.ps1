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
  [string]$Version = '0.0.0-dev'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$payload   = Join-Path $root 'payload'
$artifacts = Join-Path $root 'build\artifacts'
New-Item -ItemType Directory -Force -Path $artifacts | Out-Null

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

    # admin-seed.mjs imports npm packages ('pg', 'argon2'). The Nitro bundle
    # next door doesn't expose those to a standalone script, so bundle it
    # with esbuild: `pg` is pure JS and gets inlined; `argon2` ships a
    # native .node addon and must stay external — we stage its module tree
    # beside admin-seed.mjs so Node resolves `import 'argon2'` from
    # payload\app\server\node_modules\argon2.
    $adminSrc = Join-Path $root 'services\bootstrap\admin-seed.mjs'
    $adminOut = Join-Path $appStage 'server\admin-seed.mjs'
    & bunx --bun esbuild $adminSrc --bundle --platform=node --format=esm --target=node20 --external:argon2 "--outfile=$adminOut"
    if ($LASTEXITCODE -ne 0) { throw "esbuild admin-seed.mjs failed" }

    # Stage argon2 + transitive runtime deps into payload\app\server\node_modules.
    # node-gyp-build resolves the prebuild from argon2\prebuilds\win32-x64 at load time,
    # so the Windows-installed node_modules tree (this script only runs on Windows CI)
    # already contains the correct native binary under that folder.
    $nmDst = Join-Path $appStage 'server\node_modules'
    New-Item -ItemType Directory -Force -Path $nmDst | Out-Null
    foreach ($pkg in @('argon2','node-addon-api','node-gyp-build')) {
      $src = Join-Path $projectRoot ("node_modules\" + $pkg)
      if (-not (Test-Path $src)) { throw "Required runtime dep missing from node_modules: $pkg" }
      Copy-Item $src (Join-Path $nmDst $pkg) -Recurse -Force
    }
    $phcSrc = Join-Path $projectRoot 'node_modules\@phc\format'
    if (-not (Test-Path $phcSrc)) { throw "Required runtime dep missing from node_modules: @phc/format" }
    New-Item -ItemType Directory -Force -Path (Join-Path $nmDst '@phc') | Out-Null
    Copy-Item $phcSrc (Join-Path $nmDst '@phc\format') -Recurse -Force
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
}


function Fetch($url, $dest) {
  if (Test-Path $dest) { return }
  Write-Host "  -> $url"
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  Invoke-WebRequest $url -OutFile $dest -UseBasicParsing
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

# --- 6. Assets -------------------------------------------------------------
$assetsDest = Join-Path $payload 'assets'
New-Item -ItemType Directory -Force -Path $assetsDest | Out-Null
$icon = Join-Path $root 'installer\nsis\assets\opsqai.ico'
if (Test-Path $icon) { Copy-Item $icon $assetsDest -Force }

# --- 6b. Payload guardrails ------------------------------------------------
# Never ship a stub installer. These checks fail the build before makensis if
# any large runtime payload was not staged correctly.
Assert-Exists (Join-Path $payload 'runtime\node\node.exe') 'Node.js runtime'
Assert-Exists (Join-Path $payload 'winsw\OpsqaiPlatform.exe') 'WinSW service wrapper'
Assert-Exists (Join-Path $payload 'wizard\OPSQAI-Wizard.exe') 'Electron setup wizard'
Assert-Exists (Join-Path $payload 'services\bootstrap\init.js') 'bootstrap service'
Assert-Exists (Join-Path $payload 'services\bootstrap\migrate.mjs') 'migration runner source'
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
Assert-Exists (Join-Path $payload 'app\server\admin-seed.mjs') 'staged admin seeder'
Assert-Exists (Join-Path $payload 'app\server\node_modules\argon2\package.json') 'argon2 module staged for admin-seed'
Assert-Exists (Join-Path $payload 'app\server\node_modules\argon2\prebuilds\win32-x64') 'argon2 win32-x64 prebuild'
Assert-Exists (Join-Path $payload 'caddy\caddy.exe') 'Caddy runtime'
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

# --- 7. Run NSIS -----------------------------------------------------------
$makensis = @(
  'C:\Program Files (x86)\NSIS\makensis.exe',
  'C:\Program Files\NSIS\makensis.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $makensis) { throw 'NSIS not found. Install NSIS 3.09+.' }

Write-Host "makensis..."
$flags = @("/DVERSION=$Version", "/DPAYLOAD_DIR=$payload")
if ($SkipPostgres) { $flags += "/DSKIP_POSTGRES=1" }
& $makensis @flags (Join-Path $root 'installer\nsis\OPSQAI-Setup.nsi')
if ($LASTEXITCODE -ne 0) { throw "makensis failed with $LASTEXITCODE" }

$exe = Join-Path $artifacts 'OPSQAI-Setup.exe'
if (-not (Test-Path $exe)) { throw "Installer not produced at $exe" }

# --- 8. Sign ---------------------------------------------------------------
if ($Sign) {
  Write-Host "Signing $exe with EV cert..."
  & signtool.exe sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a $exe
  if ($LASTEXITCODE -ne 0) { throw "signtool failed with $LASTEXITCODE" }
  & signtool.exe verify /pa /v $exe
}

Write-Host "OK -> $exe" -ForegroundColor Green
