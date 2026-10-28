param(
  [int]$Port = 55432,
  [string]$Image = 'postgres:16-alpine'
)

$ErrorActionPreference = 'Stop'
$containerName = "akufada-postgres-e2e-$PID"
$databasePassword = [guid]::NewGuid().ToString('N')
$databaseUrl = "postgresql://akufada_e2e:$databasePassword@127.0.0.1:$Port/akufada_e2e?schema=public"
$envNames = @('DATABASE_URL', 'NODE_ENV', 'JWT_ACCESS_SECRET', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD')
$previous = @{}
foreach ($name in $envNames) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }

try {
  docker info *> $null
  if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop must be running to launch the disposable PostgreSQL container.' }

  docker run --detach --rm --name $containerName `
    --env POSTGRES_DB=akufada_e2e `
    --env POSTGRES_USER=akufada_e2e `
    --env "POSTGRES_PASSWORD=$databasePassword" `
    --publish "127.0.0.1:${Port}:5432" `
    --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,size=1g `
    $Image *> $null
  if ($LASTEXITCODE -ne 0) { throw 'Could not start disposable PostgreSQL.' }

  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    docker exec $containerName pg_isready -U akufada_e2e -d akufada_e2e *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Disposable PostgreSQL did not become ready within 60 seconds.' }

  $env:DATABASE_URL = $databaseUrl
  $env:NODE_ENV = 'test'
  $env:JWT_ACCESS_SECRET = 'e2e-test-access-secret-at-least-32-characters-long'
  $env:POSTGRES_DB = 'akufada_e2e'
  $env:POSTGRES_USER = 'akufada_e2e'
  $env:POSTGRES_PASSWORD = $databasePassword

  npm run prisma:generate -w @akufada/backend
  if ($LASTEXITCODE -ne 0) { throw 'Prisma client generation failed.' }
  npm run prisma:deploy -w @akufada/backend
  if ($LASTEXITCODE -ne 0) { throw 'Prisma migrations failed on the disposable database.' }
  npm run prisma:seed -w @akufada/backend
  if ($LASTEXITCODE -ne 0) { throw 'The synthetic seed/bootstrap process failed.' }
  npm run test:e2e -w @akufada/backend
  if ($LASTEXITCODE -ne 0) { throw 'The backend database e2e suite failed.' }

  Write-Host 'PASS: disposable Postgres migration, seed, authentication, catalog, order, access control, and stock recovery checks.' -ForegroundColor Green
}
finally {
  docker rm --force $containerName *> $null
  foreach ($name in $envNames) {
    [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process')
  }
}
