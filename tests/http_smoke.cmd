@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0http_smoke.ps1" %*

