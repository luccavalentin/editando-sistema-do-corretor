import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirAdmin } from '@/server/sessao';
import { listarContas } from '@/server/consultas';
import { numero, tempoRelativo } from '@/lib/formato';

export const metadata: Metadata = { title: 'Contas' };

const SITUACOES: Record<string, { rotulo: string; classe: string }> = {
  teste: { rotulo: 'Em teste', classe: 'bg-acento-sutil text-acento' },
  ativo: { rotulo: 'Ativa', classe: 'bg-sucesso-sutil text-sucesso' },
  inadimplente: { rotulo: 'Inadimplente', classe: 'bg-atencao-sutil text-atencao' },
  suspenso: { rotulo: 'Suspensa', classe: 'bg-perigo-sutil text-perigo' },
  cancelado: { rotulo: 'Cancelada', classe: 'bg-superficie-alta text-texto-apoio' },
};

export default async function PaginaDeContas({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; situacao?: string }>;
}) {
  await exigirAdmin();
  const params = await searchParams;

  const contas = await listarContas({
    busca: params.q,
    situacao: params.situacao && params.situacao in SITUACOES ? params.situacao : undefined,
  });

  return (
    <div className="console-entrada flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Contas</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          {contas.length === 0
            ? 'Nenhuma conta com esses filtros'
            : `${numero(contas.length)} ${contas.length === 1 ? 'conta' : 'contas'}`}
        </p>
      </div>

      <form method="get" className="console-card flex flex-wrap items-center gap-2 rounded-[--radius-padrao] bg-superficie p-3">
        <label htmlFor="q" className="so-leitor">
          Buscar conta pelo nome
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={params.q ?? ''}
          placeholder="Nome da imobiliária"
          className="h-9 min-w-56 flex-grow rounded-[--radius-padrao] border border-borda bg-fundo px-3 text-sm text-texto transition-colors focus:border-acento"
        />

        <label htmlFor="situacao" className="so-leitor">
          Filtrar por situação
        </label>
        <select
          id="situacao"
          name="situacao"
          defaultValue={params.situacao ?? ''}
          className="h-9 rounded-[--radius-padrao] border border-borda bg-fundo px-2 text-sm text-texto transition-colors focus:border-acento"
        >
          <option value="">Todas as situações</option>
          {Object.entries(SITUACOES).map(([chave, { rotulo }]) => (
            <option key={chave} value={chave}>
              {rotulo}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="h-9 rounded-[--radius-padrao] bg-acento px-4 text-sm font-semibold text-[#0d0f14] transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
        >
          Filtrar
        </button>

        {(params.q || params.situacao) && (
          <Link href="/contas" className="rounded-[--radius-padrao] px-2 py-1 text-sm text-acento transition-colors hover:bg-acento-sutil">
            Limpar
          </Link>
        )}
      </form>

      {contas.length === 0 ? (
        <p className="rounded-[--radius-padrao] border border-borda bg-superficie px-4 py-8 text-center text-sm text-texto-secundario">
          Nenhuma conta encontrada.
        </p>
      ) : (
        <div className="console-card overflow-x-auto rounded-[--radius-padrao] bg-superficie">
          <table className="w-full min-w-[56rem] text-sm">
            <caption className="so-leitor">
              Contas da plataforma, com uso e situação de cada uma
            </caption>
            <thead className="bg-superficie-alta text-left text-xs uppercase tracking-wider text-texto-apoio">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">Conta</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Situação</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">Equipe</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">Clientes</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">Imóveis</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">Simulações</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Criada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--borda] bg-superficie">
              {contas.map((conta) => {
                const situacao = SITUACOES[conta.situacao] ?? {
                  rotulo: conta.situacao,
                  classe: 'bg-superficie-alta text-texto-apoio',
                };

                /** Estourou o limite do plano: precisa aparecer na lista. */
                const equipeCheia = conta.membros >= conta.limite_usuarios;
                const imoveisCheios = conta.imoveis >= conta.limite_imoveis;

                return (
                  <tr key={conta.id} className="transition-[background-color,transform] hover:bg-superficie-alta hover:[transform:translateX(2px)]">
                    <td className="px-4 py-2.5">
                      <Link href={`/contas/${conta.id}`} className="font-medium hover:underline">
                        {conta.nome}
                      </Link>
                      {conta.slug && (
                        <span className="identificador ml-2">/c/{conta.slug}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${situacao.classe}`}
                      >
                        {situacao.rotulo}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={equipeCheia ? 'text-atencao' : undefined}>
                        {conta.membros}/{conta.limite_usuarios}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{numero(conta.pessoas)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={imoveisCheios ? 'text-atencao' : undefined}>
                        {numero(conta.imoveis)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {numero(conta.simulacoes)}
                    </td>
                    <td className="px-4 py-2.5 text-texto-apoio">
                      {tempoRelativo(conta.criado_em)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
