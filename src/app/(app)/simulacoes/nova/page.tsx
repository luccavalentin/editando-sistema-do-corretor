import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { clienteServidor } from '@/lib/supabase/servidor';
import { EstadoSemPermissao } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { conservacaoParaHomefin, tipoImovelParaHomefin, usoParaHomefin } from '@/dominio/simulacao';
import { FormularioDeSimulacao } from './formulario';

export const metadata: Metadata = { title: 'Nova simulação' };

export default async function PaginaNovaSimulacao({
  searchParams,
}: {
  searchParams: Promise<{ pessoa?: string; imovel?: string }>;
}) {
  const sessao = await exigirSessao('/simulacoes/nova');

  if (!sessao.pode('simulacao.criar')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Nova simulação" />
      </div>
    );
  }

  const params = await searchParams;
  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  // As duas listas numa ida só. O formulário precisa das duas de qualquer jeito,
  // e pedi-las em sequência dobraria a espera para desenhar a tela.
  const [{ data: pessoas }, { data: imoveis }] = await Promise.all([
    supabase
      .from('pessoas')
      .select('id, nome, cpf, data_nascimento, renda')
      .eq('tenant_id', tenantId)
      .is('excluido_em', null)
      .order('nome', { ascending: true })
      .limit(500),
    supabase
      .from('imoveis')
      .select('id, codigo, titulo, valor, tipo, uso, conservacao, uf')
      .eq('tenant_id', tenantId)
      .is('excluido_em', null)
      .in('situacao', ['disponivel', 'reservado', 'em_negociacao'])
      .order('atualizado_em', { ascending: false })
      .limit(300),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 lg:px-6">
      <div>
        <Link
          href="/simulacoes"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-link hover:underline"
        >
          <Icone nome="voltar" className="size-4" />
          Simulações
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nova simulação</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          Monte os números com o cliente, veja a estimativa na hora, e mande aos bancos quando
          estiver certo.
        </p>
      </div>

      <FormularioDeSimulacao
        pessoaInicial={params.pessoa}
        imovelInicial={params.imovel}
        pessoas={(pessoas ?? []).map((p) => ({
          id: p.id,
          nome: p.nome,
          temCpf: Boolean(p.cpf),
          temNascimento: Boolean(p.data_nascimento),
          renda: p.renda == null ? null : Number(p.renda),
        }))}
        imoveis={(imoveis ?? []).map((i) => ({
          id: i.id,
          codigo: i.codigo,
          titulo: i.titulo,
          valor: i.valor == null ? null : Number(i.valor),
          // A tradução para os códigos da Homefin acontece aqui, no servidor,
          // para o formulário não precisar conhecer o contrato do provedor.
          tipoHomefin: tipoImovelParaHomefin(i.tipo),
          usoHomefin: usoParaHomefin(i.uso),
          situacaoHomefin: conservacaoParaHomefin(i.conservacao),
          uf: i.uf,
        }))}
      />
    </div>
  );
}
