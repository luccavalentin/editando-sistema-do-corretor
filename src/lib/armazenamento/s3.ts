import 'server-only';

/**
 * Armazenamento de mídia compatível com S3 (MinIO no VPS, ou qualquer bucket).
 *
 * POR QUE FORA DO SUPABASE
 *
 * Foi decisão de produto: o banco fica no Supabase, a mídia não. Foto de imóvel
 * é o dado que mais cresce e o que menos precisa de banco — um corretor com 300
 * anúncios e 25 fotos cada já passa de 50 GB, e isso num plano de banco custa
 * caro por um trabalho que um MinIO no mesmo VPS faz de graça.
 *
 * O FLUXO, E POR QUE ELE É ASSIM
 *
 *   1. O navegador pede uma autorização de envio ao servidor.
 *   2. O servidor confere permissão, DERIVA A CHAVE DO OBJETO (o cliente nunca
 *      escolhe onde o arquivo cai) e devolve uma URL assinada de curta duração.
 *   3. O navegador envia o arquivo DIRETO para o armazenamento.
 *   4. O servidor confere o que chegou — tamanho, tipo e os primeiros bytes — e
 *      só então grava a linha no banco.
 *
 * O passo 3 é o que permite escalar: o arquivo não passa pelo processo do Next.
 * Uma dúzia de corretores subindo fotos de 8 MB ao mesmo tempo derrubaria um
 * VPS pequeno se cada byte tivesse que atravessar o Node.
 *
 * O passo 4 é o que impede o passo 3 de virar um buraco: quem assina não vê os
 * bytes, então a única forma de saber o que foi enviado é olhar depois. Sem
 * ele, o banco poderia apontar para um arquivo que não existe, que está vazio,
 * ou que é um HTML de phishing com nome de foto.
 */

import { randomUUID } from 'node:crypto';

import { servidor } from '@/lib/ambiente';
import { BYTES_PARA_RECONHECER, reconhecerImagem, type TipoDeImagem } from '@/dominio/midia';

import {
  assinarUrl,
  cabecalhosAssinados,
  codificarRfc3986,
  type Credencial,
  type EscopoAssinatura,
} from './assinatura';

/** Erro de armazenamento com mensagem que pode ir para a tela. */
export class FalhaDeArmazenamento extends Error {
  constructor(
    mensagem: string,
    readonly detalhe?: string,
  ) {
    super(mensagem);
    this.name = 'FalhaDeArmazenamento';
  }
}

interface Configuracao {
  endpoint: URL;
  endpointInterno: URL;
  bucket: string;
  credencial: Credencial;
  escopo: EscopoAssinatura;
  urlPublica: string;
  forcarPathStyle: boolean;
}

function configuracao(): Configuracao {
  const midia = servidor().midia;

  if (!midia) {
    throw new FalhaDeArmazenamento(
      'O armazenamento de fotos não está configurado.',
      'Defina MIDIA_CHAVE_ACESSO e MIDIA_CHAVE_SECRETA no ambiente.',
    );
  }

  return {
    endpoint: new URL(midia.endpoint),
    endpointInterno: new URL(midia.endpointInterno),
    bucket: midia.bucket,
    credencial: { chaveAcesso: midia.chaveAcesso, chaveSecreta: midia.chaveSecreta },
    escopo: { regiao: midia.regiao, servico: 's3' },
    urlPublica: midia.urlPublica.replace(/\/+$/, ''),
    forcarPathStyle: midia.forcarPathStyle,
  };
}

/**
 * Se há armazenamento configurado.
 *
 * A interface usa isto para dizer "envio de fotos não configurado" em vez de
 * oferecer um botão que sempre falha. Princípio do produto: mostrar o que não
 * está pronto, nunca fingir que está.
 */
export function armazenamentoDisponivel(): boolean {
  return servidor().midia !== null;
}

/**
 * Monta a URL do objeto.
 *
 * Dois estilos porque MinIO e S3 discordam: o MinIO usa
 * `endpoint/bucket/chave` e a AWS prefere `bucket.endpoint/chave`. Errar isso
 * dá 403 de assinatura, porque o `host` entra na assinatura e muda junto.
 */
function urlDoObjeto(
  chave: string,
  config: Configuracao,
  /**
   * `interno` para as chamadas que o SERVIDOR faz. O host entra na assinatura,
   * então ele precisa ser o mesmo que a requisição vai usar de verdade —
   * misturar os dois dá 403 sem explicação.
   */
  quem: 'navegador' | 'interno' = 'navegador',
): URL {
  const caminho = chave
    .split('/')
    .map((parte) => codificarRfc3986(parte))
    .join('/');

  const base = quem === 'interno' ? config.endpointInterno : config.endpoint;

  if (config.forcarPathStyle) {
    return new URL(`${base.origin}/${config.bucket}/${caminho}`);
  }
  return new URL(`${base.protocol}//${config.bucket}.${base.host}/${caminho}`);
}

