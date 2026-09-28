import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Middleware do console.
 *
 * Duas funções: renovar a sessão do Supabase (só aqui dá para gravar cookie
 * antes da renderização) e barrar rota sem sessão.
 *
 * A checagem de `admin_plataforma` NÃO acontece aqui, e é de propósito: o
 * middleware roda na borda e cada consulta ao banco daqui custa em toda
 * requisição, inclusive nas de arquivo estático. Quem confere o privilégio é
 * `exigirAdmin()`, em cada página — e lá a conferência é a cada carregamento,
 * sem cache, para revogar acesso ter efeito imediato.
 */
export async function middleware(requisicao: NextRequest) {
  let resposta = NextResponse.next({ request: requisicao });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA!,
    {
      cookies: {
        getAll() {
          return requisicao.cookies.getAll();
        },
        setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value } of cookies) requisicao.cookies.set(name, value);
          resposta = NextResponse.next({ request: requisicao });
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

  if (!user && caminho !== '/entrar') {
    const destino = requisicao.nextUrl.clone();
    destino.pathname = '/entrar';
    return NextResponse.redirect(destino);
  }

  if (user && caminho === '/entrar') {
    const destino = requisicao.nextUrl.clone();
    destino.pathname = '/';
    return NextResponse.redirect(destino);
  }

  return resposta;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
