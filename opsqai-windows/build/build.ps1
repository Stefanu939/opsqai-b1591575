<#
.SYNOPSIS
  Build the OPSQAI Windows installer.

.DESCRIPTION
  Phase 2 pipeline:
    1. Build the OPSQAI app in Node-server mode (npm run build:selfhosted).
    2. Stage the built app bundle + supabase migrations into payload\app.
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
  [string]$Version = '0.0.0-dev'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$payload   = Join-Path $root 'payload'
$artifacts = Join-Path $root 'build\artifacts'
New-Item -ItemType Directory -Force -Path $artifacts | Out-Null

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

# --- 3. Service entrypoints -----------------------------------------------
Copy-Item -Recurse -Force (Join-Path $root 'services') (Join-Path $payload 'services')

# --- 4. Caddy --------------------------------------------------------------
$caddyVersion = '2.8.4'
$caddyDir = Join-Path $payload 'caddy'
if (-not (Test-Path (Join-Path $caddyDir 'caddy.exe'))) {
  Write-Host "Caddy $caddyVersion"
  $zip = Join-Path $env:TEMP "caddy_${caddyVersion}_windows_amd64.zip"
  Fetch "https://github.com/caddyserver/caddy/releases/download/v$caddyVersion/caddy_${caddyVersion}_windows_amd64.zip" $zip
  Expand-Archive $zip -DestinationPath $caddyDir -Force
}
Copy-Item (Join-Path $root 'payload\caddy\Caddyfile') (Join-Path $caddyDir 'Caddyfile') -Force

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

# --- 6. Assets -------------------------------------------------------------
$assetsDest = Join-Path $payload 'assets'
New-Item -ItemType Directory -Force -Path $assetsDest | Out-Null
$icon = Join-Path $root 'installer\nsis\assets\opsqai.ico'
if (Test-Path $icon) { Copy-Item $icon $assetsDest -Force }

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
