/**
 * Regras de mídia: o que o sistema aceita e como ele confere.
 *
 * Módulo puro, sem rede e sem banco, porque as duas pontas precisam dele: o
 * formulário no navegador (para avisar antes de gastar a franquia de dados do
 * corretor) e o servidor (para decidir de verdade). Regra duplicada em dois
 * lugares vira regra divergente; aqui ela é uma só.
 */

/** Tipos aceitos em foto de imóvel. */
export const TIPOS_DE_IMAGEM = {
  'image/jpeg': { extensao: 'jpg', rotulo: 'JPEG' },
  'image/png': { extensao: 'png', rotulo: 'PNG' },
  'image/webp': { extensao: 'webp', rotulo: 'WebP' },
  'image/avif': { extensao: 'avif', rotulo: 'AVIF' },
} as const;

export type TipoDeImagem = keyof typeof TIPOS_DE_IMAGEM;

export function ehTipoDeImagem(tipo: string): tipo is TipoDeImagem {
  return tipo in TIPOS_DE_IMAGEM;
}

/**
 * 12 MB.
 *
 * Foto de celular moderno chega a 8 MB, então o limite precisa caber isso com
 * folga. Acima disso é quase sempre engano — alguém mandando um vídeo ou um
 * PDF digitalizado — e deixar passar custa banda e disco de quem hospeda.
 */
export const TAMANHO_MAXIMO_FOTO = 12 * 1024 * 1024;

/** 20 MB para documento, que costuma ser PDF de escritura com muitas páginas. */
export const TAMANHO_MAXIMO_DOCUMENTO = 20 * 1024 * 1024;

/** Quantas fotos cabem num anúncio. Acima disso ninguém rola até o fim. */
export const MAXIMO_DE_FOTOS_POR_IMOVEL = 40;

/**
 * Reconhece a imagem pelos primeiros bytes.
 *
 * O `Content-Type` que o navegador manda é declaração, não prova: ele vem do
 * cliente e o cliente pode mentir. Isto aqui olha o arquivo.
 *
 * O ataque concreto que isso fecha: subir um HTML como se fosse `image/jpeg`.
 * O arquivo fica hospedado num domínio ligado à marca, e o link — que parece
 * uma foto de imóvel — abre uma página de phishing servida pelo próprio
 * sistema. `nosniff` já reduz o risco, mas depende de o CDN e o navegador
 * colaborarem; conferir o byte não depende de ninguém.
 */
export function reconhecerImagem(bytes: Uint8Array): TipoDeImagem | null {
  const comeca = (...esperados: number[]): boolean =>
    esperados.every((byte, indice) => bytes[indice] === byte);

  // FF D8 FF — sempre os três primeiros bytes de um JPEG.
  if (comeca(0xff, 0xd8, 0xff)) return 'image/jpeg';

  // Assinatura de 8 bytes do PNG, com o \r\n de propósito para detectar
  // arquivo corrompido por transferência em modo texto.
  if (comeca(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';

  const texto = (inicio: number, fim: number): string =>
    String.fromCharCode(...Array.from(bytes.slice(inicio, fim)));

  // RIFF....WEBP — contêiner RIFF com o tamanho no meio.
  if (texto(0, 4) === 'RIFF' && texto(8, 12) === 'WEBP') return 'image/webp';

  // Caixa ISO-BMFF: tamanho, 'ftyp', marca. AVIF usa 'avif' (imagem) ou
  // 'avis' (sequência).
  if (texto(4, 8) === 'ftyp') {
    const marca = texto(8, 12);
    if (marca === 'avif' || marca === 'avis') return 'image/avif';
  }

  return null;
}

/** Quantos bytes bastam para `reconhecerImagem` decidir. */
export const BYTES_PARA_RECONHECER = 16;

/**
 * Normaliza o nome do arquivo para servir de legenda.
 *
 * O nome original não vira caminho no armazenamento — isso seria travessia de
 * diretório de graça. A chave do objeto é sorteada pelo servidor; o nome só
 * sobrevive como texto, e mesmo assim limpo.
 */
export function legendaAPartirDoNome(nomeDoArquivo: string): string {
  const semExtensao = nomeDoArquivo.replace(/\.[^.]+$/, '');
  return semExtensao
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/** Mensagem pronta para a tela quando o arquivo não serve. */
export function recusarArquivo(parametros: {
  tipoDeclarado: string;
  tamanho: number;
  limite?: number;
}): string | null {
  const { tipoDeclarado, tamanho, limite = TAMANHO_MAXIMO_FOTO } = parametros;

  if (!ehTipoDeImagem(tipoDeclarado)) {
    const aceitos = Object.values(TIPOS_DE_IMAGEM)
      .map((t) => t.rotulo)
      .join(', ');
    return `Formato não aceito. Envie ${aceitos}.`;
  }

  if (tamanho <= 0) return 'O arquivo está vazio.';

  if (tamanho > limite) {
    const mb = (limite / (1024 * 1024)).toFixed(0);
    const enviadoMb = (tamanho / (1024 * 1024)).toFixed(1);
    return `A foto tem ${enviadoMb} MB e o limite é ${mb} MB.`;
  }

  return null;
}
