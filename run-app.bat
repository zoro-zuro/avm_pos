@echo off
cd /d "release\0.0.3\win-unpacked"
echo Starting AVM POS.exe...
"AVM POS.exe" 2>&1
echo.
echo App exited with code: %ERRORLEVEL%
pause
