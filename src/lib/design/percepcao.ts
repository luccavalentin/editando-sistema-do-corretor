/**
 * Distância perceptual entre cores e simulação de daltonismo.
 *
 * Por que isto existe separado de `contraste.ts`: razão de contraste WCAG mede
 * apenas diferença de LUMINÂNCIA. Serve para texto sobre fundo, e não serve
 * para saber se duas séries de um gráfico se distinguem — azul `#000F9F` e
 * roxo `#6D28D9` têm luminância parecida e dão 1.03:1 de contraste, mas
 * ninguém os confunde. Usar contraste ali reprova cores boas e aprova cores
 * ruins.
 *
 * A métrica certa para cor categórica é distância perceptual. OKLab é o espaço
 * onde distância euclidiana corresponde bem à diferença percebida.
 *
 * O funil do Agilliza é lido por cor (14 etapas), então isto não é rigor
 * decorativo: é o que garante que o corretor distinga "visita" de "proposta"
 * no gráfico — inclusive quem tem daltonismo, que é cerca de 8% dos homens.
 */

import { hexParaRgb } from './contraste';

export interface OkLab {
  /** Luminosidade percebida, 0 a 1. */
  L: number;
  /** Eixo verde-vermelho. */
  a: number;
  /** Eixo azul-amarelo. */
  b: number;
}

/** sRGB com gama para sRGB linear. */
function paraLinear(valor255: number): number {
  const c = valor255 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** sRGB linear de volta para 0–255 com gama. */
function paraGama(linear: number): number {
  const limitado = Math.min(1, Math.max(0, linear));
  const c = limitado <= 0.0031308 ? limitado * 12.92 : 1.055 * Math.pow(limitado, 1 / 2.4) - 0.055;
  return Math.round(c * 255);
}

/**
 * Converte para OKLab.
 * Matrizes de Björn Ottosson: https://bottosson.github.io/posts/oklab/
 */
export function paraOkLab(hex: string): OkLab {
  const { r, g, b } = hexParaRgb(hex);
  const rl = paraLinear(r);
  const gl = paraLinear(g);
  const bl = paraLinear(b);

  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

/**
 * Distância perceptual entre duas cores, em unidades de OKLab.
 *
 * Referência prática de leitura:
 *   ~0.02  diferença apenas perceptível lado a lado
 *   ~0.10  distinguível num gráfico, com esforço
 *   ~0.15  confortável para série categórica
 *   ~0.30  inequívoco
 */
export function distancia(hexA: string, hexB: string): number {
  const a = paraOkLab(hexA);
  const b = paraOkLab(hexB);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
}

export type TipoDaltonismo = 'protanopia' | 'deuteranopia' | 'tritanopia';

/**
 * Matrizes de simulação em sRGB linear.
 * Viénot, Brettel & Mollon (1999) — o modelo padrão para dicromacia.
 */
const MATRIZES: Record<TipoDaltonismo, readonly [number[], number[], number[]]> = {
  // Ausência do cone L (vermelho). ~1% dos homens.
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  // Ausência do cone M (verde). ~1% dos homens, o mais comum entre as formas
  // severas — e o que mais afeta escala verde/vermelho de status.
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  // Ausência do cone S (azul). Raro, mas afeta escala azul/amarelo.
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** Simula como a cor é percebida por quem tem o tipo de daltonismo informado. */
export function simularDaltonismo(hex: string, tipo: TipoDaltonismo): string {
  const { r, g, b } = hexParaRgb(hex);
  const rl = paraLinear(r);
  const gl = paraLinear(g);
  const bl = paraLinear(b);

  const [linhaR, linhaG, linhaB] = MATRIZES[tipo];

  const componente = (linha: number[]): number =>
    (linha[0] ?? 0) * rl + (linha[1] ?? 0) * gl + (linha[2] ?? 0) * bl;

  const hex2 = (n: number): string => n.toString(16).padStart(2, '0');

  return `#${hex2(paraGama(componente(linhaR)))}${hex2(paraGama(componente(linhaG)))}${hex2(
    paraGama(componente(linhaB)),
  )}`;
}

/**
 * Menor distância perceptual entre dois membros quaisquer da paleta, já vista
 * pelos olhos do tipo de daltonismo informado.
 *
 * @returns o par mais próximo e sua distância — o gargalo da paleta.
 */
export function parMaisProximo(
  cores: readonly string[],
  tipo?: TipoDaltonismo,
): { a: number; b: number; distancia: number } {
  const vistas = tipo ? cores.map((c) => simularDaltonismo(c, tipo)) : [...cores];

  let melhor = { a: -1, b: -1, distancia: Number.POSITIVE_INFINITY };

  for (let i = 0; i < vistas.length; i++) {
    for (let j = i + 1; j < vistas.length; j++) {
      const d = distancia(vistas[i]!, vistas[j]!);
      if (d < melhor.distancia) melhor = { a: i, b: j, distancia: d };
    }
  }

  return melhor;
}
