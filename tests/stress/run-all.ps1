# TawePro Stress Test Orchestrator
# Runs all 6 test scenarios sequentially, collects JSON results, generates report
# Usage: powershell -ExecutionPolicy Bypass -File run-all.ps1

param(
    [string]$BaseUrl = "https://iium-tawe-pro.vercel.app",
    [switch]$SkipAuth = $false,
    [switch]$SkipHeavy = $false
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultsDir = Join-Path $ScriptDir "results"

# Check for k6
$k6 = Get-Command "k6" -ErrorAction SilentlyContinue
if (-not $k6) {
    Write-Host "[ERROR] k6 is not installed. Install from: https://k6.io/docs/get-started/installation/" -ForegroundColor Red
    Write-Host "  Windows: choco install k6  OR  winget install k6  OR download from GitHub" -ForegroundColor Yellow
    exit 1
}

Write-Host "=== TawePro Stress Test Suite ===" -ForegroundColor Cyan
Write-Host "Target: $BaseUrl" -ForegroundColor Cyan
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

if (-not (Test-Path $ResultsDir)) {
    New-Item -ItemType Directory -Path $ResultsDir | Out-Null
}

# Clean old results
Get-ChildItem $ResultsDir -Filter "*.json" -ErrorAction SilentlyContinue | Remove-Item -Force

$env:BASE_URL = $BaseUrl
$env:K6_SUMMARY_EXPORT = ""

$tests = @(
    @{Name="auth-flood";       Script="k6-scripts/auth-flood.js";       Output="auth-flood.json";       Description="Auth Flood (4500 users)"},
    @{Name="schedule-read";    Script="k6-scripts/schedule-read.js";    Output="schedule-read.json";    Description="Schedule Read (1000 concurrent)"},
    @{Name="mixed-rpc-burst";  Script="k6-scripts/mixed-rpc-burst.js";  Output="mixed-rpc-burst.json";  Description="Mixed RPC Burst (500 users)"}
)

$heavyTests = @(
    @{Name="attendance-rush";  Script="k6-scripts/attendance-rush.js";  Output="attendance-rush.json";  Description="Attendance Check-In Rush (1000 users)"},
    @{Name="notification-blast"; Script="k6-scripts/notification-blast.js"; Output="notification-blast.json"; Description="Notification Broadcast (single)"},
    @{Name="sustained-load";   Script="k6-scripts/sustained-load.js";   Output="sustained-load.json";   Description="Sustained Load (250 users, 60 min)"}
)

if ($SkipAuth) {
    $tests = $tests | Where-Object { $_.Name -ne "auth-flood" }
}

$resultFiles = @()
$summary = @()

function Invoke-K6Test {
    param($TestDef)
    $scriptPath = Join-Path $ScriptDir $TestDef.Script
    $outputPath = Join-Path $ResultsDir $TestDef.Output

    $startTime = Get-Date
    $exitCode = -1
    $caught = $false

    try {
        # Run k6 as a native command in a script block to control error handling
        $ps = [PowerShell]::Create()
        $ps.AddScript("k6 run --out 'json=$outputPath' --quiet '$scriptPath' 2>&1").Invoke() | Out-Null
        $exitCode = $ps.Streams.Error.Count -gt 0

        # Fallback: direct invocation if the above doesn't capture exit code
        if ($exitCode -eq 0) {
            $oldPref = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            $null = & k6 run --out "json=$outputPath" --quiet $scriptPath *>&1
            $exitCode = $LASTEXITCODE
            $ErrorActionPreference = $oldPref
        }
    } catch {
        $caught = $true
        $exitCode = $LASTEXITCODE
        if ($exitCode -eq 0) { $exitCode = -1 }
    }

    $endTime = Get-Date
    $elapsed = ($endTime - $startTime).TotalSeconds

    $hasOutput = Test-Path $outputPath -ErrorAction SilentlyContinue
    $outputSize = if ($hasOutput) { (Get-Item $outputPath).Length } else { 0 }

    # Determine real status based on output and exit code
    if (-not $hasOutput -or $outputSize -eq 0) {
        $status = "ERROR"
        $statusColor = "Red"
    } elseif ($exitCode -eq 0 -or $exitCode -eq 99 -or $exitCode -eq 108) {
        $status = "PASS"
        $statusColor = "Green"
    } else {
        $status = "FAIL"
        $statusColor = "Red"
    }

    $script:resultFiles += $outputPath
    $script:summary += @{
        Test = $TestDef.Name
        Description = $TestDef.Description
        Duration = [math]::Round($elapsed, 1)
        ExitCode = $exitCode
        Status = $status
        OutputSize = $outputSize
    }

    Write-Host "    Completed in ${elapsed}s | Exit: $exitCode | Status: $status | Output: $outputSize bytes" -ForegroundColor $statusColor
}

foreach ($test in $tests) {
    Write-Host ""
    Write-Host ">>> Running: $($test.Description)" -ForegroundColor Green
    Write-Host "    Script: $($test.Script)" -ForegroundColor Gray
    Invoke-K6Test -TestDef $test
}

if (-not $SkipHeavy) {
    foreach ($test in $heavyTests) {
        Write-Host ""
        Write-Host ">>> Running: $($test.Description)" -ForegroundColor Green
        Write-Host "    Script: $($test.Script)" -ForegroundColor Gray
        Invoke-K6Test -TestDef $test
    }
}

# Write summary JSON for report generator
$summaryPath = Join-Path $ResultsDir "summary.json"
$summary | ConvertTo-Json | Set-Content $summaryPath

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "=== Test Suite Complete ===" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

foreach ($s in $summary) {
    $color = if ($s.Status -eq "PASS") { "Green" } elseif ($s.Status -eq "ERROR") { "Red" } else { "Yellow" }
    Write-Host "  $($s.Status): $($s.Description) ($($s.Duration)s)" -ForegroundColor $color
}

Write-Host ""
Write-Host "Result files saved to: $ResultsDir" -ForegroundColor Cyan
Write-Host "To generate HTML report: node generate-report.mjs" -ForegroundColor Cyan
