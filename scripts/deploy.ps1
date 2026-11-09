param (
    [Parameter(Position=0)]
    [ValidateSet("build","start","stop","restart","reload","status","logs")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
$WorkingDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $WorkingDir

Write-Host "=== Family Stream Manager: $Action ===" -ForegroundColor Cyan

switch ($Action) {
    "build" {
        Write-Host "Building Next.js standalone application..." -ForegroundColor Yellow
        npm run build:standalone
        Write-Host "Build complete and static assets hydrated." -ForegroundColor Green
    }
    "start" {
        Write-Host "Starting PM2 service..." -ForegroundColor Yellow
        npx pm2 start ecosystem.config.cjs --env production
        npx pm2 save
        Write-Host "Service started." -ForegroundColor Green
    }
    "stop" {
        npx pm2 stop ecosystem.config.cjs
        Write-Host "Service stopped." -ForegroundColor Red
    }
    "restart" {
        npx pm2 restart ecosystem.config.cjs
        Write-Host "Service restarted." -ForegroundColor Green
    }
    "reload" {
        npx pm2 reload ecosystem.config.cjs
        Write-Host "Zero-downtime reload completed." -ForegroundColor Green
    }
    "status" {
        npx pm2 status
    }
    "logs" {
        npx pm2 logs family-stream
    }
}
