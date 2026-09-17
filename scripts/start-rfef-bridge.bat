@echo off
setlocal EnableDelayedExpansion

REM ============================================================================
REM ATHLETIC IA - LANZADOR LOCAL RFEF BRIDGE (P3.7)
REM ============================================================================

REM 1. Comprobar si el puente ya esta escuchando en el puerto 41189 (evitar doble instancia)
netstat -ano -p tcp | findstr :41189 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [INFO] El puente RFEF ya esta en ejecucion en el puerto 41189.
    exit /b 0
)

REM 2. Ubicar la ruta del proyecto (directorio padre de scripts\)
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."

REM 3. Localizar node.exe de forma robusta
set "NODE_CMD=node"
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_CMD=C:\Program Files\nodejs\node.exe"
)

REM 4. Iniciar el puente RFEF
"%NODE_CMD%" scripts\rfef-bridge.js

popd
exit /b 0
