# Start both servers for the Interview AI System
# Run with: .\start-servers.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Interview AI System Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python service is already running
$pythonRunning = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($pythonRunning) {
    Write-Host "⚠ Python service already running on port 8000" -ForegroundColor Yellow
} else {
    Write-Host "Starting Python AI Service (port 8000)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\python-ai'; python services/api_service.py" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

# Check if Node.js server is already running
$nodeRunning = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($nodeRunning) {
    Write-Host "⚠ Node.js server already running on port 5000" -ForegroundColor Yellow
} else {
    Write-Host "Starting Node.js Backend (port 5000)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Servers Starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Python AI Service: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Node.js Backend:   http://localhost:5000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Open your browser to: http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Test Accounts:" -ForegroundColor Cyan
Write-Host "  Admin:   admin@interviewai.com / admin123" -ForegroundColor White
Write-Host "  Student: student1@interviewai.com / student123" -ForegroundColor White
Write-Host ""

