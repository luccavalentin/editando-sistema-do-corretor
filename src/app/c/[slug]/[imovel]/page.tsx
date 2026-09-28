import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { obterAnuncio } from '@/server/consultas/portfolio';
import { urlPublicaDaFoto } from '@/lib/armazenamento/s3';
import { ImagemRemota } from '@/components/ui/imagem-remota';
import { Chip } from '@/components/ui/sinal';
import { Icone } from '@/components/shell/icones';
import {
  CONSERVACOES,
  FINALIDADES,
  TIPOS_DE_IMOVEL,
  USOS,
} from '@/dominio/imovel';
import { moeda } from '@/lib/formato';
import { publico } from '@/lib/ambiente';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; imovel: string }>;
}): Promise<Metadata> {
  const { slug, imovel: slugImovel } = await params;
  const anuncio = await obterAnuncio(slug, slugImovel);

  if (!anuncio) return { title: 'Imóvel não encontrado', robots: { index: false } };

  const { imovel, fotos } = anuncio;
  const preco = imovel.valor != null ? moeda(imovel.valor) : moeda(imovel.valor_aluguel);
  const local = [imovel.bairro, imovel.cidade].filter(Boolean).join(', ');

  // A descrição do anúncio já foi escrita para vender. Usá-la como meta é
  // melhor do que gerar um resumo genérico — e é o texto que aparece no
  // preview do link no WhatsApp, que é por onde a maioria chega.
  const descricao =
    imovel.descricao_publica?.replace(/\s+/g, ' ').trim().slice(0, 160) ??
    `${imovel.titulo} em ${local}. ${preco}.`;

  const capa = fotos.find((f) => f.capa) ?? fotos[0];

  return {
    title: imovel.titulo,
    description: descricao,
    alternates: { canonical: `${publico.urlApp}/c/${slug}/${slugImovel}` },
    openGraph: {
      title: `${imovel.titulo} · ${preco}`,
      description: descricao,
      type: 'website',
      ...(capa
        ? { images: [{ url: capa.url_externa ?? urlPublicaDaFoto(capa.chave) }] }
        : {}),
    },
  };
}

export default function PaginaDoAnuncio(props: {
  params: Promise<{ slug: string; imovel: string }>;
}) {
  return <Anuncio {...props} />;
}

