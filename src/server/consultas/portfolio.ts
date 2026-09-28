import 'server-only';

import { unstable_cache } from 'next/cache';

import { clientePublico } from '@/lib/supabase/servidor';
import type { FinalidadeImovel, TipoImovel } from '@/lib/supabase/tipos-banco';

/**
 * Consultas da vitrine pública.
 *
 * Tudo aqui roda como `anon`, sem sessão. É a única parte do sistema em que um
 * desconhecido alcança o banco, e a fronteira foi medida nas migrações 0010 e
 * 0012: privilégio coluna a coluna mais política de linha. As views
 * `portfolio_*` são conveniência de leitura, não a proteção — mesmo que alguém
 * consulte a tabela direto daqui, as colunas privadas não vêm.
 *
 * Nenhuma função deste arquivo aceita o `tenant_id` como filtro de segurança: o
 * que decide é o `slug` público mais a política. Passar tenant explícito daria
 * a impressão errada de que é o código que isola.
 *
 * O CACHE ESTÁ AQUI, E NÃO NA PÁGINA
 *
 * A vitrine usa filtros na URL, e uma página que lê `searchParams` é sempre
 * renderizada sob demanda no Next — `export const revalidate` não a alcança.
 * Cachear a PÁGINA, portanto, não é opção.
 *
 * Mas a parte cara não é montar o HTML: é a ida ao banco. Cacheando a consulta,
 * mil visitantes pedindo a mesma vitrine fazem uma consulta, não mil, e o React
 * roda mil vezes em cima do mesmo dado — que é barato.
 *
 * Cada entrada leva a etiqueta `vitrine:<tenant>`, para o corretor poder ver o
 * anúncio novo no ar sem esperar o tempo passar.
 */

/** Cinco minutos. Anúncio novo demorar isso não custa nada; consultar o banco a cada visita, sim. */
const SEGUNDOS_DE_CACHE = 300;

/** Etiqueta para derrubar o cache da vitrine de um corretor específico. */
export function etiquetaDaVitrine(tenantId: string): string {
  return `vitrine:${tenantId}`;
}

export interface CorretorPublico {
  id: string;
  nome: string;
  slug: string;
  creci: string | null;
  portfolio_titulo: string | null;
  portfolio_bio: string | null;
  portfolio_whatsapp: string | null;
  portfolio_email: string | null;
  portfolio_logo_chave: string | null;
  portfolio_capa_chave: string | null;
}

export interface ImovelPublico {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  finalidade: string;
  situacao: string;
  uso: string;
  conservacao: string;
  slug: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  endereco_publico: string | null;
  latitude_publica: number | null;
  longitude_publica: number | null;
  valor: number | null;
  valor_aluguel: number | null;
  valor_condominio: number | null;
  valor_iptu: number | null;
  aceita_financiamento: boolean;
  aceita_fgts: boolean;
  area_util: number | null;
  area_total: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  andar: number | null;
  ano_construcao: number | null;
  mobiliado: boolean;
  aceita_pet: boolean;
  comodidades: string[];
  descricao_publica: string | null;
  publicado_em: string | null;
  tenant_id: string;
}

export interface FotoPublica {
  id: string;
  imovel_id: string;
  chave: string;
  url_externa: string | null;
  legenda: string | null;
  ordem: number;
  capa: boolean;
  largura: number | null;
  altura: number | null;
}

/** Acha o corretor pela URL. `null` quando a vitrine não existe ou está desligada. */
export const obterCorretorPorSlug = unstable_cache(
  async (slug: string): Promise<CorretorPublico | null> => {
    const supabase = clientePublico();

    const { data } = await supabase
      .from('portfolio_corretores')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    return (data as CorretorPublico | null) ?? null;
  },
  ['portfolio-corretor'],
  { revalidate: SEGUNDOS_DE_CACHE, tags: ['vitrine'] },
);

