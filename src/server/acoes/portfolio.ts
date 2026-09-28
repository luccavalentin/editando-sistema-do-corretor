'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { clienteServidor } from '@/lib/supabase/servidor';
import { exigirPermissao, SemPermissao } from '@/server/sessao';
import { registrarAuditoria } from '@/server/auditoria';
import { etiquetaDaVitrine } from '@/server/consultas/portfolio';
import { lerFormularioDaVitrine } from '@/dominio/portfolio';

/**
 * Configuração da vitrine pública.
 *
 * Ligar a vitrine é o ato que coloca o nome do corretor numa página indexável
 * pelo Google, com os imóveis, o preço e o contato dele. Por isso é decisão
 * explícita — `portfolio_ativo` nasce `false` no banco — e por isso ela é
 * auditada como qualquer operação sensível.
 */

const VIOLACAO_DE_UNICIDADE = '23505';
const VIOLACAO_DE_CHECK = '23514';

export interface EstadoDaVitrine {
  erro?: string;
  sucesso?: string;
  campos?: Record<string, string>;
}

export async function salvarVitrine(
  _anterior: EstadoDaVitrine,
  formulario: FormData,
): Promise<EstadoDaVitrine> {
  let sessao;
  try {
    // Publicar a vitrine é a mesma permissão de publicar um anúncio: quem pode
    // pôr um imóvel no ar pode pôr a própria página no ar.
    sessao = await exigirPermissao('imoveis.publicar');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: 'Seu papel não permite configurar o portfólio público.' };
    }
    throw erro;
  }

  const analise = lerFormularioDaVitrine(formulario);

  if (!analise.success) {
    const campos: Record<string, string> = {};
    for (const problema of analise.error.issues) {
      const campo = String(problema.path[0] ?? 'slug');
      campos[campo] ??= problema.message;
    }
    return { erro: 'Confira os campos destacados.', campos };
  }

  const dados = analise.data;
  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const { error } = await supabase
    .from('tenants')
    .update({
      slug: dados.slug,
      portfolio_titulo: dados.titulo,
      portfolio_bio: dados.bio ?? null,
      portfolio_whatsapp: dados.whatsapp ?? null,
      portfolio_email: dados.email ?? null,
      portfolio_ativo: dados.ativo,
    })
    .eq('id', tenantId);

  if (error) {
    if (error.code === VIOLACAO_DE_UNICIDADE) {
      return {
        erro: 'Esse endereço já está em uso por outro corretor.',
        campos: { slug: 'Escolha outro endereço.' },
      };
    }
    if (error.code === VIOLACAO_DE_CHECK) {
      return { erro: 'Para publicar a vitrine, preencha o endereço e o título.' };
    }
    return { erro: 'Não foi possível salvar. Tente de novo em instantes.' };
  }

  await registrarAuditoria({
    tenantId,
    autorId: sessao.usuarioId,
    acao: dados.ativo ? 'publicar' : 'despublicar',
    entidade: 'portfolio',
    entidadeId: tenantId,
    depois: { slug: dados.slug, ativo: dados.ativo },
  });

  // O gatilho da migração 0012 já ajustou a visibilidade dos imóveis; aqui só
  // se derruba o cache para que a mudança apareça na hora.
  revalidateTag(etiquetaDaVitrine(tenantId));
  revalidateTag('vitrine');
  revalidatePath('/portfolio');

  return {
    sucesso: dados.ativo
      ? 'Vitrine publicada. Seus anúncios já estão no ar.'
      : 'Vitrine salva. Ela continua fora do ar até você publicar.',
  };
}
