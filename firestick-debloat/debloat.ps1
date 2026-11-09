# Fire TV Stick debloater (Windows PowerShell).
# Usage:
#   .\debloat.ps1 -Ip 192.168.1.50                  # safe list
#   .\debloat.ps1 -Ip 192.168.1.50 -Optional        # safe + optional list
#   .\debloat.ps1 -Ip 192.168.1.50 -DryRun          # preview only
#   .\debloat.ps1 -Ip 192.168.1.50 -UninstallFallback
#   .\debloat.ps1 -Ip 192.168.1.50 -Restore         # undo using the log
param(
  [Parameter(Mandatory=$true)][string]$Ip,
  [switch]$Optional, [switch]$DryRun, [switch]$UninstallFallback, [switch]$Restore
)
$ErrorActionPreference = 'Continue'
$Dir = $PSScriptRoot
$Log = Join-Path $Dir 'debloat-log.txt'
$Target = if ($Ip -match ':') { $Ip } else { "${Ip}:5555" }

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
  if (Test-Path (Join-Path $Dir 'platform-tools\adb.exe')) { $env:Path = (Join-Path $Dir 'platform-tools') + ';' + $env:Path }
  else { Write-Host 'adb not found. Unzip Android platform-tools into this folder or add it to PATH.'; exit 1 }
}

$Protected = @('com.amazon.tv.launcher','com.amazon.tv.settings','com.amazon.tv.settings.v2',
  'com.amazon.firehomestarter','com.amazon.venezia','com.amazon.vizzini','com.amazon.tv.ime',
  'com.amazon.device.sync','com.amazon.tv.oobe','com.amazon.ftv.profilepicker')

function Sh { param([string[]]$a) (& adb -s $Target shell @a 2>&1 | Out-String).Trim() }
function Read-List($f) { Get-Content $f | ForEach-Object { ($_ -replace '#.*','').Trim() } | Where-Object { $_ } }

Write-Host "Connecting to $Target (accept the prompt on your TV if it appears)..."
adb connect $Target | Out-Null
for ($i=0; $i -lt 10; $i++) { if ((adb -s $Target get-state 2>$null) -eq 'device') { break }; Start-Sleep 2 }
if ((adb -s $Target get-state 2>$null) -ne 'device') { Write-Host 'Could not connect. Is ADB debugging ON?'; exit 1 }
Write-Host ("Device: {0} / Fire OS {1}" -f (Sh getprop,ro.product.model), (Sh getprop,ro.build.version.name))

if ($Restore) {
  if (-not (Test-Path $Log)) { Write-Host 'No debloat-log.txt found.'; exit 1 }
  Get-Content $Log | ForEach-Object { ($_ -split ' ')[1] } | Sort-Object -Unique | ForEach-Object {
    Sh cmd,package,install-existing,--user,0,$_ | Out-Null
    Sh pm,enable,--user,0,$_ | Out-Null
    Write-Host "  restored  $_"
  }
  Move-Item $Log (Join-Path $Dir 'debloat-log.restored.txt') -Force
  adb -s $Target reboot; exit 0
}

$pkgs = Read-List (Join-Path $Dir 'packages-safe.txt')
if ($Optional) { $pkgs += Read-List (Join-Path $Dir 'packages-optional.txt') }
$installed = (Sh pm,list,packages) -split "`r?`n" | ForEach-Object { $_ -replace '^package:','' }

$ok=0; $skip=0; $fail=0
foreach ($p in $pkgs) {
  if ($Protected -contains $p) { Write-Host "  PROTECTED  $p"; continue }
  if ($installed -notcontains $p) { Write-Host "  not found  $p"; $skip++; continue }
  if ($DryRun) { Write-Host "  would disable  $p"; continue }
  $out = Sh pm,disable-user,--user,0,$p
  if ($out -match 'disabled-user') { Write-Host "  disabled   $p"; Add-Content $Log "disable $p"; $ok++ }
  elseif ($UninstallFallback) {
    $out2 = Sh pm,uninstall,-k,--user,0,$p
    if ($out2 -match 'Success') { Write-Host "  removed*   $p (user 0 only; restorable)"; Add-Content $Log "uninstall $p"; $ok++ }
    else { Write-Host "  FAILED     $p : $out2"; $fail++ }
  } else { Write-Host "  blocked    $p ($out)"; $fail++ }
}
Write-Host "`nDone. changed=$ok  not-present=$skip  blocked=$fail"
if ($fail -gt 0 -and -not $UninstallFallback) { Write-Host 'Some were blocked by Fire OS. Try again with -UninstallFallback.' }
Write-Host "Restart the stick to apply: adb -s $Target reboot"