export interface FiltroPublico {
  finalidade?: FinalidadeImovel | undefined;
  tipo?: TipoImovel | undefined;
  cidade?: string | undefined;
  quartos?: number | undefined;
  precoMax?: number | undefined;
  ordem?: 'recentes' | 'menor_preco' | 'maior_preco' | undefined;
  pagina?: number | undefined;
}

const POR_PAGINA = 12;

export interface VitrineDeImoveis {
  itens: (ImovelPublico & { capa: FotoPublica | null })[];
  total: number;
  pagina: number;
  porPagina: number;
}

async function consultarImoveisDaVitrine(
  tenantId: string,
  filtro: FiltroPublico,
): Promise<VitrineDeImoveis> {
  const supabase = clientePublico();
  const pagina = Math.max(1, filtro.pagina ?? 1);
  const de = (pagina - 1) * POR_PAGINA;

  let consulta = supabase
    .from('portfolio_imoveis')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filtro.finalidade) consulta = consulta.eq('finalidade', filtro.finalidade);
  if (filtro.tipo) consulta = consulta.eq('tipo', filtro.tipo);
  if (filtro.cidade) consulta = consulta.eq('cidade', filtro.cidade);
  if (filtro.quartos != null) consulta = consulta.gte('quartos', filtro.quartos);

  // O comprador pensa em teto, não em faixa: "até 600 mil". Um imóvel só de
  // aluguel entra pela outra coluna, senão ele some da busca por preço.
  if (filtro.precoMax != null) {
    consulta = consulta.or(`valor.lte.${filtro.precoMax},valor_aluguel.lte.${filtro.precoMax}`);
  }

  switch (filtro.ordem) {
    case 'menor_preco':
      consulta = consulta.order('valor', { ascending: true, nullsFirst: false });
      break;
    case 'maior_preco':
      consulta = consulta.order('valor', { ascending: false, nullsFirst: false });
      break;
    default:
      consulta = consulta.order('publicado_em', { ascending: false, nullsFirst: false });
  }

  const { data, count } = await consulta.range(de, de + POR_PAGINA - 1);
  const itens = ((data ?? []) as unknown as ImovelPublico[]).map((i) => ({
    ...i,
    capa: null as FotoPublica | null,
  }));

  // Uma consulta para todas as capas. Uma por cartão seria N+1 numa página que
  // precisa abrir rápido no 4G de quem está procurando imóvel no celular.
  if (itens.length > 0) {
    const { data: fotos } = await supabase
      .from('portfolio_midias')
      .select('*')
      .in(
        'imovel_id',
        itens.map((i) => i.id),
      )
      .eq('capa', true);

    const porImovel = new Map(
      ((fotos ?? []) as unknown as FotoPublica[]).map((f) => [f.imovel_id, f]),
    );
    for (const item of itens) item.capa = porImovel.get(item.id) ?? null;
  }

  return { itens, total: count ?? 0, pagina, porPagina: POR_PAGINA };
}

/**
 * A listagem, com cache por combinação de filtros.
 *
 * A chave inclui o filtro serializado: duas buscas diferentes são duas
 * entradas. Isso significa que um visitante curioso pode criar muitas entradas
 * combinando filtros — mas as opções são finitas (finalidade × tipo × cidade ×
 * quartos) e cada entrada expira em cinco minutos, então o teto é baixo.
 */
export function listarImoveisDaVitrine(
  tenantId: string,
  filtro: FiltroPublico = {},
): Promise<VitrineDeImoveis> {
  const chave = JSON.stringify([
    tenantId,
    filtro.finalidade ?? null,
    filtro.tipo ?? null,
    filtro.cidade ?? null,
    filtro.quartos ?? null,
    filtro.precoMax ?? null,
    filtro.ordem ?? null,
    filtro.pagina ?? 1,
  ]);

  return unstable_cache(
    () => consultarImoveisDaVitrine(tenantId, filtro),
    ['portfolio-imoveis', chave],
    { revalidate: SEGUNDOS_DE_CACHE, tags: ['vitrine', etiquetaDaVitrine(tenantId)] },
  )();
}

