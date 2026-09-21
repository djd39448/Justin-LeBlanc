# Installs only Justin-scoped startup tasks; never changes existing unrelated task definitions.
# Run from an elevated shell. Runtime secrets remain in ConfigPath outside the checkout.
param([Parameter(Mandatory)][string]$ConfigPath,[switch]$IncludeTunnel,[switch]$InteractiveOnly)
$ErrorActionPreference='Stop'
$resolvedConfig=(Resolve-Path -LiteralPath $ConfigPath).Path
$runner=Join-Path $PSScriptRoot 'run-service.ps1'
$shellExecutable=(Get-Command pwsh).Source
$roles=@('api','worker')
if($IncludeTunnel){$roles+='tunnel'}
foreach($role in $roles){
  $taskName="jlm-demo-$role"
  $existing=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if($existing){
    if(-not ($existing.Actions.Arguments -like "*$runner*")){throw "Refusing to replace unowned task $taskName"}
    throw "Task $taskName already exists. Reconcile its running state; do not install twice."
  }
}
foreach($role in $roles){
  $arguments='-NoProfile -NonInteractive -WindowStyle Hidden -File "{0}" -Role {1} -ConfigPath "{2}"' -f $runner,$role,$resolvedConfig
  $action=New-ScheduledTaskAction -Execute $shellExecutable -Argument $arguments -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
  $trigger=if($InteractiveOnly){New-ScheduledTaskTrigger -AtLogOn -User ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)}else{New-ScheduledTaskTrigger -AtStartup}
  $logonType=if($InteractiveOnly){'Interactive'}else{'S4U'}
  $principal=New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType $logonType -RunLevel Limited
  $settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  Register-ScheduledTask -TaskName "jlm-demo-$role" -Description 'Justin LeBlanc isolated demo only; see repository RUNBOOK.' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -ErrorAction Stop | Out-Null
  Start-ScheduledTask -TaskName "jlm-demo-$role" -ErrorAction Stop
}
Get-ScheduledTask | Where-Object {$_.TaskName -like 'jlm-demo-*'} | Select-Object TaskName,State
