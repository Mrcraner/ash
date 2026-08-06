# ASH local API smoke test (PowerShell)
# Prerequisites: user/agent/community services running; MySQL via start-mysql.ps1.

$ErrorActionPreference = "Stop"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Assert-Ok($name, $resp) {
  if ($null -eq $resp) { throw "${name}: empty response" }
  if ($resp.code -ne 0) { throw "${name}: code=$($resp.code) message=$($resp.message)" }
  Write-Host "OK  $name" -ForegroundColor Green
}

Write-Host "== health =="
Assert-Ok "user/health" (Invoke-RestMethod http://127.0.0.1:8001/health)
Assert-Ok "agent/health" (Invoke-RestMethod http://127.0.0.1:8002/health)
Assert-Ok "community/health" (Invoke-RestMethod http://127.0.0.1:8003/health)

Write-Host "== agent hello (public) =="
Assert-Ok "agent/hello" (Invoke-RestMethod http://127.0.0.1:8002/api/v1/hello)

Write-Host "== auth register/login =="
$u = "smoke_" + [guid]::NewGuid().ToString("N").Substring(0, 8)
$reg = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8001/api/v1/auth/register `
  -ContentType "application/json" `
  -WebSession $session `
  -Body (@{
    nickname = "Smoke"
    username = $u
    password = "pass1234"
    confirm_password = "pass1234"
  } | ConvertTo-Json)
Assert-Ok "auth/register" $reg

$me = Invoke-RestMethod -Uri http://127.0.0.1:8001/api/v1/auth/me -WebSession $session
Assert-Ok "auth/me" $me

Write-Host "== agent secure ping (JWT) =="
Assert-Ok "agent/secure/ping" (Invoke-RestMethod -Uri http://127.0.0.1:8002/api/v1/secure/ping -WebSession $session)

Write-Host "== user hello R/W =="
$created = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8001/api/v1/hello `
  -ContentType "application/json" `
  -Body (@{ message = "hello from ash smoke $($([DateTime]::UtcNow.ToString('o')))" } | ConvertTo-Json)
Assert-Ok "user/hello create" $created
$id = $created.data.id
$got = Invoke-RestMethod "http://127.0.0.1:8001/api/v1/hello/$id"
Assert-Ok "user/hello get" $got

Write-Host "== community posts R/W =="
$post = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8003/api/v1/posts `
  -ContentType "application/json" `
  -WebSession $session `
  -Body (@{ title = "smoke"; content = "community hello" } | ConvertTo-Json)
Assert-Ok "community/posts create" $post
$list = Invoke-RestMethod "http://127.0.0.1:8003/api/v1/posts?limit=5"
Assert-Ok "community/posts list" $list

Write-Host "All smoke checks passed." -ForegroundColor Cyan
