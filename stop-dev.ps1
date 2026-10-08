<#
.SYNOPSIS
    Agrovisoon dev stopper -- kills any process listening on port 8000 (backend)
    and port 3000 (frontend).

.USAGE
    .\stop-dev.ps1
#>

$ErrorActionPreference = "Continue"

function Stop-Port {
    param([int]$Port, [string]$Label)

    Write-Host "Stopping $Label (port $Port)..." -ForegroundColor Yellow

    $connections = netstat -ano |
        Select-String ":$Port\s" |
        Where-Object { $_ -match "LISTENING" }

    if (-not $connections) {
        Write-Host "  Nothing listening on port $Port." -ForegroundColor DarkGray
        return
    }

    $pids = $connections |
        ForEach-Object { ($_ -split "\s+")[-1] } |
        Sort-Object -Unique

    foreach ($pid in $pids) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Stop-Process -Id $pid -Force
                Write-Host "  Killed PID $pid ($($proc.Name))" -ForegroundColor Green
            }
        } catch {
            Write-Warning "  Could not kill PID $pid : $($_.Exception.Message)"
        }
    }
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Agrovisoon * Stop Dev Servers" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Stop-Port -Port 8000 -Label "FastAPI backend"
Stop-Port -Port 3000 -Label "Next.js frontend"

Write-Host ""
Write-Host "Done. Both servers have been stopped." -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
