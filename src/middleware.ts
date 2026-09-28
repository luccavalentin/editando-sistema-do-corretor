import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Middleware: renova a sessão, protege as rotas e emite a Content-Security-Policy.
 *
 * A CSP fica aqui, e não em next.config.ts, porque usa um nonce novo a cada
 * resposta. CSP com nonce fixo não protege contra nada: o atacante lê o nonce no
 * HTML e usa. Cabeçalho estático não consegue variar por requisição — por isso a
 * política é montada aqui.
 */

/** Rotas que funcionam sem usuário autenticado. */
const ROTAS_PUBLICAS = [
  '/entrar',
  // A porta de entrada: quem chega sem saber qual acesso é o dele escolhe aqui.
  '/escolher-acesso',
  '/recuperar-senha',
  '/redefinir-senha',
  '/aceitar-convite',
  // Portal do cliente: autentica por CPF e data de nascimento, sem sessão
  // Supabase (seção 3.2). A proteção dele é própria.
  '/portal',
  // Portfólio público do corretor, indexável por busca (seção 3.3).
  '/c',
  // Webhooks de banco e de WhatsApp: autenticam por assinatura, não por cookie.
  '/api/webhooks',
  '/api/saude',
];

function ePublica(caminho: string): boolean {
  return ROTAS_PUBLICAS.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

/**
 * Rotas que não precisam nem SABER quem é o usuário.
 *
 * Diferente de `ROTAS_PUBLICAS`: `/entrar` é pública, mas o middleware ainda
 * precisa da sessão lá para mandar quem já está logado direto para o início.
 * Nestas aqui a resposta é idêntica para todo mundo, então perguntar quem é
 * seria trabalho jogado fora.
 *
 * E não é trabalho barato: `auth.getUser()` faz uma IDA DE REDE ao servidor de
 * autenticação do Supabase. A vitrine é a página feita para receber milhares de
 * desconhecidos vindos do Google — uma chamada de rede por visita, só para
 * descobrir que não há usuário, some com o tempo de resposta e ainda impede a
 * página de ser cacheada, porque o middleware acaba tocando cookies.
 */
const ROTAS_SEM_SESSAO = ['/c', '/api/webhooks', '/api/saude'];

function dispensaSessao(caminho: string): boolean {
  return ROTAS_SEM_SESSAO.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

/**
 * Monta a CSP da requisição.
 *
 * `strict-dynamic` junto com o nonce é o que torna a política resistente: um
 * script carregado por um script confiável herda a confiança, e a lista de
 * domínios permitidos deixa de ser a defesa — o nonce passa a ser. Sem isso,
 * qualquer CDN da allowlist que seja comprometido vira vetor de XSS.
 */
function montarCsp(nonce: string, emDesenvolvimento: boolean): string {
  const diretivas = [
    "default-src 'self'",

    // `unsafe-eval` só em desenvolvimento: o refresh rápido do Next depende dele.
    // Em produção ele sai, porque `eval` é meio caminho andado para XSS.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${emDesenvolvimento ? "'unsafe-eval'" : ''}`,

    // `unsafe-inline` em estilo é inevitável: o Next injeta CSS inline e o
    // próprio design system usa `style` inline nos componentes. O risco é muito
    // menor que em script — CSS não executa código —, mas fica registrado aqui
    // como concessão consciente, não como descuido.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",

    // Foto de imóvel vem do storage próprio; `blob:` é para pré-visualização de
    // upload antes de enviar.
    "img-src 'self' data: blob: https:",

    // Supabase (REST, auth e realtime) e as integrações do servidor.
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",

    // O service worker e o manifest, DECLARADOS.
    //
    // Sem `worker-src`, a regra cai em `child-src` e depois em `default-src`,
    // onde `'self'` resolveria. Mas navegadores mais antigos usam `script-src`
    // para worker — e ali o `strict-dynamic` faz o `'self'` ser IGNORADO, o que
    // bloquearia o registro sem erro visível: o app simplesmente deixaria de
    // funcionar offline, e ninguém saberia por quê.
    "worker-src 'self'",
    "manifest-src 'self'",

    // Nenhum plugin, nenhum iframe de terceiro, e esta página não pode ser
    // embutida em lugar nenhum (anti-clickjacking, junto com X-Frame-Options).
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",

    "base-uri 'self'",
    "form-action 'self'",

    // Bloqueia downgrade acidental para http em recurso interno.
    'upgrade-insecure-requests',
  ];

  return diretivas.filter(Boolean).join('; ').replace(/\s{2,}/g, ' ');
}

export async function middleware(requisicao: NextRequest) {
  const emDesenvolvimento = process.env.NODE_ENV !== 'production';

  // 16 bytes de aleatoriedade por resposta. `crypto` do runtime edge.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = montarCsp(nonce, emDesenvolvimento);

  // O Next lê a CSP dos cabeçalhos da REQUISIÇÃO para saber qual nonce colocar
  // nas tags <script> que ele mesmo gera. Sem esta linha, o nonce da resposta
  // não bate com o dos scripts e a página fica em branco.
  const cabecalhosDaRequisicao = new Headers(requisicao.headers);
  cabecalhosDaRequisicao.set('x-nonce', nonce);
  cabecalhosDaRequisicao.set('content-security-policy', csp);

  let resposta = NextResponse.next({ request: { headers: cabecalhosDaRequisicao } });

  // ---------------------------------------------------------------------
  // Saída antecipada para a vitrine pública e os webhooks.
  //
  // A CSP acima já foi montada e vale para estas rotas também — segurança não
  // depende de quem está pedindo. O que fica de fora é só a consulta de sessão,
  // que não mudaria nada na resposta.
  // ---------------------------------------------------------------------
  if (dispensaSessao(requisicao.nextUrl.pathname)) {
    resposta.headers.set('content-security-policy', csp);
    resposta.headers.set('x-nonce', nonce);
    return resposta;
  }

  // ---------------------------------------------------------------------
  // Renovação da sessão.
  // Precisa acontecer no middleware porque só aqui é possível gravar cookie
  // antes da renderização. Sem isto, o token expira no meio da navegação e o
  // corretor é jogado para a tela de login sem motivo aparente.
  // ---------------------------------------------------------------------
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA!,
    {
      cookies: {
        getAll() {
          return requisicao.cookies.getAll();
        },
        setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value } of cookies) {
            requisicao.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request: { headers: cabecalhosDaRequisicao } });
          for (const { name, value, options } of cookies) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = requisicao.nextUrl.pathname;

  // ---------------------------------------------------------------------
  // Proteção de rota.
  // É a primeira barreira, não a única: a RLS continua valendo, e um usuário
  // autenticado sem vínculo de tenant também não vê nada.
  // ---------------------------------------------------------------------
  if (!user && !ePublica(caminho)) {
    const destino = requisicao.nextUrl.clone();

    // A RAIZ é diferente das demais: quem digita o endereço principal pode ser
    // corretor OU cliente, e mandá-lo direto para o login do corretor faz o
    // comprador encarar um formulário de e-mail e senha que ele não tem.
    // Qualquer outra rota é do corretor por natureza — ele é quem tem link
    // para `/clientes/xyz`.
    destino.pathname = caminho === '/' ? '/escolher-acesso' : '/entrar';

    if (caminho !== '/') {
      // Preserva onde ele queria chegar.
      destino.searchParams.set('destino', caminho + requisicao.nextUrl.search);
    }
    return NextResponse.redirect(destino);
  }

  // Quem já está dentro não precisa ver a tela de entrada.
  if (user && (caminho === '/entrar' || caminho === '/' || caminho === '/escolher-acesso')) {
    const destino = requisicao.nextUrl.clone();
    destino.pathname = '/inicio';
    destino.search = '';
    return NextResponse.redirect(destino);
  }

  resposta.headers.set('content-security-policy', csp);
  resposta.headers.set('x-nonce', nonce);

  return resposta;
}

export const config = {
  matcher: [
    /*
     * Tudo, menos:
     *   _next/static e _next/image — ativos com hash, imutáveis
     *   favicon, manifest, sw.js, robots, sitemap — arquivos de raiz
     *   offline.html — a página que o service worker serve sem rede. Ela NÃO
     *     pode passar por aqui: não é rota pública, então o middleware mandaria
     *     quem não está logado para /entrar, e o service worker guardaria esse
     *     redirecionamento no lugar da página. A falha apareceria só offline,
     *     que é justamente quando ninguém consegue investigar.
     *   arquivos de imagem servidos diretamente
     * Rodar o middleware nesses caminhos só gastaria tempo de resposta.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2)$).*)',
  ],
};
