# Testes da lógica pura do firmware do Uno (compila no PC com g++).
# Uso: make -C test/firmware_uno test
LOGICA := ../../arduino/data_flow_inventory/src/logica
HW := ../../arduino/data_flow_inventory/src/hw
CXX ?= g++
# mocks/ tem o Wire e a biblioteca do LCD de mentira para compilar src/hw/lcd.cpp no PC.
CXXFLAGS := -std=c++11 -Wall -Wextra -Werror -O1 -I$(LOGICA) -I$(HW) -Imocks

# A camada de hardware entra no teste só no que tem lógica própria (o LCD); o resto
# (motores, sensores, serial) depende de registradores do AVR e fica para a bancada.
FONTES_LOGICA := $(wildcard $(LOGICA)/*.cpp) $(HW)/lcd.cpp
FONTES_TESTE := principal.cpp $(wildcard teste_*.cpp)

.PHONY: test clean
test: testes
	./testes

testes: $(FONTES_LOGICA) $(FONTES_TESTE) teste.h $(wildcard $(LOGICA)/*.h) $(wildcard mocks/*.h) $(HW)/lcd.h
	$(CXX) $(CXXFLAGS) -o $@ $(FONTES_TESTE) $(FONTES_LOGICA)

clean:
	rm -f testes
