import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirAdmin } from '@/server/sessao';
import { listarAuditoria } from '@/server/consultas';
import { dataHora } from '@/lib/formato';

export const metadata: Metadata = { title: 'Auditoria' };

export default async function PaginaDeAuditoria({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string; conta?: string }>;
}) {
  await exigirAdmin();
  const params = await searchParams;

  const linhas = await listarAuditoria({
    acao: params.acao,
    tenantId: params.conta,
    limite: 200,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Auditoria</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          Registro imutável. O banco não permite alterar nem apagar uma linha daqui — nem o
          proprietário da conta, nem o administrador da plataforma.
        </p>
      </div>

      {params.conta && (
        <div className="flex items-center justify-between gap-3 rounded-[--radius-padrao] border border-borda bg-superficie-alta px-4 py-2.5 text-sm">
          <span className="text-texto-secundario">
            Filtrado por uma conta — <span className="identificador">{params.conta}</span>
          </span>
          <Link href="/auditoria" className="text-acento hover:underline">
            Ver tudo
          </Link>
        </div>
      )}

      {linhas.length === 0 ? (
        <p className="rounded-[--radius-padrao] border border-borda bg-superficie px-4 py-8 text-center text-sm text-texto-secundario">
          Nenhum registro ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[--radius-padrao] border border-borda">
          <table className="w-full min-w-[60rem] text-sm">
            <caption className="so-leitor">
              Registro de auditoria da plataforma, do mais recente ao mais antigo
            </caption>
            <thead className="bg-superficie-alta text-left text-xs uppercase tracking-wider text-texto-apoio">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Quando
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Quem
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Conta
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Ação
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Sobre
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Resultado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--borda] bg-superficie">
              {linhas.map((linha) => (
                <tr key={linha.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-texto-apoio">
                    {dataHora(linha.criado_em)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="block">{linha.autor_email ?? 'sistema'}</span>
                    {linha.autor_papel && (
                      <span className="text-xs text-texto-apoio">{linha.autor_papel}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {linha.tenant_id ? (
                      <Link
                        href={`/contas/${linha.tenant_id}`}
                        className="text-acento hover:underline"
                      >
                        {linha.tenant_nome ?? 'conta'}
                      </Link>
                    ) : (
                      <span className="text-texto-apoio">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {linha.acao}
                    {/* A justificativa é obrigatória em consulta de crédito e em
                        acesso administrativo a conta de terceiro. Mostrá-la ao
                        lado da ação é o que torna o registro útil — sem ela, o
                        log diz o que aconteceu mas não por quê. */}
                    {linha.justificativa && (
                      <span className="mt-0.5 block text-xs font-normal text-texto-secundario">
                        {linha.justificativa}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-texto-secundario">
                    {linha.entidade}
                    {linha.entidade_id && (
                      <span className="identificador ml-1">{linha.entidade_id.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        linha.resultado === 'sucesso'
                          ? 'text-sucesso'
                          : linha.resultado === 'negado'
                            ? 'text-perigo'
                            : 'text-texto-apoio'
                      }
                    >
                      {linha.resultado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
