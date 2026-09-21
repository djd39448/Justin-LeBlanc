# Upgrades only existing, owned Justin demo tasks from sign-in startup to S4U machine startup.
# Dependencies: Windows ScheduledTasks/CIM cmdlets and the repository stop/run service scripts.
# Depended on by: an elevated operator after reviewing the dry-run output.
# Why: unattended startup needs a reversible task migration without touching unrelated tasks.
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$ConfigPath,
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$allowedRoles = @('api', 'worker', 'tunnel')
$expectedDescription = 'Justin LeBlanc isolated demo only; see repository RUNBOOK.'
$resolvedConfig = (Resolve-Path -LiteralPath $ConfigPath).Path
$runner = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'run-service.ps1')).Path
$stopper = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'stop-services.ps1')).Path
$workspace = Split-Path -Parent $PSScriptRoot
$hostProcess = [Environment]::ProcessPath
if (
  [string]::IsNullOrWhiteSpace($hostProcess) -or
  [System.IO.Path]::GetFileName($hostProcess) -ine 'pwsh.exe'
) {
  throw 'This migration must be hosted by pwsh.exe so task action ownership is deterministic.'
}
$shellExecutable = (Resolve-Path -LiteralPath $hostProcess).Path
$conhostExecutable = (Resolve-Path -LiteralPath (Join-Path $env:WINDIR 'System32\conhost.exe')).Path
$currentIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
if ($null -eq $currentIdentity.User) {
  throw 'The current Windows identity has no resolvable SID; refusing task ownership checks.'
}
$currentSid = $currentIdentity.User.Value
$principal = [System.Security.Principal.WindowsPrincipal]::new($currentIdentity)
$isElevated = $principal.IsInRole(
  [System.Security.Principal.WindowsBuiltInRole]::Administrator
)

function Get-ExpectedArgument {
  param([Parameter(Mandatory)][string]$Role)
  return '-NoProfile -NonInteractive -WindowStyle Hidden -File "{0}" -Role {1} -ConfigPath "{2}"' -f $runner, $Role, $resolvedConfig
}

function Resolve-AccountSid {
  param([Parameter(Mandatory)][string]$AccountId)
  try {
    if ($AccountId -match '^S-\d-\d+(?:-\d+)+$') {
      return [System.Security.Principal.SecurityIdentifier]::new($AccountId).Value
    }
    $account = [System.Security.Principal.NTAccount]::new($AccountId)
    return $account.Translate([System.Security.Principal.SecurityIdentifier]).Value
  } catch {
    throw 'A scheduled-task principal could not be resolved to a SID; refusing ownership.'
  }
}

function Get-OwnedTask {
  param([Parameter(Mandatory)][string]$Role)
  $name = "jlm-demo-$Role"
  $task = Get-ScheduledTask -TaskName $name -TaskPath '\' -ErrorAction SilentlyContinue
  if (-not $task) { return $null }
  $actions = @($task.Actions)
  if ($actions.Count -ne 1) { throw "Refusing ${name}: expected exactly one owned action." }
  $action = $actions[0]
  $expectedArguments = Get-ExpectedArgument -Role $Role
  $expectedForwardArguments = '--headless "{0}" {1}' -f $shellExecutable, $expectedArguments
  $taskSid = Resolve-AccountSid -AccountId $task.Principal.UserId
  $directAction = $action.Execute -eq $shellExecutable
  $forwardedAction = $action.Execute -eq $conhostExecutable
  $ownership = [ordered]@{
    description = $task.Description -eq $expectedDescription
    execute = $directAction -or $forwardedAction
    args =
      ($directAction -and $action.Arguments -eq $expectedArguments) -or
      ($forwardedAction -and $action.Arguments -eq $expectedForwardArguments)
    workspace =
      ($directAction -and $action.WorkingDirectory -eq $workspace) -or
      ($forwardedAction -and [string]::IsNullOrEmpty($action.WorkingDirectory))
    principal = $taskSid -eq $currentSid
  }
  $mismatches = @(
    $ownership.GetEnumerator() | Where-Object { -not $_.Value } | ForEach-Object { $_.Key }
  )
  if ($mismatches.Count -gt 0) {
    throw "Refusing ${name}: ownership mismatch fields: $($mismatches -join ', ')."
  }
  return $task
}

function Test-StartupMode {
  param([Parameter(Mandatory)]$Task)
  $triggers = @($Task.Triggers)
  return (
    $Task.Principal.LogonType.ToString() -eq 'S4U' -and
    $triggers.Count -eq 1 -and
    $triggers[0].CimClass.CimClassName -eq 'MSFT_TaskBootTrigger'
  )
}

function Register-StartupTask {
  param(
    [Parameter(Mandatory)][string]$Role,
    [Parameter(Mandatory)]$OriginalTask
  )
  $name = "jlm-demo-$Role"
  $action = New-ScheduledTaskAction `
    -Execute $shellExecutable `
    -Argument (Get-ExpectedArgument -Role $Role) `
    -WorkingDirectory $workspace
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $taskPrincipal = New-ScheduledTaskPrincipal `
    -UserId $OriginalTask.Principal.UserId `
    -LogonType S4U `
    -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries
  Register-ScheduledTask `
    -TaskName $name `
    -TaskPath '\' `
    -Description $expectedDescription `
    -Action $action `
    -Trigger $trigger `
    -Principal $taskPrincipal `
    -Settings $settings `
    -Force `
    -ErrorAction Stop | Out-Null
}

