import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { carregarFunil } from '@/server/consultas/negocios';
import { Botao } from '@/components/ui/botao';
import { Chip, ChipTemperatura } from '@/components/ui/sinal';
import { EstadoPrimeiroAcesso, EstadoSemPermissao } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { moedaCurta, numero, tempoCurto } from '@/lib/formato';
import { MoverEtapa, type EtapaDisponivel } from './mover';

export const metadata: Metadata = { title: 'Negócios' };

export default async function PaginaNegocios() {
  const sessao = await exigirSessao('/negocios');

  if (!sessao.pode('crm.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Funil de negócios" />
      </div>
    );
  }

  const colunas = await carregarFunil(sessao.atual.tenant.id);
  const podeMover = sessao.pode('crm.editar');

  const etapasParaMover: EtapaDisponivel[] = colunas.map((c) => ({
    id: c.etapaId,
    nome: c.nome,
    encerraComo: c.encerraComo,
  }));

  const totalNegocios = colunas.reduce((s, c) => s + c.negocios.length, 0);
  const valorTotal = colunas.reduce((s, c) => s + c.valorTotal, 0);
  const totalParados = colunas.reduce((s, c) => s + c.negocios.filter((n) => n.parado).length, 0);

  // As colunas terminais não entram no kanban: elas são resultado, não funil.
  // Um negócio ganho ficaria ocupando espaço de quem ainda precisa de atenção.
  const colunasDoFunil = colunas.filter((c) => c.encerraComo === null);

  if (totalNegocios === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Negócios</h1>
        <p className="mb-6 text-sm text-texto-secundario">
          O funil mostra onde cada oportunidade está e onde a carteira trava.
        </p>
        <EstadoPrimeiroAcesso
          titulo="Nenhum negócio aberto"
          descricao="Um negócio liga uma pessoa a uma intenção de compra. É ele que entra no funil, alimenta o painel e dispara os follow-ups — o cadastro do cliente sozinho não faz isso."
          acao={{ rotulo: 'Criar primeiro negócio', href: '/negocios/novo' }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end gap-4 px-4 py-5 lg:px-6">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold tracking-tight">Negócios</h1>
          <p className="mt-0.5 text-sm text-texto-secundario">
            {numero(totalNegocios)} {totalNegocios === 1 ? 'negócio aberto' : 'negócios abertos'} ·{' '}
            {moedaCurta(valorTotal)} em negociação
            {totalParados > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-atencao-texto">
                  {totalParados} {totalParados === 1 ? 'parado' : 'parados'} há mais de 7 dias
                </span>
              </>
            )}
          </p>
        </div>

        {sessao.pode('crm.criar') && (
          <Botao comoFilho>
            <Link href="/negocios/novo">
              <Icone nome="mais" className="size-4" />
              Novo negócio
            </Link>
          </Botao>
        )}
      </div>

      {/* Kanban com rolagem horizontal. Cada coluna tem largura fixa para que a
          leitura não mude conforme a quantidade de cartões. */}
      <div className="flex-grow overflow-x-auto px-4 pb-5 lg:px-6">
        <div className="flex h-full min-w-max gap-3">
          {colunasDoFunil.map((coluna) => (
            <section
              key={coluna.etapaId}
              aria-label={`Etapa ${coluna.nome}`}
              className="flex w-72 shrink-0 flex-col rounded-xl border border-borda bg-superficie-afundada"
            >
              <header className="flex items-center gap-2 border-b border-borda px-3 py-2.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ background: coluna.cor ?? 'var(--grafico-1)' }}
                />
                <h2 className="flex-grow truncate text-sm font-semibold">{coluna.nome}</h2>
                <span
                  data-numerico
                  className="rounded-full bg-superficie px-2 py-0.5 text-xs font-bold text-texto-secundario"
                >
                  {coluna.negocios.length}
                </span>
              </header>

              {coluna.valorTotal > 0 && (
                <p
                  data-numerico
                  className="border-b border-borda-sutil px-3 py-1.5 text-xs font-semibold text-texto-secundario"
                >
                  {moedaCurta(coluna.valorTotal)}
                </p>
              )}

              <ul className="flex flex-grow flex-col gap-2 overflow-y-auto p-2">
                {coluna.negocios.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-borda px-3 py-6 text-center text-xs text-texto-apoio">
                    Nenhum negócio nesta etapa
                  </li>
                ) : (
                  coluna.negocios.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-lg border border-borda bg-superficie p-2.5 shadow-baixa"
                    >
                      <div className="mb-1.5 flex items-start gap-2">
                        <Link
                          href={`/negocios/${n.id}`}
                          className="min-w-0 flex-grow text-sm font-semibold text-texto no-underline hover:text-link"
                        >
                          <span className="line-clamp-2">{n.titulo ?? n.codigo}</span>
                        </Link>
                        <ChipTemperatura temperatura={n.temperatura} />
                      </div>

                      <Link
                        href={`/clientes/${n.pessoaId}`}
                        className="mb-1.5 block truncate text-xs text-texto-secundario no-underline hover:text-link"
                      >
                        {n.pessoaNome}
                      </Link>

                      <div className="mb-2 flex items-center gap-2">
                        <span data-numerico className="text-sm font-bold">
                          {moedaCurta(n.valor)}
                        </span>
                        <span className="ml-auto text-micro text-texto-apoio">{n.codigo}</span>
                      </div>

                      {n.parado ? (
                        <p className="mb-2 flex items-center gap-1.5 rounded-md bg-atencao-sutil px-2 py-1 text-micro font-semibold text-atencao-texto">
                          <Icone nome="alerta" className="size-3" />
                          Parado há {tempoCurto(n.etapaDesde)}
                        </p>
                      ) : (
                        <p className="mb-2 text-micro text-texto-apoio">
                          Nesta etapa há {tempoCurto(n.etapaDesde)}
                        </p>
                      )}

                      {podeMover && (
                        <MoverEtapa
                          negocioId={n.id}
                          etapaAtualId={n.etapaId}
                          etapas={etapasParaMover}
                          compacto
                        />
                      )}
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* Fechados no período aparecem como resumo, não como coluna: o funil é
          sobre o que ainda pode ser feito. */}
      {colunas.some((c) => c.encerraComo !== null && c.negocios.length > 0) && (
        <div className="flex flex-wrap gap-3 border-t border-borda bg-superficie px-4 py-3 lg:px-6">
          {colunas
            .filter((c) => c.encerraComo !== null && c.negocios.length > 0)
            .map((c) => (
              <Chip key={c.etapaId} tom={c.encerraComo === 'ganho' ? 'sucesso' : 'perigo'} tamanho="medio">
                {c.nome}: {c.negocios.length} · {moedaCurta(c.valorTotal)}
              </Chip>
            ))}
        </div>
      )}
    </div>
  );
}
