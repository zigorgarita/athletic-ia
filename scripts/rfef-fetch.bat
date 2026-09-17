@echo off
setlocal EnableDelayedExpansion

REM ============================================================================
REM ATHLETIC IA - HELPER LOCAL RFEF (DIVISIÓN DE HONOR JUVENIL · GRUPO 2)
REM Obtiene el HTML oficial de una jornada (J3 a J30) mediante Windows curl/Schannel
REM y lo copia al portapapeles de Windows para su posterior previsualización.
REM ============================================================================

REM 1. Validar parámetro de jornada
if "%~1"=="" (
    echo [ERROR] Debe especificar el numero de jornada.
    echo Uso: scripts\rfef-fetch.bat ^<jornada^>
    echo Ejemplo: scripts\rfef-fetch.bat 3
    exit /b 1
)

set "JORNADA=%~1"

REM Comprobar que es un número entero
set "VAR_CHECK="
for /f "delims=0123456789" %%A in ("%JORNADA%") do set "VAR_CHECK=%%A"
if defined VAR_CHECK (
    echo [ERROR] La jornada "%JORNADA%" no es un numero entero valido.
    exit /b 1
)

REM Validar rango 3 a 30
if %JORNADA% LSS 3 (
    echo [ERROR] Jornada invalida: %JORNADA%. Solo se admiten jornadas de 3 a 30.
    exit /b 1
)
if %JORNADA% GTR 30 (
    echo [ERROR] Jornada invalida: %JORNADA%. Solo se admiten jornadas de 3 a 30.
    exit /b 1
)

REM 2. Preparar directorios y rutas efímeras
if not exist "scratch" (
    mkdir "scratch" >nul 2>&1
)

set "UNIQUE_ID=%RANDOM%_%RANDOM%"
set "COOKIE_JAR=scratch\rfef_cookie_%UNIQUE_ID%.txt"
set "TEMP_HTML=scratch\rfef_temp_%UNIQUE_ID%.html"
set "FINAL_HTML=scratch\rfef_jornada_%JORNADA%.html"

REM 3. Endpoint canónico oficial RFEF (DHJ Grupo 2)
set "BASE_URL=https://resultados.rfef.es/pnfg/NPcd/NFG_CmpJornada"
set "URL=%BASE_URL%?cod_primaria=1000120&CodTemporada=22&CodCompeticion=33836116&CodGrupo=33836118&CodJornada=%JORNADA%"

echo [INFO] Consultando RFEF oficial para Jornada %JORNADA% via Schannel...

REM 4. Petición oficial con curl.exe nativo de Windows (Schannel)
type nul > "%COOKIE_JAR%"
C:\Windows\System32\curl.exe -s -L --cookie-jar "%COOKIE_JAR%" --cookie "%COOKIE_JAR%" --output "%TEMP_HTML%" "%URL%"
set "CURL_STATUS=%ERRORLEVEL%"

REM 5. Limpieza obligatoria del cookie jar efímero
if exist "%COOKIE_JAR%" (
    del /f /q "%COOKIE_JAR%" >nul 2>&1
)

REM 6. Validaciones estrictas del resultado antes de aceptar
if %CURL_STATUS% neq 0 (
    echo [ERROR] Fallo en la conexion curl. Codigo de salida: %CURL_STATUS%.
    if exist "%TEMP_HTML%" del /f /q "%TEMP_HTML%" >nul 2>&1
    exit /b 1
)

if not exist "%TEMP_HTML%" (
    echo [ERROR] No se genero el archivo de respuesta de la RFEF.
    exit /b 1
)

REM Comprobar tamaño del archivo (> 10000 bytes)
for %%F in ("%TEMP_HTML%") do set "HTML_SIZE=%%~zF"
if !HTML_SIZE! LSS 10000 (
    echo [ERROR] Respuesta de la RFEF insuficiente: !HTML_SIZE! bytes.
    if exist "%TEMP_HTML%" del /f /q "%TEMP_HTML%" >nul 2>&1
    exit /b 1
)

REM Comprobar marcas identificativas del portal oficial RFEF
findstr /i "NFG_CmpJornada" "%TEMP_HTML%" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] El contenido recibido no contiene la estructura oficial de la RFEF.
    if exist "%TEMP_HTML%" del /f /q "%TEMP_HTML%" >nul 2>&1
    exit /b 1
)

REM Comprobar que la respuesta contiene la competicion oficial configurada (DHJ)
findstr /i "CodCompeticion=33836116" "%TEMP_HTML%" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] La respuesta de la RFEF no contiene la competicion oficial: CodCompeticion=33836116.
    if exist "%TEMP_HTML%" del /f /q "%TEMP_HTML%" >nul 2>&1
    exit /b 1
)

REM Comprobar que la respuesta contiene el grupo oficial configurado (Grupo 2)
findstr /i "CodGrupo=33836118" "%TEMP_HTML%" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] La respuesta de la RFEF no contiene el grupo oficial: CodGrupo=33836118.
    if exist "%TEMP_HTML%" del /f /q "%TEMP_HTML%" >nul 2>&1
    exit /b 1
)

REM Comprobar evidencia estructural de emparejamientos y equipos (font_widgetL / font_widgetV)
findstr /i /c:"class=font_widgetL" "%TEMP_HTML%" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] La pagina de la RFEF no contiene partidos oficiales: tabla de resultados vacia.
    if exist "%TEMP_HTML%" del /f /q "%TEMP_HTML%" >nul 2>&1
    exit /b 1
)

findstr /i /c:"class=font_widgetV" "%TEMP_HTML%" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] La pagina de la RFEF no contiene partidos oficiales: falta font_widgetV.
    if exist "%TEMP_HTML%" del /f /q "%TEMP_HTML%" >nul 2>&1
    exit /b 1
)

REM Comprobar correspondencia exacta de jornada en el HTML
set "FOUND_JORNADA=0"
findstr /i /c:"<strong>Jornada</strong> %JORNADA%" "%TEMP_HTML%" >nul 2>&1 && set "FOUND_JORNADA=1"
if "!FOUND_JORNADA!"=="0" (
    findstr /i /c:"CodJornada=%JORNADA%&" "%TEMP_HTML%" >nul 2>&1 && set "FOUND_JORNADA=1"
)
if "!FOUND_JORNADA!"=="0" (
    findstr /i "Jornada %JORNADA%" "%TEMP_HTML%" >nul 2>&1 && set "FOUND_JORNADA=1"
)
if "!FOUND_JORNADA!"=="0" (
    echo [ERROR] El contenido recibido no parece corresponder a la Jornada %JORNADA%.
    if exist "%TEMP_HTML%" del /f /q "%TEMP_HTML%" >nul 2>&1
    exit /b 1
)

REM 7. Preservar captura válida y copiar al portapapeles de Windows
copy /y "%TEMP_HTML%" "%FINAL_HTML%" >nul 2>&1
if exist "%TEMP_HTML%" del /f /q "%TEMP_HTML%" >nul 2>&1

powershell -NoProfile -Command "Get-Content -Raw '%FINAL_HTML%' | Set-Clipboard"

echo ============================================================================
echo [OK] Jornada %JORNADA% obtenida con exito desde la RFEF.
echo - Tamano: !HTML_SIZE! bytes
echo - Archivo local: %FINAL_HTML%
echo - Estado: HTML oficial copiado al portapapeles de Windows.
echo ============================================================================

exit /b 0
