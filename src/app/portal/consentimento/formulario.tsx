'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Icone } from '@/components/shell/icones';
import { aceitarOTermo, type EstadoDoTermo } from '@/server/acoes/portal-lgpd';

function BotaoAceitar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-lg bg-acao text-md font-semibold text-acao-texto transition-colors hover:bg-acao-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Registrando' : 'Aceitar e continuar'}
    </button>
  );
}

export function FormularioDoTermo({ versao }: { versao: string }) {
  const [estado, acao] = useActionState<EstadoDoTermo, FormData>(aceitarOTermo, {});

  return (
    <form action={acao} className="mt-5 flex flex-col gap-4">
      {estado.erro && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-perigo-sutil px-3 py-2.5 text-sm text-perigo-texto"
        >
          <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
          {estado.erro}
        </p>
      )}

      {/* A caixa nasce DESMARCADA, e é assim que tem que ser: consentimento
          pré-marcado não é consentimento, é presunção. */}
      <div className="flex items-start gap-3 rounded-xl border border-borda bg-superficie p-4">
        <input
          id="aceito"
          name="aceito"
          type="checkbox"
          required
          className="mt-0.5 size-5 shrink-0 accent-[var(--cor-acao)]"
        />
        <label htmlFor="aceito" className="cursor-pointer text-sm text-texto">
          Li e concordo com o tratamento dos meus dados como descrito acima.
        </label>
      </div>

      <BotaoAceitar />

      <p className="text-center text-xs text-texto-apoio">
        Versão do termo: {versao}. Guardamos a data do seu aceite e esta versão — se o texto
        mudar, pediremos sua concordância de novo.
      </p>
    </form>
  );
}
