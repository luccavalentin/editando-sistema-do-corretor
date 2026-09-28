import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { listarClientesParaSelecao, listarEtapasIniciais } from '@/server/consultas/negocios';
import { EstadoSemPermissao } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { FormularioDeNegocio } from './formulario';

export const metadata: Metadata = { title: 'Novo negócio' };

export default async function PaginaNovoNegocio({
  searchParams,
}: {
  searchParams: Promise<{ pessoa?: string }>;
}) {
  const sessao = await exigirSessao('/negocios/novo');

  if (!sessao.pode('crm.criar')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Criação de negócios" />
      </div>
    );
  }

  const { pessoa } = await searchParams;
  const tenantId = sessao.atual.tenant.id;

  const [clientes, etapas] = await Promise.all([
    listarClientesParaSelecao(tenantId),
    listarEtapasIniciais(tenantId),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 lg:px-6">
      <div>
        <Link
          href="/negocios"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-texto-secundario no-underline hover:text-texto"
        >
          <Icone nome="voltar" className="size-3.5" />
          Negócios
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Novo negócio</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          O código é gerado pelo sistema. A partir daqui, cada movimento de etapa fica registrado
          com data, hora e autor.
        </p>
      </div>

      <FormularioDeNegocio clientes={clientes} etapas={etapas} pessoaPreSelecionada={pessoa} />
    </div>
  );
}
