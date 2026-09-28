'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { entrarNoConsole, type EstadoDaEntrada } from './acoes';

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-[--radius-padrao] bg-acento font-semibold text-[#0d0f14] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Entrando' : 'Entrar no console'}
    </button>
  );
}

export function FormularioDoConsole() {
  const [estado, acao] = useActionState<EstadoDaEntrada, FormData>(entrarNoConsole, {});

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {estado.erro && (
        <p
          role="alert"
          className="rounded-[--radius-padrao] bg-perigo-sutil px-3 py-2.5 text-sm text-perigo"
        >
          {estado.erro}
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-texto-secundario">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="h-11 w-full rounded-[--radius-padrao] border border-borda bg-superficie px-3 text-texto"
        />
      </div>

      <div>
        <label htmlFor="senha" className="mb-1.5 block text-xs font-semibold text-texto-secundario">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 w-full rounded-[--radius-padrao] border border-borda bg-superficie px-3 text-texto"
        />
      </div>

      <Botao />
    </form>
  );
}
