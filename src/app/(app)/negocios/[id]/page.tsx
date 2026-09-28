import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { exigirSessao } from '@/server/sessao';
import { carregarNegocio } from '@/server/consultas/negocios';
import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoTitulo } from '@/components/ui/cartao';
import { Chip, ChipTemperatura } from '@/components/ui/sinal';
import { EstadoSemPermissao } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { data, dataHora, duracaoEmDias, moeda, tempoRelativo } from '@/lib/formato';
import { MoverEtapa, type EtapaDisponivel } from '../mover';

export const metadata: Metadata = { title: 'Negócio' };

export default async function PaginaNegocio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirSessao(`/negocios/${id}`);

  if (!sessao.pode('crm.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Detalhe do negócio" />
      </div>
    );
  }

  const detalhe = await carregarNegocio(sessao.atual.tenant.id, id);
  if (!detalhe) notFound();

  const { negocio, pessoaNome, pessoaTemperatura, etapaNome, etapaCor, historico, etapas } = detalhe;

  const etapasParaMover: EtapaDisponivel[] = etapas.map((e) => ({
    id: e.id,
    nome: e.nome,
    encerraComo: e.encerraComo,
  }));

  const encerrado = negocio.situacao === 'ganho' || negocio.situacao === 'perdido';
  const ordemAtual = etapas.find((e) => e.id === negocio.etapa_id)?.ordem ?? 0;
  const etapasDoFunil = etapas.filter((e) => e.encerraComo === null);

  return (
    <div className="flex flex-col gap-4 px-4 py-5 lg:px-6">
      <Link
        href="/negocios"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-texto-secundario no-underline hover:text-texto"
      >
        <Icone nome="voltar" className="size-3.5" />
        Negócios
      </Link>

      <Cartao>
        <CartaoCorpo className="flex flex-wrap items-start gap-4">
          <div className="min-w-60 flex-grow">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{negocio.titulo ?? negocio.codigo}</h1>
              <Chip>{negocio.codigo}</Chip>
              {negocio.situacao === 'ganho' && <Chip tom="sucesso">GANHO</Chip>}
              {negocio.situacao === 'perdido' && <Chip tom="perigo">PERDIDO</Chip>}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-texto-secundario">
              <Link
                href={`/clientes/${negocio.pessoa_id}`}
                className="flex items-center gap-1.5 font-semibold text-texto no-underline hover:text-link"
              >
                <Icone nome="pessoas" className="size-3.5" />
                {pessoaNome}
              </Link>
              <ChipTemperatura temperatura={pessoaTemperatura} />
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-sm"
                  style={{ background: etapaCor ?? 'var(--grafico-1)' }}
                />
                {etapaNome} · há {tempoRelativo(negocio.etapa_desde)}
              </span>
              {detalhe.responsavelNome && <span>Responsável {detalhe.responsavelNome}</span>}
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-texto-apoio">Valor</p>
            <p data-numerico className="text-2xl font-bold tracking-tight">
              {moeda(negocio.valor)}
            </p>
            {negocio.previsao_fechamento && (
              <p className="text-xs text-texto-apoio">
                Previsão {data(negocio.previsao_fechamento)}
              </p>
            )}
          </div>
        </CartaoCorpo>

        {negocio.situacao === 'perdido' && negocio.motivo_perda && (
          <div className="mx-5 mb-5 rounded-lg border border-perigo-borda bg-perigo-sutil px-4 py-3">
            <p className="mb-0.5 text-micro font-bold tracking-wider text-perigo-texto">
              MOTIVO DA PERDA
            </p>
            <p className="text-sm text-perigo-texto">{negocio.motivo_perda}</p>
          </div>
        )}
      </Cartao>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          {/* Esteira visual: a cor é reforço, o número e o nome é que
              identificam a etapa. Em deuteranopia as cores vizinhas ficam
              indistinguíveis — por isso nunca é só cor. */}
          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>Onde está</CartaoTitulo>
              <span className="text-xs text-texto-secundario">
                Etapa {ordemAtual + 1} de {etapasDoFunil.length}
              </span>
            </CartaoCabecalho>
            <CartaoCorpo>
              <ol className="flex items-start gap-0">
                {etapasDoFunil.map((e, i) => {
                  const concluida = e.ordem < ordemAtual;
                  const atual = e.id === negocio.etapa_id;
                  return (
                    <li
                      key={e.id}
                      className="flex min-w-0 flex-grow flex-col items-center gap-1.5"
                    >
                      <div className="flex w-full items-center">
                        <span
                          aria-hidden="true"
                          className="h-0.5 flex-grow"
                          style={{
                            background:
                              i === 0
                                ? 'transparent'
                                : e.ordem <= ordemAtual
                                  ? (e.cor ?? 'var(--grafico-1)')
                                  : 'var(--cor-borda)',
                          }}
                        />
                        <span
                          className="flex size-6 shrink-0 items-center justify-center rounded-full text-micro font-bold"
                          style={
                            concluida
                              ? { background: e.cor ?? 'var(--grafico-1)', color: '#fff' }
                              : atual
                                ? {
                                    background: 'var(--cor-superficie)',
                                    color: e.cor ?? 'var(--grafico-1)',
                                    border: `3px solid ${e.cor ?? 'var(--grafico-1)'}`,
                                  }
                                : {
                                    background: 'var(--cor-superficie-afundada)',
                                    color: 'var(--cor-texto-apoio)',
                                    border: '1px solid var(--cor-borda)',
                                  }
                          }
                        >
                          {concluida ? '✓' : e.ordem + 1}
                        </span>
                        <span
                          aria-hidden="true"
                          className="h-0.5 flex-grow"
                          style={{
                            background:
                              i === etapasDoFunil.length - 1
                                ? 'transparent'
                                : e.ordem < ordemAtual
                                  ? (e.cor ?? 'var(--grafico-1)')
                                  : 'var(--cor-borda)',
                          }}
                        />
                      </div>
                      <span
                        className={
                          atual
                            ? 'text-center text-micro font-bold leading-tight text-texto'
                            : 'text-center text-micro leading-tight text-texto-apoio'
                        }
                      >
                        {e.nome}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {sessao.pode('crm.editar') && (
                <div className="mt-5 border-t border-borda-sutil pt-4">
                  <MoverEtapa
                    negocioId={negocio.id}
                    etapaAtualId={negocio.etapa_id}
                    etapas={etapasParaMover}
                  />
                </div>
              )}
            </CartaoCorpo>
          </Cartao>

          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>Histórico de etapas</CartaoTitulo>
              <span className="text-xs text-texto-secundario">
                Cada movimento com data, hora e autor
              </span>
            </CartaoCabecalho>
            <CartaoCorpo>
              <ol className="flex flex-col">
                {historico.map((h, i) => (
                  <li key={h.id} className="flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span
                        aria-hidden="true"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-acao-sutil text-acao-sutil-texto"
                      >
                        <Icone nome="seta" className="size-3" />
                      </span>
                      {i < historico.length - 1 && (
                        <span aria-hidden="true" className="mt-1 w-0.5 flex-grow bg-borda-sutil" />
                      )}
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="text-sm font-semibold text-texto">
                        {h.etapaDeNome ? `${h.etapaDeNome} → ${h.etapaParaNome}` : `Entrou em ${h.etapaParaNome}`}
                      </p>
                      <p className="text-xs text-texto-secundario">
                        <time dateTime={h.criadoEm}>{dataHora(h.criadoEm)}</time>
                        {h.autorNome ? ` · ${h.autorNome}` : ' · sistema'}
                        {h.segundos !== null && ` · ficou ${duracaoEmDias(h.segundos)} na anterior`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CartaoCorpo>
          </Cartao>
        </div>

        <aside className="flex flex-col gap-4">
          <Cartao>
            <CartaoCorpo>
              <h2 className="mb-3 text-sm font-semibold">Próximos passos</h2>
              <div className="flex flex-col gap-2">
                {sessao.pode('simulacao.criar') && !encerrado && (
                  <Botao tipo="secundario" larguraTotal comoFilho>
                    <Link href={`/simulacoes/nova?pessoa=${negocio.pessoa_id}&negocio=${negocio.id}`}>
                      Simular financiamento
                    </Link>
                  </Botao>
                )}
                {sessao.pode('agenda.editar') && !encerrado && (
                  <Botao tipo="neutro" larguraTotal comoFilho>
                    <Link href={`/agenda/novo?pessoa=${negocio.pessoa_id}&negocio=${negocio.id}`}>
                      Agendar visita
                    </Link>
                  </Botao>
                )}
                <Botao tipo="neutro" larguraTotal comoFilho>
                  <Link href={`/clientes/${negocio.pessoa_id}`}>Abrir ficha do cliente</Link>
                </Botao>
              </div>
            </CartaoCorpo>
          </Cartao>

          <Cartao>
            <CartaoCorpo>
              <h2 className="mb-2 text-sm font-semibold">Dados do negócio</h2>
              <dl className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-texto-apoio">Código</dt>
                  <dd data-numerico className="font-semibold">{negocio.codigo}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-texto-apoio">Criado em</dt>
                  <dd>{data(negocio.criado_em)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-texto-apoio">Última atividade</dt>
                  <dd>{tempoRelativo(negocio.ultima_atividade_em)}</dd>
                </div>
                {negocio.fechado_em && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-texto-apoio">Fechado em</dt>
                    <dd>{data(negocio.fechado_em)}</dd>
                  </div>
                )}
              </dl>
            </CartaoCorpo>
          </Cartao>
        </aside>
      </div>
    </div>
  );
}
