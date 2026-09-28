'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';

import { clienteServidor } from '@/lib/supabase/servidor';
import { registrarAuditoria } from '@/server/auditoria';

export interface EstadoEntrada {
  erro?: string;
  campo?: 'email' | 'senha';
}

const esquema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o seu e-mail.')
    .email('Esse e-mail não parece válido.')
    // Minúscula obrigatória: o banco tem índice único em `email` e o CHECK
    // exige caixa baixa. Normalizar aqui evita dois perfis para a mesma pessoa.
    .transform((v) => v.toLowerCase()),
  senha: z.string().min(1, 'Informe a sua senha.'),
  destino: z.string().optional(),
});

/**
 * Só aceita caminho interno.
 *
 * Sem esta função, `?destino=https://site-falso.com` transformaria a tela de
 * login numa ponte de phishing: o corretor entra no sistema verdadeiro e é
 * cuspido num clone. É a vulnerabilidade de redirecionamento aberto, e ela
 * aparece justamente em telas de login que preservam o destino.
 */
function destinoSeguro(bruto: string | undefined): string {
  if (!bruto) return '/inicio';
  // Precisa começar com uma única barra. `//outro.site` é URL absoluta
  // protocolo-relativa e o navegador a segue para fora.
  if (!bruto.startsWith('/') || bruto.startsWith('//')) return '/inicio';
  if (bruto.includes('..') || bruto.includes('\\')) return '/inicio';
  return bruto;
}

export async function entrar(
  _anterior: EstadoEntrada,
  formulario: FormData,
): Promise<EstadoEntrada> {
  const analise = esquema.safeParse({
    email: formulario.get('email'),
    senha: formulario.get('senha'),
    destino: formulario.get('destino') ?? undefined,
  });

  if (!analise.success) {
    const primeiro = analise.error.issues[0];
    return {
      erro: primeiro?.message ?? 'Confira os dados e tente de novo.',
      campo: primeiro?.path[0] === 'senha' ? 'senha' : 'email',
    };
  }

  const { email, senha, destino } = analise.data;

  const supabase = await clienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error || !data.user) {
    // A tentativa negada é registrada com o e-mail tentado e a origem: é o que
    // permite detectar alguém varrendo senhas. O registro usa a chave de
    // serviço, porque não há usuário autenticado para autorizá-lo.
    const cabecalhos = await headers();
    await registrarAuditoria({
      acao: 'entrar',
      entidade: 'sessao',
      resultado: 'negado',
      autorEmail: email,
      ip: cabecalhos.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      agenteUsuario: cabecalhos.get('user-agent'),
      metadados: { motivo: error?.code ?? 'credencial_invalida' },
    });

    // MENSAGEM GENÉRICA, DE PROPÓSITO.
    //
    // "E-mail não cadastrado" e "senha incorreta" são mensagens diferentes, e
    // essa diferença permite descobrir quais e-mails existem no sistema — um
    // por um, automatizado. Num CRM imobiliário isso vale muito: a lista de
    // corretores de uma região é ativo comercial do concorrente.
    //
    // O usuário legítimo que errou a senha perde um pouco de conveniência. É
    // uma troca consciente e é o padrão da indústria.
    return { erro: 'E-mail ou senha incorretos.', campo: 'senha' };
  }

  await registrarAuditoria({
    acao: 'entrar',
    entidade: 'sessao',
    entidadeId: data.user.id,
    resultado: 'permitido',
    autorId: data.user.id,
    autorEmail: email,
  });

  redirect(destinoSeguro(destino));
}

export async function sair(): Promise<void> {
  const supabase = await clienteServidor();
  const { data } = await supabase.auth.getUser();

  await supabase.auth.signOut();

  if (data.user) {
    await registrarAuditoria({
      acao: 'sair',
      entidade: 'sessao',
      entidadeId: data.user.id,
      autorId: data.user.id,
      autorEmail: data.user.email ?? null,
    });
  }

  redirect('/entrar');
}
