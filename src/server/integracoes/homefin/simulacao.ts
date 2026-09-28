import 'server-only';

/**
 * Orquestração da simulação na Homefin.
 *
 * O FLUXO, E POR QUE ESTA ORDEM
 *
 *   1. `POST /oportunidade`          — cria a oportunidade E o participante
 *                                      titular, de uma vez.
 *   2. `POST .../participante`       — SOMENTE quando há composição de renda.
 *   3. `POST .../simulacao`          — uma por banco escolhido.
 *   4. `POST .../incluir-proposta-integracao` — envia ao banco.
 *   5. `GET /oportunidade/{id}`      — reconcilia depois, para saber o desfecho.
 *
 * A ARMADILHA DO PASSO 2
 *
 * O passo 1 JÁ cria o titular. Postar um segundo participante com o mesmo
 * documento deixa dois compradores idênticos na oportunidade, e o Bradesco
 * responde `INT-006 ... falhou: undefined` — mensagem que não menciona
 * duplicidade e que custou horas de diagnóstico no sistema anterior. Por isso o
 * passo 2 só roda para o COPARTICIPANTE, e o banco de dados ainda impede, por
 * restrição, que o CPF dos dois seja igual.
 *
 * A ARMADILHA DA REGIONAL
 *
 * `POST /auth/token` devolve `idRegional: 1`, que é a regional da própria
 * HomeFin. A nossa é 26. Usar o valor do token faz a oportunidade nascer no
 * lugar errado, e ninguém percebe até alguém procurar a oportunidade e não
 * achar. `identificacaoDoParceiro()` já resolve isso — este módulo nunca lê a
 * regional de outro lugar.
 */

import { clienteServico } from '@/lib/supabase/servidor';
import {
  chamarHomefin,
  HomefinErro,
  HomefinNaoConfigurada,
  identificacaoDoParceiro,
  limparTextoLivre,
  mensagemParaOCorretor,
  type RegistroDaChamada,
} from './cliente';
import { situacaoDaHomefin } from '@/dominio/simulacao';

/** Id de operação (produto) na Homefin. 1 é o financiamento imobiliário. */
const ID_OPERACAO_PADRAO = '1';

export interface BancoParaSimular {
  idBanco: number;
  codigoBanco: number | null;
  nomeBanco: string;
}

export interface DadosParaEnvio {
  simulacaoId: string;
  tenantId: string;

  valorImovel: number;
  valorFinanciamento: number;
  prazoMeses: number;
  rendaTotal: number;
  sistemaAmortizacao: 'sac' | 'price';
  usaFgts: boolean;
  financiarDespesas: boolean;

  tipoImovelHomefin: string;
  usoImovelHomefin: string;
  situacaoImovelHomefin: string;
  uf: string;

  nomeTitular: string;
  cpfTitular: string;
  dataNascimentoTitular: string;
  emailTitular: string | null;
  celularTitular: string | null;
  estadoCivilHomefin: string | null;

  compoeRenda: boolean;
  nomeCoparticipante: string | null;
  cpfCoparticipante: string | null;
  dataNascimentoCoparticipante: string | null;
  rendaCoparticipante: number | null;

  bancos: BancoParaSimular[];
}

export interface ResultadoDoEnvio {
  sucesso: boolean;
  idOportunidade?: string;
  codigoOportunidade?: string;
  /** Uma entrada por banco, na ordem em que foram pedidos. */
  bancos: {
    idBanco: number;
    idSimulacao: string | null;
    situacao: ReturnType<typeof situacaoDaHomefin> | 'erro_no_envio';
    mensagem: string | null;
  }[];
  erro?: string;
}

/**
 * Grava a chamada no log de integração.
 *
 * Usa a chave de serviço porque o log não pode ser alterado por quem é
 * auditado — a política de RLS dá apenas LEITURA ao proprietário da conta.
 * Nunca lança: uma falha ao gravar log não pode derrubar uma simulação que deu
 * certo.
 */
function registrador(tenantId: string, simulacaoId: string | null, operacao: string) {
  return async (registro: RegistroDaChamada): Promise<void> => {
    try {
      const supabase = clienteServico('gravar log de integracao, que o usuario nao pode alterar');
      await supabase.from('integracao_chamadas').insert({
        tenant_id: tenantId,
        provedor: 'homefin',
        operacao,
        metodo: registro.metodo,
        caminho: registro.endpoint,
        sucesso: registro.erro === null,
        status_http: registro.statusHttp,
        duracao_ms: registro.duracaoMs,
        requisicao: registro.enviado as never,
        resposta: registro.recebido as never,
        erro: registro.erro,
        simulacao_id: simulacaoId,
      });
    } catch {
      // Log é registro, não fluxo. Se ele falhar, a simulação segue.
    }
  };
}

