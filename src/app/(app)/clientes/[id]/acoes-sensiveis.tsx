'use client';

import { useState, useTransition } from 'react';

import { Botao } from '@/components/ui/botao';
import { Chip } from '@/components/ui/sinal';
import { Icone } from '@/components/shell/icones';
import { formatarCpf } from '@/lib/privacidade/documentos';
import { alternarPortal, revelarCpf } from '@/server/acoes/pessoas';

/**
 * Revelar o CPF completo.
 *
 * O valor NÃO vem no HTML da página. Ele é buscado sob demanda por uma ação que
 * registra a auditoria — sem isso, mascarar na tela seria teatro: bastaria abrir
 * o código-fonte para ler o número, e não haveria como responder "quem viu o CPF
 * deste cliente e quando", que é o que a seção 18 exige.
 */
export function RevelarCpf({ pessoaId, mascarado }: { pessoaId: string; mascarado: string }) {
  const [revelado, setRevelado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, iniciar] = useTransition();

  function alternar() {
    if (revelado) {
      setRevelado(null);
      return;
    }
    iniciar(async () => {
      const r = await revelarCpf(pessoaId);
      if (r.erro) setErro(r.erro);
      else if (r.cpf) {
        setRevelado(formatarCpf(r.cpf));
        setErro(null);
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span data-numerico>{revelado ?? mascarado}</span>
      <button
        type="button"
        onClick={alternar}
        disabled={carregando}
        aria-live="polite"
        className="rounded-md border border-borda px-1.5 py-0.5 text-micro font-semibold text-link hover:bg-acao-sutil disabled:opacity-60"
      >
        {carregando ? '...' : revelado ? 'Ocultar' : 'Revelar'}
      </button>
      {erro && (
        <span role="alert" className="text-micro text-perigo-texto">
          {erro}
        </span>
      )}
    </span>
  );
}

/** Liberar, pausar ou revogar o portal do cliente (seção 6.5). */
export function ControlePortal({
  pessoaId,
  liberado,
  podeLiberar,
}: {
  pessoaId: string;
  liberado: boolean;
  /** `false` quando falta CPF ou data de nascimento. */
  podeLiberar: boolean;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, iniciar] = useTransition();

  function alternar() {
    iniciar(async () => {
      const r = await alternarPortal(pessoaId, !liberado);
      setErro(r.erro ?? null);
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="flex-grow text-sm font-semibold">Portal do cliente</h3>
        {liberado ? <Chip tom="sucesso">LIBERADO</Chip> : <Chip>PAUSADO</Chip>}
      </div>

      <p className="mb-3 text-xs leading-relaxed text-texto-secundario">
        {liberado
          ? 'O cliente acompanha o processo pelo portal, entrando com CPF e data de nascimento. Não existe senha para ele esquecer.'
          : podeLiberar
            ? 'Libere para que o cliente acompanhe as etapas, os imóveis e o financiamento sem precisar te perguntar.'
            : 'Para liberar, cadastre o CPF e a data de nascimento: é com esses dois dados que o cliente entra.'}
      </p>

      <div className="flex gap-2">
        <Botao
          tipo={liberado ? 'neutro' : 'secundario'}
          tamanho="pequeno"
          onClick={alternar}
          disabled={carregando || (!liberado && !podeLiberar)}
        >
          {carregando ? 'Salvando' : liberado ? 'Pausar acesso' : 'Liberar acesso'}
        </Botao>

        {liberado && (
          <Botao tipo="fantasma" tamanho="pequeno" comoFilho>
            <a href={`/portal?pessoa=${pessoaId}`} target="_blank" rel="noreferrer">
              <Icone nome="seta" className="size-3.5" />
              Ver como o cliente vê
            </a>
          </Botao>
        )}
      </div>

      {erro && (
        <p role="alert" className="mt-2 text-xs text-perigo-texto">
          {erro}
        </p>
      )}
    </div>
  );
}
