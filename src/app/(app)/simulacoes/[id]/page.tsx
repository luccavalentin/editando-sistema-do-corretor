import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { exigirSessao } from '@/server/sessao';
import { obterSimulacao } from '@/server/consultas/simulacoes';
import { homefinEstaConfigurada } from '@/server/integracoes/homefin/cliente';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoTitulo } from '@/components/ui/cartao';
import { Chip } from '@/components/ui/sinal';
import { EstadoSemPermissao } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import {
  analisarComprometimento,
  estimarParcela,
  ROTULO_SITUACAO_SIMULACAO,
  SISTEMA_AMORTIZACAO_HOMEFIN,
  TAXA_REFERENCIA_ANUAL,
  TIPO_IMOVEL_HOMEFIN,
} from '@/dominio/simulacao';
import { mascararCpf } from '@/lib/privacidade/documentos';
import { data, dataHora, moeda, percentual, tempoRelativo } from '@/lib/formato';
import { BotaoAtualizar, BotaoEnviar, BotaoEscolherBanco } from './acoes';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const sessao = await exigirSessao();
  const { id } = await params;
  const ficha = await obterSimulacao(sessao.atual.tenant.id, id);
  return { title: ficha ? `${ficha.simulacao.codigo} · Simulação` : 'Simulação' };
}

