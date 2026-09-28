'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Icone } from '@/components/shell/icones';
import { excluirOsMeusDados } from '@/server/acoes/portal-lgpd';

function BotaoConfirmar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-lg bg-perigo-forte px-5 text-sm font-semibold text-acao-texto transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Apagando' : 'Sim, apagar meus dados deste portal'}
    </button>
  );
}

/**
 * A exclusão, em dois passos.
 *
 * O primeiro clique não apaga nada: ele abre a explicação. Esta é uma ação
 * irreversível pedida por alguém que provavelmente está irritado com algo, e
 * um clique acidental num botão vermelho não pode custar o histórico dele.
 *
 * A explicação também precisa ser HONESTA sobre o alcance. Prometer exclusão
 * total e entregar exclusão parcial seria pior do que explicar a diferença: o
 * cadastro na imobiliária permanece, porque o corretor tem obrigação legal de
 * manter registro de uma negociação.
 */
export function ExcluirMeusDados({ nomeDoCorretor }: { nomeDoCorretor: string }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="text-sm font-semibold text-perigo-texto hover:underline"
        >
          Apagar meus dados deste portal
        </button>
        <p className="mt-1 text-xs text-texto-apoio">
          Apaga seu acesso e seu histórico aqui. O cadastro com {nomeDoCorretor} permanece.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-perigo-borda bg-perigo-sutil p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icone nome="alerta" className="size-4 text-perigo-texto" />
        <h3 className="font-bold text-perigo-texto">Tem certeza?</h3>
      </div>

      <div className="mb-4 flex flex-col gap-3 text-sm text-perigo-texto">
        <div>
          <p className="font-semibold">O que será apagado agora</p>
          <ul className="mt-0.5 list-inside list-disc">
            <li>Seu acesso a este portal</li>
            <li>O registro das suas entradas</li>
            <li>O aceite do termo</li>
          </ul>
        </div>

        <div>
          <p className="font-semibold">O que NÃO será apagado</p>
          <ul className="mt-0.5 list-inside list-disc">
            <li>Seu cadastro com {nomeDoCorretor}</li>
            <li>As simulações já feitas em seu nome</li>
            <li>O histórico da negociação</li>
          </ul>
          <p className="mt-1">
            O corretor tem obrigação legal de manter esse registro. Para apagá-lo também, fale
            diretamente com {nomeDoCorretor}.
          </p>
        </div>

        <p>Isto não pode ser desfeito. Para voltar, será preciso pedir a liberação de novo.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={excluirOsMeusDados}>
          <BotaoConfirmar />
        </form>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="h-11 rounded-lg border border-borda bg-superficie px-5 text-sm font-semibold text-texto"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
