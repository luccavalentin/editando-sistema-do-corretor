import type { Metadata } from 'next';
import Link from 'next/link';

import { Marca } from '@/components/shell/marca';
import { Icone } from '@/components/shell/icones';
import { clienteServidor } from '@/lib/supabase/servidor';
import { FormularioDoAceite } from './formulario';

export const metadata: Metadata = {
  title: 'Convite para a equipe',
  // O link do convite carrega um segredo. Indexá-lo seria publicá-lo.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * A tela de aceite.
 *
 * ELA NÃO DIZ DE QUAL IMOBILIÁRIA É O CONVITE ANTES DE O USUÁRIO ENTRAR, e isso
 * é deliberado. Quem tiver o link — inclusive alguém que o recebeu por engano —
 * descobriria que aquele e-mail foi convidado por aquela empresa. É pouca
 * informação, mas é informação de graça para quem não deveria tê-la.
 *
 * Depois de entrar, a conferência de e-mail no servidor decide tudo: o link só
 * funciona para a pessoa a quem foi feito.
 */
export default async function PaginaDeAceite({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const supabase = await clienteServidor();
  const { data } = await supabase.auth.getUser();
  const usuario = data.user;

  return (
    <main id="conteudo" className="flex min-h-dvh flex-col justify-center bg-fundo px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <Marca altura={38} prioritaria />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Convite para a equipe</h1>
            <p className="mt-1 text-sm text-texto-secundario">
              Alguém te convidou para trabalhar junto no Agilliza.
            </p>
          </div>
        </div>

        {!token ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-perigo-sutil px-3 py-3 text-sm text-perigo-texto"
          >
            <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
            Este link está incompleto. Peça o convite de novo a quem te chamou.
          </p>
        ) : !usuario ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg bg-superficie-afundada px-4 py-3 text-sm text-texto-secundario">
              Para aceitar, entre com a conta do e-mail que recebeu o convite. Se ainda não tem
              conta, quem te convidou precisa criá-la — ou você pode usar a recuperação de senha
              com esse e-mail.
            </p>

            {/* O token volta no `destino` para a pessoa não perder o convite ao
                fazer login. Sem isto ela entra e cai no início, sem entender
                por que não virou membro. */}
            <Link
              href={`/entrar?destino=${encodeURIComponent(`/aceitar-convite?token=${token}`)}`}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-acao text-md font-semibold text-acao-texto transition-colors hover:bg-acao-hover"
            >
              Entrar na minha conta
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg bg-superficie-afundada px-4 py-3 text-sm text-texto-secundario">
              Você está entrando como{' '}
              <strong className="text-texto">{usuario.email}</strong>. O convite só funciona para
              o e-mail a quem ele foi feito — se não for este, saia e entre com o outro.
            </p>

            <FormularioDoAceite token={token} />
          </div>
        )}
      </div>
    </main>
  );
}
