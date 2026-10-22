$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskLaunch = Join-Path $taskRoot 'Start LIFE HUD.cmd'
$taskIcon = Join-Path $taskRoot 'apps\web\public\favicon.ico'
if (!(Test-Path -LiteralPath $taskLaunch) -or !(Test-Path -LiteralPath $taskIcon)) {
    throw 'The LIFE HUD launcher or icon is missing.'
}
$taskDesktop = [Environment]::GetFolderPath('DesktopDirectory')
if (!$taskDesktop -or !(Test-Path -LiteralPath $taskDesktop)) {
    throw 'The Windows desktop directory is unavailable.'
}
$taskShortcutPath = Join-Path $taskDesktop 'LIFE HUD.lnk'
$taskShell = New-Object -ComObject WScript.Shell
$taskShortcut = $taskShell.CreateShortcut($taskShortcutPath)
if ((Test-Path -LiteralPath $taskShortcutPath) -and $taskShortcut.TargetPath -ne $taskLaunch) {
    throw 'A different LIFE HUD shortcut already exists; it was preserved.'
}
$taskShortcut.TargetPath = $taskLaunch
$taskShortcut.Arguments = ''
$taskShortcut.WorkingDirectory = $taskRoot
$taskShortcut.IconLocation = "$taskIcon,0"
$taskShortcut.Description = 'Start LIFE HUD locally'
$taskShortcut.WindowStyle = 7
$taskShortcut.Save()
Write-Output "Desktop shortcut ready: $taskShortcutPath"
