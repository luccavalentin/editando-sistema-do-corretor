import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * A marca não pode voltar a ser servida pela metade.
 *
 * O QUE ACONTECEU
 *
 * O símbolo da Agilliza são duas peças: o telhado vermelho e o "g". Um recorte
 * guardado como `agilliza-simbolo.png` tinha só o telhado, com o "g" decepado.
 * Como todo ícone saía dali, a marca foi pela metade para o favicon, para o
 * ícone do iOS e para o menu recolhido — e ninguém percebeu, porque um telhado
 * vermelho sozinho ainda "parece" um logo.
 *
 * POR QUE TESTAR PROPORÇÃO E NÃO A IMAGEM
 *
 * Porque foi exatamente a proporção que denunciou o erro. O símbolo oficial é
 * ALTO (930 × 1785, proporção 0,52). O recorte era LARGO (407 × 185, proporção
 * 2,20). Qualquer arquivo largo no lugar do símbolo significa telhado sem "g" —
 * não há como um símbolo completo ser mais largo que alto.
 *
 * Comparar pixel a pixel com uma imagem de referência prenderia a marca à
 * versão de hoje: no dia em que a Agilliza refizer o logo, o teste acusaria
 * falha sem haver defeito. A proporção sobrevive a um redesenho; o recorte, não.
 */

const raiz = join(__dirname, '..', '..');
const marca = join(raiz, 'public', 'marca');

/** Lê largura e altura do cabeçalho IHDR de um PNG, sem dependência nenhuma. */
function dimensoesDoPng(caminho: string): { largura: number; altura: number } {
  const cabecalho = readFileSync(caminho).subarray(0, 33);
  return {
    largura: cabecalho.readUInt32BE(16),
    altura: cabecalho.readUInt32BE(20),
  };
}

describe('arquivos da marca', () => {
  const simbolos = ['agilliza-simbolo.png', 'agilliza-simbolo-negativa.png'];

  it.each(simbolos)('%s existe', (arquivo) => {
    expect(existsSync(join(marca, arquivo))).toBe(true);
  });

  it.each(simbolos)('%s é mais alto que largo — tem o "g", não só o telhado', (arquivo) => {
    const { largura, altura } = dimensoesDoPng(join(marca, arquivo));
    expect(altura).toBeGreaterThan(largura);
  });

  it.each(simbolos)('%s mantém a proporção do símbolo oficial (0,52)', (arquivo) => {
    const { largura, altura } = dimensoesDoPng(join(marca, arquivo));
    // Folga de 5%: um reexporte pode variar um pixel, um recorte não fica perto.
    expect(largura / altura).toBeCloseTo(0.521, 1);
  });

  it('a proporção declarada no componente bate com o arquivo', () => {
    const fonte = readFileSync(join(raiz, 'src', 'components', 'shell', 'marca.tsx'), 'utf8');
    const achado = fonte.match(/const SIMBOLO = \{ largura: (\d+), altura: (\d+) \}/);

    expect(achado, 'const SIMBOLO não encontrado em marca.tsx').not.toBeNull();

    const declarada = Number(achado![1]) / Number(achado![2]);
    const { largura, altura } = dimensoesDoPng(join(marca, 'agilliza-simbolo.png'));

    // Se alguém trocar o arquivo e esquecer o componente, o navegador reserva o
    // espaço errado e a marca entra esticada. Aqui os dois andam juntos.
    expect(declarada).toBeCloseTo(largura / altura, 2);
  });

  it('a marca horizontal continua mais larga que alta', () => {
    const { largura, altura } = dimensoesDoPng(join(marca, 'agilliza-horizontal.png'));
    expect(largura).toBeGreaterThan(altura * 2);
  });
});

describe('ícones gerados', () => {
  const icones = [
    ['icones/icone-192.png', 192],
    ['icones/icone-512.png', 512],
    ['icones/icone-192-maskable.png', 192],
    ['icones/icone-512-maskable.png', 512],
  ] as const;

  it.each(icones)('%s existe e é quadrado no tamanho certo', (arquivo, lado) => {
    const caminho = join(raiz, 'public', arquivo);
    expect(existsSync(caminho), `${arquivo} não existe — rode scripts/gerar-icones-pwa.mjs`).toBe(
      true,
    );

    const { largura, altura } = dimensoesDoPng(caminho);
    expect(largura).toBe(lado);
    expect(altura).toBe(lado);
  });
});
