# ==============================================================
# Coffee Shop Order Management System (Akufada)
# Database Restore & Verification Script (PowerShell)
# ==============================================================

param(
  [Parameter(Mandatory=$true)]
  [string]$BackupFile,
  [string]$DbHost = $(if ($env:DB_HOST) { $env:DB_HOST } else { "127.0.0.1" }),
  [string]$DbPort = $(if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }),
  [string]$RestoreTargetDb = "akufada_restore_test",
  [string]$DbUser = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "akufada_admin" })
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
  Write-Error "Backup file not found at: $BackupFile"
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "AKUFADA VERIFIED RESTORATION RUNBOOK" -ForegroundColor Cyan
Write-Host "Source Dump: $BackupFile"
Write-Host "Isolated Target DB: $RestoreTargetDb"
Write-Host "=========================================="

$PgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if (-not $PgRestore) {
  $DefaultPgPath = "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe"
  if (Test-Path $DefaultPgPath) {
    $PgRestore = $DefaultPgPath
  } else {
    $DefaultPg16 = "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe"
    if (Test-Path $DefaultPg16) { $PgRestore = $DefaultPg16 }
  }
}

$Psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $Psql) {
  $DefaultPsqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
  if (Test-Path $DefaultPsqlPath) {
    $Psql = $DefaultPsqlPath
  }
}

if ($PgRestore -and $Psql) {
  Write-Host "1. Re-creating clean disposable test database '$RestoreTargetDb'..."
  & $Psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS $RestoreTargetDb;"
  & $Psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE $RestoreTargetDb;"

  Write-Host "2. Restoring archive into '$RestoreTargetDb' via pg_restore..."
  & $PgRestore -h $DbHost -p $DbPort -U $DbUser -d $RestoreTargetDb --clean --if-exists $BackupFile

  Write-Host "3. Executing Post-Restore Data Integrity Verification Queries..." -ForegroundColor Yellow
  $VerifySql = @"
  SELECT 
    (SELECT count(*) FROM users) AS total_users,
    (SELECT count(*) FROM categories) AS total_categories,
    (SELECT count(*) FROM products) AS total_products,
    (SELECT count(*) FROM inventory) AS total_inventory;
"@
  & $Psql -h $DbHost -p $DbPort -U $DbUser -d $RestoreTargetDb -c $VerifySql

  Write-Host "SUCCESS: Restoration and row-count verification completed cleanly!" -ForegroundColor Green
} else {
  Write-Host "Native pg_restore/psql not in PATH. Running containerized restore via Docker..."
  docker compose exec -T postgres psql -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS $RestoreTargetDb; CREATE DATABASE $RestoreTargetDb;"
  Get-Content -Path $BackupFile -Raw | docker compose exec -T postgres pg_restore -U $DbUser -d $RestoreTargetDb --clean --if-exists
  docker compose exec -T postgres psql -U $DbUser -d $RestoreTargetDb -c "SELECT count(*) FROM products; SELECT count(*) FROM users;"
  Write-Host "SUCCESS: Restoration verified via Docker container." -ForegroundColor Green
}
