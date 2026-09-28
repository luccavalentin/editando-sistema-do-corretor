import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { EstadoSemPermissao } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { FormularioDeCliente } from './formulario';

export const metadata: Metadata = { title: 'Novo cliente' };

export default async function PaginaNovoCliente() {
  const sessao = await exigirSessao('/clientes/novo');

  // Verificação no servidor, não só no menu. Esconder o botão é conveniência;
  // barrar a rota é segurança — e a RLS barra de novo no banco.
  if (!sessao.pode('crm.criar')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao
          papel={ROTULO_PAPEL[sessao.atual.papel]}
          oQue="Cadastro de clientes"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 lg:px-6">
      <div>
        <Link
          href="/clientes"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-texto-secundario no-underline hover:text-texto"
        >
          <Icone nome="voltar" className="size-3.5" />
          Clientes
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Novo cliente</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          Só o nome é obrigatório. Tudo o mais pode ser completado depois — o importante é registrar
          a pessoa antes que o contato esfrie.
        </p>
      </div>

      <FormularioDeCliente />
    </div>
  );
}
