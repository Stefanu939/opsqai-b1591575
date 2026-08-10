<#
.SYNOPSIS
  Clean-install / upgrade acceptance check for an installed OPSQAI Self-Hosted
  system. Run it on the test machine AFTER OPSQAI-Setup.exe finished.

.DESCRIPTION
  "NSIS produced an EXE" is not success. This script asserts the whole
  installer -> startup contract and distinguishes:
      not listening  |  listening but unhealthy  |  healthy
  Nothing here is destructive: it never touches the PostgreSQL data directory,
  never rewrites config.json and never resets the database.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File verify-install-layout.ps1
  powershell -ExecutionPolicy Bypass -File verify-install-layout.ps1 -Rerun
#>
[CmdletBinding()]
param(
  [string]$InstallDir = (Join-Path $env:ProgramW6432 'OPSQAI'),
  [string]$DataDir    = (Join-Path $env:ProgramData 'OPSQAI'),
  [int]$AppPort       = 3000,
  [int]$PgPort        = 55432,
  # Compares installId / DB password / database against a baseline captured by a
  # previous run, proving a restart or re-bootstrap preserved existing data.
  [switch]$Rerun
)

$ErrorActionPreference = 'Stop'
$script:Failures = @()
$script:Checks = 0

function Check([string]$name, [scriptblock]$body) {
  $script:Checks++
  try {
    & $body
    Write-Host ("  [ OK ] {0}" -f $name)
  } catch {
    $script:Failures += "$name -> $($_.Exception.Message)"
    Write-Host ("  [FAIL] {0} -> {1}" -f $name, $_.Exception.Message) -ForegroundColor Red
  }
}
function Expect([bool]$cond, [string]$message) { if (-not $cond) { throw $message } }

$configPath = Join-Path $DataDir 'config\config.json'
$psql       = Join-Path $InstallDir 'pgsql\bin\psql.exe'
$baseline   = Join-Path $DataDir 'logs\acceptance-baseline.json'

Write-Host "OPSQAI clean-install acceptance check"
Write-Host "  install dir: $InstallDir"
Write-Host "  data dir   : $DataDir"

