import 'server-only';

import { servidor } from '@/lib/ambiente';

/**
 * Cliente da API Homefin.
 *
 * ARQUITETURA: a **Agilliza** é o parceiro cadastrado na Homefin. O corretor NÃO
 * é cliente da Homefin e nunca cadastra credencial de banco — ele opera sob a
 * conta da plataforma. Por isso a credencial é de ambiente, e não por tenant.
 *
 * Contrato: `https://api.homefin.com.br/external`, HTTPS obrigatório (a API não
 * aceita HTTP), autenticação Bearer obtida em `POST /auth/token`.
 *
 * Tudo aqui é `server-only`. O segredo nunca chega ao navegador, e a resposta do
 * banco passa por humanização antes de virar texto de tela.
 */

// ---------------------------------------------------------------------------
// ERROS
// ---------------------------------------------------------------------------

export class HomefinNaoConfigurada extends Error {
  constructor() {
    super('A integração com a Homefin não está configurada nesta instalação.');
    this.name = 'HomefinNaoConfigurada';
  }
}

export class HomefinErro extends Error {
  constructor(
    message: string,
    readonly statusHttp?: number,
    readonly endpoint?: string,
    /** `true` quando repetir a chamada pode dar certo. */
    readonly tentarDeNovo = false,
  ) {
    super(message);
    this.name = 'HomefinErro';
  }
}

/**
 * Traduz a resposta do provedor para algo que o corretor entenda.
 *
 * Duas responsabilidades. A primeira é não vazar detalhe de infraestrutura: uma
 * mensagem contendo "supabase", "service_role" ou "environment variable" virou
 * texto de tela em algum momento, e isso entrega arquitetura para quem estiver
 * sondando. A segunda é não mostrar JSON cru: o corretor precisa saber o que
 * fazer, não ler a pilha de erro do provedor.
 */
