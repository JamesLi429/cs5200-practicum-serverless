param(
    [string]$BaseUrl = "https://yourconsultant.cc"
)

$ErrorActionPreference = "Stop"

$endpoints = @(
    "/api/health",
    "/api/db-test",
    "/api/summary",
    "/api/monthly-trends",
    "/api/restaurant-performance",
    "/api/meal-type-performance",
    "/api/payment-method-performance",
    "/api/alcohol-trends",
    "/api/loyalty-summary",
    "/api/discount-impact",
    "/api/wait-time-analysis",
    "/api/server-performance",
    "/api/daily-trends",
    "/api/metadata"
)

$failed = 0

Write-Host "Testing API endpoints at $BaseUrl"
Write-Host ""

foreach ($endpoint in $endpoints) {
    $url = "$BaseUrl$endpoint"

    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 60

        if ($response.ok -eq $true) {
            Write-Host "[PASS] $endpoint"
        } else {
            Write-Host "[FAIL] $endpoint returned ok=false"
            $failed++
        }
    } catch {
        Write-Host "[FAIL] $endpoint"
        Write-Host "       $($_.Exception.Message)"
        $failed++
    }
}

Write-Host ""

if ($failed -eq 0) {
    Write-Host "All API endpoint tests passed."
    exit 0
} else {
    Write-Host "$failed API endpoint test(s) failed."
    exit 1
}