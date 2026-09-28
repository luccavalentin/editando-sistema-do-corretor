import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Moldura do portal do cliente.
 *
 * Sem o menu do corretor, sem troca de conta, sem contadores. Quem está aqui é
 * o comprador, e a única coisa que ele precisa é acompanhar o próprio processo.
 * Mostrar a navegação interna confundiria e vazaria a estrutura do produto.
 */
export default function LayoutDoPortal({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-fundo">{children}</div>;
}
