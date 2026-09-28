/**
 * Assinatura AWS Signature Version 4.
 *
 * POR QUE À MÃO, E NÃO O SDK DA AWS
 *
 * O sistema precisa de quatro operações em armazenamento compatível com S3:
 * URL assinada para enviar, URL assinada para ler, HEAD e DELETE. O
 * `@aws-sdk/client-s3` resolve isso arrastando dezenas de pacotes e alguns
 * megabytes para dentro de uma imagem que vai rodar num VPS — para usar uma
 * fração mínima do que ele oferece.
 *
 * A objeção séria a escrever criptografia à mão é que ela erra em silêncio: a
 * assinatura sai errada e o servidor devolve 403 sem dizer por quê, ou pior,
 * sai "certa o bastante" num caso e errada em outro. Isso só é aceitável
 * porque o SigV4 tem VETORES DE TESTE OFICIAIS da AWS, com entrada e saída
 * publicadas. O arquivo `tests/unit/assinatura-s3.test.ts` confere esta
 * implementação contra eles. Se um dia falhar, falha no teste, não em produção.
 *
 * Este módulo é puro: só `node:crypto` e strings. Não conhece bucket, imóvel
 * nem tenant — quem sabe disso é `s3.ts`.
 */

import { createHash, createHmac } from 'node:crypto';

const ALGORITMO = 'AWS4-HMAC-SHA256';

/** Hash de corpo vazio. Constante do protocolo, usada em GET/HEAD/DELETE. */
export const HASH_CORPO_VAZIO =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * Em URL pré-assinada o corpo não entra na assinatura.
 *
 * É o que permite o navegador enviar o arquivo direto para o armazenamento: o
 * servidor assina sem nunca ver os bytes. O preço é que a assinatura não
 * garante O QUE foi enviado — por isso `s3.ts` confere o objeto por HEAD antes
 * de gravar qualquer linha no banco.
 */
export const CORPO_NAO_ASSINADO = 'UNSIGNED-PAYLOAD';

export function sha256Hex(dado: string | Uint8Array): string {
  return createHash('sha256').update(dado).digest('hex');
}

function hmac(chave: Uint8Array | string, dado: string): Buffer {
  return createHmac('sha256', chave).update(dado, 'utf8').digest();
}

/**
 * Codificação percentual do RFC 3986.
 *
 * `encodeURIComponent` não serve: ele deixa `!`, `'`, `(`, `)` e `*` passarem,
 * e a AWS espera esses cinco codificados. Um nome de arquivo com parêntese —
 * "foto (1).jpg", que é o que o Windows gera ao duplicar — seria assinado de um
 * jeito e enviado de outro, e o envio falharia com 403 sem explicação.
 */
export function codificarRfc3986(texto: string, manterBarra = false): string {
  let saida = '';
  for (const caractere of texto) {
    if (/[A-Za-z0-9\-_.~]/.test(caractere)) {
      saida += caractere;
    } else if (caractere === '/' && manterBarra) {
      saida += '/';
    } else {
      for (const byte of Buffer.from(caractere, 'utf8')) {
        saida += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
      }
    }
  }
  return saida;
}

/** `20130524T000000Z` e `20130524`, o par que o protocolo exige. */
export function carimbos(momento: Date): { completo: string; data: string } {
  const completo = momento.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { completo, data: completo.slice(0, 8) };
}

/**
 * Deriva a chave de assinatura do dia.
 *
 * Quatro HMACs encadeados: data, região, serviço, sufixo fixo. O resultado só
 * vale para aquela combinação — é o que limita o estrago de uma chave derivada
 * vazada a um dia, uma região e um serviço.
 */
export function chaveDeAssinatura(
  segredo: string,
  data: string,
  regiao: string,
  servico: string,
): Buffer {
  const kData = hmac('AWS4' + segredo, data);
  const kRegiao = hmac(kData, regiao);
  const kServico = hmac(kRegiao, servico);
  return hmac(kServico, 'aws4_request');
}

