'use client';

import { createBrowserClient } from '@supabase/ssr';

import { publico } from '@/lib/ambiente';
import type { Banco } from './tipos-banco';

let instancia: ReturnType<typeof criar> | null = null;

function criar() {
  return createBrowserClient<Banco>(publico.supabaseUrl, publico.supabaseChavePublica);
}

/**
 * Cliente Supabase para o navegador, em instância única.
 *
 * O singleton não é micro-otimização: criar um cliente por componente abre uma
 * conexão de realtime por componente e faz o token ser renovado várias vezes em
 * paralelo, o que na prática derruba a sessão do corretor no meio do
 * atendimento.
 *
 * Aqui só entra a chave publicável. Toda leitura passa por RLS, então o pior que
 * um navegador hostil consegue é ver o que aquele usuário já podia ver.
 */
export function clienteNavegador() {
  instancia ??= criar();
  return instancia;
}
