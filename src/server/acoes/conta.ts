'use server';

import { revalidatePath } from 'next/cache';

import { clienteServidor } from '@/lib/supabase/servidor';
import { exigirPermissao, SemPermissao } from '@/server/sessao';
import { registrarAuditoria } from '@/server/auditoria';
import { lerFormularioDaConta } from '@/dominio/conta';
import { documentoParaLog } from '@/lib/privacidade/documentos';

export interface EstadoDaConta {
  erro?: string;
  sucesso?: string;
  campos?: Record<string, string>;
}

export async function salvarConta(
  _anterior: EstadoDaConta,
  formulario: FormData,
): Promise<EstadoDaConta> {
  let sessao;
  try {
    sessao = await exigirPermissao('configuracoes.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: 'Seu papel não permite alterar as configurações da conta.' };
    }
    throw erro;
  }

  const analise = lerFormularioDaConta(formulario);
  if (!analise.success) {
    const campos: Record<string, string> = {};
    for (const problema of analise.error.issues) {
      const campo = String(problema.path[0] ?? 'nome');
      campos[campo] ??= problema.message;
    }
    return { erro: 'Confira os campos destacados.', campos };
  }

  const dados = analise.data;
  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  // O estado ANTERIOR é lido para a auditoria. Um log que só diz o valor novo
  // não responde à pergunta que se faz depois: "o que mudou?".
  const { data: antes } = await supabase
    .from('tenants')
    .select('nome, cpf_cnpj, creci, fuso_horario')
    .eq('id', tenantId)
    .maybeSingle();

  const { error } = await supabase
    .from('tenants')
    .update({
      nome: dados.nome,
      cpf_cnpj: dados.cpfCnpj ?? null,
      creci: dados.creci ?? null,
      fuso_horario: dados.fusoHorario,
    })
    .eq('id', tenantId);

  if (error) {
    if (error.code === '23505') {
      return {
        erro: 'Esse CPF ou CNPJ já está cadastrado em outra conta.',
        campos: { cpfCnpj: 'Já em uso.' },
      };
    }
    return { erro: 'Não foi possível salvar. Tente de novo em instantes.' };
  }

  await registrarAuditoria({
    tenantId,
    autorId: sessao.usuarioId,
    acao: 'editar',
    entidade: 'conta',
    entidadeId: tenantId,
    // O documento vai MASCARADO no log, dos dois lados. O registro precisa
    // provar que o campo mudou, não repetir o número em texto claro.
    antes: antes
      ? {
          nome: antes.nome,
          documento: antes.cpf_cnpj ? documentoParaLog(antes.cpf_cnpj) : null,
          creci: antes.creci,
          fuso: antes.fuso_horario,
        }
      : null,
    depois: {
      nome: dados.nome,
      documento: dados.cpfCnpj ? documentoParaLog(dados.cpfCnpj) : null,
      creci: dados.creci,
      fuso: dados.fusoHorario,
    },
  });

  revalidatePath('/configuracoes');
  // O nome da conta aparece no cabeçalho de todas as telas.
  revalidatePath('/', 'layout');

  return { sucesso: 'Configurações salvas.' };
}
