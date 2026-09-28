import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import { itensDoCelular, MENU } from '@/components/shell/navegacao';

/**
 * O menu não pode prometer o que não existe.
 *
 * O PROBLEMA QUE ISTO RESOLVE
 *
 * Antes deste teste, 14 dos 20 itens do menu levavam a 404. O corretor clicava
 * em "Agenda", via uma página de erro, e concluía que o sistema tinha
 * quebrado — não que a tela ainda não tinha sido feita. É a diferença entre um
 * produto inacabado e um produto com defeito, e o segundo destrói confiança
 * muito mais rápido.
 *
 * A marca `emBreve` no item resolve isso, mas só enquanto alguém lembrar de
 * tirá-la ao construir a tela. Este teste é esse alguém: ele varre os ARQUIVOS
 * e reprova nos DOIS sentidos.
 */

const RAIZ = join(process.cwd(), 'src', 'app');

function paginasEm(diretorio: string): string[] {
  const encontradas: string[] = [];
  for (const nome of readdirSync(diretorio)) {
    const caminho = join(diretorio, nome);
    if (statSync(caminho).isDirectory()) encontradas.push(...paginasEm(caminho));
    else if (nome === 'page.tsx') encontradas.push(caminho);
  }
  return encontradas;
}

const ROTAS_EXISTENTES = new Set(
  paginasEm(RAIZ).map((caminho) => {
    const partes = relative(RAIZ, caminho)
      .split(sep)
      .slice(0, -1)
      .filter((p) => !(p.startsWith('(') && p.endsWith(')')));
    return '/' + partes.join('/');
  }),
);

const TODOS_OS_ITENS = MENU.flatMap((grupo) => grupo.itens);

describe('todo item do menu diz a verdade', () => {
  it('encontrou itens e páginas para comparar', () => {
    // Varredura quebrada faria o teste passar vazio, sem proteger nada.
    expect(TODOS_OS_ITENS.length).toBeGreaterThan(10);
    expect(ROTAS_EXISTENTES.size).toBeGreaterThan(5);
  });

  for (const item of TODOS_OS_ITENS) {
    it(`${item.href} (${item.rotulo})`, () => {
      const temPagina = ROTAS_EXISTENTES.has(item.href);

      if (item.emBreve) {
        expect(
          temPagina,
          `"${item.rotulo}" está marcado como "em breve" mas a página ${item.href} JÁ EXISTE. ` +
            'Apague `emBreve: true` de navegacao.ts — o item está escondendo uma tela pronta.',
        ).toBe(false);
      } else {
        expect(
          temPagina,
          `"${item.rotulo}" aponta para ${item.href}, que NÃO existe — o corretor levaria um 404. ` +
            'Construa a tela, ou marque o item com `emBreve: true` em navegacao.ts.',
        ).toBe(true);
      }
    });
  }
});

describe('a barra do celular só mostra o que abre', () => {
  const tudoLiberado = () => true;

  it('nenhum item "em breve" ocupa uma das quatro vagas', () => {
    // São quatro vagas na barra que o corretor usa em pé, na frente do imóvel.
    const itens = itensDoCelular(tudoLiberado);
    expect(itens.every((i) => !i.emBreve)).toBe(true);
  });

  it('todos levam a uma página que existe', () => {
    for (const item of itensDoCelular(tudoLiberado)) {
      expect(ROTAS_EXISTENTES.has(item.href), `${item.href} não existe`).toBe(true);
    }
  });

  it('cabe no máximo quatro', () => {
    expect(itensDoCelular(tudoLiberado).length).toBeLessThanOrEqual(4);
  });
});
