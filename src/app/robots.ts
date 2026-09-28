import type { MetadataRoute } from 'next';

import { publico } from '@/lib/ambiente';

/**
 * O que o buscador pode rastrear.
 *
 * A regra é curta e vale a pena ler ao contrário: TUDO é proibido, menos a
 * vitrine pública. Uma lista de proibições cresce errado — basta alguém
 * acrescentar uma rota e esquecer de proibi-la para a área privada aparecer no
 * Google.
 *
 * Isso não é controle de acesso: as rotas internas já exigem sessão e a RLS
 * barra no banco. `robots.txt` é pedido de boa vizinhança, e um robô mal
 * intencionado o ignora. Serve para o buscador honesto não indexar a URL de
 * login nem gastar rastreamento em página que devolve redirecionamento.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/c/'],
        disallow: ['/'],
      },
    ],
    sitemap: `${publico.urlApp}/sitemap.xml`,
  };
}
