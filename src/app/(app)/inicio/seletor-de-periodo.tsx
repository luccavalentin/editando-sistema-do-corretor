'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { cn } from '@/lib/ui';
import type { Periodo } from '@/server/consultas/painel';

const OPCOES: { valor: Periodo; rotulo: string }[] = [
  { valor: 7, rotulo: '7 dias' },
  { valor: 30, rotulo: '30 dias' },
  { valor: 90, rotulo: '90 dias' },
];

/**
 * Troca o período dos indicadores.
 *
 * O período vive na URL, não em estado de componente. Três consequências
 * práticas: o corretor consegue mandar "olha o trimestre" por link para o
 * gerente, o botão voltar do navegador funciona, e a página recarrega no mesmo
 * recorte depois de um F5.
 *
 * `useTransition` mantém os números antigos visíveis enquanto os novos chegam,
 * em vez de piscar a tela inteira em branco. O `aria-busy` avisa o leitor de
 * tela de que o conteúdo está sendo atualizado.
 */
export function SeletorDePeriodo({ atual }: { atual: Periodo }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [carregando, iniciar] = useTransition();

  function escolher(valor: Periodo) {
    const novos = new URLSearchParams(parametros.toString());
    novos.set('periodo', String(valor));
    iniciar(() => {
      router.push(`/inicio?${novos.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      role="group"
      aria-label="Período dos indicadores"
      aria-busy={carregando}
      className="flex gap-0.5 rounded-lg border border-borda bg-superficie-afundada p-0.5"
    >
      {OPCOES.map((o) => {
        const ativo = o.valor === atual;
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => escolher(o.valor)}
            aria-pressed={ativo}
            disabled={carregando}
            className={cn(
              'h-8 rounded-md px-3 text-xs font-semibold transition-colors',
              ativo
                ? 'bg-superficie text-link shadow-baixa'
                : 'text-texto-secundario hover:text-texto',
              carregando && 'cursor-wait',
            )}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
