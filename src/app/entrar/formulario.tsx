'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Botao } from '@/components/ui/botao';
import { entrar, type EstadoEntrada } from './acoes';

function BotaoEnviar() {
  const { pending } = useFormStatus();

  return (
    <Botao type="submit" tamanho="grande" larguraTotal disabled={pending}>
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
        'Entrar'
      )}
    </Botao>
  );
}

export function FormularioDeEntrada({ destino }: { destino?: string }) {
  const [estado, acao] = useActionState<EstadoEntrada, FormData>(entrar, {});

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="destino" value={destino ?? ''} />

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-texto-secundario">
          E-mail
        </label>
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
          className="h-11 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-md text-texto placeholder:text-texto-desabilitado aria-invalid:border-2 aria-invalid:border-perigo"
        />
      </div>

      {/* O link "Esqueci a senha" aparece ACIMA do campo, mas vem DEPOIS dele
          no HTML — `order` do flexbox reposiciona sem mexer na ordem de
          tabulação. Com ele antes, quem preenche pelo teclado digitava o
          e-mail, teclava Tab esperando a senha e caía num link; a senha ia
          para lugar nenhum, ou o Enter abria a recuperação. É o tipo de
          detalhe que só aparece para quem não usa mouse. */}
      {/* Grade de duas linhas com posição explícita: o rótulo e o link ficam
          lado a lado em cima, o campo embaixo — mas no HTML o link vem DEPOIS
          do campo. Assim a ordem de tabulação é e-mail → senha → entrar.

          Com o link antes, quem preenche pelo teclado digitava o e-mail,
          teclava Tab esperando a senha e caía num link: a senha ia para lugar
          nenhum, ou o Enter abria a recuperação no meio do login. É o tipo de
          detalhe que só aparece para quem não usa mouse. */}
      <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
        <label
          htmlFor="senha"
          className="col-start-1 row-start-1 mb-1.5 text-sm font-semibold text-texto-secundario"
        >
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={estado.campo === 'senha' ? true : undefined}
          aria-describedby={estado.erro ? 'erro-entrada' : undefined}
          className="col-span-2 row-start-2 h-11 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-md text-texto aria-invalid:border-2 aria-invalid:border-perigo"
        />
        <a
          href="/recuperar-senha"
          className="col-start-2 row-start-1 text-xs font-semibold no-underline"
        >
          Esqueci a senha
        </a>
      </div>

      {estado.erro && (
        /* role="alert" faz o leitor de tela anunciar na hora, sem esperar o
           usuário navegar até aqui. */
        <p
          id="erro-entrada"
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-perigo-sutil px-3 py-2.5 text-sm text-perigo-texto"
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
