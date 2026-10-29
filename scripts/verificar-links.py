#!/usr/bin/env python3
"""Verifica links relativos e âncoras dos arquivos Markdown versionados.

Uso: python3 scripts/verificar-links.py   (na raiz do repositório)

Falha (código 1) se um link aponta para arquivo inexistente ou para uma âncora
(#secao) que não existe no arquivo de destino. Links externos (http/https,
mailto) não são verificados: dependem da rede. Roda no CI (job docs-links) e
pode rodar antes de um PR que mexe na documentação.
"""
import os
import re
import subprocess
import sys
import urllib.parse

LINK = re.compile(r'(?<!!)\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)')
IMAGEM = re.compile(r'!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)')
TITULO = re.compile(r'^(#{1,6})\s+(.*?)\s*#*\s*$')
CERCA = re.compile(r'^\s*(```|~~~)')


def arquivos_md():
    saida = subprocess.run(['git', 'ls-files', '-z', '*.md'], capture_output=True, check=True).stdout
    return [f for f in saida.decode('utf-8').split('\0') if f and 'node_modules/' not in f]


def sem_codigo(texto):
    """Linhas fora de blocos de código (links dentro de ``` são exemplos)."""
    dentro = False
    for linha in texto.split('\n'):
        if CERCA.match(linha):
            dentro = not dentro
            continue
        if not dentro:
            yield re.sub(r'`[^`]*`', '', linha)


def ancora(titulo):
    """Âncora que o GitHub gera para um título."""
    t = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', titulo)  # [texto](link) -> texto
    t = re.sub(r'<[^>]+>', '', t).replace('`', '').strip().lower()
    t = ''.join(c for c in t if c.isalnum() or c in ' -_')
    return t.replace(' ', '-')


_cache = {}


def ancoras(caminho):
    if caminho not in _cache:
        vistas, nomes = {}, set()
        texto = open(caminho, encoding='utf-8').read()
        dentro = False
        for linha in texto.split('\n'):
            if CERCA.match(linha):
                dentro = not dentro
                continue
            m = None if dentro else TITULO.match(linha)
            if m:
                base = ancora(m.group(2))
                n = vistas.get(base, 0)
                nomes.add(base if n == 0 else '%s-%d' % (base, n))
                vistas[base] = n + 1
        nomes.update(re.findall(r'<a\s+(?:name|id)="([^"]+)"', texto))
        _cache[caminho] = nomes
    return _cache[caminho]


def verificar():
    erros = []
    for origem in arquivos_md():
        pasta = os.path.dirname(origem)
        texto = open(origem, encoding='utf-8').read()
        for linha in sem_codigo(texto):
            for alvo in LINK.findall(linha) + IMAGEM.findall(linha):
                if re.match(r'[a-z]+:', alvo) or alvo.startswith('../blob/'):
                    continue  # externo, ou caminho da interface web do GitHub (templates)
                caminho, _, frag = alvo.partition('#')
                caminho = urllib.parse.unquote(caminho)
                destino = os.path.normpath(os.path.join(pasta, caminho)) if caminho else origem
                if not os.path.exists(destino):
                    erros.append('%s: link para arquivo inexistente: %s' % (origem, alvo))
                elif frag and destino.endswith('.md') and urllib.parse.unquote(frag).lower() not in ancoras(destino):
                    erros.append('%s: âncora inexistente: %s' % (origem, alvo))
    return erros


if __name__ == '__main__':
    erros = verificar()
    for e in erros:
        print(e)
    print('%d link(s) quebrado(s)' % len(erros) if erros else 'Links da documentação OK')
    sys.exit(1 if erros else 0)
