@echo off
echo ========================================
echo Starting Skillnox AI System (NVIDIA Cloud Engine)
echo ========================================
echo.

echo Starting Node.js Backend Server (port 5070)...
start "Skillnox AI Server" cmd /k "npm run dev"

echo.
echo ========================================
echo Server Starting...
echo ========================================
echo.
echo Node.js Server:   http://localhost:5070
echo NVIDIA AI Engine:  Connected (meta/llama-3.1-8b-instruct)
echo.
echo Open your browser to: http://localhost:5070
echo.
echo Test Accounts:
echo   Admin:   admin@interviewai.com / admin123
echo   Student: student1@interviewai.com / student123
echo.
pause

