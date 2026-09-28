import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { clienteServidor } from '@/lib/supabase/servidor';
import { cadastrarImovel } from '@/server/acoes/imoveis';
import { EstadoSemPermissao } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { FormularioDeImovel } from '../formulario';

export const metadata: Metadata = { title: 'Novo imóvel' };

export default async function PaginaNovoImovel() {
  const sessao = await exigirSessao('/imoveis/novo');

  if (!sessao.pode('imoveis.criar')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Cadastro de imóvel" />
      </div>
    );
  }

  // Proprietário é uma pessoa do CRM, não texto livre: é o que permite ligar o
  // imóvel ao histórico de contato e evitar dois cadastros do mesmo dono.
  const supabase = await clienteServidor();
  const { data: pessoas } = await supabase
    .from('pessoas')
    .select('id, nome')
    .eq('tenant_id', sessao.atual.tenant.id)
    .is('excluido_em', null)
    .order('nome', { ascending: true })
    .limit(500);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 lg:px-6">
      <div>
        <Link
          href="/imoveis"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-link hover:underline"
        >
          <Icone nome="voltar" className="size-4" />
          Imóveis
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Novo imóvel</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          Salve como rascunho agora e complete depois — só o título é obrigatório para começar.
        </p>
      </div>

      <FormularioDeImovel
        acaoDoServidor={cadastrarImovel}
        proprietarios={pessoas ?? []}
        podePublicar={sessao.pode('imoveis.publicar')}
        rotuloDoBotao="Cadastrar imóvel"
        urlDeCancelar="/imoveis"
      />
    </div>
  );
}
