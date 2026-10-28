# ==============================================================
# Coffee Shop Order Management System (Akufada)
# Database Backup Automation Script (PowerShell)
# ==============================================================

param(
  [string]$DbHost = $(if ($env:DB_HOST) { $env:DB_HOST } else { "127.0.0.1" }),
  [string]$DbPort = $(if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }),
  [string]$DbName = $(if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "akufada_db" }),
  [string]$DbUser = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "akufada_admin" }),
  [string]$OutputDir = "./backups"
)

$ErrorActionPreference = "Stop"

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$BackupPath = Join-Path $OutputDir "akufada_backup_${Timestamp}.dump"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "AKUFADA DATABASE BACKUP" -ForegroundColor Cyan
Write-Host "Host: $DbHost | Port: $DbPort | DB: $DbName | User: $DbUser"
Write-Host "Target Dump: $BackupPath"
Write-Host "=========================================="

# Check if pg_dump is available in PATH or PostgreSQL program directory
$PgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $PgDump) {
  $DefaultPgPath = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
  if (Test-Path $DefaultPgPath) {
    $PgDump = $DefaultPgPath
  } else {
    $DefaultPg16 = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
    if (Test-Path $DefaultPg16) { $PgDump = $DefaultPg16 }
  }
}

if ($PgDump) {
  Write-Host "Executing pg_dump (Custom compressed archive format -Fc)..."
  & $PgDump -h $DbHost -p $DbPort -U $DbUser -d $DbName -Fc -f $BackupPath
  if ($LASTEXITCODE -eq 0 -and (Test-Path $BackupPath)) {
    $Size = (Get-Item $BackupPath).Length
    Write-Host "SUCCESS: Backup created successfully at $BackupPath ($Size bytes)" -ForegroundColor Green
  } else {
    Write-Error "Backup failed with exit code $LASTEXITCODE"
  }
} else {
  # Fallback to docker container execution if native pg_dump not installed
  Write-Host "Native pg_dump not found in PATH. Attempting containerized execution via Docker..."
  docker compose exec -T postgres pg_dump -U $DbUser -Fc $DbName > $BackupPath
  if (Test-Path $BackupPath) {
    Write-Host "SUCCESS: Backup created via Docker at $BackupPath" -ForegroundColor Green
  } else {
    Write-Error "Failed to execute backup: Neither native pg_dump nor Docker container is reachable."
  }
}
