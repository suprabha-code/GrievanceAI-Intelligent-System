@echo off
title GrievanceAI Backend Server (Do Not Close)
echo Stopping existing node processes...
taskkill /F /IM node.exe > nul 2>&1
timeout /t 2 > nul

echo Starting backend server...
cd /d e:\Grievancee-master\Grievancee-master\backend
echo Server is running on Port 5000. Keep this window open!
node server.js
pause