function canonizarCabecalhos(cabecalhos: Record<string, string>): {
  canonicos: string;
  assinados: string;
} {
  const pares = Object.entries(cabecalhos)
    .map(([nome, valor]) => [nome.toLowerCase().trim(), valor.trim().replace(/\s+/g, ' ')] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  return {
    canonicos: pares.map(([nome, valor]) => nome + ':' + valor + '\n').join(''),
    assinados: pares.map(([nome]) => nome).join(';'),
  };
}

function canonizarConsulta(consulta: Record<string, string>): string {
  return Object.entries(consulta)
    .map(([nome, valor]) => [codificarRfc3986(nome), codificarRfc3986(valor)] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([nome, valor]) => nome + '=' + valor)
    .join('&');
}

export interface Credencial {
  chaveAcesso: string;
  chaveSecreta: string;
  /** Presente quando a credencial é temporária (STS). */
  token?: string | undefined;
}

export interface EscopoAssinatura {
  regiao: string;
  servico: string;
}

/**
 * Monta a requisição canônica e devolve a assinatura hexadecimal.
 *
 * Isolada das duas funções públicas porque é exatamente aqui que os vetores
 * oficiais batem — testar este pedaço é testar o protocolo.
 */
export function assinar(parametros: {
  metodo: string;
  caminho: string;
  consulta: Record<string, string>;
  cabecalhos: Record<string, string>;
  hashCorpo: string;
  credencial: Credencial;
  escopo: EscopoAssinatura;
  momento: Date;
}): { assinatura: string; cabecalhosAssinados: string; consultaCanonica: string } {
  const { metodo, caminho, consulta, cabecalhos, hashCorpo, credencial, escopo, momento } =
    parametros;

  const { completo, data } = carimbos(momento);
  const { canonicos, assinados } = canonizarCabecalhos(cabecalhos);
  const consultaCanonica = canonizarConsulta(consulta);

  const requisicaoCanonica = [
    metodo.toUpperCase(),
    codificarRfc3986(caminho, true),
    consultaCanonica,
    canonicos,
    assinados,
    hashCorpo,
  ].join('\n');

  const escopoTexto = data + '/' + escopo.regiao + '/' + escopo.servico + '/aws4_request';
  const paraAssinar = [ALGORITMO, completo, escopoTexto, sha256Hex(requisicaoCanonica)].join('\n');

  const chave = chaveDeAssinatura(credencial.chaveSecreta, data, escopo.regiao, escopo.servico);

  return {
    assinatura: createHmac('sha256', chave).update(paraAssinar, 'utf8').digest('hex'),
    cabecalhosAssinados: assinados,
    consultaCanonica,
  };
}

/**
 * URL pré-assinada, para o navegador falar direto com o armazenamento.
 *
 * O arquivo não passa pelo Next. Numa VPS isso é a diferença entre servir
 * milhares de corretores e derrubar o processo com uma dúzia de uploads
 * simultâneos de fotos de 8 MB.
 *
 * `cabecalhosObrigatorios` entra na assinatura: o que for listado aqui o
 * cliente é obrigado a enviar com valor idêntico, senão o armazenamento recusa.
 * É assim que o servidor trava o `content-type` sem confiar no cliente.
 */
export function assinarUrl(parametros: {
  metodo: string;
  url: URL;
  credencial: Credencial;
  escopo: EscopoAssinatura;
  validadeSegundos: number;
  cabecalhosObrigatorios?: Record<string, string>;
  momento?: Date;
}): string {
  const {
    metodo,
    url,
    credencial,
    escopo,
    validadeSegundos,
    cabecalhosObrigatorios = {},
    momento = new Date(),
  } = parametros;

  const { completo, data } = carimbos(momento);

  const cabecalhos: Record<string, string> = { host: url.host, ...cabecalhosObrigatorios };
  const { assinados } = canonizarCabecalhos(cabecalhos);

  const consulta: Record<string, string> = {};
  for (const [nome, valor] of url.searchParams) consulta[nome] = valor;

  consulta['X-Amz-Algorithm'] = ALGORITMO;
  consulta['X-Amz-Credential'] =
    credencial.chaveAcesso + '/' + data + '/' + escopo.regiao + '/' + escopo.servico + '/aws4_request';
  consulta['X-Amz-Date'] = completo;
  consulta['X-Amz-Expires'] = String(validadeSegundos);
  consulta['X-Amz-SignedHeaders'] = assinados;
  if (credencial.token) consulta['X-Amz-Security-Token'] = credencial.token;

  const caminho = decodeURIComponent(url.pathname);

  const { assinatura, consultaCanonica } = assinar({
    metodo,
    caminho,
    consulta,
    cabecalhos,
    hashCorpo: CORPO_NAO_ASSINADO,
    credencial,
    escopo,
    momento,
  });

  return (
    url.origin +
    codificarRfc3986(caminho, true) +
    '?' +
    consultaCanonica +
    '&X-Amz-Signature=' +
    assinatura
  );
}

/**
 * Assinatura por cabeçalho, para o próprio servidor chamar o armazenamento.
 *
 * Usada em HEAD (conferir o que o cliente enviou) e DELETE (remover foto). Aqui
 * o corpo É assinado, porque o servidor tem os bytes em mãos e não há motivo
 * para abrir mão da garantia.
 */
export function cabecalhosAssinados(parametros: {
  metodo: string;
  url: URL;
  credencial: Credencial;
  escopo: EscopoAssinatura;
  corpo?: string | Uint8Array;
  cabecalhosExtras?: Record<string, string>;
  momento?: Date;
}): Record<string, string> {
  const {
    metodo,
    url,
    credencial,
    escopo,
    corpo,
    cabecalhosExtras = {},
    momento = new Date(),
  } = parametros;

  const { completo, data } = carimbos(momento);
  const hashCorpo = corpo === undefined ? HASH_CORPO_VAZIO : sha256Hex(corpo);

  const cabecalhos: Record<string, string> = {
    host: url.host,
    'x-amz-content-sha256': hashCorpo,
    'x-amz-date': completo,
    ...cabecalhosExtras,
  };
  if (credencial.token) cabecalhos['x-amz-security-token'] = credencial.token;

  const consulta: Record<string, string> = {};
  for (const [nome, valor] of url.searchParams) consulta[nome] = valor;

  const { assinatura, cabecalhosAssinados: assinados } = assinar({
    metodo,
    caminho: decodeURIComponent(url.pathname),
    consulta,
    cabecalhos,
    hashCorpo,
    credencial,
    escopo,
    momento,
  });

  const escopoTexto = data + '/' + escopo.regiao + '/' + escopo.servico + '/aws4_request';

  return {
    ...cabecalhos,
    Authorization:
      ALGORITMO +
      ' Credential=' +
      credencial.chaveAcesso +
      '/' +
      escopoTexto +
      ', SignedHeaders=' +
      assinados +
      ', Signature=' +
      assinatura,
  };
}
