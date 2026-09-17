@echo off
REM ============================================================
REM DATA FLOW INVENTORY - Inicializacao dos servicos locais
REM Abre 3 janelas dedicadas: Mosquitto (broker), mqtt_probe e
REM Server Node.js. Ver docs/testes/validações/README.md
REM ============================================================
setlocal

set "MOSQUITTO_EXE=C:\Program Files\mosquitto\mosquitto.exe"
if not exist "%MOSQUITTO_EXE%" (
    where mosquitto.exe >nul 2>&1
    if not errorlevel 1 (
        set "MOSQUITTO_EXE=mosquitto.exe"
    )
)

set "MOSQUITTO_CONF=C:\mosquitto\mosquitto.conf"
set "ROOT=%~dp0"

echo ============================================================
echo  DATA FLOW INVENTORY - Inicializacao de Servicos
echo ============================================================
echo.

REM ---------- Verificacoes previas ----------
if not exist "%MOSQUITTO_EXE%" if "%MOSQUITTO_EXE%"=="C:\Program Files\mosquitto\mosquitto.exe" (
    echo [ERRO] Mosquitto nao encontrado em: %MOSQUITTO_EXE%
    echo        Instale o Mosquitto em https://mosquitto.org/download/
    echo        ou ajuste a variavel MOSQUITTO_EXE neste script.
    pause
    exit /b 1
)

if not exist "%MOSQUITTO_CONF%" (
    echo [INFO] %MOSQUITTO_CONF% nao encontrado. Tentando criar automaticamente...
    if not exist "C:\mosquitto" mkdir "C:\mosquitto" >nul 2>&1
    (
        echo # DataFlowInventory - Configuracao Broker Local
        echo listener 1883 0.0.0.0
        echo allow_anonymous true
    ) > "%MOSQUITTO_CONF%" 2>nul
    if not exist "%MOSQUITTO_CONF%" (
        echo [ERRO] Nao foi possivel criar %MOSQUITTO_CONF%.
        echo        Crie-o manualmente com o conteudo:
        echo          listener 1883 0.0.0.0
        echo          allow_anonymous true
        pause
        exit /b 1
    )
    echo [OK] %MOSQUITTO_CONF% criado com sucesso.
    echo.
)

if not exist "%ROOT%server\.env" (
    if exist "%ROOT%server\.env.example" (
        echo [INFO] Criando server\.env a partir de server\.env.example...
        copy "%ROOT%server\.env.example" "%ROOT%server\.env" >nul
        echo [OK] server\.env criado.
    ) else (
        echo [AVISO] server\.env nao encontrado.
    )
    echo.
)

if not exist "%ROOT%server\node_modules" (
    echo [INFO] Instalando dependencias do server (npm install)...
    cd /d "%ROOT%server" && call npm install --quiet
    cd /d "%ROOT%"
    echo [OK] Dependencias do server instaladas.
    echo.
)

if not exist "%ROOT%test\mqtt_probe\node_modules" (
    echo [INFO] Instalando dependencias do mqtt_probe (npm install)...
    cd /d "%ROOT%test\mqtt_probe" && call npm install --quiet
    cd /d "%ROOT%"
    echo [OK] Dependencias do mqtt_probe instaladas.
    echo.
)

REM ---------- Pre-voo: porta 1883 ja ocupada? ----------
REM Se OUTRO broker (ex.: o servico automatico do Windows, que escuta
REM so em loopback) ja detem a 1883, subir um segundo Mosquitto PARTICIONA
REM a rede MQTT: o server cai num broker e o ESP32 no outro, e o dashboard
REM fica preso em "ESP32 Offline". Ver docs/CHANGELOG.md.
netstat -ano | findstr /R /C:":1883 .*LISTENING" >nul
if not errorlevel 1 (
    echo [ERRO] A porta 1883 JA esta em uso por outro processo.
    echo        Provavel causa: o servico "mosquitto" do Windows esta ativo em segundo plano.
    echo        Isso particiona a rede MQTT (server e ESP32 em brokers diferentes).
    echo.
    echo        Processo ouvindo na 1883:
    netstat -ano | findstr ":1883"
    echo.
    echo        Solucao (abra PowerShell como Administrador e execute):
    echo          net stop mosquitto; sc.exe config mosquitto start= demand
    echo        Depois rode este script novamente.
    echo.
    pause
    exit /b 1
)

REM ---------- 1) Broker Mosquitto ----------
echo [1/3] Iniciando Mosquitto (broker MQTT, porta 1883)...
start "MOSQUITTO (broker) - NAO FECHAR" cmd /k ""%MOSQUITTO_EXE%" -c "%MOSQUITTO_CONF%" -v"

REM Aguarda o broker subir antes dos clientes
timeout /t 3 /nobreak >nul

REM ---------- 2) mqtt_probe ----------
echo [2/3] Iniciando mqtt_probe (monitor dataflow/#)...
start "MQTT_PROBE (dataflow/#)" cmd /k "cd /d "%ROOT%test\mqtt_probe" && node probe.js"

REM ---------- 3) Server Node.js ----------
echo [3/3] Iniciando servidor Node.js (dashboard em http://localhost:3000)...
start "SERVER NODE (dashboard :3000)" cmd /k "cd /d "%ROOT%server" && npm start"

echo.
echo ============================================================
echo  Servicos iniciados em janelas separadas.
echo.
echo  Smoke test (PowerShell):
echo    ^& "C:\Program Files\mosquitto\mosquitto_pub.exe" -h 127.0.0.1 -t "dataflow/status" -m '{"type":"status","estado":"smoke-test"}'
echo.
echo  Dashboard: http://localhost:3000
echo ============================================================
pause
endlocal