// ---------------------------------------------------------------------------
// CHAVES DE OBJETO
// ---------------------------------------------------------------------------

/**
 * Deriva a chave onde o arquivo vai cair.
 *
 * O cliente NUNCA escolhe. Se escolhesse, `../../outro-tenant/` seria a forma
 * mais barata de escrever no espaço de outro corretor — e `chave` também é o
 * que a política de RLS guarda, então uma chave forjada contaminaria o banco
 * junto.
 *
 * O sorteio (`randomUUID`) também impede adivinhação: mesmo que o bucket seja
 * público para leitura, ninguém enumera as fotos de um concorrente.
 */
export function chaveDeFotoDeImovel(parametros: {
  tenantId: string;
  imovelId: string;
  extensao: string;
}): string {
  const { tenantId, imovelId, extensao } = parametros;
  return `tenants/${tenantId}/imoveis/${imovelId}/${randomUUID()}.${extensao}`;
}

/** Documento privado: outro prefixo, para separar o que é público do que não é. */
export function chaveDeDocumento(parametros: {
  tenantId: string;
  pastaLogica: string;
  extensao: string;
}): string {
  const { tenantId, pastaLogica, extensao } = parametros;
  const pastaLimpa = pastaLogica.replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'geral';
  return `privado/tenants/${tenantId}/${pastaLimpa}/${randomUUID()}.${extensao}`;
}

/**
 * Confere que a chave pertence mesmo ao tenant.
 *
 * Segunda barreira: mesmo que alguém consiga fazer uma chave chegar de fora,
 * ela não é usada para outro tenant. Custa uma comparação de string e fecha a
 * classe inteira de erro em que um identificador viaja por onde não devia.
 */
export function chaveEhDoTenant(chave: string, tenantId: string): boolean {
  if (chave.includes('..') || chave.startsWith('/')) return false;
  return (
    chave.startsWith(`tenants/${tenantId}/`) || chave.startsWith(`privado/tenants/${tenantId}/`)
  );
}

// ---------------------------------------------------------------------------
// OPERAÇÕES
// ---------------------------------------------------------------------------

/**
 * Autorização de envio, válida por poucos minutos.
 *
 * O `content-type` vai ASSINADO: o navegador é obrigado a enviar exatamente o
 * tipo que o servidor autorizou, senão o armazenamento recusa. Sem isso, a
 * autorização para mandar um JPEG serviria para mandar qualquer coisa.
 *
 * Dez minutos porque o corretor pode estar num 3G ruim em frente ao imóvel,
 * subindo 8 MB. Menos que isso reprova envio legítimo; muito mais estende a
 * janela em que uma URL vazada ainda vale.
 */
export function autorizarEnvio(parametros: {
  chave: string;
  tipoConteudo: string;
  validadeSegundos?: number;
}): { url: string; chave: string; expiraEm: string } {
  const { chave, tipoConteudo, validadeSegundos = 600 } = parametros;
  const config = configuracao();

  const url = assinarUrl({
    metodo: 'PUT',
    url: urlDoObjeto(chave, config),
    credencial: config.credencial,
    escopo: config.escopo,
    validadeSegundos,
    cabecalhosObrigatorios: { 'content-type': tipoConteudo },
  });

  return {
    url,
    chave,
    expiraEm: new Date(Date.now() + validadeSegundos * 1000).toISOString(),
  };
}

/**
 * URL pública da foto.
 *
 * Foto de anúncio é pública por natureza — o portfólio existe para ser
 * indexado pelo Google. Servir por URL direta (ou CDN) em vez de URL assinada
 * economiza uma ida ao servidor por imagem e deixa o cache do navegador
 * trabalhar, que é o que faz a página do imóvel abrir rápido no celular.
 */
export function urlPublicaDaFoto(chave: string): string {
  const config = configuracao();
  const caminho = chave
    .split('/')
    .map((parte) => codificarRfc3986(parte))
    .join('/');
  return `${config.urlPublica}/${caminho}`;
}

/**
 * URL assinada de leitura, para o que NÃO é público.
 *
 * Documento de cliente — RG, holerite, escritura — nunca ganha URL permanente.
 * Cinco minutos é o bastante para o navegador buscar o arquivo e curto o
 * suficiente para uma URL copiada por engano num grupo de WhatsApp já não
 * valer nada quando alguém clicar.
 */
export function urlDeLeituraPrivada(chave: string, validadeSegundos = 300): string {
  const config = configuracao();
  return assinarUrl({
    metodo: 'GET',
    url: urlDoObjeto(chave, config),
    credencial: config.credencial,
    escopo: config.escopo,
    validadeSegundos,
  });
}

export interface ArquivoNoArmazenamento {
  tamanho: number;
  tipoConteudo: string;
  etag: string | null;
}

