param(
  [string]$Database = $(if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { 'akufada_db' }),
  [string]$User = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { 'akufada_admin' })
)

$ErrorActionPreference = 'Stop'
$target = "akufada_restore_test_$PID"
$backupPath = Join-Path ([IO.Path]::GetTempPath()) "akufada-backup-$PID.dump"
$targetCreated = $false

function Invoke-ComposePsql([string]$Db, [string]$Sql) {
  $result = docker compose exec -T postgres psql -U $User -d $Db -At -F ',' -c $Sql
  if ($LASTEXITCODE -ne 0) { throw "psql failed against $Db" }
  return ($result -join '').Trim()
}

try {
  docker compose exec -T postgres pg_isready -U $User -d $Database *> $null
  if ($LASTEXITCODE -ne 0) { throw 'The Compose Postgres service is not running or is not ready.' }

  $countsSql = 'SELECT (SELECT count(*) FROM users),(SELECT count(*) FROM categories),(SELECT count(*) FROM products),(SELECT count(*) FROM inventory);'
  $sourceCounts = Invoke-ComposePsql $Database $countsSql
  $dump = Start-Process -FilePath 'docker' -ArgumentList @('compose','exec','-T','postgres','pg_dump','-U',$User,'-Fc',$Database) -NoNewWindow -PassThru -RedirectStandardOutput $backupPath
  $dump.WaitForExit()
  if ($dump.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $backupPath) -or (Get-Item -LiteralPath $backupPath).Length -lt 100) {
    throw 'pg_dump did not produce a valid backup archive.'
  }

  docker compose exec -T postgres psql -U $User -d postgres -c "CREATE DATABASE $target" *> $null
  if ($LASTEXITCODE -ne 0) { throw 'Could not create disposable restore database.' }
  $targetCreated = $true
  $restore = Start-Process -FilePath 'docker' -ArgumentList @('compose','exec','-T','postgres','pg_restore','-U',$User,'-d',$target,'--no-owner','--exit-on-error','-') -NoNewWindow -PassThru -RedirectStandardInput $backupPath
  $restore.WaitForExit()
  if ($restore.ExitCode -ne 0) { throw 'pg_restore failed.' }

  $restoredCounts = Invoke-ComposePsql $target $countsSql
  if ($sourceCounts -ne $restoredCounts) {
    throw "Restored table counts differ. Source=$sourceCounts Restored=$restoredCounts"
  }
  Write-Host "PASS: backup restored to $target; users/categories/products/inventory row counts match." -ForegroundColor Green
}
finally {
  if ($targetCreated) {
    docker compose exec -T postgres psql -U $User -d postgres -c "DROP DATABASE IF EXISTS $target WITH (FORCE)" *> $null
  }
  Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
}
