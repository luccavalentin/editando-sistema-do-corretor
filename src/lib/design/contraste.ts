/**
 * Cálculo de contraste conforme WCAG 2.1.
 *
 * Existe para que "contraste WCAG AA" (seção 20) seja um teste automatizado e
 * não uma intenção. Os tokens do design system são verificados por
 * tests/unit/contraste.test.ts, que reprova o build quando uma cor de texto
 * cai abaixo do mínimo.
 *
 * Referência: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

/** Limites da norma. */
export const MINIMO = {
  /** Texto normal, AA. */
  textoAA: 4.5,
  /** Texto grande (>=18.66px negrito ou >=24px), AA. */
  textoGrandeAA: 3,
  /** Texto normal, AAA. */
  textoAAA: 7,
  /** Borda de controle, ícone e limite de componente, AA. */
  componenteAA: 3,
} as const;

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Converte `#rgb` ou `#rrggbb` em canais de 0 a 255.
 *
 * @throws Se a string não for um hexadecimal de cor válido. Falhar alto é
 * proposital: uma cor escrita errada precisa quebrar o teste, não passar
 * silenciosamente como preto.
 */
export function hexParaRgb(hex: string): RGB {
  const limpo = hex.trim().replace(/^#/, '');

  const expandido =
    limpo.length === 3
      ? limpo
          .split('')
          .map((c) => c + c)
          .join('')
      : limpo;

  if (!/^[0-9a-fA-F]{6}$/.test(expandido)) {
    throw new Error(`Cor hexadecimal inválida: "${hex}"`);
  }

  return {
    r: Number.parseInt(expandido.slice(0, 2), 16),
    g: Number.parseInt(expandido.slice(2, 4), 16),
    b: Number.parseInt(expandido.slice(4, 6), 16),
  };
}

/**
 * Luminância relativa de um canal, com a linearização da norma.
 * O trecho abaixo de 0.04045 é linear; acima segue a curva de gama 2.4.
 */
function canalLinear(valor255: number): number {
  const c = valor255 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Luminância relativa de 0 (preto) a 1 (branco). */
export function luminancia(cor: string | RGB): number {
  const { r, g, b } = typeof cor === 'string' ? hexParaRgb(cor) : cor;
  return 0.2126 * canalLinear(r) + 0.7152 * canalLinear(g) + 0.0722 * canalLinear(b);
}

/**
 * Razão de contraste entre duas cores, de 1:1 a 21:1.
 * A ordem dos argumentos não importa.
 */
export function contraste(corA: string | RGB, corB: string | RGB): number {
  const a = luminancia(corA);
  const b = luminancia(corB);
  const claro = Math.max(a, b);
  const escuro = Math.min(a, b);
  return (claro + 0.05) / (escuro + 0.05);
}

/** Arredonda para duas casas, para relatório legível. */
export function contrasteArredondado(corA: string, corB: string): number {
  return Math.round(contraste(corA, corB) * 100) / 100;
}

export type NivelAprovado = 'AAA' | 'AA' | 'AA-grande' | 'reprovado';

/** Classifica o par de cores no nível mais alto que ele alcança. */
export function classificar(corTexto: string, corFundo: string): NivelAprovado {
  const razao = contraste(corTexto, corFundo);
  if (razao >= MINIMO.textoAAA) return 'AAA';
  if (razao >= MINIMO.textoAA) return 'AA';
  if (razao >= MINIMO.textoGrandeAA) return 'AA-grande';
  return 'reprovado';
}

/** `true` se o par serve para texto normal em AA. */
export function aprovadoParaTexto(corTexto: string, corFundo: string): boolean {
  return contraste(corTexto, corFundo) >= MINIMO.textoAA;
}

/** `true` se o par serve para borda, ícone ou limite de componente. */
export function aprovadoParaComponente(cor: string, corFundo: string): boolean {
  return contraste(cor, corFundo) >= MINIMO.componenteAA;
}