export interface AnuncioCompleto {
  imovel: ImovelPublico;
  fotos: FotoPublica[];
  corretor: CorretorPublico;
}

/**
 * Um anúncio, pelo slug do corretor e o do imóvel.
 *
 * Os dois slugs são conferidos juntos: um imóvel só abre sob a vitrine a que
 * pertence. Sem isso, `/c/outro-corretor/apto-vila-mariana-abc123` mostraria o
 * imóvel de um concorrente sob a marca de quem não o anunciou.
 */
export async function obterAnuncio(
  slugCorretor: string,
  slugImovel: string,
): Promise<AnuncioCompleto | null> {
  const corretor = await obterCorretorPorSlug(slugCorretor);
  if (!corretor) return null;

  const supabase = clientePublico();

  const { data: imovel } = await supabase
    .from('portfolio_imoveis')
    .select('*')
    .eq('slug', slugImovel)
    .eq('tenant_id', corretor.id)
    .maybeSingle();

  if (!imovel) return null;

  const { data: fotos } = await supabase
    .from('portfolio_midias')
    .select('*')
    .eq('imovel_id', (imovel as unknown as ImovelPublico).id)
    .order('capa', { ascending: false })
    .order('ordem', { ascending: true });

  return {
    imovel: imovel as unknown as ImovelPublico,
    fotos: (fotos ?? []) as unknown as FotoPublica[],
    corretor,
  };
}

/** Cidades com anúncio no ar, para o filtro oferecer só o que existe. */
export const cidadesDaVitrine = unstable_cache(
  async (tenantId: string): Promise<string[]> => {
    const supabase = clientePublico();
    const { data } = await supabase
      .from('portfolio_imoveis')
      .select('cidade')
      .eq('tenant_id', tenantId)
      .not('cidade', 'is', null);

    const unicas = new Set(
      ((data ?? []) as { cidade: string | null }[])
        .map((l) => l.cidade)
        .filter((c): c is string => Boolean(c)),
    );
    return [...unicas].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },
  ['portfolio-cidades'],
  { revalidate: SEGUNDOS_DE_CACHE, tags: ['vitrine'] },
);

/**
 * Tudo que o sitemap precisa.
 *
 * Uma consulta só, e sem paginação: o sitemap é gerado periodicamente, não a
 * cada visita. Se um dia um corretor tiver 5.000 anúncios, isto vira geração
 * em partes — o limite existe para o processo não engolir a memória do VPS
 * enquanto ninguém está olhando.
 */
export async function tudoParaOSitemap(limite = 5000): Promise<{
  corretores: { slug: string }[];
  anuncios: { slugCorretor: string; slugImovel: string; publicadoEm: string | null }[];
}> {
  const supabase = clientePublico();

  const { data: corretores } = await supabase
    .from('portfolio_corretores')
    .select('id, slug')
    .limit(limite);

  const lista = (corretores ?? []) as { id: string; slug: string }[];
  if (lista.length === 0) return { corretores: [], anuncios: [] };

  const { data: imoveis } = await supabase
    .from('portfolio_imoveis')
    .select('slug, tenant_id, publicado_em')
    .not('slug', 'is', null)
    .limit(limite);

  const slugPorTenant = new Map(lista.map((c) => [c.id, c.slug]));

  const anuncios = ((imoveis ?? []) as { slug: string; tenant_id: string; publicado_em: string | null }[])
    .map((i) => {
      const slugCorretor = slugPorTenant.get(i.tenant_id);
      return slugCorretor
        ? { slugCorretor, slugImovel: i.slug, publicadoEm: i.publicado_em }
        : null;
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  return { corretores: lista.map((c) => ({ slug: c.slug })), anuncios };
}
