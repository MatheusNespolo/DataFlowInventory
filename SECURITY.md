# Política de Segurança

## Versões cobertas

O projeto é um protótipo acadêmico em evolução. Correções de segurança são aplicadas na
branch `main`; não há versões antigas mantidas.

## Como relatar uma vulnerabilidade

**Não abra uma issue pública** com detalhes de uma falha de segurança.

1. Se estiver disponível, use **Security → Report a vulnerability** neste repositório do GitHub
   (relato privado).
2. Se essa opção não aparecer, procure a equipe mantenedora pelo perfil
   [@MatheusNespolo](https://github.com/MatheusNespolo) no GitHub e peça um canal privado, sem
   descrever a falha em público.

Inclua, se possível: o componente afetado (servidor, simulador, dashboard, firmware ou
observabilidade), os passos para reproduzir e o impacto que você enxerga.

## O que esperar

Este é um projeto mantido por estudantes: respondemos assim que possível, sem prazo garantido,
e agradecemos o relato responsável.

## Cuidados do projeto

- Credenciais ficam em `server/.env` e em `esp32/gateway_mqtt/secrets.h`, ambos ignorados pelo
  Git. **Nunca** faça commit de senhas ou tokens (veja o
  [Guia de Contribuição](CONTRIBUTING.md#2-regras-de-segurança-não-negociáveis)).
- O servidor aplica Helmet com CSP, CORS restrito por `ALLOWED_ORIGIN`, limite de taxa de
  comandos e validação de entrada. O endpoint `/metrics` é aberto como o `/api/status`: exponha-o
  apenas em redes confiáveis.
