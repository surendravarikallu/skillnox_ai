# Start the Skillnox AI System (Powered by NVIDIA Build API)
# Run with: .\start-servers.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Skillnox AI System (NVIDIA Cloud Engine)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js server is already running
$nodeRunning = Get-NetTCPConnection -LocalPort 5060 -ErrorAction SilentlyContinue
if ($nodeRunning) {
    Write-Host "⚠ Skillnox AI Server already running on port 5060" -ForegroundColor Yellow
} else {
    Write-Host "Starting Node.js Backend Server (port 5060)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Server Starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Node.js Server:   http://localhost:5060" -ForegroundColor Yellow
Write-Host "NVIDIA AI Engine:  Connected (meta/llama-3.1-8b-instruct)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Open your browser to: http://localhost:5060" -ForegroundColor Green
Write-Host ""
Write-Host "Test Accounts:" -ForegroundColor Cyan
Write-Host "  Admin:   admin@interviewai.com / admin123" -ForegroundColor White
Write-Host "  Student: student1@interviewai.com / student123" -ForegroundColor White
Write-Host ""