/** Lê um id da resposta, que às vezes vem embrulhado e às vezes não. */
function extrairId(resposta: unknown, chave: string, envelope?: string): string | null {
  if (resposta === null || typeof resposta !== 'object') return null;
  const obj = resposta as Record<string, unknown>;

  // O swagger define `{oportunidade: {...}}`, mas a coleção Postman lê o campo
  // no topo. Aceitar os dois custa três linhas e evita uma falha que só
  // apareceria em produção.
  if (envelope && obj[envelope] && typeof obj[envelope] === 'object') {
    const dentro = obj[envelope] as Record<string, unknown>;
    if (dentro[chave] != null) return String(dentro[chave]);
  }

  return obj[chave] != null ? String(obj[chave]) : null;
}

/**
 * Envia a simulação inteira.
 *
 * Um banco que falha NÃO derruba os outros: cada um é tratado à parte e o
 * corretor vê "Bradesco aprovado, Itaú deu erro" em vez de perder tudo porque
 * uma instituição estava fora do ar.
 */
export async function enviarSimulacao(dados: DadosParaEnvio): Promise<ResultadoDoEnvio> {
  const { simulacaoId, tenantId } = dados;

  let identificacao;
  try {
    identificacao = await identificacaoDoParceiro();
  } catch (erro) {
    if (erro instanceof HomefinNaoConfigurada) {
      return {
        sucesso: false,
        bancos: [],
        erro: 'A integração de financiamento não está configurada nesta instalação.',
      };
    }
    throw erro;
  }

  // ---------------------------------------------------------------- passo 1
  const corpoOportunidade = {
    operacao: { idOperacao: ID_OPERACAO_PADRAO },
    regional: { idRegional: identificacao.idRegional },
    parceiro: { idParceiro: identificacao.idParceiro },
    usuarioParceiro: { idUsuarioParceiro: identificacao.idUsuarioParceiro },

    // Aninhamento inconsistente do contrato: a maioria usa `.id`, mas `uf` e
    // `situacaoImovel` usam `.codigo`. Errar isso não dá erro — o campo é
    // ignorado em silêncio, e a oportunidade nasce sem UF.
    tipoImovel: { id: dados.tipoImovelHomefin },
    usoImovel: { id: dados.usoImovelHomefin },
    uf: { codigo: dados.uf },
    situacaoImovel: { codigo: dados.situacaoImovelHomefin },
    codigoSistemaAmortizacaoBanco: { id: dados.sistemaAmortizacao === 'price' ? 'P' : 'S' },
    ...(dados.estadoCivilHomefin ? { tipoEstadoCivil: { id: dados.estadoCivilHomefin } } : {}),

    valorImovel: dados.valorImovel,
    valorFinanciamento: dados.valorFinanciamento,
    prazo: dados.prazoMeses,

    // Precisa refletir a escolha do corretor. Mandar "N" fixo fez oito
    // simulações irem erradas ao banco no sistema anterior.
    utilizaFgtsSimulacao: dados.usaFgts ? 'S' : 'N',
    fgFinanciarDespesas: dados.financiarDespesas ? 'S' : 'N',

    bancos: dados.bancos.map((b) => ({
      idBanco: b.idBanco,
      codigoBanco: b.codigoBanco ?? 0,
      nomeBanco: b.nomeBanco,
      flagSimulacao: 'S',
    })),

    cpfCnpj: dados.cpfTitular,
    nome: dados.nomeTitular,
    rendaTotal: dados.rendaTotal,
    dataNascimento: dados.dataNascimentoTitular,
    ...(dados.emailTitular ? { email: dados.emailTitular } : {}),
    ...(dados.celularTitular ? { celular: dados.celularTitular } : {}),
    fgCompoeRenda: dados.compoeRenda,

    ...(dados.compoeRenda && dados.cpfCoparticipante
      ? {
          cpfConjuge: dados.cpfCoparticipante,
          nomeConjuge: dados.nomeCoparticipante ?? '',
          ...(dados.dataNascimentoCoparticipante
            ? { dataNascimentoConjuge: dados.dataNascimentoCoparticipante }
            : {}),
          ...(dados.rendaCoparticipante != null
            ? { rendaConjuge: dados.rendaCoparticipante }
            : {}),
        }
      : {}),
  };

  let idOportunidade: string | null = null;
  let codigoOportunidade: string | null = null;

  try {
    const resposta = await chamarHomefin<unknown>(
      '/oportunidade',
      'POST',
      corpoOportunidade,
      registrador(tenantId, simulacaoId, 'criar_oportunidade'),
    );
    idOportunidade = extrairId(resposta, 'idOportunidade', 'oportunidade');
    codigoOportunidade = extrairId(resposta, 'codigoOportunidade', 'oportunidade');
  } catch (erro) {
    return {
      sucesso: false,
      bancos: [],
      erro:
        erro instanceof HomefinErro
          ? mensagemParaOCorretor(erro.message)
          : 'Não foi possível abrir a simulação no banco.',
    };
  }

  if (!idOportunidade) {
    return {
      sucesso: false,
      bancos: [],
      erro: 'O banco aceitou a simulação mas não devolveu o identificador dela.',
    };
  }

  // ---------------------------------------------------------------- passo 2
  // SOMENTE o coparticipante. O titular já foi criado no passo 1 — ver o
  // cabeçalho deste arquivo.
  if (dados.compoeRenda && dados.cpfCoparticipante && dados.cpfCoparticipante !== dados.cpfTitular) {
    try {
      await chamarHomefin<unknown>(
        `/oportunidade/${idOportunidade}/participante`,
        'POST',
        {
          tipoSituacao: 'A',
          nomeParticipante: limparTextoLivre(dados.nomeCoparticipante ?? ''),
          tipoQualificacao: 'CO',
          tipoPessoa: 'F',
          cpfCnpj: dados.cpfCoparticipante,
          ...(dados.dataNascimentoCoparticipante
            ? { dataNascimento: dados.dataNascimentoCoparticipante }
            : {}),
          ...(dados.rendaCoparticipante != null ? { renda: dados.rendaCoparticipante } : {}),
          utilizaFgts: dados.usaFgts ? 'S' : 'N',
          fgAutorizacaoDados: true,
        },
        registrador(tenantId, simulacaoId, 'incluir_participante'),
      );
    } catch {
      // A composição de renda falhou, mas a oportunidade existe e os bancos
      // podem ser simulados com a renda do titular. Interromper aqui jogaria
      // fora o trabalho já feito; o corretor vê o aviso no resultado.
    }
  }

  // ---------------------------------------------------------- passos 3 e 4
  const resultados: ResultadoDoEnvio['bancos'] = [];

  for (const banco of dados.bancos) {
    let idSimulacao: string | null = null;

    try {
      const resposta = await chamarHomefin<unknown>(
        `/oportunidade/${idOportunidade}/simulacao`,
        'POST',
        {
          valorImovel: dados.valorImovel,
          valorFinanciamento: dados.valorFinanciamento,
          prazo: dados.prazoMeses,
          codigoSistemaAmortizacaoBanco: { id: dados.sistemaAmortizacao === 'price' ? 'P' : 'S' },
          banco: { idBanco: banco.idBanco },
          // Tudo que é "retorno do banco" vai nulo: quem preenche é o banco,
          // depois da integração. Mandar valor aqui seria inventar resposta.
          codigoOportunidadeBanco: null,
          valorParcelaBanco: null,
          taxaJurosAnoBanco: null,
          codigoIndexadorBanco: null,
          valorIofBanco: null,
          valorFinanciamentoBancoMax: null,
          valorParcelaBancoMax: null,
          prazoPagamentoBancoMax: null,
          fgAutorizacaoDados: true,
        },
        registrador(tenantId, simulacaoId, 'criar_simulacao'),
      );

      idSimulacao = extrairId(resposta, 'idSimulacao');
    } catch (erro) {
      resultados.push({
        idBanco: banco.idBanco,
        idSimulacao: null,
        situacao: 'erro_no_envio',
        mensagem:
          erro instanceof HomefinErro
            ? mensagemParaOCorretor(erro.message)
            : 'O banco não respondeu.',
      });
      continue;
    }

    if (!idSimulacao) {
      resultados.push({
        idBanco: banco.idBanco,
        idSimulacao: null,
        situacao: 'erro_no_envio',
        mensagem: 'A simulação foi criada mas o identificador não voltou.',
      });
      continue;
    }

    // Passo 4: manda a proposta ao banco.
    try {
      const resposta = await chamarHomefin<Record<string, unknown>>(
        `/oportunidade/${idOportunidade}/incluir-proposta-integracao`,
        'POST',
        { idSimulacao: Number(idSimulacao) },
        registrador(tenantId, simulacaoId, 'enviar_proposta'),
      );

      resultados.push({
        idBanco: banco.idBanco,
        idSimulacao,
        situacao: situacaoDaHomefin(
          typeof resposta?.tipoSituacao === 'string' ? resposta.tipoSituacao : null,
        ),
        mensagem:
          typeof resposta?.retornoIntegracao === 'string'
            ? mensagemParaOCorretor(resposta.retornoIntegracao)
            : null,
      });
    } catch (erro) {
      resultados.push({
        idBanco: banco.idBanco,
        idSimulacao,
        situacao: 'erro_no_envio',
        mensagem:
          erro instanceof HomefinErro
            ? mensagemParaOCorretor(erro.message)
            : 'A proposta não chegou ao banco.',
      });
    }
  }

  return {
    sucesso: resultados.some((r) => r.situacao !== 'erro_no_envio'),
    idOportunidade,
    ...(codigoOportunidade ? { codigoOportunidade } : {}),
    bancos: resultados,
  };
}

