import type { NextConfig } from 'next';

/**
 * Plataforma administrativa — configuração.
 *
 * Mais fechada que a do sistema do corretor, e de propósito: esta aplicação vê
 * TODAS as contas. Ela não precisa de imagem remota, não precisa ser indexada,
 * não precisa de nada aberto.
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/:caminho*',
        headers: [
          // Nenhum buscador deve conhecer esta aplicação.
          { key: 'x-robots-tag', value: 'noindex, nofollow, noarchive' },
          { key: 'x-content-type-options', value: 'nosniff' },
          { key: 'x-frame-options', value: 'DENY' },
          // `no-referrer`, e não `strict-origin`: o admin navega com id de conta
          // na URL, e vazar isso para qualquer link externo é vazar cliente.
          { key: 'referrer-policy', value: 'no-referrer' },
          { key: 'permissions-policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'strict-transport-security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Console administrativo não tem tela em cache. Voltar no navegador
          // depois de sair não pode mostrar dado de conta nenhuma.
          { key: 'cache-control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
