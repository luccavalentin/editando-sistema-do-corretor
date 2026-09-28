import type { Metadata } from 'next';

import { exigirSessao } from '@/server/sessao';
import { clienteServidor } from '@/lib/supabase/servidor';
import { EstadoSemPermissao } from '@/components/ui/estados';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { publico } from '@/lib/ambiente';
import { FormularioDaVitrine } from './formulario';

export const metadata: Metadata = { title: 'Meu portfólio' };

export default async function PaginaDoPortfolio() {
  const sessao = await exigirSessao('/portfolio');

  if (!sessao.pode('imoveis.publicar')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Portfólio público" />
      </div>
    );
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const [{ data: tenant }, { count }] = await Promise.all([
    supabase
      .from('tenants')
      .select(
        'nome, slug, portfolio_ativo, portfolio_titulo, portfolio_bio, portfolio_whatsapp, portfolio_email',
      )
      .eq('id', tenantId)
      .single(),
    supabase
      .from('imoveis')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('publicado_no_portfolio', true)
      .is('excluido_em', null),
  ]);

  /**
   * Sugestão de endereço a partir do nome da conta.
   *
   * O corretor não deveria ter que inventar um identificador de URL do nada. A
   * sugestão é só valor inicial — ele pode trocar, e a validação é a mesma.
   */
  const sugestao = (tenant?.nome ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const urlBase = publico.urlApp.replace(/^https?:\/\//, '');

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu portfólio</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          Sua página pública de imóveis. O link funciona no WhatsApp, no Instagram e no Google.
        </p>
      </div>

      <FormularioDaVitrine
        urlBase={urlBase}
        totalPublicados={count ?? 0}
        valores={{
          slug: tenant?.slug ?? sugestao,
          titulo: tenant?.portfolio_titulo ?? tenant?.nome ?? '',
          bio: tenant?.portfolio_bio ?? '',
          whatsapp: tenant?.portfolio_whatsapp ?? '',
          email: tenant?.portfolio_email ?? '',
          ativo: tenant?.portfolio_ativo ?? false,
        }}
      />
    </div>
  );
}
