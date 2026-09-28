import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { listarSimulacoes, resumirSimulacoes } from '@/server/consultas/simulacoes';
import { homefinEstaConfigurada } from '@/server/integracoes/homefin/cliente';
import { Botao } from '@/components/ui/botao';
import { Cartao } from '@/components/ui/cartao';
import { Chip } from '@/components/ui/sinal';
import {
  EstadoIntegracaoDesconectada,
  EstadoPrimeiroAcesso,
  EstadoSemPermissao,
  EstadoVazio,
} from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { opcaoConhecida } from '@/dominio/imovel';
import { ROTULO_SITUACAO_SIMULACAO } from '@/dominio/simulacao';
import { moeda, numero, tempoRelativo } from '@/lib/formato';
import type { SituacaoSimulacao } from '@/lib/supabase/tipos-banco';

export const metadata: Metadata = { title: 'Simulações' };

export default async function PaginaSimulacoes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sessao = await exigirSessao('/simulacoes');

  if (!sessao.pode('simulacao.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao
          papel={ROTULO_PAPEL[sessao.atual.papel]}
          oQue="Simulações de financiamento"
        />
      </div>
    );
  }

  const params = await searchParams;
  const tenantId = sessao.atual.tenant.id;

  const situacao = opcaoConhecida(params.situacao, ROTULO_SITUACAO_SIMULACAO) as
    | SituacaoSimulacao
    | undefined;

  const [resultado, resumo] = await Promise.all([
    listarSimulacoes(tenantId, {
      busca: params.q,
      situacao,
      pagina: Number(params.pagina) || 1,
    }),
    resumirSimulacoes(tenantId),
  ]);

  const temFiltro = Boolean(params.q || situacao);
  const totalPaginas = Math.max(1, Math.ceil(resultado.total / resultado.porPagina));
  const integracaoLigada = homefinEstaConfigurada();

  function urlComPagina(n: number): string {
    const p = new URLSearchParams();
    for (const [chave, valor] of Object.entries(params)) {
      if (valor && chave !== 'pagina') p.set(chave, valor);
    }
    p.set('pagina', String(n));
    return `/simulacoes?${p.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold tracking-tight">Simulações</h1>
          <p className="mt-0.5 text-sm text-texto-secundario">
            {resumo.total === 0
              ? 'Nenhuma simulação ainda'
              : `${numero(resultado.total)} ${resultado.total === 1 ? 'simulação' : 'simulações'} nesta busca`}
          </p>
        </div>

        {sessao.pode('simulacao.criar') && (
          <Botao comoFilho>
            <Link href="/simulacoes/nova">
              <Icone nome="mais" className="size-4" />
              Nova simulação
            </Link>
          </Botao>
        )}
      </div>

      {/* A integração pode estar desligada e o sistema continua útil: a
          simulação é criada, a estimativa aparece, e o envio espera. Dizer isso
          é melhor do que oferecer um botão que sempre falha. */}
      {!integracaoLigada && (
        <EstadoIntegracaoDesconectada
          nome="Homefin"
          oQueFicaIndisponivel="O envio aos bancos fica indisponível. As simulações continuam sendo criadas, e a estimativa é calculada aqui mesmo — mas ela é estimativa, e a tela diz isso."
          href="/configuracoes/integracoes"
        />
      )}

      {resumo.total > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador rotulo="Total" valor={numero(resumo.total)} />
          <Indicador rotulo="Em análise" valor={numero(resumo.emAnalise)} tom="atencao" />
          <Indicador rotulo="Aprovadas" valor={numero(resumo.aprovadas)} tom="sucesso" />
          <Indicador rotulo="Recusadas" valor={numero(resumo.recusadas)} tom="perigo" />
        </div>
      )}

      {resumo.total > 0 && (
        <Cartao className="p-3">
          <form method="get" action="/simulacoes" className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-60 flex-grow items-center gap-2 rounded-lg border border-borda bg-fundo px-3">
              <Icone nome="busca" className="size-4 shrink-0 text-texto-apoio" />
              <label htmlFor="q" className="so-leitor">
                Buscar por código ou nome do cliente
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={params.q ?? ''}
                placeholder="Código ou nome do cliente"
                className="h-9 w-full bg-transparent text-sm text-texto placeholder:text-texto-desabilitado focus:outline-none"
              />
            </div>

            <label htmlFor="situacao" className="so-leitor">
              Filtrar por situação
            </label>
            <select
              id="situacao"
              name="situacao"
              defaultValue={situacao ?? ''}
              className="h-9 rounded-lg border border-borda-controle bg-superficie px-2 text-sm text-texto"
            >
              <option value="">Todas as situações</option>
              {Object.entries(ROTULO_SITUACAO_SIMULACAO).map(([chave, { texto }]) => (
                <option key={chave} value={chave}>
                  {texto}
                </option>
              ))}
            </select>

            <Botao type="submit" tamanho="pequeno">
              Filtrar
            </Botao>

            {temFiltro && (
              <Botao type="button" tipo="fantasma" tamanho="pequeno" comoFilho>
                <Link href="/simulacoes">Limpar</Link>
              </Botao>
            )}
          </form>
        </Cartao>
      )}

      {resumo.total === 0 ? (
        <EstadoPrimeiroAcesso
          titulo="Financiamento antes da visita, não depois"
          descricao="Simule a capacidade de compra do cliente com os bancos antes de levá-lo para ver imóvel. Descobrir que o crédito não sai depois de três visitas custa o fim de semana de todo mundo."
          acao={
            sessao.pode('simulacao.criar')
              ? { rotulo: 'Criar primeira simulação', href: '/simulacoes/nova' }
              : undefined
          }
        />
      ) : resultado.itens.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma simulação com esses filtros"
          descricao="Tente outra combinação, ou limpe os filtros para ver todas."
          acao={{ rotulo: 'Limpar filtros', href: '/simulacoes' }}
        />
      ) : (
        <>
          <Cartao className="overflow-hidden p-0">
            <ul className="divide-y divide-borda">
              {resultado.itens.map((simulacao) => {
                const rotulo = ROTULO_SITUACAO_SIMULACAO[simulacao.situacao];
                return (
                  <li key={simulacao.id}>
                    <Link
                      href={`/simulacoes/${simulacao.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-superficie-hover"
                    >
                      <div className="min-w-48 flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-micro font-semibold tracking-wide text-texto-apoio">
                            {simulacao.codigo}
                          </span>
                          <Chip tom={rotulo.tom}>{rotulo.texto}</Chip>
                        </div>
                        <p className="mt-0.5 font-medium text-texto">
                          {simulacao.pessoa?.nome ?? 'Cliente removido'}
                        </p>
                        {simulacao.imovel && (
                          <p className="linhas-1 text-xs text-texto-apoio">
                            {simulacao.imovel.codigo} · {simulacao.imovel.titulo}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-texto-apoio">Financiamento</p>
                        <p className="font-semibold text-texto">
                          {moeda(simulacao.valor_financiamento)}
                        </p>
                        <p className="text-xs text-texto-apoio">
                          {simulacao.prazo_meses} meses
                        </p>
                      </div>

                      <div className="min-w-32 text-right">
                        {simulacao.melhor_parcela != null ? (
                          <>
                            <p className="text-xs text-texto-apoio">Melhor parcela</p>
                            <p className="font-bold text-sucesso-texto">
                              {moeda(simulacao.melhor_parcela)}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-texto-apoio">
                            {simulacao.enviado_em
                              ? 'Aguardando resposta'
                              : 'Ainda não enviada'}
                          </p>
                        )}
                        <p className="text-micro text-texto-apoio">
                          {simulacao.total_bancos}{' '}
                          {simulacao.total_bancos === 1 ? 'banco' : 'bancos'} ·{' '}
                          {tempoRelativo(simulacao.criado_em)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Cartao>

          {totalPaginas > 1 && (
            <nav
              aria-label="Paginação das simulações"
              className="flex items-center justify-between gap-3"
            >
              <p className="text-sm text-texto-secundario">
                Página {resultado.pagina} de {totalPaginas}
              </p>
              <div className="flex gap-2">
                {resultado.pagina > 1 && (
                  <Botao tipo="neutro" tamanho="pequeno" comoFilho>
                    <Link href={urlComPagina(resultado.pagina - 1)} rel="prev">
                      Anterior
                    </Link>
                  </Botao>
                )}
                {resultado.pagina < totalPaginas && (
                  <Botao tipo="neutro" tamanho="pequeno" comoFilho>
                    <Link href={urlComPagina(resultado.pagina + 1)} rel="next">
                      Próxima
                    </Link>
                  </Botao>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function Indicador({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: string;
  tom?: 'sucesso' | 'atencao' | 'perigo';
}) {
  const cor =
    tom === 'sucesso'
      ? 'text-sucesso-texto'
      : tom === 'atencao'
        ? 'text-atencao-texto'
        : tom === 'perigo'
          ? 'text-perigo-texto'
          : 'text-texto';

  return (
    <Cartao className="p-3">
      <p className="text-micro font-semibold uppercase tracking-wide text-texto-apoio">{rotulo}</p>
      <p className={`mt-1 text-xl font-bold ${cor}`}>{valor}</p>
    </Cartao>
  );
}
