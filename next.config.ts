import type { NextConfig } from 'next';

/**
 * Cabeçalhos de segurança aplicados a todas as respostas.
 *
 * A Content-Security-Policy NÃO fica aqui: ela é gerada por requisição no
 * middleware, porque usa um nonce novo a cada resposta. Cabeçalho estático com
 * nonce fixo não protege contra nada.
 */
const cabecalhosSeguranca = [
  // Só HTTPS, por 2 anos, incluindo subdomínios. Pré-carregável nos navegadores.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Impede o navegador de adivinhar o tipo do conteúdo (vetor de XSS em upload).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Nenhuma página do painel pode ser embutida em iframe de terceiro (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Não vaza a URL interna (que contém IDs de cliente) para sites externos.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Desliga APIs do navegador que o produto não usa.
  {
    key: 'Permissions-Policy',
    value: [
      'camera=(self)',
      'microphone=(self)',
      'geolocation=(self)',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()',
      'interest-cohort=()',
    ].join(', '),
  },
  // Isola o contexto de navegação: bloqueia ataques de cross-window.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // Sem esta linha o Next anuncia a própria versão para quem quiser atacá-la.
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
];

const config: NextConfig = {
  reactStrictMode: true,

  /**
   * Onde o build é escrito.
   *
   * POR QUE ISTO É CONFIGURÁVEL
   *
   * `next dev` e `next build` usam o MESMO `.next` por padrão, e um apaga o
   * outro. Na prática: sobe-se o servidor de produção para conferir alguma
   * coisa, roda-se o `dev` em seguida para editar, e o build de produção some —
   * o `server.js` do standalone deixa de existir, com uma mensagem que não
   * explica o porquê. Aconteceu três vezes até virar esta linha.
   *
   * Com `DIRETORIO_BUILD=.next-producao`, os dois convivem: o `dev` fica com
   * `.next`, a produção com o seu próprio. Ver `scripts/producao-local.mjs` e
   * o alvo `build:producao` no package.json.
   */
  distDir: process.env.DIRETORIO_BUILD ?? '.next',

  // Build autocontido: o VPS roda `node server.js` sem precisar de node_modules.
  output: 'standalone',

  // Não anunciar a stack para quem está sondando.
  poweredByHeader: false,

  compress: true,

  // Erro de tipo ou de lint reprova o build. Sem exceção: código que não
  // compila não chega em produção.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  images: {
    // AVIF primeiro: foto de imóvel é o ativo mais pesado do produto e o
    // corretor abre o sistema no 4G da rua.
    formats: ['image/avif', 'image/webp'],
    // Larguras alinhadas com os pontos de quebra reais da interface.
    deviceSizes: [360, 414, 640, 828, 1080, 1280, 1536, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // SVG remoto é vetor de XSS. Fotos vêm do storage próprio, nunca como SVG.
    dangerouslyAllowSVG: false,
    remotePatterns: [
      // Storage de mídia próprio (MinIO/S3 no VPS) — configurado por ambiente.
      ...(process.env.MIDIA_HOST_PUBLICO
        ? [
            {
              protocol: 'https' as const,
              hostname: process.env.MIDIA_HOST_PUBLICO,
            },
          ]
        : []),
    ],
  },

  experimental: {
    // Server Actions recebem upload de foto de imóvel.
    serverActions: { bodySizeLimit: '8mb' },
    // Reduz o JavaScript enviado ao cliente nos pacotes de ícone e gráfico.
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: cabecalhosSeguranca,
      },
      {
        // Ativos com hash no nome são imutáveis: cache agressivo é seguro.
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Nenhuma rota de API pode ser cacheada por proxy intermediário:
        // uma resposta de um tenant jamais pode ser servida a outro.
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
          { key: 'Vary', value: 'Cookie, Authorization' },
        ],
      },
    ];
  },
};

export default config;
