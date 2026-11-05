@echo off
setlocal
cd /d "%~dp0"
if not defined PORT set "PORT=8000"
py -3 -c "import http.server" >nul 2>&1
if not errorlevel 1 (
    set "LAB_PYTHON=py -3"
    goto serve
)
python -c "import sys,http.server; assert sys.version_info.major == 3" >nul 2>&1
if not errorlevel 1 (
    set "LAB_PYTHON=python"
    goto serve
)
echo Nie znaleziono Python 3. Zainstaluj go z python.org i zaznacz Add Python to PATH.
echo Potem uruchom start.bat ponownie.
pause
exit /b 1
:serve
echo Otworz w przegladarce: http://127.0.0.1:%PORT%
echo Nie otwieraj pliku index.html bezposrednio. Zostaw to okno otwarte.
%LAB_PYTHON% -m http.server %PORT% --bind 127.0.0.1
pause
