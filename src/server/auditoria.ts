import 'server-only';

import { headers } from 'next/headers';

import { clienteServico } from '@/lib/supabase/servidor';
import { documentoParaLog } from '@/lib/privacidade/documentos';
import type { Json, Papel, ResultadoAuditoria } from '@/lib/supabase/tipos-banco';

/**
 * Registro de auditoria (seção 18).
 *
 * Grava com a CHAVE DE SERVIÇO porque o cliente não tem — e não pode ter —
 * permissão de inserir em `auditoria`. Se tivesse, poderia forjar registro, o
 * que é pior do que não ter auditoria nenhuma: um log que pode ser plantado não
 * serve de prova de nada.
 *
 * A tabela não tem política de UPDATE nem de DELETE, então nem o proprietário da
 * conta apaga o que foi registrado aqui. Verificado em
 * supabase/tests/01_isolamento_entre_tenants.sql.
 */

export interface EntradaDeAuditoria {
  /** Verbo curto: criar, editar, excluir, exportar, revelar_cpf, consultar_credito. */
  acao: string;
  /** Tabela ou conceito afetado: pessoa, negocio, simulacao, sessao. */
  entidade: string;
  entidadeId?: string | null;
  tenantId?: string | null;
  autorId?: string | null;
  autorEmail?: string | null;
  autorPapel?: Papel | null;
  resultado?: ResultadoAuditoria;
  /**
   * Motivo declarado. Obrigatório para consulta de crédito (seção 11) e para
   * acesso administrativo a tenant de terceiro (seção 17).
   */
  justificativa?: string | null;
  ip?: string | null;
  agenteUsuario?: string | null;
  antes?: Json | null;
  depois?: Json | null;
  metadados?: Record<string, unknown>;
}

/**
 * Campos que NUNCA entram na auditoria em texto claro.
 *
 * A auditoria registra QUE o CPF mudou, não qual é o CPF. Ela é lida por
 * administrador, exportada em investigação e guardada por anos — copiar dado
 * pessoal para dentro dela multiplica a superfície de vazamento em vez de
 * proteger.
 */
const CAMPOS_SENSIVEIS = new Set([
  'cpf',
  'cpf_cnpj',
  'cpfConjuge',
  'cpf_conjuge',
  'senha',
  'password',
  'token',
  'token_hash',
  'secret',
  'segredo',
  'chave',
  'api_key',
  'authorization',
  'jwt',
  'refresh_token',
]);

/** Campos que ficam mascarados em vez de removidos, para dar contexto. */
const CAMPOS_MASCARADOS = new Set(['email', 'telefone', 'celular', 'numero']);

function mascararValor(chave: string, valor: unknown): unknown {
  if (valor === null || valor === undefined) return valor;

  const nome = chave.toLowerCase();

  if (CAMPOS_SENSIVEIS.has(nome)) {
    // Documento vira marca correlacionável, sem os dígitos.
    if (nome.includes('cpf') || nome.includes('cnpj')) {
      return documentoParaLog(String(valor));
    }
    return '[oculto]';
  }

  if (CAMPOS_MASCARADOS.has(nome)) {
    const texto = String(valor);
    if (texto.includes('@')) {
      const arroba = texto.indexOf('@');
      return `${texto.slice(0, Math.min(2, arroba))}***${texto.slice(arroba)}`;
    }
    return texto.length > 4 ? `***${texto.slice(-2)}` : '***';
  }

  return valor;
}

/** Aplica o mascaramento em profundidade. */
function limpar(valor: unknown, profundidade = 0): unknown {
  if (profundidade > 6) return '[profundo]';
  if (valor === null || typeof valor !== 'object') return valor;

  if (Array.isArray(valor)) {
    return valor.slice(0, 50).map((v) => limpar(v, profundidade + 1));
  }

  const saida: Record<string, unknown> = {};
  for (const [chave, v] of Object.entries(valor as Record<string, unknown>)) {
    const mascarado = mascararValor(chave, v);
    saida[chave] = mascarado === v ? limpar(v, profundidade + 1) : mascarado;
  }
  return saida;
}

/**
 * Grava a entrada.
 *
 * NUNCA lança. Auditoria que derruba a operação principal é pior que auditoria
 * perdida: o corretor não consegue salvar o cliente porque o log falhou. A falha
 * vai para o console de erro, onde o monitoramento a captura.
 *
 * Esse é um dos raros casos em que engolir exceção é a decisão certa, e por isso
 * está explicado.
 */
export async function registrarAuditoria(entrada: EntradaDeAuditoria): Promise<void> {
  try {
    let ip = entrada.ip ?? null;
    let agente = entrada.agenteUsuario ?? null;

    if (ip === null || agente === null) {
      try {
        const cabecalhos = await headers();
        ip ??= cabecalhos.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
        agente ??= cabecalhos.get('user-agent');
      } catch {
        // Fora de contexto de requisição (job de fila). Segue sem origem.
      }
    }

    const supabase = clienteServico('gravar auditoria: o cliente nao pode inserir log');

    const { error } = await supabase.from('auditoria').insert({
      acao: entrada.acao,
      entidade: entrada.entidade,
      entidade_id: entrada.entidadeId ?? null,
      tenant_id: entrada.tenantId ?? null,
      autor_id: entrada.autorId ?? null,
      autor_email: entrada.autorEmail ?? null,
      autor_papel: entrada.autorPapel ?? null,
      resultado: entrada.resultado ?? 'permitido',
      justificativa: entrada.justificativa ?? null,
      ip,
      agente_usuario: agente,
      antes: (limpar(entrada.antes) ?? null) as Json | null,
      depois: (limpar(entrada.depois) ?? null) as Json | null,
      metadados: (limpar(entrada.metadados ?? {}) ?? {}) as Json,
    });

    if (error) {
      console.error('[auditoria] falhou ao gravar', {
        acao: entrada.acao,
        entidade: entrada.entidade,
        erro: error.message,
      });
    }
  } catch (erro) {
    console.error('[auditoria] excecao ao gravar', {
      acao: entrada.acao,
      erro: erro instanceof Error ? erro.message : String(erro),
    });
  }
}
