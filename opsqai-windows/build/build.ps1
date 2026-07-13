<#
.SYNOPSIS
  Build the OPSQAI Windows installer.

.DESCRIPTION
  Phase 1 pipeline:
    1. Stage payload/ (Node runtime, WinSW binaries renamed per service, hello service).
    2. Run makensis to produce OPSQAI-Setup.exe.
    3. Optionally sign with the EV code-signing certificate on the runner.

  Phases 2+ add: app bundle, PostgreSQL Portable, Caddy, wizard/admin Electron builds.

.PARAMETER Configuration
  Debug | Release. Release enables LZMA solid compression and strips dev logs.

.PARAMETER Sign
  Sign the resulting exe with signtool + the EV cert (must be present on the runner).

.PARAMETER Version
  Semver string. Defaults to 0.0.0-dev.
#>
[CmdletBinding()]
param(
  [ValidateSet('Debug','Release')] [string]$Configuration = 'Debug',
  [switch]$Sign,
  [string]$Version = '0.0.0-dev'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$payload   = Join-Path $root 'payload'
$artifacts = Join-Path $root 'build\artifacts'
New-Item -ItemType Directory -Force -Path $artifacts | Out-Null

# --- 1. Node runtime -------------------------------------------------------
$nodeVersion = '20.18.1'
$nodeDir     = Join-Path $payload 'runtime\node'
if (-not (Test-Path (Join-Path $nodeDir 'node.exe'))) {
  Write-Host "Downloading Node.js $nodeVersion..."
  $zip = Join-Path $env:TEMP "node-v$nodeVersion-win-x64.zip"
  Invoke-WebRequest "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip" -OutFile $zip
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
if (-not (Test-Path $winswExe)) {
  Write-Host "Downloading WinSW $winswVersion..."
  Invoke-WebRequest "https://github.com/winsw/winsw/releases/download/v$winswVersion/WinSW-x64.exe" -OutFile $winswExe
}

# One renamed copy per service. Phase 1: hello only.
$services = @('OpsqaiHello')
foreach ($svc in $services) {
  Copy-Item $winswExe (Join-Path $winswDir "$svc.exe") -Force
  Copy-Item (Join-Path $root "winsw-configs\$svc.xml") (Join-Path $winswDir "$svc.xml") -Force
}

# --- 3. Hello service payload ---------------------------------------------
$svcDest = Join-Path $payload 'services\hello'
New-Item -ItemType Directory -Force -Path $svcDest | Out-Null
Copy-Item (Join-Path $root 'services\hello\index.js') $svcDest -Force

# --- 4. Assets -------------------------------------------------------------
$assetsDest = Join-Path $payload 'assets'
New-Item -ItemType Directory -Force -Path $assetsDest | Out-Null
$icon = Join-Path $root 'installer\nsis\assets\opsqai.ico'
if (Test-Path $icon) { Copy-Item $icon $assetsDest -Force }

# --- 5. Run NSIS -----------------------------------------------------------
$makensis = @(
  'C:\Program Files (x86)\NSIS\makensis.exe',
  'C:\Program Files\NSIS\makensis.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $makensis) { throw 'NSIS not found. Install NSIS 3.09+.' }

Write-Host "Running makensis..."
& $makensis "/DVERSION=$Version" "/DPAYLOAD_DIR=$payload" (Join-Path $root 'installer\nsis\OPSQAI-Setup.nsi')
if ($LASTEXITCODE -ne 0) { throw "makensis failed with $LASTEXITCODE" }

$exe = Join-Path $artifacts 'OPSQAI-Setup.exe'
if (-not (Test-Path $exe)) { throw "Installer not produced at $exe" }

# --- 6. Sign ---------------------------------------------------------------
if ($Sign) {
  $signtool = 'signtool.exe' # assume on PATH via Windows SDK
  Write-Host "Signing $exe with EV cert..."
  & $signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a $exe
  if ($LASTEXITCODE -ne 0) { throw "signtool failed with $LASTEXITCODE" }
  & $signtool verify /pa /v $exe
}

Write-Host "OK -> $exe" -ForegroundColor Green
