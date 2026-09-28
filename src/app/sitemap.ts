import type { MetadataRoute } from 'next';

import { tudoParaOSitemap } from '@/server/consultas/portfolio';
import { publico } from '@/lib/ambiente';

/**
 * Sitemap das páginas públicas.
 *
 * Só a vitrine entra. As telas internas do corretor NÃO aparecem aqui e nem
 * deveriam ser rastreadas — o `robots.ts` ao lado cuida disso. Listar `/clientes`
 * num sitemap seria oferecer ao buscador um mapa da área privada.
 *
 * Revalidado de hora em hora: anúncio novo demorar até 60 minutos para entrar
 * no sitemap não atrasa nada (o buscador leva mais que isso para voltar), e
 * evita varrer o banco a cada requisição de robô.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { corretores, anuncios } = await tudoParaOSitemap();

  return [
    ...corretores.map((c) => ({
      url: `${publico.urlApp}/c/${c.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...anuncios.map((a) => ({
      url: `${publico.urlApp}/c/${a.slugCorretor}/${a.slugImovel}`,
      lastModified: a.publicadoEm ? new Date(a.publicadoEm) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
