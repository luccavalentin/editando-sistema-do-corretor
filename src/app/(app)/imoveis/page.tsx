import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { cidadesComImovel, listarImoveis, resumirImoveis } from '@/server/consultas/imoveis';
import { armazenamentoDisponivel, urlPublicaDaFoto } from '@/lib/armazenamento/s3';
import { Botao } from '@/components/ui/botao';
import { Cartao } from '@/components/ui/cartao';
import { Chip } from '@/components/ui/sinal';
import { ImagemRemota } from '@/components/ui/imagem-remota';
import { EstadoPrimeiroAcesso, EstadoSemPermissao, EstadoVazio } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import {
  FINALIDADES,
  opcaoConhecida,
  resumirCaracteristicas,
  SITUACOES_DE_IMOVEL,
  TIPOS_DE_IMOVEL,
} from '@/dominio/imovel';
import { moeda, numero, tempoRelativo } from '@/lib/formato';

export const metadata: Metadata = { title: 'Imóveis' };

/** Cor do chip de situação. Cada estado tem texto próprio, nunca só cor. */
const TOM_DA_SITUACAO: Record<string, 'neutro' | 'sucesso' | 'atencao' | 'perigo' | 'acao'> = {
  rascunho: 'neutro',
  disponivel: 'sucesso',
  reservado: 'atencao',
  em_negociacao: 'acao',
  vendido: 'neutro',
  alugado: 'neutro',
  suspenso: 'perigo',
};

