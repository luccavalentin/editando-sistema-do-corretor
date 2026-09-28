import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

import { publico, servidor as configServidor } from '@/lib/ambiente';
import type { Banco } from './tipos-banco';

/**
 * Cliente Supabase para Server Component, Server Action e Route Handler.
 *
 * Usa a chave PUBLICÁVEL de propósito, mesmo rodando no servidor: assim toda
 * consulta passa pela Row Level Security com a identidade do usuário logado. Se
 * uma rota nova esquecer de filtrar por tenant, o Postgres barra.
 *
 * O caminho tentador — usar a chave de serviço no servidor "porque é servidor" —
 * é exatamente como vazamento entre tenants acontece: um `select` sem `where` e
 * o corretor vê a carteira do concorrente.
 */
export async function clienteServidor() {
  const jarraDeCookies = await cookies();

  return createServerClient<Banco>(publico.supabaseUrl, publico.supabaseChavePublica, {
    cookies: {
      getAll() {
        return jarraDeCookies.getAll();
      },
      setAll(cookiesParaGravar: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesParaGravar) {
            jarraDeCookies.set(name, value, options);
          }
        } catch {
          // Server Component não pode gravar cookie. A renovação do token
          // acontece no middleware, que pode — então engolir aqui é correto, e
          // não um erro escondido.
        }
      },
    },
  });
}

/**
 * Cliente com a CHAVE DE SERVIÇO. Ignora RLS por completo.
 *
 * Use somente onde não existe usuário para autorizar a operação:
 *   - criar tenant e o membro proprietário na mesma transação
 *   - gravar auditoria (o cliente não pode inserir, para não forjar log)
 *   - job de fila, webhook de banco, sincronização de portal
 *   - portal do cliente, que autentica por CPF e não tem sessão Supabase
 *
 * Toda chamada aqui deve registrar auditoria. A regra prática: se você não
 * consegue nomear quem autorizou a operação, ela não deveria estar usando esta
 * função.
 *
 * @param motivo Por que a RLS está sendo ignorada. Aparece no log e serve de
 * documentação obrigatória no ponto de uso.
 */
export function clienteServico(motivo: string) {
  if (!motivo || motivo.length < 10) {
    throw new Error(
      'clienteServico() exige um motivo descritivo: ele ignora a RLS e precisa ' +
        'ficar rastreável. Ex.: clienteServico("criar tenant e membro proprietario").',
    );
  }

  const { supabaseChaveServico } = configServidor();

  return createServerClient<Banco>(publico.supabaseUrl, supabaseChaveServico, {
    cookies: {
      // A chave de serviço não usa sessão: nenhum cookie é lido ou gravado.
      // Deixar vazio evita que um token de usuário seja anexado por acidente e
      // confunda a auditoria sobre quem fez o quê.
      getAll() {
        return [];
      },
      setAll() {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Cliente sem sessão, para as páginas públicas da vitrine.
 *
 * POR QUE NÃO O `clienteServidor`
 *
 * Aquele lê os cookies da requisição. Ler cookie torna a página DINÂMICA no
 * Next: cada visita passa a renderizar do zero, porque o resultado poderia
 * depender de quem está pedindo. A vitrine é a única parte do sistema feita
 * para ser vista por milhares de desconhecidos e indexada por buscador —
 * renderizar de novo a cada visita desperdiça o VPS num trabalho cujo
 * resultado é idêntico para todo mundo.
 *
 * Sem cookie, a consulta roda como `anon`, que é exatamente a identidade que a
 * migração 0010 mediu: privilégio coluna a coluna, e política que só devolve
 * anúncio publicado de conta com vitrine ligada. Não é um cliente "sem
 * proteção" — é um cliente com a proteção que o visitante deve ter.
 *
 * Um efeito colateral bem-vindo: se alguém acidentalmente usar este cliente
 * numa tela interna, ela vem vazia em vez de vazar. O erro aparece como tela
 * sem dado, não como dado do tenant errado.
 */
export function clientePublico() {
  return createServerClient<Banco>(publico.supabaseUrl, publico.supabaseChavePublica, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
