# Convenience local boot (SQLite smoke mode for user/community).
# Prefer Docker MySQL in real daily development — see README.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Force -Path (Join-Path $root ".data") | Out-Null

Write-Host "Start services manually in separate terminals:" -ForegroundColor Cyan
Write-Host '  1) cd backend\services\user; $env:ASH_CONFIG="configs/config.local.yaml"; go run .\cmd'
Write-Host '  2) cd backend\services\agent; go run .\cmd'
Write-Host '  3) cd backend\services\community; $env:ASH_CONFIG="configs/config.local.yaml"; go run .\cmd'
Write-Host '  4) cd frontend; npm run dev'
Write-Host 'Then: powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1'
