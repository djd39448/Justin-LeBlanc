# Keeps one dedicated demo process alive. Invoked only by jlm-demo scheduled tasks.
# Secrets are loaded by Node from a protected env file outside the repository.
param([ValidateSet('api','worker','tunnel')][string]$Role='api', [Parameter(Mandatory)][string]$ConfigPath)
$ErrorActionPreference='Stop'
$workspace=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $workspace
$privateRoot=Split-Path -Parent (Resolve-Path -LiteralPath $ConfigPath).Path
$logDirectory=Join-Path $privateRoot 'logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
while($true){
  try {
    if($Role -eq 'tunnel'){
      & (Join-Path $privateRoot 'cloudflared.exe') tunnel --no-autoupdate run --token-file (Join-Path $privateRoot 'tunnel-token.txt') *>> (Join-Path $logDirectory 'tunnel.log')
    }else{
      $entry=if($Role -eq 'api'){'apps/api/server.ts'}else{'scripts/worker.ts'}
      & node "--env-file=$ConfigPath" --import tsx $entry *>> (Join-Path $logDirectory "$Role.log")
    }
  }catch{Add-Content -LiteralPath (Join-Path $logDirectory "$Role.log") -Value "Service exited; inspect local configuration. $(Get-Date -Format o)"}
  Start-Sleep -Seconds 10
}
