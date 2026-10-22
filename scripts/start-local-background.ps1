$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRoot
$taskLogDir = Join-Path $taskRoot '.local\logs'
$taskTemp = Join-Path $taskRoot '.local\tmp'
[void][IO.Directory]::CreateDirectory($taskLogDir)
[void][IO.Directory]::CreateDirectory($taskTemp)
$env:TEMP = $taskTemp
$env:TMP = $taskTemp

function Test-LocalReady([string]$Address) {
    try {
        $response = Invoke-WebRequest -Uri $Address -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200
    } catch { return $false }
}

try {
    $taskNode = Join-Path $taskRoot '.local\runtime\node.exe'
    if (!(Test-Path -LiteralPath $taskNode)) {
        $taskNode = (Get-Command node -CommandType Application -ErrorAction Stop).Source
    }
    # Explorer does not inherit the coding tool's temporary PATH.
    $env:PATH = (Split-Path -Parent $taskNode) + [IO.Path]::PathSeparator + $env:PATH
    # Serialize double-clicks without locking any application data or credentials.
    $taskLockPath = Join-Path $taskLogDir 'launcher.lock'
    try {
        $taskLock = [IO.File]::Open($taskLockPath, 'OpenOrCreate', 'ReadWrite', 'None')
    } catch [IO.IOException] {
        Write-Host 'LIFE HUD is already starting. Please wait for its browser window.'
        exit 0
    }
    try {
        $taskPorts = @(Get-NetTCPConnection -State Listen -LocalPort 3001,3002 -ErrorAction SilentlyContinue)
        if ($taskPorts.Count -eq 0) {
            $taskStamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
            $taskOut = Join-Path $taskLogDir "local-$taskStamp.out.log"
            $taskErr = Join-Path $taskLogDir "local-$taskStamp.err.log"
            $taskProcess = Start-Process -FilePath $taskNode -ArgumentList @('scripts/local.cjs', 'start', '--no-open') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput $taskOut -RedirectStandardError $taskErr -PassThru
            Write-Host 'Starting LIFE HUD and its local services...'
            Write-Host "Logs: $taskOut"
        } else {
            # Never kill or replace a service that already owns a local port.
            Write-Host 'Checking the existing local services...'
        }
        $taskDeadline = (Get-Date).AddMinutes(4)
        do {
            if ((Test-LocalReady 'http://127.0.0.1:3001/health/ready') -and (Test-LocalReady 'http://127.0.0.1:3002/sign-in')) {
                Write-Host 'LIFE HUD is ready: http://127.0.0.1:3002/'
                Start-Process -FilePath 'explorer.exe' -ArgumentList 'http://127.0.0.1:3002/' -WindowStyle Hidden
                exit 0
            }
            if ($taskProcess -and $taskProcess.HasExited) {
                throw "The local launcher exited ($($taskProcess.ExitCode)). Check $taskOut and $taskErr"
            }
            Start-Sleep -Seconds 2
        } while ((Get-Date) -lt $taskDeadline)
        throw "Local services did not become ready. Check logs in $taskLogDir. Existing services were not stopped."
    } finally { $taskLock.Dispose() }
} catch {
    Write-Host "LIFE HUD could not start: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