export default async function PaginaImoveis({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sessao = await exigirSessao('/imoveis');

  if (!sessao.pode('imoveis.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Carteira de imóveis" />
      </div>
    );
  }

  const params = await searchParams;
  const tenantId = sessao.atual.tenant.id;

  const [resultado, resumo, cidades] = await Promise.all([
    listarImoveis(tenantId, {
      busca: params.q,
      situacao: opcaoConhecida(params.situacao, SITUACOES_DE_IMOVEL),
      finalidade: opcaoConhecida(params.finalidade, FINALIDADES),
      tipo: opcaoConhecida(params.tipo, TIPOS_DE_IMOVEL),
      cidade: params.cidade,
      quartosMin: params.quartos ? Number(params.quartos) : undefined,
      apenasPublicados: params.publicados === '1',
      ordem: (params.ordem as 'recentes' | undefined) ?? 'recentes',
      pagina: Number(params.pagina) || 1,
    }),
    resumirImoveis(tenantId),
    cidadesComImovel(tenantId),
  ]);

  const temFiltro = Boolean(
    params.q ||
      params.situacao ||
      params.finalidade ||
      params.tipo ||
      params.cidade ||
      params.quartos ||
      params.publicados === '1',
  );

  const totalPaginas = Math.max(1, Math.ceil(resultado.total / resultado.porPagina));
  const podeVerFotos = armazenamentoDisponivel();

  function urlComPagina(n: number): string {
    const p = new URLSearchParams();
    for (const [chave, valor] of Object.entries(params)) {
      if (valor && chave !== 'pagina') p.set(chave, valor);
    }
    p.set('pagina', String(n));
    return `/imoveis?${p.toString()}`;
  }

  // Carteira vazia de verdade é diferente de busca sem resultado. Confundir os
  // dois faz o corretor achar que perdeu os imóveis.
  const carteiraVazia = resumo.total === 0 && !temFiltro;

  return (
    <div className="flex flex-col gap-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold tracking-tight">Imóveis</h1>
          <p className="mt-0.5 text-sm text-texto-secundario">
            {carteiraVazia
              ? 'Nenhum imóvel cadastrado ainda'
              : `${numero(resultado.total)} ${resultado.total === 1 ? 'imóvel' : 'imóveis'} nesta busca`}
          </p>
        </div>

        {sessao.pode('imoveis.criar') && (
          <Botao comoFilho>
            <Link href="/imoveis/novo">
              <Icone nome="mais" className="size-4" />
              Novo imóvel
            </Link>
          </Botao>
        )}
      </div>

      {!carteiraVazia && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador rotulo="Na carteira" valor={numero(resumo.total)} />
          <Indicador rotulo="Disponíveis" valor={numero(resumo.disponiveis)} />
          <Indicador rotulo="No portfólio" valor={numero(resumo.publicados)} />
          <Indicador rotulo="Visualizações" valor={numero(resumo.visualizacoes)} />
        </div>
      )}

      {/* Filtros em formulário GET: o estado mora na URL, então voltar funciona,
          o link é compartilhável com a equipe e a página serve sem JavaScript. */}
      {!carteiraVazia && (
        <Cartao className="p-3">
          <form method="get" action="/imoveis" className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-60 flex-grow items-center gap-2 rounded-lg border border-borda bg-fundo px-3">
              <Icone nome="busca" className="size-4 shrink-0 text-texto-apoio" />
              <label htmlFor="q" className="so-leitor">
                Buscar por título, bairro, cidade ou código
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={params.q ?? ''}
                placeholder="Título, bairro, cidade ou código"
                className="h-9 w-full bg-transparent text-sm text-texto placeholder:text-texto-desabilitado focus:outline-none"
              />
            </div>

            <SeletorFiltro
              id="situacao"
              rotulo="Situação"
              padrao="Todas as situações"
              valor={params.situacao}
              opcoes={Object.entries(SITUACOES_DE_IMOVEL)}
            />
            <SeletorFiltro
              id="finalidade"
              rotulo="Finalidade"
              padrao="Venda e aluguel"
              valor={params.finalidade}
              opcoes={Object.entries(FINALIDADES)}
            />
            <SeletorFiltro
              id="tipo"
              rotulo="Tipo"
              padrao="Todos os tipos"
              valor={params.tipo}
              opcoes={Object.entries(TIPOS_DE_IMOVEL)}
            />

            {cidades.length > 1 && (
              <SeletorFiltro
                id="cidade"
                rotulo="Cidade"
                padrao="Todas as cidades"
                valor={params.cidade}
                opcoes={cidades.map((c) => [c, c])}
              />
            )}

            <label className="flex h-9 items-center gap-2 rounded-lg border border-borda px-3 text-sm text-texto-secundario">
              <input
                type="checkbox"
                name="publicados"
                value="1"
                defaultChecked={params.publicados === '1'}
                className="size-4 accent-[var(--cor-acao)]"
              />
              No portfólio
            </label>

            <Botao type="submit" tamanho="pequeno">
              Filtrar
            </Botao>

            {temFiltro && (
              <Botao type="button" tipo="fantasma" tamanho="pequeno" comoFilho>
                <Link href="/imoveis">Limpar</Link>
              </Botao>
            )}
          </form>
        </Cartao>
      )}

      {carteiraVazia ? (
        <EstadoPrimeiroAcesso
          titulo="Sua carteira de imóveis começa aqui"
          descricao="Cadastre o primeiro imóvel para montar seu portfólio, ligar anúncios a negócios e simular financiamento a partir do valor real."
          acao={
            sessao.pode('imoveis.criar')
              ? { rotulo: 'Cadastrar imóvel', href: '/imoveis/novo' }
              : undefined
          }
        />
      ) : resultado.itens.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum imóvel com esses filtros"
          descricao="Tente outra combinação, ou limpe os filtros para ver a carteira inteira."
          acao={{ rotulo: 'Limpar filtros', href: '/imoveis' }}
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {resultado.itens.map((imovel) => (
              <li key={imovel.id}>
                <Link
                  href={`/imoveis/${imovel.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-borda bg-superficie transition-colors hover:border-acao focus-visible:outline-offset-2"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-superficie-afundada">
                    {imovel.capa && podeVerFotos ? (
                      <ImagemRemota
                        src={urlPublicaDaFoto(imovel.capa.chave)}
                        alt={imovel.capa.legenda ?? `Foto de ${imovel.titulo}`}
                        proporcao="size-full"
                      />
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center gap-1 text-texto-desabilitado">
                        <Icone nome="predio" className="size-8" />
                        <span className="text-micro">Sem foto</span>
                      </div>
                    )}

                    <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                      <Chip tom={TOM_DA_SITUACAO[imovel.situacao] ?? 'neutro'}>
                        {SITUACOES_DE_IMOVEL[imovel.situacao as keyof typeof SITUACOES_DE_IMOVEL] ??
                          imovel.situacao}
                      </Chip>
                      {imovel.visivel_no_portfolio && (
                        <Chip tom="acao">
                          <Icone nome="globo" className="size-3" />
                          No ar
                        </Chip>
                      )}
                      {imovel.exclusividade && <Chip tom="atencao">Exclusivo</Chip>}
                    </div>
                  </div>

                  <div className="flex flex-grow flex-col gap-1.5 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-micro font-semibold tracking-wide text-texto-apoio">
                        {imovel.codigo}
                      </span>
                      <span className="text-micro text-texto-apoio">
                        {tempoRelativo(imovel.atualizado_em)}
                      </span>
                    </div>

                    <h2 className="linhas-2 font-semibold leading-snug text-texto">
                      {imovel.titulo}
                    </h2>

                    <p className="text-sm text-texto-secundario">
                      {[imovel.bairro, imovel.cidade].filter(Boolean).join(', ') ||
                        'Endereço não informado'}
                    </p>

                    <p className="text-xs text-texto-apoio">
                      {resumirCaracteristicas(imovel) || 'Características não informadas'}
                    </p>

                    <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                      <div>
                        {imovel.valor != null && (
                          <p className="text-lg font-bold leading-none text-texto">
                            {moeda(imovel.valor)}
                          </p>
                        )}
                        {imovel.valor_aluguel != null && (
                          <p className="text-sm font-semibold text-texto-secundario">
                            {moeda(imovel.valor_aluguel)}
                            <span className="text-xs font-normal">/mês</span>
                          </p>
                        )}
                        {imovel.valor == null && imovel.valor_aluguel == null && (
                          <p className="text-sm text-texto-apoio">Preço a definir</p>
                        )}
                      </div>

                      {imovel.visualizacoes > 0 && (
                        <span className="flex items-center gap-1 text-micro text-texto-apoio">
                          <Icone nome="grafico" className="size-3" />
                          {numero(imovel.visualizacoes)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {totalPaginas > 1 && (
            <nav
              aria-label="Paginação dos imóveis"
              className="flex items-center justify-between gap-3 pt-1"
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

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <Cartao className="p-3">
      <p className="text-micro font-semibold uppercase tracking-wide text-texto-apoio">{rotulo}</p>
      <p className="mt-1 text-xl font-bold text-texto">{valor}</p>
    </Cartao>
  );
}

function SeletorFiltro({
  id,
  rotulo,
  padrao,
  valor,
  opcoes,
}: {
  id: string;
  rotulo: string;
  padrao: string;
  valor: string | undefined;
  opcoes: [string, string][];
}) {
  return (
    <>
      <label htmlFor={id} className="so-leitor">
        {rotulo}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={valor ?? ''}
        className="h-9 rounded-lg border border-borda-controle bg-superficie px-2 text-sm text-texto"
      >
        <option value="">{padrao}</option>
        {opcoes.map(([chave, texto]) => (
          <option key={chave} value={chave}>
            {texto}
          </option>
        ))}
      </select>
    </>
  );
}
