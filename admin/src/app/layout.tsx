import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--fonte-sans' });

export const metadata: Metadata = {
  title: { default: 'Console — Agilliza', template: '%s · Console Agilliza' },
  description: 'Administração da plataforma Agilliza.',
  // Nenhum buscador deve conhecer esta aplicação. O cabeçalho no next.config
  // repete isto, porque meta tag depende de o robô executar a página.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0d0f14',
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
