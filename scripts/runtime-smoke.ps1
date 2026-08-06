# ASH local runtime smoke (P0): health + doctor
# Prerequisite: ash-runtime listening on 127.0.0.1:18765

$ErrorActionPreference = "Stop"

function Assert-Ok($name, $resp) {
  if ($null -eq $resp) { throw "${name}: empty response" }
  if ($resp.code -ne 0) { throw "${name}: code=$($resp.code) message=$($resp.message)" }
  Write-Host "OK  $name" -ForegroundColor Green
}

Write-Host "== ash-runtime health =="
Assert-Ok "runtime/health" (Invoke-RestMethod http://127.0.0.1:18765/health)
Assert-Ok "runtime/api/health" (Invoke-RestMethod http://127.0.0.1:18765/api/local/v1/health)

Write-Host "== ash-runtime doctor =="
$doc = Invoke-RestMethod http://127.0.0.1:18765/api/local/v1/doctor
Assert-Ok "runtime/doctor" $doc
Write-Host ("     tier={0} characters_ok={1} nvidia_smi={2}" -f `
  $doc.data.suggested_tier, $doc.data.characters_ok, $doc.data.nvidia_smi)

if (-not $doc.data.characters_ok) {
  throw "doctor: characters_ok=false (check local.characters_dir / ASH_CHARACTERS_DIR)"
}

Write-Host "All runtime smoke checks passed." -ForegroundColor Green
