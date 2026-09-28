import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  cidadesDaVitrine,
  listarImoveisDaVitrine,
  obterCorretorPorSlug,
} from '@/server/consultas/portfolio';
import { urlPublicaDaFoto } from '@/lib/armazenamento/s3';
import { ImagemRemota } from '@/components/ui/imagem-remota';
import { Chip } from '@/components/ui/sinal';
import {
  FINALIDADES,
  opcaoConhecida,
  resumirCaracteristicas,
  TIPOS_DE_IMOVEL,
} from '@/dominio/imovel';
import { moeda, numero } from '@/lib/formato';
import { publico } from '@/lib/ambiente';

/**
 * A vitrine do corretor.
 *
 * Esta página é o produto virado para fora: é o que o corretor manda no
 * WhatsApp e o que o Google indexa. Três decisões vêm daí:
 *
 *   1. O cache está nas CONSULTAS, não na página. Ler `searchParams` — que os
 *      filtros exigem — torna qualquer página dinâmica no Next, então um
 *      `export const revalidate` aqui não faria nada. Quem carrega o cache é
 *      `consultas/portfolio.ts`: mil visitantes viram uma consulta ao banco, e
 *      o React roda mil vezes em cima do mesmo dado, que é barato.
 *   2. Nenhuma leitura de cookie, e o middleware nem pergunta quem é o
 *      visitante nesta rota. Uma ida de rede a menos por visita.
 *   3. Dados estruturados (JSON-LD) no fim. Sem eles o resultado no Google é
 *      uma linha de texto; com eles, aparece preço, quartos e foto.
 */

const TOTAL_DE_FILTROS_VISIVEIS = 1;

