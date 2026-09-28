import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { ProvedorTema } from '@/components/provedores/tema';
import '@/styles/globals.css';

/**
 * Inter variável, servida pelo próprio domínio.
 *
 * `next/font` baixa o arquivo em tempo de build e serve daqui: uma requisição a
 * menos para o Google, nada de FOUT, e nenhum dado do corretor indo para um
 * terceiro só por carregar fonte.
 *
 * `display: swap` mostra o texto com a fonte do sistema até a Inter chegar — na
 * rua, com 4G ruim, texto visível vale mais que texto bonito.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fonte-sans',
});

export const metadata: Metadata = {
  title: {
    default: 'Agilliza — Centro de comando do corretor',
    template: '%s · Agilliza',
  },
  description:
    'Organize clientes, acelere o atendimento, antecipe o financiamento e transforme cada oportunidade em uma próxima ação clara.',
  applicationName: 'Agilliza',
  // O painel não deve ser indexado; o portfólio público tem metadados próprios.
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },

  // O corretor manda o link do sistema no WhatsApp para a própria equipe. Sem
  // isto o preview sai como uma caixa cinza com a URL crua.
  openGraph: {
    type: 'website',
    siteName: 'Agilliza',
    title: 'Agilliza — Centro de comando do corretor',
    description:
      'Clientes, imóveis, financiamento e portfólio público num sistema só.',
    images: [{ url: '/marca/abertura.jpg', width: 1200, height: 630, alt: 'Agilliza' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Não travar o zoom: travar é barreira de acessibilidade, e o corretor de
  // 50 anos lendo tabela no celular precisa poder ampliar.
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0b109f' },
    { media: '(prefers-color-scheme: dark)', color: '#00052e' },
  ],
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      // O next-themes escreve a classe antes da hidratação; sem isto o React
      // reclama de divergência entre servidor e cliente em todo carregamento.
      suppressHydrationWarning
      data-densidade="confortavel"
      className={inter.variable}
    >
      <body>
        {/* Primeiro elemento focável da página: quem usa teclado pula o menu
            inteiro em vez de tabular por 18 itens a cada navegação. */}
        <a
          href="#conteudo"
          className="so-leitor focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-aviso focus-visible:rounded-lg focus-visible:bg-acao focus-visible:px-4 focus-visible:py-2 focus-visible:text-acao-texto"
        >
          Pular para o conteúdo
        </a>
        <ProvedorTema>{children}</ProvedorTema>
      </body>
    </html>
  );
}
