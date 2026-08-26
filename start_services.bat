@echo off
REM ============================================================
REM DATA FLOW INVENTORY - Inicializacao dos servicos locais
REM Abre 3 janelas dedicadas: Mosquitto (broker), mqtt_probe e
REM Server Node.js. Ver docs/testes/roteiros/roteiro_teste_2026-08-20.md (Bloco 0).
REM ============================================================
setlocal

set "MOSQUITTO_EXE=C:\Program Files\mosquitto\mosquitto.exe"
set "MOSQUITTO_CONF=C:\mosquitto\mosquitto.conf"
set "ROOT=%~dp0"

echo ============================================================
echo  DATA FLOW INVENTORY - start_services
echo ============================================================
echo.

REM ---------- Verificacoes previas ----------
if not exist "%MOSQUITTO_EXE%" (
    echo [ERRO] Mosquitto nao encontrado em: %MOSQUITTO_EXE%
    echo        Ajuste a variavel MOSQUITTO_EXE neste script.
    pause
    exit /b 1
)

if not exist "%MOSQUITTO_CONF%" (
    echo [ERRO] Arquivo de configuracao nao encontrado: %MOSQUITTO_CONF%
    echo        Crie-o conforme docs/broker_local_mosquitto.md
    echo        ^(listener 1883 0.0.0.0 + allow_anonymous true^)
    pause
    exit /b 1
)

if not exist "%ROOT%server\.env" (
    echo [AVISO] server\.env nao encontrado. Copie de server\.env.example
    echo         e configure MQTT_BROKER_URL=mqtt://localhost
    echo.
)

if not exist "%ROOT%server\node_modules" (
    echo [AVISO] server\node_modules nao encontrado. Rode antes:
    echo         cd server ^&^& npm install
    echo.
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
echo  Smoke test (rodar NESTE ou em outro terminal):
echo    netstat -ano ^| findstr :1883
echo      ^(esperado: 0.0.0.0:1883 LISTENING^)
echo    mosquitto_pub -h localhost -t "dataflow/status" -m "{\"type\":\"status\",\"estado\":\"smoke-test\"}"
echo      ^(deve aparecer no MQTT_PROBE e nos logs do SERVER^)
echo.
echo  Dashboard: http://localhost:3000
echo ============================================================
pause
endlocal