import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { exigirAdmin } from '@/server/sessao';
import { obterConta } from '@/server/consultas';
import { numero, tempoRelativo } from '@/lib/formato';

export const metadata: Metadata = { title: 'Conta' };

const PAPEIS: Record<string, string> = {
  proprietario: 'Proprietário',
  admin_equipe: 'Administrador da equipe',
  corretor: 'Corretor',
  assistente: 'Assistente',
  secretaria: 'Secretária',
  sdr: 'SDR',
  financeiro: 'Financeiro',
  visualizacao: 'Visualização',
};

export default async function PaginaDaConta({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const { id } = await params;

  const ficha = await obterConta(id);
  if (!ficha) notFound();

  const { conta, equipe, uso } = ficha;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/contas" className="text-sm text-acento hover:underline">
          ← Contas
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight">{conta.nome}</h1>
        <p className="identificador mt-0.5">{conta.id}</p>
      </div>

      {/* O que esta tela NÃO mostra é tão importante quanto o que mostra. */}
      <div className="rounded-[--radius-padrao] border border-borda bg-superficie-alta px-4 py-3">
        <p className="text-sm text-texto-secundario">
          Esta tela mostra <strong className="text-texto">configuração e volume</strong> da conta.
          Nome de cliente, CPF, telefone, valor de negócio e observação do corretor{' '}
          <strong className="text-texto">não aparecem aqui</strong> — suporte se faz com números,
          não lendo a carteira de quem pediu ajuda.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-texto-apoio">
            Equipe ({equipe.length})
          </h2>
          <div className="overflow-x-auto rounded-[--radius-padrao] border border-borda">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-superficie-alta text-left text-xs uppercase tracking-wider text-texto-apoio">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Pessoa
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Papel
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Situação
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Último acesso
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--borda] bg-superficie">
                {equipe.map((membro) => (
                  <tr key={membro.usuario_id}>
                    <td className="px-4 py-2.5">
                      <span className="block font-medium">{membro.nome}</span>
                      <span className="text-xs text-texto-apoio">{membro.email}</span>
                    </td>
                    <td className="px-4 py-2.5">{PAPEIS[membro.papel] ?? membro.papel}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          membro.situacao === 'ativo' ? 'text-sucesso' : 'text-texto-apoio'
                        }
                      >
                        {membro.situacao}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-texto-apoio">
                      {tempoRelativo(membro.ultimo_acesso_em)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-[--radius-padrao] border border-borda bg-superficie p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-texto-apoio">
              Uso
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              <Linha rotulo="Clientes" valor={numero(uso.pessoas)} />
              <Linha rotulo="Imóveis" valor={numero(uso.imoveis)} />
              <Linha rotulo="No portfólio" valor={numero(uso.imoveisPublicados)} />
              <Linha rotulo="Negócios" valor={numero(uso.negocios)} />
              <Linha rotulo="Simulações" valor={numero(uso.simulacoes)} />
            </dl>
          </section>

          <section className="rounded-[--radius-padrao] border border-borda bg-superficie p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-texto-apoio">
              Plano e limites
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              <Linha
                rotulo="Usuários"
                valor={`${equipe.length} / ${conta.limite_usuarios}`}
                alerta={equipe.length >= conta.limite_usuarios}
              />
              <Linha
                rotulo="Imóveis"
                valor={`${uso.imoveis} / ${numero(conta.limite_imoveis)}`}
                alerta={uso.imoveis >= conta.limite_imoveis}
              />
              <Linha
                rotulo="Armazenamento"
                valor={`${numero(conta.limite_armazenamento_mb)} MB`}
              />
              <Linha rotulo="Retenção" valor={`${conta.retencao_dias} dias`} />
              <Linha rotulo="MFA obrigatório" valor={conta.mfa_obrigatorio ? 'Sim' : 'Não'} />
            </dl>
          </section>

          <section className="rounded-[--radius-padrao] border border-borda bg-superficie p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-texto-apoio">
              Configuração
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              <Linha rotulo="Situação" valor={conta.situacao} />
              <Linha rotulo="CRECI" valor={conta.creci ?? '—'} />
              <Linha rotulo="Fuso" valor={conta.fuso_horario} />
              <Linha
                rotulo="Portfólio público"
                valor={conta.portfolio_ativo ? 'No ar' : 'Desligado'}
              />
              <Linha rotulo="Criada" valor={tempoRelativo(conta.criado_em)} />
            </dl>
          </section>

          <Link
            href={`/auditoria?conta=${conta.id}`}
            className="rounded-[--radius-padrao] border border-borda bg-superficie px-4 py-3 text-center text-sm font-semibold text-acento transition-colors hover:bg-superficie-alta"
          >
            Ver auditoria desta conta
          </Link>
        </div>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-texto-apoio">{rotulo}</dt>
      <dd className={`font-medium tabular-nums ${alerta ? 'text-atencao' : 'text-texto'}`}>
        {valor}
      </dd>
    </div>
  );
}
