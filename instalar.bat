@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║          TEAMEVAL - Instalación automática               ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: Verificar Node.js
echo [1/5] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado. Descárgalo de https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo ✅ Node.js %%i encontrado

:: Verificar npm
echo.
echo [2/5] Verificando npm...
call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm no funciona. Abre PowerShell como administrador y ejecuta:
    echo    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('call npm --version') do echo ✅ npm %%i encontrado

:: Instalar dependencias del backend
echo.
echo [3/5] Instalando dependencias del backend...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del backend
    pause
    exit /b 1
)
echo ✅ Backend listo

:: Instalar dependencias del frontend
echo.
echo [4/5] Instalando dependencias del frontend...
cd /d "%~dp0frontend-web"
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del frontend
    pause
    exit /b 1
)
echo ✅ Frontend listo

:: Preparar base de datos local
echo.
echo [5/5] Preparando la base de datos local...
cd /d "%~dp0backend"
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Error generando Prisma Client
    pause
    exit /b 1
)
call npx prisma db push
if %errorlevel% neq 0 (
    echo ❌ Error sincronizando la base de datos local
    pause
    exit /b 1
)
call npm run prisma:seed
if %errorlevel% neq 0 (
    echo ❌ Error cargando datos de ejemplo
    pause
    exit /b 1
)
echo ✅ Base de datos local lista

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  ✅ Instalación completada                               ║
echo ║                                                          ║
echo ║  Próximos pasos:                                         ║
echo ║  1. Revisa backend\.env si quieres cambiar JWT o correo  ║
echo ║  2. Ejecuta arrancar.bat para iniciar la aplicación      ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
pause
