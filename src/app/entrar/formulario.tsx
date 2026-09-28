'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Botao } from '@/components/ui/botao';
import { entrar, type EstadoEntrada } from './acoes';

function BotaoEnviar() {
  const { pending } = useFormStatus();

  return (
    <Botao
      type="submit"
      tamanho="grande"
      larguraTotal
      disabled={pending}
      className="login-botao mt-1 h-12 rounded-xl text-sm font-semibold shadow-[0_10px_30px_-16px_var(--cor-acao)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-18px_var(--cor-acao)] active:translate-y-0"
    >
      {pending ? (
        <>
          <svg
            className="size-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
          </svg>
          Entrando
        </>
      ) : (
        <>
          Entrar
          <svg
            viewBox="0 0 24 24"
            className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </>
      )}
    </Botao>
  );
}

export function FormularioDeEntrada({ destino }: { destino?: string }) {
  const [estado, acao] = useActionState<EstadoEntrada, FormData>(entrar, {});

  return (
    <form action={acao} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="destino" value={destino ?? ''} />

      <div className="login-campo">
        <label htmlFor="email" className="mb-2 block text-xs font-semibold tracking-[0.01em] text-texto-secundario">
          E-mail
        </label>
        <div className="group relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-texto-desabilitado transition-colors duration-200 group-focus-within:text-acao">
            <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <path d="M4 5h16v14H4z" strokeLinejoin="round" />
              <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            aria-invalid={estado.campo === 'email' ? true : undefined}
            aria-describedby={estado.erro ? 'erro-entrada' : undefined}
            placeholder="voce@imobiliaria.com.br"
            className="h-12 w-full rounded-xl border border-borda-controle bg-superficie pl-11 pr-3 text-[15px] text-texto shadow-[var(--sombra-interna)] outline-none transition-all duration-200 placeholder:text-texto-desabilitado hover:border-borda-forte focus:border-acao focus:ring-4 focus:ring-acao/10 aria-invalid:border-2 aria-invalid:border-perigo aria-invalid:focus:ring-perigo/10"
          />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
        <label
          htmlFor="senha"
          className="col-start-1 row-start-1 mb-2 text-xs font-semibold tracking-[0.01em] text-texto-secundario"
        >
          Senha
        </label>
        <div className="group relative col-span-2 row-start-2">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-texto-desabilitado transition-colors duration-200 group-focus-within:text-acao">
            <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={estado.campo === 'senha' ? true : undefined}
            aria-describedby={estado.erro ? 'erro-entrada' : undefined}
            className="h-12 w-full rounded-xl border border-borda-controle bg-superficie pl-11 pr-3 text-[15px] text-texto shadow-[var(--sombra-interna)] outline-none transition-all duration-200 hover:border-borda-forte focus:border-acao focus:ring-4 focus:ring-acao/10 aria-invalid:border-2 aria-invalid:border-perigo aria-invalid:focus:ring-perigo/10"
          />
        </div>
        <a
          href="/recuperar-senha"
          className="col-start-2 row-start-1 mb-2 text-xs font-semibold text-link no-underline transition-colors duration-200 hover:text-link-hover"
        >
          Esqueci a senha
        </a>
      </div>

      {estado.erro && (
        <p
          id="erro-entrada"
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-perigo-borda bg-perigo-sutil px-3.5 py-3 text-sm text-perigo-texto"
        >
          <svg
            viewBox="0 0 24 24"
            className="mt-0.5 size-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {estado.erro}
        </p>
      )}

      <BotaoEnviar />
    </form>
  );
}
