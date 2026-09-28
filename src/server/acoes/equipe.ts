'use server';

import { revalidatePath } from 'next/cache';

import { clienteServidor } from '@/lib/supabase/servidor';
import { exigirPermissao, SemPermissao } from '@/server/sessao';
import { registrarAuditoria } from '@/server/auditoria';
import { lerFormularioDeConvite, linkDoConvite } from '@/dominio/convite';
import { gerarConvite } from '@/server/convite-token';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { publico } from '@/lib/ambiente';
import type { Papel } from '@/lib/supabase/tipos-banco';

export interface EstadoDoConvite {
  erro?: string;
  campos?: Record<string, string>;
  /**
   * O link gerado, mostrado UMA VEZ.
   *
   * Ele não volta depois: o banco guarda só o hash, e reconstruir o token é
   * impossível por desenho. Quem fechar a tela sem copiar precisa revogar e
   * convidar de novo — o que é chato, e é por isso que a tela insiste tanto
   * para ele copiar agora.
   */
  link?: string;
  emailConvidado?: string;
}

export async function convidar(
  _anterior: EstadoDoConvite,
  formulario: FormData,
): Promise<EstadoDoConvite> {
  let sessao;
  try {
    sessao = await exigirPermissao('equipe.administrar');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: 'Seu papel não permite convidar pessoas para a equipe.' };
    }
    throw erro;
  }

  const analise = lerFormularioDeConvite(formulario);
  if (!analise.success) {
    const campos: Record<string, string> = {};
    for (const problema of analise.error.issues) {
      const campo = String(problema.path[0] ?? 'email');
      campos[campo] ??= problema.message;
    }
    return { erro: 'Confira os campos destacados.', campos };
  }

  const { email, papel } = analise.data;
  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  // Já é da equipe? Convidar de novo geraria um link que, ao ser aceito,
  // esbarraria na chave única de `membros` com um erro sem explicação.
  const { data: perfilExistente } = await supabase
    .from('perfis')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (perfilExistente) {
    const { data: jaMembro } = await supabase
      .from('membros')
      .select('id, situacao')
      .eq('tenant_id', tenantId)
      .eq('usuario_id', perfilExistente.id)
      .maybeSingle();

    if (jaMembro) {
      return {
        erro:
          jaMembro.situacao === 'ativo'
            ? 'Essa pessoa já faz parte da equipe.'
            : 'Essa pessoa já esteve na equipe. Reative o acesso dela na lista abaixo.',
        campos: { email: 'Já cadastrado nesta conta.' },
      };
    }
  }

  const { token, tokenHash, expiraEm } = gerarConvite();

  const { error } = await supabase.from('convites').insert({
    tenant_id: tenantId,
    email,
    papel,
    token_hash: tokenHash,
    convidado_por: sessao.usuarioId,
    expira_em: expiraEm.toISOString(),
  });

  if (error) {
    // Índice único parcial: um convite pendente por e-mail e conta.
    if (error.code === '23505') {
      return {
        erro: 'Já existe um convite pendente para esse e-mail. Revogue o anterior para gerar outro.',
        campos: { email: 'Convite pendente.' },
      };
    }
    return { erro: 'Não foi possível criar o convite. Tente de novo em instantes.' };
  }

  await registrarAuditoria({
    tenantId,
    autorId: sessao.usuarioId,
    acao: 'convidar',
    entidade: 'membro',
    // O e-mail entra no log porque ele É o objeto da ação: sem ele, o registro
    // diria que alguém convidou alguém, o que não serve para nada.
    depois: { email, papel },
  });

  revalidatePath('/equipe');

  return { link: linkDoConvite(publico.urlApp, token), emailConvidado: email };
}

export async function revogarConvite(conviteId: string): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('equipe.administrar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite revogar convites.' };
    throw erro;
  }

  const supabase = await clienteServidor();

  const { error } = await supabase
    .from('convites')
    .update({ revogado_em: new Date().toISOString() })
    .eq('id', conviteId)
    .eq('tenant_id', sessao.atual.tenant.id)
    .is('aceito_em', null);

  if (error) return { erro: 'Não foi possível revogar o convite.' };

  await registrarAuditoria({
    tenantId: sessao.atual.tenant.id,
    autorId: sessao.usuarioId,
    acao: 'revogar_convite',
    entidade: 'membro',
    entidadeId: conviteId,
  });

  revalidatePath('/equipe');
  return {};
}

export async function alterarPapel(
  membroId: string,
  novoPapel: Papel,
): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('equipe.administrar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite alterar papéis.' };
    throw erro;
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const { data: membro } = await supabase
    .from('membros')
    .select('usuario_id, papel')
    .eq('id', membroId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!membro) return { erro: 'Membro não encontrado.' };

  // O proprietário não muda de papel por aqui. Transferir a titularidade é
  // outra operação, com outras consequências — quem responde pela cobrança e
  // pelos dados perante a LGPD. Um menu de "mudar papel" não é lugar para isso.
  if (membro.papel === 'proprietario') {
    return { erro: 'O papel do proprietário não muda por aqui. Transferir a conta é outra ação.' };
  }

  const { error } = await supabase
    .from('membros')
    .update({ papel: novoPapel })
    .eq('id', membroId)
    .eq('tenant_id', tenantId);

  if (error) return { erro: 'Não foi possível alterar o papel.' };

  await registrarAuditoria({
    tenantId,
    autorId: sessao.usuarioId,
    acao: 'alterar_papel',
    entidade: 'membro',
    entidadeId: membroId,
    antes: { papel: membro.papel },
    depois: { papel: novoPapel },
  });

  revalidatePath('/equipe');
  return {};
}

export async function alterarSituacao(
  membroId: string,
  ativar: boolean,
): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('equipe.administrar');
  } catch (erro) {
    if (erro instanceof SemPermissao) return { erro: 'Seu papel não permite alterar acessos.' };
    throw erro;
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const { data: membro } = await supabase
    .from('membros')
    .select('usuario_id, papel')
    .eq('id', membroId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!membro) return { erro: 'Membro não encontrado.' };

  if (membro.papel === 'proprietario') {
    return { erro: 'O proprietário não pode ter o próprio acesso desativado.' };
  }

  // Desativar a si mesmo tranca a pessoa para fora da conta. Se ela for a
  // única administradora, tranca a conta inteira — e recuperar isso exige
  // suporte mexendo no banco.
  if (membro.usuario_id === sessao.usuarioId) {
    return { erro: 'Você não pode desativar o próprio acesso.' };
  }

  const { error } = await supabase
    .from('membros')
    // `suspenso`, e não `removido`: suspender tira o acesso e preserva o
    // vínculo, então o histórico continua apontando para a pessoa certa e
    // reativar é um clique. `removido` é para quem saiu de vez.
    .update({ situacao: ativar ? 'ativo' : 'suspenso' })
    .eq('id', membroId)
    .eq('tenant_id', tenantId);

  if (error) {
    if (error.hint === 'limite_plano_usuarios') {
      return {
        erro:
          'O plano não tem vaga para mais um usuário ativo. Desative outra pessoa ou aumente o plano.',
      };
    }
    return { erro: 'Não foi possível alterar o acesso.' };
  }

  await registrarAuditoria({
    tenantId,
    autorId: sessao.usuarioId,
    acao: ativar ? 'reativar' : 'desativar',
    entidade: 'membro',
    entidadeId: membroId,
    depois: { papel: ROTULO_PAPEL[membro.papel], situacao: ativar ? 'ativo' : 'suspenso' },
  });

  revalidatePath('/equipe');
  return {};
}
