'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Icone } from '@/components/shell/icones';
import { aceitarConvite, type EstadoDoAceite } from '@/server/acoes/aceitar-convite';

function BotaoAceitar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-lg bg-acao text-md font-semibold text-acao-texto transition-colors hover:bg-acao-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Entrando na equipe' : 'Aceitar e entrar'}
    </button>
  );
}

export function FormularioDoAceite({ token }: { token: string }) {
  const [estado, acao] = useActionState<EstadoDoAceite, FormData>(aceitarConvite, {});

  return (
    <form action={acao} className="flex flex-col gap-4">
      {/* O token viaja no formulário, não numa variável de estado: assim o
          aceite funciona mesmo se o JavaScript falhar. */}
      <input type="hidden" name="token" value={token} />

      {estado.erro && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-perigo-sutil px-3 py-3 text-sm text-perigo-texto"
        >
          <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
          {estado.erro}
        </p>
      )}

      <BotaoAceitar />
    </form>
  );
}
