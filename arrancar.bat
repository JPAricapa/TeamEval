@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║          TEAMEVAL - Iniciando aplicación                 ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo Iniciando backend y frontend web en ventanas separadas...
echo.

:: Iniciar backend
start "TeamEval - Backend" cmd /k "cd /d "%~dp0backend" && echo Iniciando backend... && call npm run dev"

:: Esperar 3 segundos para que el backend arranque primero
timeout /t 3 /nobreak >nul

:: Iniciar frontend
start "TeamEval - Frontend" cmd /k "cd /d "%~dp0frontend-web" && echo Iniciando frontend web... && call npm run dev"

echo ✅ Aplicación iniciada.
echo.
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:5173
echo.
echo Abre http://localhost:5173 en tu navegador.
echo Para detener, cierra las ventanas de Backend y Frontend.
echo.
pause