/** Lê os metadados do objeto. `null` quando ele não existe. */
export async function inspecionar(chave: string): Promise<ArquivoNoArmazenamento | null> {
  const config = configuracao();
  const url = urlDoObjeto(chave, config, 'interno');

  const resposta = await fetch(url, {
    method: 'HEAD',
    headers: cabecalhosAssinados({
      metodo: 'HEAD',
      url,
      credencial: config.credencial,
      escopo: config.escopo,
    }),
    cache: 'no-store',
  });

  if (resposta.status === 404) return null;
  if (!resposta.ok) {
    throw new FalhaDeArmazenamento(
      'Não foi possível conferir o arquivo enviado.',
      `HEAD devolveu ${resposta.status}`,
    );
  }

  return {
    tamanho: Number(resposta.headers.get('content-length') ?? 0),
    tipoConteudo: resposta.headers.get('content-type') ?? 'application/octet-stream',
    etag: resposta.headers.get('etag'),
  };
}

/**
 * Lê os primeiros bytes para reconhecer o formato de verdade.
 *
 * Um GET com `Range` traz 16 bytes, não o arquivo inteiro: conferir uma foto de
 * 8 MB custa o mesmo que conferir uma de 100 KB.
 */
export async function primeirosBytes(
  chave: string,
  quantidade = BYTES_PARA_RECONHECER,
): Promise<Uint8Array | null> {
  const config = configuracao();
  const url = urlDoObjeto(chave, config, 'interno');

  const resposta = await fetch(url, {
    method: 'GET',
    headers: {
      ...cabecalhosAssinados({
        metodo: 'GET',
        url,
        credencial: config.credencial,
        escopo: config.escopo,
        cabecalhosExtras: { range: `bytes=0-${quantidade - 1}` },
      }),
    },
    cache: 'no-store',
  });

  if (resposta.status === 404) return null;
  if (!resposta.ok && resposta.status !== 206) {
    throw new FalhaDeArmazenamento(
      'Não foi possível ler o arquivo enviado.',
      `GET devolveu ${resposta.status}`,
    );
  }

  return new Uint8Array(await resposta.arrayBuffer());
}

export async function remover(chave: string): Promise<void> {
  const config = configuracao();
  const url = urlDoObjeto(chave, config, 'interno');

  const resposta = await fetch(url, {
    method: 'DELETE',
    headers: cabecalhosAssinados({
      metodo: 'DELETE',
      url,
      credencial: config.credencial,
      escopo: config.escopo,
    }),
    cache: 'no-store',
  });

  // 204 é sucesso; 404 significa que já não está lá, que é o estado desejado.
  if (!resposta.ok && resposta.status !== 404) {
    throw new FalhaDeArmazenamento(
      'Não foi possível remover o arquivo.',
      `DELETE devolveu ${resposta.status}`,
    );
  }
}

export interface ConferenciaDeImagem {
  aprovado: boolean;
  motivo?: string;
  tamanho: number;
  tipoReal: TipoDeImagem | null;
}

/**
 * Confere o que chegou ao armazenamento antes de o banco saber que existe.
 *
 * A ordem importa: se a linha fosse gravada antes, um envio interrompido
 * deixaria o anúncio com uma foto quebrada — e "a foto sumiu" é o tipo de
 * defeito que o corretor descobre na frente do cliente.
 *
 * Reprovou? O objeto é removido aqui mesmo. Lixo que ninguém referencia é lixo
 * que ninguém apaga depois.
 */
export async function conferirImagemEnviada(parametros: {
  chave: string;
  tamanhoMaximo: number;
}): Promise<ConferenciaDeImagem> {
  const { chave, tamanhoMaximo } = parametros;

  const metadados = await inspecionar(chave);
  if (!metadados) {
    return { aprovado: false, motivo: 'O envio não chegou ao servidor.', tamanho: 0, tipoReal: null };
  }

  if (metadados.tamanho <= 0) {
    await remover(chave).catch(() => {});
    return { aprovado: false, motivo: 'O arquivo chegou vazio.', tamanho: 0, tipoReal: null };
  }

  if (metadados.tamanho > tamanhoMaximo) {
    await remover(chave).catch(() => {});
    const mb = (tamanhoMaximo / (1024 * 1024)).toFixed(0);
    return {
      aprovado: false,
      motivo: `O arquivo passou do limite de ${mb} MB.`,
      tamanho: metadados.tamanho,
      tipoReal: null,
    };
  }

  const bytes = await primeirosBytes(chave);
  const tipoReal = bytes ? reconhecerImagem(bytes) : null;

  if (!tipoReal) {
    await remover(chave).catch(() => {});
    return {
      aprovado: false,
      motivo: 'O arquivo enviado não é uma imagem.',
      tamanho: metadados.tamanho,
      tipoReal: null,
    };
  }

  return { aprovado: true, tamanho: metadados.tamanho, tipoReal };
}