# --- 1..3 installed directory structure ------------------------------------
# This is the layout the payload packer must reproduce; a flat $INSTDIR (server\,
# node\, bin\) means the .7z parts lost their top-level component directory.
$requiredPaths = @(
  'app\server\index.mjs',
  'app\server\migrate.mjs',
  'app\server\admin-seed\admin-seed.mjs',
  'app\migrations',
  'runtime\node\node.exe',
  'pgsql\bin\psql.exe',
  'pgsql\bin\pg_ctl.exe',
  'pgsql\bin\pg_isready.exe',
  'caddy\caddy.exe',
  'winsw\OpsqaiPlatform.exe',
  'wizard\OPSQAI-Wizard.exe',
  'desktop-shell\OPSQAI.exe',
  'services\bootstrap\init.js',
  'tools\7zr.exe'
)
foreach ($rel in $requiredPaths) {
  Check "layout: $rel" { Expect (Test-Path (Join-Path $InstallDir $rel)) "missing $rel" }.GetNewClosure()
}
foreach ($stray in @('server', 'node', 'bin', 'lib')) {
  Check "layout: no flat '$stray' at the install root" {
    Expect (-not (Test-Path (Join-Path $InstallDir $stray))) `
      "$stray exists at the install root - payload parts were archived without their component directory"
  }.GetNewClosure()
}

# --- 3b. bootstrap provenance ---------------------------------------------
# The installed init.js must be byte-identical to the one recorded at build
# time, and must be the ONLY bootstrap entrypoint (no stale copy a launcher
# could pick up instead).
$bootstrapInit = Join-Path $InstallDir 'services\bootstrap\init.js'
$provPath      = Join-Path $InstallDir 'services\bootstrap\build-provenance.json'
Check 'bootstrap provenance record shipped' { Expect (Test-Path $provPath) "missing $provPath" }
Check 'installed init.js matches build provenance sha256' {
  $raw  = (Get-Content $provPath -Raw) -replace "^\uFEFF", ''
  $rec  = $raw | ConvertFrom-Json
  $hash = (Get-FileHash $bootstrapInit -Algorithm SHA256).Hash.ToLower()
  Expect ($hash -eq $rec.sha256) "installed init.js sha256=$hash but provenance says $($rec.sha256)"
}
Check 'installed init.js resolves the embedded DB password from config' {
  $src = Get-Content $bootstrapInit -Raw
  Expect ($src -match [regex]::Escape('config.database.embedded?.password')) `
    'init.js does not read config.database.embedded.password'
  Expect ($src -notmatch 'const\s+pw\s*=\s*embedded\s*\?\s*""') `
    'init.js still hardcodes an empty embedded password (fe_sendauth regression)'
}
Check 'exactly one bootstrap init.js is installed' {
  $copies = @(Get-ChildItem -Path $InstallDir -Filter 'init.js' -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\node_modules\\' })
  Expect ($copies.Count -eq 1) ("found {0} init.js copies: {1}" -f $copies.Count, ($copies.FullName -join '; '))
}



# --- 4..7 configuration ----------------------------------------------------
$cfg = $null
Check 'config.json exists' { Expect (Test-Path $configPath) "missing $configPath" }
Check 'config.json is valid JSON (BOM tolerated)' {
  $raw = (Get-Content $configPath -Raw) -replace "^\uFEFF", ''
  $script:cfg = $raw | ConvertFrom-Json
  Expect ($null -ne $script:cfg) 'config.json did not parse'
}
Check 'config.json contains a valid UUID installId' {
  Expect ($script:cfg.installId -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') `
    "installId is '$($script:cfg.installId)'"
}

# --- 8..13 database --------------------------------------------------------
Check 'OpsqaiDatabase service exists' {
  Expect ($null -ne (Get-Service OpsqaiDatabase -ErrorAction SilentlyContinue)) 'service not installed'
}
Check "PostgreSQL listens on 127.0.0.1:$PgPort" {
  Expect (Test-NetConnection -ComputerName 127.0.0.1 -Port $PgPort -InformationLevel Quiet -WarningAction SilentlyContinue) `
    'no TCP listener'
}

$pgEnv = @{
  PGHOST = '127.0.0.1'; PGPORT = "$PgPort"; PGUSER = 'opsqai'
  PGPASSWORD = [string]$cfg.database.embedded.password
}
function Psql([string]$db, [string]$sql) {
  foreach ($k in $pgEnv.Keys) { Set-Item -Path "env:$k" -Value $pgEnv[$k] }
  $env:PGDATABASE = $db
  $out = & $psql -w -tAc $sql 2>&1
  if ($LASTEXITCODE -ne 0) { throw "psql failed: $out" }
  return ($out | Out-String).Trim()
}
Check 'system database "postgres" reachable' { Expect ((Psql 'postgres' 'SELECT 1') -eq '1') 'cannot query postgres' }
Check 'application database "opsqai" was created automatically' {
  Expect ((Psql 'postgres' "SELECT 1 FROM pg_database WHERE datname='opsqai'") -eq '1') 'opsqai database missing'
}
Check 'migrations 0001-0017 are recorded as applied' {
  $applied = [int](Psql 'opsqai' 'SELECT count(*) FROM public.schema_migrations')
  $bundled = (Get-ChildItem (Join-Path $InstallDir 'app\migrations') -Filter *.sql).Count
  Expect ($bundled -gt 0) 'no migrations bundled'
  Expect ($applied -ge $bundled) "only $applied of $bundled migrations applied"
}
Check 'public.users exists' {
  Expect ((Psql 'opsqai' "SELECT to_regclass('public.users') IS NOT NULL") -eq 't') 'users table missing'
}
Check 'admin seed created the installation owner' {
  Expect ([int](Psql 'opsqai' "SELECT count(*) FROM public.user_roles WHERE role='platform_owner'") -ge 1) `
    'no platform_owner account'
}

# --- 15..19 services and health -------------------------------------------
Check 'OpsqaiPlatform service is running' {
  Expect ((Get-Service OpsqaiPlatform).Status -eq 'Running') 'platform service is not running'
}
Check "platform is listening on 127.0.0.1:$AppPort" {
  Expect (Test-NetConnection -ComputerName 127.0.0.1 -Port $AppPort -InformationLevel Quiet -WarningAction SilentlyContinue) `
    'process is not listening (check logs\OpsqaiPlatform.err.log)'
}
Check 'platform /health reports healthy (listening != healthy)' {
  $r = Invoke-WebRequest "http://127.0.0.1:$AppPort/health" -UseBasicParsing -TimeoutSec 20
  Expect ($r.StatusCode -eq 200) "health returned HTTP $($r.StatusCode) - listening but unhealthy"
  Expect ($r.Content -match 'ok|healthy') "unexpected health payload: $($r.Content)"
}
Check 'OPSQAI_INSTALL_ID reached the platform process' {
  $log = Join-Path $DataDir 'logs\OpsqaiPlatform.out.log'
  Expect (Test-Path $log) 'platform log missing'
  $txt = Get-Content $log -Raw
  Expect ($txt -match [regex]::Escape("install_id=$($cfg.installId)")) `
    'platform log does not show the canonical install_id'
}
Check 'OpsqaiCaddy service is running' {
  Expect ((Get-Service OpsqaiCaddy).Status -eq 'Running') 'caddy service is not running'
}
Check 'https://localhost answers' {
  # A self-signed local CA is acceptable here; only reachability is asserted.
  try { $r = Invoke-WebRequest 'https://localhost/health' -UseBasicParsing -TimeoutSec 20 -SkipCertificateCheck }
  catch { $r = Invoke-WebRequest 'https://localhost/health' -UseBasicParsing -TimeoutSec 20 }
  Expect ($r.StatusCode -eq 200) "https://localhost/health returned HTTP $($r.StatusCode)"
}

# --- 20 restart loops ------------------------------------------------------
Check 'no service is stuck in a restart loop' {
  $since = (Get-Date).AddMinutes(-5)
  foreach ($svc in @('OpsqaiDatabase', 'OpsqaiPlatform', 'OpsqaiCaddy')) {
    $err = Join-Path $DataDir "logs\$svc.err.log"
    if (Test-Path $err) {
      $recent = (Get-Item $err)
      if ($recent.LastWriteTime -gt $since -and $recent.Length -gt 0) {
        $tail = (Get-Content $err -Tail 5) -join ' | '
        if ($tail -match 'FATAL|Unauthorized|EADDRINUSE|Missing environment variable') {
          throw "$svc keeps failing: $tail"
        }
      }
    }
  }
}

# --- 21..22 upgrade / re-run preservation ----------------------------------
$snapshot = [ordered]@{
  installId  = $cfg.installId
  pgPassword = [string]$cfg.database.embedded.password
  pgDataDir  = (Test-Path (Join-Path $DataDir 'data\pgsql\PG_VERSION'))
  users      = [int](Psql 'opsqai' 'SELECT count(*) FROM public.users')
  migrations = [int](Psql 'opsqai' 'SELECT count(*) FROM public.schema_migrations')
}
if ($Rerun) {
  Check 'a second start/bootstrap preserved installId, DB password, schema and data' {
    Expect (Test-Path $baseline) "no baseline at $baseline - run this script once without -Rerun first"
    $prev = Get-Content $baseline -Raw | ConvertFrom-Json
    Expect ($prev.installId  -eq $snapshot.installId)  'installId changed on re-run'
    Expect ($prev.pgPassword -eq $snapshot.pgPassword) 'embedded PostgreSQL password was regenerated'
    Expect ($snapshot.pgDataDir) 'PostgreSQL data directory was destroyed'
    Expect ($snapshot.users -ge $prev.users) "user rows dropped from $($prev.users) to $($snapshot.users)"
    Expect ($snapshot.migrations -ge $prev.migrations) 'schema_migrations shrank'
  }
} else {
  New-Item -ItemType Directory -Force -Path (Split-Path $baseline) | Out-Null
  ($snapshot | ConvertTo-Json) | Set-Content $baseline -Encoding utf8
  Write-Host "  baseline written to $baseline (re-run with -Rerun after a service restart)"
}

Write-Host ''
if ($script:Failures.Count -gt 0) {
  Write-Host ("FAILED: {0} of {1} checks" -f $script:Failures.Count, $script:Checks) -ForegroundColor Red
  $script:Failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}
Write-Host ("PASSED: all {0} checks" -f $script:Checks) -ForegroundColor Green
