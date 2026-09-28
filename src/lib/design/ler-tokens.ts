/**
 * Leitor dos tokens do design system direto do CSS.
 *
 * Existe para que os testes verifiquem a fonte da verdade — o arquivo
 * `globals.css` — e não uma cópia dos valores mantida à mão, que envelhece na
 * primeira alteração e passa a aprovar o que já está errado.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface TokensDoTema {
  /** Valores do tema claro, já com `var()` resolvido. */
  claro: Map<string, string>;
  /** Valores do tema escuro, já com `var()` resolvido. */
  escuro: Map<string, string>;
  /** Nomes declarados em `:root` mas ausentes em `.dark`. */
  semParEscuro: string[];
}

/** Extrai o conteúdo de todos os blocos com o seletor informado. */
function extrairBlocos(css: string, seletor: string): string[] {
  const blocos: string[] = [];
  // Escapa o ponto de `.dark` para não virar "qualquer caractere".
  const alvo = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const abertura = new RegExp(`(^|\\n)\\s*${alvo}\\s*\\{`, 'g');

  // O avanço do laço é o próprio `lastIndex` da expressão, então o resultado
  // do `exec` não é necessário — só o fato de ter casado.
  while (abertura.exec(css) !== null) {
    // Caminha contando chaves, para não parar no primeiro `}` de um bloco
    // aninhado como uma media query interna.
    let profundidade = 1;
    let i = abertura.lastIndex;
    const inicio = i;
    while (i < css.length && profundidade > 0) {
      const c = css[i];
      if (c === '{') profundidade++;
      else if (c === '}') profundidade--;
      i++;
    }
    blocos.push(css.slice(inicio, i - 1));
  }
  return blocos;
}

/** Coleta as declarações `--nome: valor` de um trecho de CSS. */
function coletarDeclaracoes(trecho: string, destino: Map<string, string>): void {
  // Remove comentários antes de ler, senão valor comentado entra como válido.
  const semComentarios = trecho.replace(/\/\*[\s\S]*?\*\//g, '');
  const declaracao = /(--[\w-]+)\s*:\s*([^;]+);/g;

  let m: RegExpExecArray | null;
  while ((m = declaracao.exec(semComentarios)) !== null) {
    const nome = m[1];
    const valor = m[2];
    if (nome && valor) destino.set(nome, valor.trim());
  }
}

/**
 * Resolve cadeias de `var(--a)` até chegar num valor literal.
 * Para em 12 saltos: cadeia mais longa que isso é referência circular.
 */
function resolver(valor: string, mapa: Map<string, string>, saltos = 0): string {
  if (saltos > 12) throw new Error(`Referência circular de token em: ${valor}`);

  const referencia = /^var\((--[\w-]+)\)$/.exec(valor.trim());
  if (!referencia?.[1]) return valor.trim();

  const alvo = mapa.get(referencia[1]);
  if (alvo === undefined) throw new Error(`Token inexistente: ${referencia[1]}`);

  return resolver(alvo, mapa, saltos + 1);
}

/**
 * Lê `src/styles/globals.css` e devolve os dois temas resolvidos.
 *
 * O tema escuro parte do claro e aplica os sobrescritos de `.dark`, que é
 * exatamente o que a cascata do CSS faz: um token declarado só em `:root`
 * continua valendo no escuro — e é justamente esse o erro que `semParEscuro`
 * denuncia.
 */
export function lerTokens(raizProjeto = process.cwd()): TokensDoTema {
  const css = readFileSync(join(raizProjeto, 'src', 'styles', 'globals.css'), 'utf8');

  const claroCru = new Map<string, string>();
  for (const bloco of extrairBlocos(css, ':root')) {
    coletarDeclaracoes(bloco, claroCru);
  }
  // `@theme inline` traz as medidas que não dependem de tema — raio, escala
  // tipográfica, espaçamento — e os apelidos `--color-*` do Tailwind.
  for (const bloco of extrairBlocos(css, '@theme inline')) {
    coletarDeclaracoes(bloco, claroCru);
  }

  const escuroCru = new Map(claroCru);
  const declaradosNoEscuro = new Set<string>();
  for (const bloco of extrairBlocos(css, '.dark')) {
    const doBloco = new Map<string, string>();
    coletarDeclaracoes(bloco, doBloco);
    for (const [nome, valor] of doBloco) {
      escuroCru.set(nome, valor);
      declaradosNoEscuro.add(nome);
    }
  }

  const claro = new Map<string, string>();
  for (const [nome, valor] of claroCru) claro.set(nome, resolver(valor, claroCru));

  const escuro = new Map<string, string>();
  for (const [nome, valor] of escuroCru) escuro.set(nome, resolver(valor, escuroCru));

  // Só os tokens semânticos precisam de par: a paleta é crua e imutável, e
  // medidas como raio e espaçamento não mudam com o tema.
  const semParEscuro = [...claroCru.keys()]
    .filter((nome) => nome.startsWith('--cor-'))
    .filter((nome) => !declaradosNoEscuro.has(nome))
    .sort();

  return { claro, escuro, semParEscuro };
}