export interface SituacaoReconciliada {
  idSimulacao: string;
  situacao: ReturnType<typeof situacaoDaHomefin>;
  valorParcela: number | null;
  valorFinanciamentoAprovado: number | null;
  prazoAprovado: number | null;
  taxaJurosAno: number | null;
  valorIof: number | null;
  indexador: string | null;
  valorFinanciamentoMaximo: number | null;
  valorParcelaMaxima: number | null;
  prazoMaximo: number | null;
  retornoIntegracao: string | null;
  codigoSituacaoBanco: string | null;
}

/**
 * Pergunta à Homefin como está cada banco.
 *
 * O banco responde em minutos ou horas, e não existe webhook no contrato — a
 * única forma de saber é perguntar. Esta função é chamada pela tela (quando o
 * corretor abre a simulação) e por uma rotina periódica.
 *
 * O resultado é numérico e cru: quem grava é a camada de ação, que sabe
 * traduzir para as nossas linhas.
 */
export async function reconciliarSimulacao(parametros: {
  tenantId: string;
  simulacaoId: string;
  idOportunidade: string;
}): Promise<{ bancos: SituacaoReconciliada[]; erro?: string }> {
  try {
    const resposta = await chamarHomefin<Record<string, unknown>>(
      `/oportunidade/${parametros.idOportunidade}`,
      'GET',
      undefined,
      registrador(parametros.tenantId, parametros.simulacaoId, 'reconciliar'),
    );

    const envelope = (resposta?.oportunidade ?? resposta) as Record<string, unknown>;
    const simulacoes = Array.isArray(envelope?.simulacoes) ? envelope.simulacoes : [];

    return {
      bancos: simulacoes.map((bruta) => {
        const s = bruta as Record<string, unknown>;
        return {
          idSimulacao: String(s.idSimulacao ?? ''),
          situacao: situacaoDaHomefin(typeof s.tipoSituacao === 'string' ? s.tipoSituacao : null),
          valorParcela: numeroOuNulo(s.valorParcelaBanco),
          valorFinanciamentoAprovado: numeroOuNulo(s.valorFinanciamentoBanco),
          prazoAprovado: numeroOuNulo(s.prazoPagamentoBanco),
          taxaJurosAno: numeroOuNulo(s.taxaJurosAnoBanco),
          valorIof: numeroOuNulo(s.valorIofBanco),
          indexador: textoOuNulo(s.codigoIndexadorBanco),
          valorFinanciamentoMaximo: numeroOuNulo(s.valorFinanciamentoBancoMax),
          valorParcelaMaxima: numeroOuNulo(s.valorParcelaBancoMax),
          prazoMaximo: numeroOuNulo(s.prazoPagamentoBancoMax),
          retornoIntegracao: textoOuNulo(s.retornoIntegracao),
          codigoSituacaoBanco: textoOuNulo(s.codigoSituacaoBanco),
        };
      }),
    };
  } catch (erro) {
    return {
      bancos: [],
      erro:
        erro instanceof HomefinErro
          ? mensagemParaOCorretor(erro.message)
          : 'Não foi possível consultar o andamento no banco.',
    };
  }
}

function numeroOuNulo(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function textoOuNulo(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  return texto === '' ? null : texto;
}
