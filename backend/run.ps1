$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '.env'

if (-not (Test-Path $envFile)) {
  throw "Backend settings file not found: $envFile. Copy .env.example to .env and configure it first."
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#=\s]+)\s*=\s*(.*)\s*$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}

if ([string]::IsNullOrWhiteSpace($env:FRONTEND_ORIGINS)) {
  $env:FRONTEND_ORIGINS = 'http://localhost:5174,http://localhost:5176,http://localhost:5173'
}

Set-Location $PSScriptRoot
& .\mvnw.cmd spring-boot:run