export function mensagemParaOCorretor(bruta: string | null | undefined): string {
  const generica = 'O banco não respondeu corretamente. Tente de novo em alguns instantes.';
  if (!bruta) return generica;

  if (/supabase|service[_ ]role|environment variable|postgres|stack|at Object\./i.test(bruta)) {
    return generica;
  }

  // Um JSON inteiro na tela é pior que uma frase genérica.
  if (/^[[{]/.test(bruta.trim())) return generica;

  if (bruta.length > 300) return generica;

  return bruta;
}

// ---------------------------------------------------------------------------
// MASCARAMENTO PARA LOG
// ---------------------------------------------------------------------------

const CAMPOS_SENSIVEIS = new Set([
  'secretId',
  'secretKey',
  'cpfCnpj',
  'cpf',
  'cnpj',
  'cpfConjuge',
  'rendaTotal',
  'renda',
  'rendaConjuge',
  'email',
  'emailConjuge',
  'celular',
  'celularConjuge',
  'senha',
  'password',
  'token',
  'jwt',
  'refreshToken',
  'authorization',
]);

/**
 * Remove dado pessoal antes de qualquer registro.
 *
 * A seção 10 exige "armazenar logs técnicos sem expor dados sensíveis". O log
 * vai para arquivo, agregador e terminal de plantão — lugares onde o CPF do
 * cliente não deveria estar.
 */
export function mascararParaLog(valor: unknown, profundidade = 0): unknown {
  if (profundidade > 8) return '[profundo]';
  if (Array.isArray(valor)) return valor.slice(0, 40).map((v) => mascararParaLog(v, profundidade + 1));
  if (valor && typeof valor === 'object') {
    const saida: Record<string, unknown> = {};
    for (const [chave, v] of Object.entries(valor as Record<string, unknown>)) {
      saida[chave] = CAMPOS_SENSIVEIS.has(chave) ? '***' : mascararParaLog(v, profundidade + 1);
    }
    return saida;
  }
  return valor;
}

/**
 * Limpa campo de texto livre antes de mandar ao banco.
 *
 * Os bancos recusam parênteses e colchetes em profissão e nome de empresa. O
 * "(a)" de "Professor(a)" vem de formulário e derruba a proposta inteira.
 */
export function limparTextoLivre(valor: string): string {
  return valor
    .replace(/\((?:a|o)\)/gi, '')
    .replace(/[(){}[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// AUTENTICAÇÃO
// ---------------------------------------------------------------------------

interface TokenEmMemoria {
  jwt: string;
  expiraEm: number;
  idParceiro: string;
  idUsuarioParceiro: string;
}

let tokenAtual: TokenEmMemoria | null = null;

/** Sobra de segurança antes do vencimento, para não usar token na última hora. */
const MARGEM_MS = 60_000;

/** Duração assumida quando a resposta não diz. Conservadora de propósito. */
const DURACAO_PADRAO_MS = 20 * 60_000;

export function homefinEstaConfigurada(): boolean {
  try {
    return servidor().homefin !== null;
  } catch {
    return false;
  }
}

async function obterToken(): Promise<TokenEmMemoria> {
  const config = servidor().homefin;
  if (!config) throw new HomefinNaoConfigurada();

  if (tokenAtual && tokenAtual.expiraEm > Date.now() + MARGEM_MS) {
    return tokenAtual;
  }

  const resposta = await fetch(`${config.urlBase.replace(/\/$/, '')}/auth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ secretId: config.clienteId, secretKey: config.clienteSegredo }),
    // Sem isto, o Next pode guardar a resposta e servir um token vencido.
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });

  if (!resposta.ok) {
    throw new HomefinErro(
      'Não foi possível autenticar na Homefin. Confira as credenciais da plataforma.',
      resposta.status,
      '/auth/token',
      // 5xx pode ser instabilidade; 401 é credencial errada e repetir não ajuda.
      resposta.status >= 500,
    );
  }

  const corpo = (await resposta.json()) as {
    jwt?: string;
    usuario?: { idParceiro?: string | number; idUsuarioParceiro?: string | number };
  };

  if (!corpo.jwt) {
    throw new HomefinErro('A Homefin não devolveu token de sessão.', resposta.status, '/auth/token');
  }

  tokenAtual = {
    jwt: corpo.jwt,
    expiraEm: Date.now() + DURACAO_PADRAO_MS,
    idParceiro: String(corpo.usuario?.idParceiro ?? config.idParceiro),
    idUsuarioParceiro: String(corpo.usuario?.idUsuarioParceiro ?? config.idUsuarioParceiro),
    // ATENÇÃO: `idRegional` do token NÃO é usado. Ver `identificacaoDoParceiro`.
  };

  return tokenAtual;
}

/**
 * Os três ids que toda oportunidade carrega.
 *
 * A REGIONAL NÃO VEM DO TOKEN, e isso é a pegadinha mais cara da integração. O
 * `POST /auth/token` devolve `idRegional` = 1, que é a regional da própria
 * HomeFin — usar esse valor faz a oportunidade nascer fora da nossa carteira. A
 * nossa é a 26 ("AGILLIZA CRED"), confirmada pela Homefin. O ambiente pode
 * sobrepor se um dia mudar.
 */
export async function identificacaoDoParceiro(): Promise<{
  idParceiro: string;
  idRegional: string;
  idUsuarioParceiro: string;
}> {
  const config = servidor().homefin;
  if (!config) throw new HomefinNaoConfigurada();

  const token = await obterToken();

  return {
    idParceiro: token.idParceiro || config.idParceiro,
    idRegional: config.idRegional,
    idUsuarioParceiro: token.idUsuarioParceiro || config.idUsuarioParceiro,
  };
}

// ---------------------------------------------------------------------------
// CHAMADA GENÉRICA
// ---------------------------------------------------------------------------

export interface RegistroDaChamada {
  endpoint: string;
  metodo: string;
  statusHttp: number | null;
  duracaoMs: number;
  /** Já mascarado. Seguro para gravar. */
  enviado: unknown;
  /** No sucesso, um resumo; no erro, o corpo inteiro. */
  recebido: unknown;
  erro: string | null;
}

/**
 * Encolhe a resposta guardada no log quando deu certo.
 *
 * No CRM Agilliza real, guardar o corpo inteiro do `GET /oportunidade/{id}` a
 * cada reconciliação gerou 1,2 GB de log — e ninguém lê essa coluna: a única
 * consulta feita sobre ela é uma contagem por endpoint e status. No sucesso
 * guardamos um resumo; no ERRO guardamos tudo, que é justamente quando o corpo
 * importa.
 */
function resumirResposta(sucesso: boolean, corpo: unknown): unknown {
  if (!sucesso) return mascararParaLog(corpo);
  if (corpo === null || typeof corpo !== 'object') return corpo;

  const obj = corpo as Record<string, unknown>;
  const resumo: Record<string, unknown> = {};

  // Guarda só o que serve para correlacionar e diagnosticar depois.
  for (const chave of ['idOportunidade', 'idSimulacao', 'idBanco', 'tipoSituacao', 'code']) {
    if (chave in obj) resumo[chave] = obj[chave];
  }
  resumo.__resumido = true;
  return resumo;
}

const TENTATIVAS_MAXIMAS = 3;

/** Códigos em que repetir faz sentido. */
function valeRepetir(status: number | null): boolean {
  if (status === null) return true; // rede caiu
  if (status === 429) return true; // limite de requisição
  return status >= 500;
}

/**
 * Chama a Homefin com autenticação, timeout, repetição limitada e log mascarado.
 *
 * A repetição usa espera exponencial com ruído. Sem o ruído, várias simulações
 * que falham juntas voltam todas ao mesmo tempo e derrubam o provedor de novo —
 * é o efeito manada que transforma uma instabilidade curta em indisponibilidade
 * longa.
 */
export async function chamarHomefin<T>(
  endpoint: string,
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE',
  corpo?: unknown,
  aoRegistrar?: (registro: RegistroDaChamada) => void | Promise<void>,
): Promise<T> {
  const config = servidor().homefin;
  if (!config) throw new HomefinNaoConfigurada();

  const url = `${config.urlBase.replace(/\/$/, '')}${endpoint}`;
  let ultimoErro: HomefinErro | null = null;

  for (let tentativa = 1; tentativa <= TENTATIVAS_MAXIMAS; tentativa++) {
    const inicio = Date.now();
    let status: number | null = null;
    let recebido: unknown = null;
    let mensagemDeErro: string | null = null;

    try {
      const token = await obterToken();

      const resposta = await fetch(url, {
        method: metodo,
        headers: {
          authorization: `Bearer ${token.jwt}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        cache: 'no-store',
        // Banco demora. 45s é generoso e ainda impede a requisição de ficar
        // pendurada segurando uma vaga da fila para sempre.
        signal: AbortSignal.timeout(45_000),
      });

      status = resposta.status;
      const texto = await resposta.text();
      recebido = texto ? safeJson(texto) : null;

      if (resposta.ok) {
        await aoRegistrar?.({
          endpoint,
          metodo,
          statusHttp: status,
          duracaoMs: Date.now() - inicio,
          enviado: mascararParaLog(corpo),
          recebido: resumirResposta(true, recebido),
          erro: null,
        });
        return recebido as T;
      }

      // 401 costuma ser token vencido antes da hora: descarta e tenta de novo.
      if (status === 401 && tentativa < TENTATIVAS_MAXIMAS) {
        tokenAtual = null;
      }

      const dados = recebido as { message?: string; code?: string } | null;
      mensagemDeErro = dados?.message ?? `A Homefin respondeu ${status}.`;
      ultimoErro = new HomefinErro(
        mensagemParaOCorretor(mensagemDeErro),
        status,
        endpoint,
        valeRepetir(status),
      );
    } catch (erro) {
      mensagemDeErro = erro instanceof Error ? erro.message : String(erro);
      ultimoErro = new HomefinErro(
        erro instanceof HomefinNaoConfigurada
          ? erro.message
          : 'A Homefin não respondeu a tempo. Tente de novo em alguns instantes.',
        undefined,
        endpoint,
        !(erro instanceof HomefinNaoConfigurada),
      );
      if (erro instanceof HomefinNaoConfigurada) throw erro;
    }

    await aoRegistrar?.({
      endpoint,
      metodo,
      statusHttp: status,
      duracaoMs: Date.now() - inicio,
      enviado: mascararParaLog(corpo),
      recebido: resumirResposta(false, recebido),
      erro: mensagemDeErro,
    });

    const ultima = tentativa === TENTATIVAS_MAXIMAS;
    if (ultima || !ultimoErro?.tentarDeNovo) break;

    // 400ms, 800ms, com até 50% de ruído para não voltarem todas juntas.
    const espera = 400 * 2 ** (tentativa - 1) * (1 + Math.random() * 0.5);
    await new Promise((r) => setTimeout(r, espera));
  }

  throw ultimoErro ?? new HomefinErro('Falha desconhecida ao falar com a Homefin.');
}

function safeJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    // Provedor devolveu HTML de erro ou texto puro. Guardar o começo basta para
    // diagnosticar sem encher o log.
    return { textoBruto: texto.slice(0, 500) };
  }
}

// ---------------------------------------------------------------------------
// DOMÍNIOS
// ---------------------------------------------------------------------------

export interface BancoDaHomefin {
  idBanco: number;
  nomeBanco: string;
  codigoBanco?: string;
}

/** Bancos disponíveis, para montar o seletor da simulação. */
export async function listarBancos(): Promise<BancoDaHomefin[]> {
  const resposta = await chamarHomefin<unknown>('/dominios/bancos', 'GET');
  const lista = Array.isArray(resposta)
    ? resposta
    : ((resposta as { bancos?: unknown[] })?.bancos ?? []);

  return (lista as Record<string, unknown>[])
    .map((b) => ({
      idBanco: Number(b.idBanco ?? b.id ?? 0),
      nomeBanco: String(b.nomeBanco ?? b.nome ?? ''),
      codigoBanco: b.codigoBanco ? String(b.codigoBanco) : undefined,
    }))
    .filter((b) => b.idBanco > 0 && b.nomeBanco !== '');
}

/** Operações disponíveis (aquisição, portabilidade e afins). */
export async function listarOperacoes(): Promise<{ idOperacao: string; nome: string }[]> {
  const resposta = await chamarHomefin<unknown>('/dominios/operacoes', 'GET');
  const lista = Array.isArray(resposta)
    ? resposta
    : ((resposta as { operacoes?: unknown[] })?.operacoes ?? []);

  return (lista as Record<string, unknown>[])
    .map((o) => ({
      idOperacao: String(o.idOperacao ?? o.id ?? ''),
      nome: String(o.nome ?? o.descricao ?? ''),
    }))
    .filter((o) => o.idOperacao !== '');
}

/**
 * Situação da simulação, conforme o contrato.
 *
 * Traduzida para português porque estes códigos aparecem na tela do corretor, e
 * "P" não significa nada para quem está atendendo um cliente.
 */
export const SITUACAO_DA_SIMULACAO = {
  S: { rotulo: 'Sem integração', tom: 'neutro' },
  P: { rotulo: 'Erro ao enviar ao banco', tom: 'perigo' },
  N: { rotulo: 'Em análise de crédito', tom: 'atencao' },
  A: { rotulo: 'Crédito aprovado', tom: 'sucesso' },
  R: { rotulo: 'Crédito recusado', tom: 'perigo' },
} as const;

export type CodigoDeSituacao = keyof typeof SITUACAO_DA_SIMULACAO;

export function traduzirSituacao(codigo: string | null | undefined) {
  const chave = (codigo ?? 'S') as CodigoDeSituacao;
  return SITUACAO_DA_SIMULACAO[chave] ?? SITUACAO_DA_SIMULACAO.S;
}

/** Limpa o cache do token. Para teste e para forçar reautenticação. */
export function esquecerToken(): void {
  tokenAtual = null;
}
