'use server';

import { redirect } from 'next/navigation';

import { clienteServidor, clienteServico } from '@/lib/supabase/servidor';
import { registrarAuditoria } from '@/server/auditoria';
import { hashDoToken } from '@/server/convite-token';

export interface EstadoDoAceite {
  erro?: string;
}

/**
 * Aceitar um convite.
 *
 * É a operação mais delicada do módulo de equipe: ela dá a alguém acesso aos
 * dados de uma imobiliária inteira. Cinco conferências, e nenhuma é redundante:
 *
 *   1. O token existe (pelo HASH — o banco nunca viu o token).
 *   2. Não foi revogado.
 *   3. Não expirou.
 *   4. Não foi aceito antes.
 *   5. O E-MAIL DE QUEM ESTÁ ACEITANDO BATE com o do convite.
 *
 * A quinta é a que costuma faltar. Sem ela, um link encaminhado por engano —
 * ou vazado de um grupo de WhatsApp — dá acesso a quem o receber, e não a quem
 * ele era destinado.
 *
 * A LEITURA DO CONVITE USA A CHAVE DE SERVIÇO porque quem aceita ainda NÃO é
 * membro da conta: a RLS de `convites` exige `pode_ler_tenant`, que ele ainda
 * não satisfaz. É o caso clássico em que a autorização não pode vir do banco,
 * porque o vínculo que ela conferiria é justamente o que está sendo criado.
 */
export async function aceitarConvite(
  _anterior: EstadoDoAceite,
  formulario: FormData,
): Promise<EstadoDoAceite> {
  const token = String(formulario.get('token') ?? '').trim();
  if (!token) return { erro: 'Link de convite inválido.' };

  // Precisa estar logado: o convite liga uma CONTA DE USUÁRIO a uma conta de
  // imobiliária, e sem usuário não há o que ligar.
  const supabase = await clienteServidor();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user?.email) {
    return { erro: 'Entre na sua conta para aceitar o convite.' };
  }

  const servico = clienteServico(
    'aceitar convite: quem aceita ainda nao e membro, entao a RLS nao o alcanca',
  );

  const { data: convite } = await servico
    .from('convites')
    .select('id, tenant_id, email, papel, expira_em, aceito_em, revogado_em, tenants(nome)')
    .eq('token_hash', hashDoToken(token))
    .maybeSingle();

  // Mensagem genérica de propósito: distinguir "não existe" de "expirado"
  // contaria a quem estivesse testando tokens que ele acertou um.
  if (!convite) return { erro: 'Convite inválido ou já utilizado.' };

  if (convite.revogado_em) {
    return { erro: 'Este convite foi cancelado. Peça um novo a quem administra a conta.' };
  }

  if (convite.aceito_em) {
    return { erro: 'Este convite já foi utilizado.' };
  }

  if (new Date(convite.expira_em) < new Date()) {
    return { erro: 'Este convite expirou. Peça um novo a quem administra a conta.' };
  }

  // A conferência que costuma faltar.
  if (convite.email !== auth.user.email.toLowerCase()) {
    return {
      erro:
        `Este convite foi feito para ${convite.email}, e você está usando ` +
        `${auth.user.email}. Entre com a conta certa ou peça um convite novo.`,
    };
  }

  // O vínculo e a marca de aceite são duas escritas. Se a segunda falhar, o
  // convite continua pendente e pode ser usado de novo — que é melhor do que o
  // contrário, em que o convite queimaria sem dar acesso.
  const { error: erroDoMembro } = await servico.from('membros').insert({
    tenant_id: convite.tenant_id,
    usuario_id: auth.user.id,
    papel: convite.papel,
    situacao: 'ativo',
  });

  if (erroDoMembro) {
    if (erroDoMembro.hint === 'limite_plano_usuarios') {
      return {
        erro:
          'A conta atingiu o limite de usuários do plano. Avise quem te convidou: ' +
          'é preciso liberar uma vaga ou aumentar o plano.',
      };
    }
    if (erroDoMembro.code === '23505') {
      return { erro: 'Você já faz parte desta equipe.' };
    }
    return { erro: 'Não foi possível concluir. Tente de novo em instantes.' };
  }

  await servico
    .from('convites')
    .update({ aceito_em: new Date().toISOString() })
    .eq('id', convite.id);

  await registrarAuditoria({
    tenantId: convite.tenant_id,
    autorId: auth.user.id,
    acao: 'aceitar_convite',
    entidade: 'membro',
    depois: { email: convite.email, papel: convite.papel },
  });

  redirect('/inicio');
}