function Restore-OriginalTaskSet {
  param(
    [Parameter(Mandatory)][hashtable]$OriginalXml,
    [Parameter(Mandatory)][hashtable]$OriginalState
  )
  $rollbackErrors = @()
  try { $null = & $stopper -ConfigPath $resolvedConfig } catch { $rollbackErrors += 'owned process stop failed' }
  foreach ($name in $OriginalXml.Keys) {
    try {
      Register-ScheduledTask -TaskName $name -TaskPath '\' -Xml $OriginalXml[$name] -Force -ErrorAction Stop | Out-Null
    } catch {
      $rollbackErrors += "task restore failed for $name"
    }
  }
  foreach ($name in $OriginalState.Keys) {
    if ($OriginalState[$name] -eq 'Running') {
      try { Start-ScheduledTask -TaskName $name -TaskPath '\' -ErrorAction Stop } catch { $rollbackErrors += "task restart failed for $name" }
    }
  }
  if ($rollbackErrors.Count -gt 0) {
    throw "Automatic rollback was incomplete: $($rollbackErrors -join '; '). Use the private XML backup before further task changes."
  }
}

$tasks = @()
foreach ($role in $allowedRoles) {
  $task = Get-OwnedTask -Role $role
  if ($task) {
    $tasks += [pscustomobject]@{
      Role = $role
      Name = "jlm-demo-$role"
      Task = $task
      State = $task.State.ToString()
      AlreadyStartup = Test-StartupMode -Task $task
    }
  }
}
if ($tasks.Count -eq 0) {
  throw 'No existing owned jlm-demo tasks were found. Use install-services.ps1 for a new installation.'
}

$plan = [pscustomobject]@{
  applyRequested = [bool]$Apply
  elevated = $isElevated
  configPathVerified = $true
  tasks = @($tasks | ForEach-Object {
    [pscustomobject]@{
      name = $_.Name
      currentState = $_.State
      action = if ($_.AlreadyStartup) { 'already-startup' } else { 'upgrade-to-startup-s4u' }
    }
  })
  limitation = 'Registration can still be denied by Windows task policy or batch-logon rights; apply mode rolls back from private XML backups.'
}
if (-not $Apply) {
  $plan | ConvertTo-Json -Depth 5
  return
}
if (-not $isElevated) {
  throw 'Apply requires an already elevated PowerShell session. This script will not invoke UAC itself.'
}

$toUpgrade = @($tasks | Where-Object { -not $_.AlreadyStartup })
if ($toUpgrade.Count -eq 0) {
  $plan | ConvertTo-Json -Depth 5
  return
}

$privateRoot = Split-Path -Parent $resolvedConfig
$backupName = 'startup-upgrade-{0}-{1}' -f (
  (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ'),
  [Guid]::NewGuid().ToString('N').Substring(0, 8)
)
$backupDirectory = Join-Path $privateRoot (Join-Path 'task-backups' $backupName)
New-Item -ItemType Directory -Path $backupDirectory -ErrorAction Stop | Out-Null
$originalXml = @{}
$originalState = @{}
foreach ($entry in $tasks) {
  $xml = Export-ScheduledTask -TaskName $entry.Name -TaskPath '\' -ErrorAction Stop
  $originalXml[$entry.Name] = $xml
  $originalState[$entry.Name] = $entry.State
  Set-Content -LiteralPath (Join-Path $backupDirectory "$($entry.Name).xml") -Value $xml -Encoding utf8NoBOM -ErrorAction Stop
}
[pscustomobject]@{
  version = 1
  createdAt = (Get-Date).ToUniversalTime().ToString('o')
  tasks = @($tasks | ForEach-Object { [pscustomobject]@{ name = $_.Name; state = $_.State } })
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $backupDirectory 'manifest.json') -Encoding utf8NoBOM -ErrorAction Stop

try {
  $null = & $stopper -ConfigPath $resolvedConfig
  foreach ($entry in $toUpgrade) {
    Register-StartupTask -Role $entry.Role -OriginalTask $entry.Task
    $updated = Get-ScheduledTask -TaskName $entry.Name -TaskPath '\' -ErrorAction Stop
    if (-not (Test-StartupMode -Task $updated)) {
      throw "Verification failed for $($entry.Name): task is not S4U with an AtStartup trigger."
    }
  }
  foreach ($entry in $tasks) {
    if ($entry.State -eq 'Running') {
      Start-ScheduledTask -TaskName $entry.Name -TaskPath '\' -ErrorAction Stop
    }
  }
} catch {
  $upgradeError = $_.Exception.Message
  Restore-OriginalTaskSet -OriginalXml $originalXml -OriginalState $originalState
  throw "Startup upgrade failed and original tasks were restored. Cause: $upgradeError"
}

[pscustomobject]@{
  upgraded = @($toUpgrade.Name)
  preserved = @($tasks | Where-Object { $_.AlreadyStartup } | ForEach-Object { $_.Name })
  backupDirectory = $backupDirectory
  restarted = @($tasks | Where-Object { $_.State -eq 'Running' } | ForEach-Object { $_.Name })
} | ConvertTo-Json -Depth 4
