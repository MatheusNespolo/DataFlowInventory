# Roteiro — Validação em bancada do firmware do Uno v3.0

> Objetivo: confirmar na bancada o que os testes automatizados não alcançam (sensores, motores, alimentação). Execute na ordem; anote o resultado de cada passo. Firmware: `arduino/data_flow_inventory/` (v3.0). Desconecte o ESP32 dos pinos 0/1 durante o upload no Uno.

Ferramentas: Serial Monitor (9600 baud) **ou** `test/mqtt_probe` (com o ESP32 conectado) e o dashboard.

> Abrir a Serial Monitor reinicia o Uno (auto-reset da USB) e o estoque volta a 15. Isso é esperado e aparece como `"reset":"reinicio"`.

## 1. Boot

1. Ligue o Uno.
2. **Esperado:** a linha `{"type":"evento","evento":"inicio",...,"versao":"3.0",...,"reset":"energia","lcd":true|false,"ram_livre":N}`.
3. Anote `lcd` (se `false`, o LCD não respondeu em 0x27 nem 0x3F: confira 5 V, GND, SDA=A4, SCL=A5) e `ram_livre`.

## 2. Sensores (antes de qualquer entrega)

1. Com as três esteiras **vazias**, leia a mensagem `"type":"sensores"`: esperado `"juncao":{"J1":0,"J2":0,"J3":0}`.
2. Passe uma peça sobre cada sensor de junção, um por vez: o valor correspondente deve ir a 1.
3. Repita para os sensores de topo (`"topo"`), com e sem peça.
4. **Se algum sensor ficar sempre em 0 ou sempre em 1**, ajuste o potenciômetro do módulo TCRT5000 (ou a fiação) antes de seguir. Este passo resolve a causa provável da "entrega da B sem débito".

## 3. Uma entrega por esteira (A, B, C)

1. Coloque uma peça no topo da esteira e peça pelo dashboard.
2. **Esperado:** `pedido` → status `ACIONANDO_ESTEIRA` → esteira liga → `entrega` com o estoque daquela peça diminuído em 1 → após ~3 s a esteira para → status `AGUARDANDO_PEDIDO`.
3. Confira o débito no dashboard e no LCD.

## 4. Motor travado (esteira C)

1. Segure a esteira C com a mão (ou trave a peça no topo) e peça uma peça C.
2. **Esperado:** em ~3 s, `erro` com `"tipo":"motor_sem_avanco","fase":"partida"`, motor parado, estado `ERRO`, **sem reset do Uno** (nenhum novo `inicio`).
3. Envie Reiniciar no dashboard: volta a `AGUARDANDO_PEDIDO`.

## 5. Timeout no trânsito

1. Peça uma peça e, depois que ela sair do topo, retire-a da esteira antes da junção.
2. **Esperado:** em 12,5 s desde a partida, `erro` com `"tipo":"timeout","fase":"transito"`, motor parado, estoque **intacto**.

## 6. Peça presa na saída

1. Peça uma peça e, quando ela chegar à junção, segure-a sobre o sensor.
2. **Esperado:** `entrega` (débito feito) e, 3 s depois, `erro` com `"tipo":"peca_presa_saida","fase":"saida"`.

## 7. Junção obstruída

1. Deixe uma peça parada sobre o sensor de junção e peça uma peça daquela esteira.
2. **Esperado:** `erro` com `"tipo":"juncao_obstruida","fase":"verificacao"`, **sem ligar o motor**.

## 8. Resistência

1. Faça 10 entregas seguidas (alternando A, B e C).
2. **Esperado:** nenhum `inicio` novo no meio (sem resets) e `ram_livre` do status estável.

## Registro

| Passo | Resultado | Observações |
|---|---|---|
| 1 Boot | | |
| 2 Sensores | | |
| 3 Entregas A/B/C | | |
| 4 Motor travado | | |
| 5 Timeout | | |
| 6 Peça presa | | |
| 7 Junção obstruída | | |
| 8 Resistência | | |
