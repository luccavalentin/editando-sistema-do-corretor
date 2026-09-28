'use server';

import { redirect } from 'next/navigation';

import { clienteSupabase } from '@/server/sessao';

export interface EstadoDaEntrada {
  erro?: string;
}

/**
 * Entrada no console.
 *
 * A mensagem de erro é GENÉRICA e igual nos dois casos — credencial errada e
 * usuário sem privilégio de administrador. Distinguir contaria a quem estivesse
 * sondando que aquele e-mail existe e é de um corretor, o que é exatamente a
 * informação que ele procura.
 */
export async function entrarNoConsole(
  _anterior: EstadoDaEntrada,
  formulario: FormData,
): Promise<EstadoDaEntrada> {
  const email = String(formulario.get('email') ?? '').trim();
  const senha = String(formulario.get('senha') ?? '');

  if (!email || !senha) return { erro: 'Informe e-mail e senha.' };

  const supabase = await clienteSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error || !data.user) {
    return { erro: 'Não foi possível entrar. Confira o e-mail e a senha.' };
  }

  // Autenticar não basta. Todo corretor tem conta neste mesmo projeto Supabase
  // e conseguiria passar pelo passo acima — o que autoriza é o privilégio.
  const { data: perfil } = await supabase
    .from('perfis')
    .select('admin_plataforma')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!perfil?.admin_plataforma) {
    // A sessão criada é desfeita: deixá-la de pé daria a um corretor um cookie
    // válido no domínio do console, e a proteção passaria a depender só da
    // checagem de cada página.
    await supabase.auth.signOut();
    return { erro: 'Não foi possível entrar. Confira o e-mail e a senha.' };
  }

  redirect('/');
}

export async function sairDoConsole(): Promise<void> {
  const supabase = await clienteSupabase();
  await supabase.auth.signOut();
  redirect('/entrar');
}
