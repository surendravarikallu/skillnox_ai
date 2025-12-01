@echo off
echo ========================================
echo Starting Interview AI System Servers
echo ========================================
echo.

echo Starting Python AI Service (port 8000)...
start "Python AI Service" cmd /k "cd python-ai && python services/api_service.py"

timeout /t 3 /nobreak >nul

echo Starting Node.js Backend (port 5000)...
start "Node.js Server" cmd /k "npm run dev"

echo.
echo ========================================
echo Servers Starting...
echo ========================================
echo.
echo Python AI Service: http://localhost:8000
echo Node.js Backend:   http://localhost:5000
echo.
echo Open your browser to: http://localhost:5000
echo.
echo Test Accounts:
echo   Admin:   admin@interviewai.com / admin123
echo   Student: student1@interviewai.com / student123
echo.
pause