export default async function VitrineDoCorretor({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const consulta = await searchParams;

  const corretor = await obterCorretorPorSlug(slug);
  if (!corretor) notFound();

  const [vitrine, cidades] = await Promise.all([
    listarImoveisDaVitrine(corretor.id, {
      finalidade: opcaoConhecida(consulta.finalidade, FINALIDADES),
      tipo: opcaoConhecida(consulta.tipo, TIPOS_DE_IMOVEL),
      cidade: consulta.cidade,
      quartos: consulta.quartos ? Number(consulta.quartos) : undefined,
      precoMax: consulta.ate ? Number(consulta.ate) : undefined,
      ordem: consulta.ordem as 'recentes' | undefined,
      pagina: Number(consulta.pagina) || 1,
    }),
    cidadesDaVitrine(corretor.id),
  ]);

  const nome = corretor.portfolio_titulo ?? corretor.nome;
  const totalPaginas = Math.max(1, Math.ceil(vitrine.total / vitrine.porPagina));
  const temFiltro = Boolean(
    consulta.finalidade || consulta.tipo || consulta.cidade || consulta.quartos || consulta.ate,
  );

  function urlCom(mudanca: Record<string, string | undefined>): string {
    const p = new URLSearchParams();
    for (const [chave, valor] of Object.entries({ ...consulta, ...mudanca })) {
      if (valor) p.set(chave, valor);
    }
    const texto = p.toString();
    return texto ? `/c/${slug}?${texto}` : `/c/${slug}`;
  }

  /**
   * Link de WhatsApp com a mensagem já escrita.
   *
   * Quem chega numa vitrine não sabe o que dizer. Mensagem pronta com o código
   * do imóvel é a diferença entre um contato e uma aba fechada — e o corretor
   * recebe já sabendo de qual anúncio se trata.
   */
  function linkWhatsApp(texto: string): string | null {
    if (!corretor?.portfolio_whatsapp) return null;
    return `https://wa.me/55${corretor.portfolio_whatsapp}?text=${encodeURIComponent(texto)}`;
  }

  const whatsappGeral = linkWhatsApp(`Olá! Vi seus imóveis no site e gostaria de mais informações.`);

  return (
    <>
      {/* --------------------------------------------------- cabeçalho */}
      <header className="gradiente-menu text-[var(--cor-menu-texto)]">
        <div className="textura-pontos">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 lg:px-6 lg:py-14">
            <div className="flex flex-wrap items-center gap-4">
              {corretor.portfolio_logo_chave && (
                <ImagemRemota
                  src={urlPublicaDaFoto(corretor.portfolio_logo_chave)}
                  alt={`Logo de ${nome}`}
                  proporcao="size-16 rounded-xl"
                  prioritaria
                />
              )}
              <div className="min-w-0">
                <h1 className="text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
                  {nome}
                </h1>
                {corretor.creci && (
                  <p className="mt-1 text-sm opacity-90">{corretor.creci}</p>
                )}
              </div>
            </div>

            {corretor.portfolio_bio && (
              <p className="max-w-2xl text-md leading-relaxed opacity-95">
                {corretor.portfolio_bio}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {whatsappGeral && (
                <a
                  href={whatsappGeral}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--cor-menu-texto)] px-5 text-md font-semibold text-[var(--cor-marca-escura)] transition-opacity hover:opacity-90"
                >
                  Falar no WhatsApp
                </a>
              )}
              {corretor.portfolio_email && (
                <a
                  href={`mailto:${corretor.portfolio_email}`}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-[var(--cor-menu-texto)]/40 px-5 text-md font-semibold transition-colors hover:bg-white/10"
                >
                  Enviar e-mail
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 lg:px-6 lg:py-8">
        {/* ------------------------------------------------ filtros */}
        <form
          method="get"
          action={`/c/${slug}`}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-borda bg-superficie p-3"
        >
          <label htmlFor="finalidade" className="so-leitor">
            Comprar ou alugar
          </label>
          <select
            id="finalidade"
            name="finalidade"
            defaultValue={consulta.finalidade ?? ''}
            className="h-10 rounded-lg border border-borda-controle bg-superficie px-2.5 text-sm text-texto"
          >
            <option value="">Comprar ou alugar</option>
            <option value="venda">Comprar</option>
            <option value="aluguel">Alugar</option>
          </select>

          <label htmlFor="tipo" className="so-leitor">
            Tipo de imóvel
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={consulta.tipo ?? ''}
            className="h-10 rounded-lg border border-borda-controle bg-superficie px-2.5 text-sm text-texto"
          >
            <option value="">Qualquer tipo</option>
            {Object.entries(TIPOS_DE_IMOVEL).map(([chave, rotulo]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </select>

          {cidades.length > TOTAL_DE_FILTROS_VISIVEIS && (
            <>
              <label htmlFor="cidade" className="so-leitor">
                Cidade
              </label>
              <select
                id="cidade"
                name="cidade"
                defaultValue={consulta.cidade ?? ''}
                className="h-10 rounded-lg border border-borda-controle bg-superficie px-2.5 text-sm text-texto"
              >
                <option value="">Todas as cidades</option>
                {cidades.map((cidade) => (
                  <option key={cidade} value={cidade}>
                    {cidade}
                  </option>
                ))}
              </select>
            </>
          )}

          <label htmlFor="quartos" className="so-leitor">
            Mínimo de quartos
          </label>
          <select
            id="quartos"
            name="quartos"
            defaultValue={consulta.quartos ?? ''}
            className="h-10 rounded-lg border border-borda-controle bg-superficie px-2.5 text-sm text-texto"
          >
            <option value="">Quartos</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>

          <button
            type="submit"
            className="h-10 rounded-lg bg-acao px-5 text-sm font-semibold text-acao-texto transition-colors hover:bg-acao-hover"
          >
            Buscar
          </button>

          {temFiltro && (
            <Link
              href={`/c/${slug}`}
              className="h-10 content-center px-3 text-sm font-medium text-link hover:underline"
            >
              Limpar
            </Link>
          )}
        </form>

        <p className="text-sm text-texto-secundario">
          {vitrine.total === 0
            ? 'Nenhum imóvel encontrado com esses filtros'
            : `${numero(vitrine.total)} ${vitrine.total === 1 ? 'imóvel disponível' : 'imóveis disponíveis'}`}
        </p>

        {/* ------------------------------------------------ anúncios */}
        {vitrine.itens.length === 0 ? (
          <div className="rounded-xl border border-borda bg-superficie px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-texto">
              {temFiltro ? 'Nada com esses filtros' : 'Nenhum imóvel no ar agora'}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-texto-secundario">
              {temFiltro
                ? 'Tente outra combinação, ou fale direto comigo: posso ter algo que ainda não está no site.'
                : 'Estou atualizando a lista. Me chame no WhatsApp e conto o que tenho disponível.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {temFiltro && (
                <Link
                  href={`/c/${slug}`}
                  className="inline-flex h-10 items-center rounded-lg border border-borda bg-superficie px-4 text-sm font-semibold text-texto"
                >
                  Ver todos
                </Link>
              )}
              {whatsappGeral && (
                <a
                  href={whatsappGeral}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-lg bg-acao px-4 text-sm font-semibold text-acao-texto"
                >
                  Falar no WhatsApp
                </a>
              )}
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vitrine.itens.map((imovel, indice) => (
              <li key={imovel.id}>
                <Link
                  href={`/c/${slug}/${imovel.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-borda bg-superficie transition-shadow hover:shadow-md"
                >
                  {imovel.capa ? (
                    <ImagemRemota
                      src={imovel.capa.url_externa ?? urlPublicaDaFoto(imovel.capa.chave)}
                      alt={imovel.capa.legenda ?? imovel.titulo}
                      // As três primeiras estão acima da dobra no desktop.
                      prioritaria={indice < 3}
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-superficie-afundada text-sm text-texto-desabilitado">
                      Sem foto
                    </div>
                  )}

                  <div className="flex flex-grow flex-col gap-1.5 p-4">
                    <div className="flex flex-wrap gap-1">
                      <Chip tom="acao">
                        {FINALIDADES[imovel.finalidade as keyof typeof FINALIDADES] ??
                          imovel.finalidade}
                      </Chip>
                      {imovel.situacao === 'reservado' && <Chip tom="atencao">Reservado</Chip>}
                    </div>

                    <h2 className="linhas-2 font-semibold leading-snug text-texto">
                      {imovel.titulo}
                    </h2>

                    <p className="text-sm text-texto-secundario">
                      {[imovel.bairro, imovel.cidade].filter(Boolean).join(', ')}
                    </p>

                    <p className="text-xs text-texto-apoio">{resumirCaracteristicas(imovel)}</p>

                    <div className="mt-auto pt-2">
                      {imovel.valor != null && (
                        <p className="text-xl font-bold leading-none text-texto">
                          {moeda(imovel.valor)}
                        </p>
                      )}
                      {imovel.valor_aluguel != null && (
                        <p className="text-md font-semibold text-texto-secundario">
                          {moeda(imovel.valor_aluguel)}
                          <span className="text-sm font-normal">/mês</span>
                        </p>
                      )}
                      {imovel.valor_condominio != null && (
                        <p className="mt-0.5 text-xs text-texto-apoio">
                          Condomínio {moeda(imovel.valor_condominio)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPaginas > 1 && (
          <nav aria-label="Páginas de imóveis" className="flex items-center justify-between gap-3">
            <p className="text-sm text-texto-secundario">
              Página {vitrine.pagina} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              {vitrine.pagina > 1 && (
                <Link
                  rel="prev"
                  href={urlCom({ pagina: String(vitrine.pagina - 1) })}
                  className="inline-flex h-10 items-center rounded-lg border border-borda bg-superficie px-4 text-sm font-semibold text-texto"
                >
                  Anterior
                </Link>
              )}
              {vitrine.pagina < totalPaginas && (
                <Link
                  rel="next"
                  href={urlCom({ pagina: String(vitrine.pagina + 1) })}
                  className="inline-flex h-10 items-center rounded-lg border border-borda bg-superficie px-4 text-sm font-semibold text-texto"
                >
                  Próxima
                </Link>
              )}
            </div>
          </nav>
        )}
      </main>

      <footer className="border-t border-borda bg-superficie">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-texto-apoio lg:px-6">
          <p>
            {nome}
            {corretor.creci ? ` · ${corretor.creci}` : ''}
          </p>
        </div>
      </footer>

      {/* Dados estruturados: é o que faz o resultado no Google mostrar preço e
          foto em vez de uma linha de texto. `RealEstateAgent` é o tipo que o
          schema.org define para quem intermedeia imóvel. */}
      <script
        type="application/ld+json"
        // `dangerouslySetInnerHTML` aqui é seguro e necessário: o conteúdo é
        // `JSON.stringify` de dados do próprio banco, não HTML, e `<script>` é
        // o único lugar onde o React não escapa o texto. Sem isso o JSON-LD
        // sairia com `&quot;` no lugar das aspas e nenhum buscador o leria.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'RealEstateAgent',
            name: nome,
            url: `${publico.urlApp}/c/${slug}`,
            ...(corretor.portfolio_bio ? { description: corretor.portfolio_bio } : {}),
            ...(corretor.portfolio_email ? { email: corretor.portfolio_email } : {}),
            ...(corretor.portfolio_whatsapp
              ? { telephone: `+55${corretor.portfolio_whatsapp}` }
              : {}),
          }),
        }}
      />
    </>
  );
}
