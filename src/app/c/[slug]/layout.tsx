import type { Metadata } from 'next';

import { obterCorretorPorSlug } from '@/server/consultas/portfolio';

/**
 * Moldura das páginas públicas.
 *
 * Deliberadamente SEM o shell do sistema: nada de menu lateral, nada de
 * cabeçalho com troca de conta, nada de contadores. Quem chega aqui é um
 * comprador vindo do Google ou de um link no WhatsApp — mostrar a ele a
 * navegação interna do corretor confunde e vaza a estrutura do produto.
 *
 * Também não há nenhuma chamada que leia cookie, o que mantém estas páginas
 * cacheáveis.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const corretor = await obterCorretorPorSlug(slug);

  if (!corretor) return { title: 'Imóveis', robots: { index: false } };

  const nome = corretor.portfolio_titulo ?? corretor.nome;

  return {
    title: { default: nome, template: `%s · ${nome}` },
    description: corretor.portfolio_bio?.slice(0, 160) ?? `Imóveis disponíveis com ${nome}.`,
    // A vitrine existe para ser encontrada. É a única parte do sistema onde
    // indexar é o objetivo, e não um risco.
    robots: { index: true, follow: true },
  };
}

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-fundo">{children}</div>;
}
