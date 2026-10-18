# Separador (roda giratória) — ligação e roteiro de bancada

> **Status (18/10/2026): implementado, NÃO validado em hardware.** O firmware compila e a lógica do giro tem testes no PC, mas o motor nunca girou com este código. Registre cada resultado como aprovado, falhou, bloqueado ou **não executado**; não presuma sucesso.
>
> Segue a frente A da [Semana 9](semana_09_14-18_outubro.md) e a seção "Separador" da [Semana 10](semana_10_19-23_outubro.md): primeiro a roda **isolada** (sem a FSM), depois a integração.

## 1. Ligação

Motor de passo **28BYJ-48** + driver **ULN2003** (a placa com 4 LEDs e o conector branco de 5 fios).

| ULN2003 | Uno | Observação |
|---|---|---|
| **IN1** | **D5** | |
| **IN2** | **D6** | |
| **IN3** | **D7** | |
| **IN4** | **D8** | |
| **GND (−)** | **GND** do Uno | GND **em comum** com a fonte do motor |
| **VCC (+)** | **5 V de uma fonte própria** | **Não** use o 5 V do Uno quando ele estiver no USB |

Por que D5 a D8: são livres e contíguos; ficam fora da serial (0/1), dos sensores (A0–A3, D2, D4), do I²C (A4/A5) e dos motores DC (D9–D11); e constam no diagrama elétrico.

**Alimentação:** o motor puxa ~240 mA com as bobinas energizadas. Ligado ao 5 V do Uno via USB, o pico e o ruído derrubam o LCD e podem reiniciar o Uno. Use uma fonte de 5 V própria (por exemplo, um dos módulos "Fonte 5V" do diagrama), ligue o **GND dela ao GND do Uno** e conecte o motor ao conector branco do ULN2003.

## 2. Pré-voo (antes de energizar)

- [ ] Fiação conferida: IN1→D5, IN2→D6, IN3→D7, IN4→D8, GND comum, VCC na fonte de 5 V própria.
- [ ] Motor no conector branco do ULN2003, sem fio solto; roda **livre** (sem peça e sem encostar em nada).
- [ ] **Roda alinhada à mão no neutro.** Não há sensor de referência: o firmware assume o neutro (0°) toda vez que o Uno liga ou reinicia, e **abrir o Serial Monitor reinicia o Uno**. Alinhe a roda **antes** de abrir o monitor e de gravar.
- [ ] Biblioteca **Stepper** (Arduino, 1.1.3) instalada na IDE (Gerenciador de Bibliotecas); ela pode não vir com a IDE.
- [ ] ESP32 desconectado dos pinos 0/1 (também necessário para gravar); assim o Serial Monitor é o único a falar com o Uno.

## 3. Ensaio isolado (sem a FSM)

Com `SEPARADOR_NA_ENTREGA 0` (padrão), a roda só gira por comando. Abra o Serial Monitor em **9600 baud** com final de linha **"Nova linha"** (ou "Ambos, NL e CR").

| Comando | Efeito |
|---|---|
| `CMD:SEP:A` | gira até o compartimento A (120° do neutro, por padrão) |
| `CMD:SEP:B` | gira até o B (240°; o caminho mais curto é 120° no sentido contrário: **é normal**) |
| `CMD:SEP:C` | gira até o C (0°, o neutro, por padrão) |
| `CMD:SEP:0` | volta ao neutro |

Um giro de 120° leva ~2 s a 10 RPM. O comando não bloqueia: o Uno continua respondendo e publicando enquanto a roda gira.

Roteiro (um passo por vez; **pare** nos critérios da seção 5):

1. **Sentido:** envie `CMD:SEP:A`. A roda foi para o lado esperado? Se não, troque `SEPARADOR_INVERTER_SENTIDO` para `1` em `config.h`, regrave e repita (A e B trocam de lugar com o sentido invertido).
2. **Ângulo:** a roda parou a 120° do neutro? Se o desvio for sistemático, ajuste `SEPARADOR_GRAUS_A/B/C` ou calibre os passos por volta (seção 4).
3. **Repetibilidade sem carga:** alterne A → B → C → A... por 10 ciclos. A roda volta sempre ao mesmo ponto? Anote o desvio observado.
4. **Estabilidade do sistema:** durante os giros, o Uno **não** pode reiniciar (não deve aparecer um novo `inicio` com `reset`), e o LCD (se houver) não pode apagar (`lcd_quedas` no `status` não deve subir).
5. **Aquecimento/ruído:** driver e motor só devem ficar mornos. O motor solta as bobinas ~0,5 s depois de parar.
6. **Reinício:** reinicie o Uno com a roda fora do neutro e confirme o comportamento documentado: o firmware assume o neutro, e a posição real se perde.
7. **Com carga/peça:** só depois de a repetibilidade sem carga estar aprovada.

## 4. Calibração (a roda é contada por software)

- **Passos por volta (`SEPARADOR_PASSOS_POR_VOLTA`, padrão 2038).** O 28BYJ-48 tem engrenagem 63,68:1, ou seja, ~2038 passos por volta; o valor 2048 que aparece em muitos tutoriais faz a roda avançar ~1,8° a mais por volta. Para conferir: marque a roda e peça A → B → C → A... várias vezes. Se a marca se afastar sempre para o mesmo lado, ajuste o valor em poucos passos e repita. Anote o valor final.
- **Velocidade (`SEPARADOR_RPM`, padrão 10).** Se a roda perder passo, engasgar ou travar, diminua (por exemplo, 8) e repita.
- **Folga e atrito:** com a roda carregada, o torque do 28BYJ-48 é pequeno; se ela perder passo só com carga, é limite mecânico, não de firmware.

## 5. Critérios de parada

Pare e desenergize se houver: cheiro de queimado, motor ou driver quentes demais para tocar, perda de passo, travamento, **reinício do Uno**, apagamento do LCD ou ruído elétrico nas esteiras. Registre a pendência; não improvise.

## 6. Integração à entrega (só depois do ensaio isolado aprovado)

Em `config.h`, mude `SEPARADOR_NA_ENTREGA` para `1` e regrave. A roda passa a girar, na confirmação da entrega (marco M2), até o compartimento da peça. Limitações conhecidas:

- **Tempo da peça:** o giro começa no momento em que a junção confirma a passagem, e a peça ainda percorre a esteira principal até o fim. Se um novo pedido for confirmado antes de a peça anterior chegar, a roda pode sair da posição cedo demais. O tempo de trânsito na esteira principal **não foi medido**.
- **Posição:** sem sensor de referência, qualquer reinício do Uno desalinha a roda; realinhe à mão.
- **Não valide junto com o Bloco 3:** teste A+B+C e o separador em sessões separadas, para não misturar causas de falha.

## 7. Registro

| Passo | Resultado | Observações |
|---|---|---|
| Ligação e pré-voo | ⬜ | |
| Sentido (`CMD:SEP:A`) | ⬜ | |
| Ângulo A/B/C | ⬜ | |
| Repetibilidade, 10 ciclos | ⬜ | |
| Uno sem reinício / LCD estável | ⬜ | |
| Aquecimento e ruído | ⬜ | |
| Comportamento após reinício | ⬜ | |
| Com carga/peça | ⬜ | |
| Calibração (`PASSOS_POR_VOLTA`, `RPM`) | ⬜ | |
| Integração na entrega (`SEPARADOR_NA_ENTREGA 1`) | ⬜ | |

Responsável/data: __________
