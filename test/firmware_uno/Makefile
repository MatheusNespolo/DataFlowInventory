# Testes da lógica pura do firmware do Uno (compila no PC com g++).
# Uso: make -C test/firmware_uno test
LOGICA := ../../arduino/data_flow_inventory/src/logica
CXX ?= g++
CXXFLAGS := -std=c++11 -Wall -Wextra -Werror -O1 -I$(LOGICA)

FONTES_LOGICA := $(wildcard $(LOGICA)/*.cpp)
FONTES_TESTE := principal.cpp $(wildcard teste_*.cpp)

.PHONY: test clean
test: testes
	./testes

testes: $(FONTES_LOGICA) $(FONTES_TESTE) teste.h $(wildcard $(LOGICA)/*.h)
	$(CXX) $(CXXFLAGS) -o $@ $(FONTES_TESTE) $(FONTES_LOGICA)

clean:
	rm -f testes
