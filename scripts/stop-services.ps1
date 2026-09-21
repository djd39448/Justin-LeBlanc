# Stops only tasks/processes tied to this demo's exact private config path.
# Windows task termination can leave a child node process; reconcile it before restart.
param([Parameter(Mandatory)][string]$ConfigPath,[switch]$Restart)
$ErrorActionPreference='Stop'
$resolvedConfig=(Resolve-Path -LiteralPath $ConfigPath).Path
$privateRoot=Split-Path -Parent $resolvedConfig
$tokenPath=Join-Path $privateRoot 'tunnel-token.txt'
$names=@('jlm-demo-api','jlm-demo-worker','jlm-demo-tunnel')
$existing=@()
foreach($name in $names){if(Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue){$existing+=$name;Stop-ScheduledTask -TaskName $name -ErrorAction Stop}}
$owned=Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and (
    ($_.Name -eq 'node.exe' -and $_.CommandLine.Contains($resolvedConfig) -and ($_.CommandLine.Contains('apps/api/server.ts') -or $_.CommandLine.Contains('scripts/worker.ts'))) -or
    ($_.Name -eq 'cloudflared.exe' -and $_.CommandLine.Contains($tokenPath))
  )
}
foreach($process in $owned){Stop-Process -Id $process.ProcessId -ErrorAction Stop}
if($Restart){foreach($name in $existing){Start-ScheduledTask -TaskName $name -ErrorAction Stop}}
Get-ScheduledTask | Where-Object {$names -contains $_.TaskName} | Select-Object TaskName,State