export default async function PaginaDaSimulacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirSessao(`/simulacoes/${id}`);

  if (!sessao.pode('simulacao.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Ficha da simulação" />
      </div>
    );
  }

  const ficha = await obterSimulacao(sessao.atual.tenant.id, id);
  if (!ficha) notFound();

  const { simulacao, bancos, pessoa, imovel } = ficha;
  const rotulo = ROTULO_SITUACAO_SIMULACAO[simulacao.situacao];
  const jaFoiEnviada = Boolean(simulacao.homefin_id_oportunidade);

  const valorFinanciamento = Number(simulacao.valor_financiamento);
  const rendaTotal =
    Number(simulacao.renda_total) + Number(simulacao.renda_coparticipante ?? 0);

  // A estimativa continua visível DEPOIS do envio, ao lado do número real: é
  // a diferença entre os dois que o cliente pergunta, e tê-la na tela evita o
  // corretor ter que refazer a conta de cabeça.
  const estimativa = estimarParcela(
    simulacao.sistema_amortizacao,
    valorFinanciamento,
    simulacao.prazo_meses,
    TAXA_REFERENCIA_ANUAL,
  );

  const aprovados = bancos.filter((b) => b.situacao === 'aprovado' && b.valor_parcela != null);
  const melhor = aprovados.length > 0 ? aprovados[0] : null;

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

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className="text-micro font-semibold tracking-wide text-texto-apoio">
                {simulacao.codigo}
              </span>
              <Chip tom={rotulo.tom}>{rotulo.texto}</Chip>
              {simulacao.usa_fgts && <Chip tom="acao">Usa FGTS</Chip>}
              {simulacao.compoe_renda && <Chip>Renda composta</Chip>}
            </div>

            <h1 className="text-2xl font-bold leading-tight tracking-tight">
              {pessoa?.nome ?? simulacao.nome_titular}
            </h1>
            <p className="mt-0.5 text-sm text-texto-secundario">
              {moeda(valorFinanciamento)} em {simulacao.prazo_meses} meses
              {imovel ? ` · ${imovel.codigo} ${imovel.titulo}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* ------------------------------------------------ os bancos */}
          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>
                Resposta dos bancos
                <span className="ml-2 text-sm font-normal text-texto-apoio">
                  {bancos.length}
                </span>
              </CartaoTitulo>
            </CartaoCabecalho>
            <CartaoCorpo className="p-0">
              {bancos.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-texto-apoio">
                  Nenhum banco foi escolhido nesta simulação.
                </p>
              ) : (
                <ul className="divide-y divide-borda">
                  {bancos.map((banco) => {
                    const situacao = ROTULO_SITUACAO_SIMULACAO[banco.situacao];
                    const ehMelhor = melhor?.id === banco.id;

                    return (
                      <li
                        key={banco.id}
                        className={banco.escolhido ? 'bg-acao-sutil' : undefined}
                      >
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                          <div className="min-w-36 flex-grow">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-texto">{banco.nome_banco}</span>
                              {banco.escolhido && <Chip tom="acao">Escolhido</Chip>}
                              {ehMelhor && !banco.escolhido && (
                                <Chip tom="sucesso">Menor parcela</Chip>
                              )}
                            </div>
                            <Chip tom={situacao.tom} className="mt-1">
                              {situacao.texto}
                            </Chip>
                          </div>

                          {banco.valor_parcela != null ? (
                            <div className="text-right">
                              <p className="text-xs text-texto-apoio">Parcela</p>
                              <p className="text-lg font-bold text-texto">
                                {moeda(banco.valor_parcela)}
                              </p>
                              {banco.taxa_juros_ano != null && (
                                <p className="text-xs text-texto-apoio">
                                  {percentual(Number(banco.taxa_juros_ano))} ao ano
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-texto-apoio">
                              {banco.situacao === 'em_analise'
                                ? 'Em análise'
                                : banco.situacao === 'rascunho'
                                  ? 'Ainda não enviado'
                                  : '—'}
                            </p>
                          )}

                          {banco.situacao === 'aprovado' &&
                            !banco.escolhido &&
                            sessao.pode('simulacao.criar') && (
                              <BotaoEscolherBanco
                                simulacaoId={id}
                                bancoId={banco.id}
                                nomeBanco={banco.nome_banco}
                              />
                            )}
                        </div>

                        {/* Detalhe do que o banco aprovou. Só aparece quando há
                            algo de fato, para a lista não virar um muro. */}
                        {(banco.valor_financiamento_aprovado != null ||
                          banco.prazo_aprovado != null ||
                          banco.valor_financiamento_maximo != null) && (
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-borda bg-superficie-afundada px-4 py-2.5 text-xs sm:grid-cols-4">
                            {banco.valor_financiamento_aprovado != null && (
                              <Miudo
                                rotulo="Financiamento"
                                valor={moeda(banco.valor_financiamento_aprovado)}
                              />
                            )}
                            {banco.prazo_aprovado != null && (
                              <Miudo rotulo="Prazo" valor={`${banco.prazo_aprovado} meses`} />
                            )}
                            {banco.valor_financiamento_maximo != null && (
                              <Miudo
                                rotulo="Máximo possível"
                                valor={moeda(banco.valor_financiamento_maximo)}
                              />
                            )}
                            {banco.valor_iof != null && (
                              <Miudo rotulo="IOF" valor={moeda(banco.valor_iof)} />
                            )}
                            {banco.indexador && (
                              <Miudo rotulo="Indexador" valor={banco.indexador} />
                            )}
                          </dl>
                        )}

                        {banco.retorno_integracao && (
                          <p className="border-t border-borda px-4 py-2 text-xs text-texto-secundario">
                            {banco.retorno_integracao}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CartaoCorpo>
          </Cartao>

          {/* ------------------------------------------- os dados enviados */}
          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>O que foi enviado ao banco</CartaoTitulo>
            </CartaoCabecalho>
            <CartaoCorpo>
              <p className="mb-3 text-xs text-texto-apoio">
                Cópia do momento do envio. Se o cadastro do cliente mudar depois, estes números
                continuam sendo os que o banco usou para decidir.
              </p>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Linha rotulo="Titular" valor={simulacao.nome_titular} />
                <Linha
                  rotulo="CPF"
                  valor={
                    sessao.pode('sensivel.ver')
                      ? mascararCpf(simulacao.cpf_titular)
                      : '•••.•••.•••-••'
                  }
                />
                <Linha
                  rotulo="Nascimento"
                  valor={data(simulacao.data_nascimento_titular)}
                />
                <Linha rotulo="Renda declarada" valor={moeda(simulacao.renda_total)} />
                {simulacao.compoe_renda && (
                  <>
                    <Linha
                      rotulo="Compõe renda"
                      valor={simulacao.nome_coparticipante ?? '—'}
                    />
                    <Linha
                      rotulo="Renda de quem compõe"
                      valor={moeda(simulacao.renda_coparticipante)}
                    />
                  </>
                )}
                <Linha rotulo="Valor do imóvel" valor={moeda(simulacao.valor_imovel)} />
                <Linha rotulo="Entrada" valor={moeda(simulacao.valor_entrada)} />
                <Linha rotulo="Financiamento" valor={moeda(valorFinanciamento)} />
                <Linha rotulo="Prazo" valor={`${simulacao.prazo_meses} meses`} />
                <Linha
                  rotulo="Sistema"
                  valor={
                    SISTEMA_AMORTIZACAO_HOMEFIN[
                      simulacao.sistema_amortizacao === 'price' ? 'P' : 'S'
                    ]
                  }
                />
                <Linha
                  rotulo="Tipo do imóvel"
                  valor={
                    TIPO_IMOVEL_HOMEFIN[
                      simulacao.tipo_imovel_homefin as keyof typeof TIPO_IMOVEL_HOMEFIN
                    ] ?? simulacao.tipo_imovel_homefin
                  }
                />
                <Linha
                  rotulo="Conservação"
                  valor={simulacao.situacao_imovel_homefin === 'N' ? 'Novo' : 'Usado'}
                />
                <Linha rotulo="UF" valor={simulacao.uf} />
                <Linha rotulo="FGTS" valor={simulacao.usa_fgts ? 'Vai usar' : 'Não usa'} />
              </dl>
            </CartaoCorpo>
          </Cartao>

          {simulacao.observacoes && (
            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>Observações</CartaoTitulo>
              </CartaoCabecalho>
              <CartaoCorpo>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-texto-secundario">
                  {simulacao.observacoes}
                </p>
              </CartaoCorpo>
            </Cartao>
          )}
        </div>

        {/* --------------------------------------------------- lateral */}
        <div className="flex flex-col gap-4">
          <Cartao>
            <CartaoCorpo className="flex flex-col gap-3">
              {!jaFoiEnviada ? (
                <BotaoEnviar
                  simulacaoId={id}
                  integracaoLigada={homefinEstaConfigurada()}
                  podeEnviar={sessao.pode('credito.consultar')}
                />
              ) : (
                <BotaoAtualizar simulacaoId={id} />
              )}

              {jaFoiEnviada && (
                <dl className="flex flex-col gap-1.5 border-t border-borda pt-3 text-xs">
                  <Linha rotulo="Enviada" valor={tempoRelativo(simulacao.enviado_em)} />
                  {simulacao.reconciliado_em && (
                    <Linha
                      rotulo="Última consulta"
                      valor={dataHora(simulacao.reconciliado_em)}
                    />
                  )}
                  {simulacao.homefin_codigo_oportunidade && (
                    <Linha
                      rotulo="Código no banco"
                      valor={simulacao.homefin_codigo_oportunidade}
                    />
                  )}
                </dl>
              )}
            </CartaoCorpo>
          </Cartao>

          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>
                <span className="flex items-center gap-2">
                  <Icone nome="calculadora" className="size-4" />
                  Estimativa
                </span>
              </CartaoTitulo>
            </CartaoCabecalho>
            <CartaoCorpo>
              <p className="mb-3 rounded-lg bg-superficie-afundada px-3 py-2 text-xs text-texto-secundario">
                Calculada aqui com taxa de referência de{' '}
                <strong>{TAXA_REFERENCIA_ANUAL}% ao ano</strong>.
                {melhor
                  ? ' O número do banco, ao lado, é o que vale.'
                  : ' Não é proposta de banco.'}
              </p>

              <div>
                <p className="text-xs text-texto-apoio">
                  {simulacao.sistema_amortizacao === 'sac' ? 'Primeira parcela' : 'Parcela fixa'}
                </p>
                <p className="text-2xl font-bold leading-tight text-texto">
                  {moeda(estimativa.primeira)}
                </p>
              </div>

              {melhor?.valor_parcela != null && (
                <div className="mt-3 rounded-lg bg-sucesso-sutil px-3 py-2.5">
                  <p className="text-xs text-sucesso-texto">
                    Melhor resposta real — {melhor.nome_banco}
                  </p>
                  <p className="text-xl font-bold text-sucesso-texto">
                    {moeda(melhor.valor_parcela)}
                  </p>
                  <p className="mt-0.5 text-xs text-sucesso-texto">
                    {Number(melhor.valor_parcela) > estimativa.primeira
                      ? `${moeda(Number(melhor.valor_parcela) - estimativa.primeira)} acima da estimativa`
                      : `${moeda(estimativa.primeira - Number(melhor.valor_parcela))} abaixo da estimativa`}
                  </p>
                </div>
              )}

              <dl className="mt-3 flex flex-col gap-1.5 border-t border-borda pt-3 text-sm">
                <Linha rotulo="Total de juros" valor={moeda(estimativa.juros)} />
                <Linha rotulo="Total pago" valor={moeda(estimativa.total)} />
              </dl>

              {rendaTotal > 0 && (
                <ComprometimentoDaRenda
                  parcela={melhor?.valor_parcela != null ? Number(melhor.valor_parcela) : estimativa.primeira}
                  renda={rendaTotal}
                />
              )}
            </CartaoCorpo>
          </Cartao>

          {pessoa && (
            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>Cliente</CartaoTitulo>
              </CartaoCabecalho>
              <CartaoCorpo>
                <Link
                  href={`/clientes/${pessoa.id}`}
                  className="text-sm font-medium text-link hover:underline"
                >
                  {pessoa.nome}
                </Link>
                {pessoa.email && (
                  <p className="mt-0.5 text-sm text-texto-secundario">{pessoa.email}</p>
                )}
              </CartaoCorpo>
            </Cartao>
          )}

          {imovel && (
            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>Imóvel</CartaoTitulo>
              </CartaoCabecalho>
              <CartaoCorpo>
                <Link
                  href={`/imoveis/${imovel.id}`}
                  className="text-sm font-medium text-link hover:underline"
                >
                  {imovel.titulo}
                </Link>
                <p className="mt-0.5 text-xs text-texto-apoio">
                  {imovel.codigo}
                  {imovel.cidade ? ` · ${imovel.cidade}` : ''}
                </p>
              </CartaoCorpo>
            </Cartao>
          )}
        </div>
      </div>
    </div>
  );
}

function ComprometimentoDaRenda({ parcela, renda }: { parcela: number; renda: number }) {
  const analise = analisarComprometimento(parcela, renda);

  return (
    <div
      className={`mt-3 rounded-lg px-3 py-2.5 ${analise.cabe ? 'bg-sucesso-sutil' : 'bg-atencao-sutil'}`}
    >
      <p
        className={`text-xs font-semibold ${analise.cabe ? 'text-sucesso-texto' : 'text-atencao-texto'}`}
      >
        Compromete {analise.percentual}% da renda
      </p>
      {analise.aviso && <p className="mt-1 text-xs text-atencao-texto">{analise.aviso}</p>}
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-texto-apoio">{rotulo}</dt>
      <dd className="text-right font-medium text-texto">{valor}</dd>
    </div>
  );
}

function Miudo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-texto-apoio">{rotulo}</dt>
      <dd className="font-medium text-texto">{valor}</dd>
    </div>
  );
}
