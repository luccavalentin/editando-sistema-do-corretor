import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

import { publico } from '@/lib/ambiente';
import type { Banco } from '@/lib/tipos-banco';

/**
 * Sessão do administrador da plataforma.
 *
 * POR QUE ESTA APLICAÇÃO É SEPARADA DO SISTEMA DO CORRETOR
 *
 * Quem entra aqui enxerga TODAS as contas — é o que `app.pode_ler_tenant()`
 * concede a um `admin_plataforma`. Essa é a permissão mais perigosa do
 * produto, e mantê-la no mesmo sistema que o corretor usa todo dia significa
 * que qualquer falha lá — um XSS numa descrição de imóvel, uma dependência
 * comprometida — fica a um passo dela.
 *
 * Separado, o ganho é concreto e não teórico:
 *
 *   - COOKIE DE OUTRO DOMÍNIO. Uma sessão de corretor roubada não alcança
 *     nada aqui, e vice-versa. Não é configuração, é a política de origem do
 *     navegador.
 *   - SUPERFÍCIE MENOR. Esta aplicação não tem envio de arquivo, não tem
 *     página pública, não tem integração com provedor externo. O que não
 *     existe não é atacável.
 *   - PODE SAIR DA INTERNET. Um domínio à parte pode ficar atrás de VPN ou
 *     restrito por IP sem afetar nenhum corretor.
 *   - IMPLANTAÇÃO SEPARADA. Atualizar o console não arrisca o sistema que
 *     está sendo usado para atender cliente.
 *
 * A DUPLA CONFERÊNCIA
 *
 * Autenticar não basta: qualquer corretor tem conta no mesmo projeto Supabase e
 * conseguiria fazer login aqui. O que autoriza é `perfis.admin_plataforma`, e
 * ele é conferido a CADA requisição — não guardado na sessão. Revogar o
 * privilégio no banco tira o acesso na próxima página, sem esperar o token
 * expirar.
 */

export interface SessaoAdmin {
  usuarioId: string;
  email: string;
  nome: string;
}

export async function clienteSupabase() {
  const jarra = await cookies();

  // Chave PUBLICÁVEL, mesmo aqui. A RLS continua valendo — ela é que concede a
  // leitura entre contas para quem é admin. Usar a chave de serviço tiraria o
  // banco do caminho e deixaria o isolamento inteiro por conta deste código.
  return createServerClient<Banco>(publico.supabaseUrl, publico.supabaseChavePublica, {
    cookies: {
      getAll() {
        return jarra.getAll();
      },
      setAll(paraGravar: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of paraGravar) {
            jarra.set(name, value, options);
          }
        } catch {
          // Componente de servidor não grava cookie. A renovação acontece no
          // middleware, que pode.
        }
      },
    },
  });
}

export async function sessaoAtual(): Promise<SessaoAdmin | null> {
  const supabase = await clienteSupabase();

  // `getUser` valida o token no servidor do Supabase. `getSession` só lê o
  // cookie, que o navegador pode ter alterado — usá-lo para decidir
  // autorização é o erro clássico desta biblioteca.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: perfil } = await supabase
    .from('perfis')
    .select('id, nome, email, admin_plataforma')
    .eq('id', data.user.id)
    .maybeSingle();

  // Autenticado mas não administrador: é um corretor que descobriu o endereço.
  // Tratado como se não houvesse sessão nenhuma.
  if (!perfil?.admin_plataforma) return null;

  return { usuarioId: perfil.id, email: perfil.email, nome: perfil.nome };
}

export async function exigirAdmin(): Promise<SessaoAdmin> {
  const sessao = await sessaoAtual();
  if (sessao) return sessao;
  redirect('/entrar');
}
