@echo off
title Tomato Clock Local Server
echo Starting Tomato Clock Local Server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
