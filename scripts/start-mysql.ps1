# Start local MySQL via Docker (preferred for Windows/macOS/Linux).
# Fallback: install MySQL 8 locally and create DB/user matching config.yaml

param(
  [switch]$Recreate
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker not found. Install Docker Desktop, then re-run this script." -ForegroundColor Yellow
  Write-Host "Manual MySQL bootstrap SQL is in deploy/mysql/init/01-init.sql" -ForegroundColor Yellow
  exit 1
}

if ($Recreate) {
  docker rm -f ash-mysql-dev 2>$null | Out-Null
}

$exists = docker ps -a --format "{{.Names}}" | Select-String -SimpleMatch "ash-mysql-dev"
if (-not $exists) {
  docker run -d --name ash-mysql-dev `
    -e MYSQL_ROOT_PASSWORD=root_dev_password `
    -e MYSQL_DATABASE=ash_dev `
    -e MYSQL_USER=ash `
    -e MYSQL_PASSWORD=ash_dev_password `
    -p 3306:3306 `
    mysql:8.0 `
    --character-set-server=utf8mb4 `
    --collation-server=utf8mb4_unicode_ci `
    --innodb-buffer-pool-size=128M
} else {
  docker start ash-mysql-dev | Out-Null
}

Write-Host "Waiting for MySQL..."
for ($i = 0; $i -lt 40; $i++) {
  docker exec ash-mysql-dev mysqladmin ping -h 127.0.0.1 -uroot -proot_dev_password --silent 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "MySQL is ready on localhost:3306 (db=ash_dev user=ash)" -ForegroundColor Green
    exit 0
  }
  Start-Sleep -Seconds 2
}
throw "MySQL did not become ready in time"