async function Anuncio({ params }: { params: Promise<{ slug: string; imovel: string }> }) {
  const { slug, imovel: slugImovel } = await params;
  const anuncio = await obterAnuncio(slug, slugImovel);
  if (!anuncio) notFound();

  const { imovel, fotos, corretor } = anuncio;
  const nome = corretor.portfolio_titulo ?? corretor.nome;
  const local = [imovel.bairro, imovel.cidade, imovel.uf].filter(Boolean).join(', ');

  const mensagem =
    `Olá! Tenho interesse no imóvel ${imovel.codigo} — ${imovel.titulo}` +
    (local ? ` (${local})` : '') +
    `. ${publico.urlApp}/c/${slug}/${slugImovel}`;

  const whatsapp = corretor.portfolio_whatsapp
    ? `https://wa.me/55${corretor.portfolio_whatsapp}?text=${encodeURIComponent(mensagem)}`
    : null;

  const caracteristicas: { rotulo: string; valor: string }[] = [
    { rotulo: 'Tipo', valor: TIPOS_DE_IMOVEL[imovel.tipo as keyof typeof TIPOS_DE_IMOVEL] ?? imovel.tipo },
    { rotulo: 'Uso', valor: USOS[imovel.uso as keyof typeof USOS] ?? imovel.uso },
    {
      rotulo: 'Conservação',
      valor: CONSERVACOES[imovel.conservacao as keyof typeof CONSERVACOES] ?? imovel.conservacao,
    },
  ];
  if (imovel.area_util != null) {
    caracteristicas.push({ rotulo: 'Área útil', valor: `${imovel.area_util} m²` });
  }
  if (imovel.area_total != null) {
    caracteristicas.push({ rotulo: 'Área total', valor: `${imovel.area_total} m²` });
  }
  if (imovel.quartos != null) caracteristicas.push({ rotulo: 'Quartos', valor: String(imovel.quartos) });
  if (imovel.suites != null) caracteristicas.push({ rotulo: 'Suítes', valor: String(imovel.suites) });
  if (imovel.banheiros != null) {
    caracteristicas.push({ rotulo: 'Banheiros', valor: String(imovel.banheiros) });
  }
  if (imovel.vagas != null) caracteristicas.push({ rotulo: 'Vagas', valor: String(imovel.vagas) });
  if (imovel.andar != null) caracteristicas.push({ rotulo: 'Andar', valor: String(imovel.andar) });
  if (imovel.ano_construcao != null) {
    caracteristicas.push({ rotulo: 'Construção', valor: String(imovel.ano_construcao) });
  }
  if (imovel.mobiliado) caracteristicas.push({ rotulo: 'Mobiliado', valor: 'Sim' });
  if (imovel.aceita_pet) caracteristicas.push({ rotulo: 'Aceita pet', valor: 'Sim' });

  const capa = fotos.find((f) => f.capa) ?? fotos[0];
  const demais = fotos.filter((f) => f.id !== capa?.id);

  return (
    <>
      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 lg:px-6">
          <Link href={`/c/${slug}`} className="min-w-0">
            <span className="linhas-1 text-lg font-bold text-texto">{nome}</span>
            {corretor.creci && (
              <span className="block text-xs text-texto-apoio">{corretor.creci}</span>
            )}
          </Link>
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 shrink-0 items-center rounded-lg bg-acao px-4 text-sm font-semibold text-acao-texto transition-colors hover:bg-acao-hover"
            >
              Falar com o corretor
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-5 lg:px-6">
        <Link
          href={`/c/${slug}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-link hover:underline"
        >
          <Icone nome="voltar" className="size-4" />
          Todos os imóveis
        </Link>

        {/* --------------------------------------------------- galeria */}
        {capa && (
          <div className="mb-5 grid grid-cols-1 gap-2 lg:grid-cols-4">
            <div className="lg:col-span-3">
              <ImagemRemota
                src={capa.url_externa ?? urlPublicaDaFoto(capa.chave)}
                alt={capa.legenda ?? imovel.titulo}
                proporcao="aspect-[16/10] rounded-xl"
                prioritaria
              />
            </div>
            {demais.length > 0 && (
              <ul className="grid grid-cols-4 gap-2 lg:grid-cols-1">
                {demais.slice(0, 4).map((foto) => (
                  <li key={foto.id}>
                    <ImagemRemota
                      src={foto.url_externa ?? urlPublicaDaFoto(foto.chave)}
                      alt={foto.legenda ?? `Foto de ${imovel.titulo}`}
                      proporcao="aspect-[4/3] rounded-lg"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {demais.length > 4 && (
          <ul className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {demais.slice(4).map((foto) => (
              <li key={foto.id}>
                <ImagemRemota
                  src={foto.url_externa ?? urlPublicaDaFoto(foto.chave)}
                  alt={foto.legenda ?? `Foto de ${imovel.titulo}`}
                  proporcao="aspect-[4/3] rounded-lg"
                />
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              <Chip tom="acao">
                {FINALIDADES[imovel.finalidade as keyof typeof FINALIDADES] ?? imovel.finalidade}
              </Chip>
              {imovel.situacao === 'reservado' && <Chip tom="atencao">Reservado</Chip>}
              <Chip>{imovel.codigo}</Chip>
            </div>

            <h1 className="text-2xl font-bold leading-tight tracking-tight lg:text-3xl">
              {imovel.titulo}
            </h1>
            <p className="mt-1 text-md text-texto-secundario">
              {imovel.endereco_publico ? `${imovel.endereco_publico} — ${local}` : local}
            </p>

            {imovel.descricao_publica && (
              <div className="mt-5">
                <h2 className="mb-2 text-lg font-semibold text-texto">Sobre o imóvel</h2>
                <p className="whitespace-pre-wrap leading-relaxed text-texto-secundario">
                  {imovel.descricao_publica}
                </p>
              </div>
            )}

            <div className="mt-5">
              <h2 className="mb-2 text-lg font-semibold text-texto">Características</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {caracteristicas.map((c) => (
                  <div key={c.rotulo} className="border-b border-borda pb-2">
                    <dt className="text-xs text-texto-apoio">{c.rotulo}</dt>
                    <dd className="font-medium text-texto">{c.valor}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {imovel.comodidades.length > 0 && (
              <div className="mt-5">
                <h2 className="mb-2 text-lg font-semibold text-texto">O que tem no imóvel</h2>
                <ul className="flex flex-wrap gap-1.5">
                  {imovel.comodidades.map((comodidade) => (
                    <li key={comodidade}>
                      <Chip tamanho="medio">{comodidade}</Chip>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ------------------------------------------------- preço */}
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-xl border border-borda bg-superficie p-4">
              {imovel.valor != null && (
                <>
                  <p className="text-xs text-texto-apoio">Valor de venda</p>
                  <p className="text-3xl font-bold leading-tight text-texto">
                    {moeda(imovel.valor)}
                  </p>
                </>
              )}
              {imovel.valor_aluguel != null && (
                <div className={imovel.valor != null ? 'mt-3' : ''}>
                  <p className="text-xs text-texto-apoio">Aluguel</p>
                  <p className="text-2xl font-bold leading-tight text-texto">
                    {moeda(imovel.valor_aluguel)}
                    <span className="text-md font-normal text-texto-secundario">/mês</span>
                  </p>
                </div>
              )}

              <dl className="mt-3 flex flex-col gap-1.5 border-t border-borda pt-3 text-sm">
                {imovel.valor_condominio != null && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-texto-apoio">Condomínio</dt>
                    <dd className="font-medium text-texto">{moeda(imovel.valor_condominio)}</dd>
                  </div>
                )}
                {imovel.valor_iptu != null && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-texto-apoio">IPTU (ano)</dt>
                    <dd className="font-medium text-texto">{moeda(imovel.valor_iptu)}</dd>
                  </div>
                )}
              </dl>

              {(imovel.aceita_financiamento || imovel.aceita_fgts) && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-borda pt-3">
                  {imovel.aceita_financiamento && <Chip tom="sucesso">Aceita financiamento</Chip>}
                  {imovel.aceita_fgts && <Chip tom="sucesso">Aceita FGTS</Chip>}
                </div>
              )}

              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-acao text-md font-semibold text-acao-texto transition-colors hover:bg-acao-hover"
                >
                  Tenho interesse
                </a>
              )}

              {corretor.portfolio_email && (
                <a
                  href={`mailto:${corretor.portfolio_email}?subject=${encodeURIComponent(`Interesse no imóvel ${imovel.codigo}`)}`}
                  className="mt-2 flex h-11 w-full items-center justify-center rounded-lg border border-borda text-sm font-semibold text-texto transition-colors hover:bg-superficie-hover"
                >
                  Enviar e-mail
                </a>
              )}

              <p className="mt-3 text-xs text-texto-apoio">
                Anunciado por {nome}
                {corretor.creci ? ` · ${corretor.creci}` : ''}
              </p>
            </div>
          </aside>
        </div>
      </main>

      <script
        type="application/ld+json"
        // Seguro e necessário: `JSON.stringify` de dados do próprio banco, não
        // HTML. É o único jeito de o JSON-LD chegar ao buscador sem o React
        // escapar as aspas.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': imovel.finalidade === 'aluguel' ? 'RentAction' : 'Product',
            name: imovel.titulo,
            ...(imovel.descricao_publica ? { description: imovel.descricao_publica } : {}),
            sku: imovel.codigo,
            ...(capa
              ? { image: [capa.url_externa ?? urlPublicaDaFoto(capa.chave)] }
              : {}),
            offers: {
              '@type': 'Offer',
              price: imovel.valor ?? imovel.valor_aluguel ?? undefined,
              priceCurrency: 'BRL',
              availability:
                imovel.situacao === 'disponivel'
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/LimitedAvailability',
              url: `${publico.urlApp}/c/${slug}/${slugImovel}`,
              seller: { '@type': 'RealEstateAgent', name: nome },
            },
          }),
        }}
      />
    </>
  );
}
