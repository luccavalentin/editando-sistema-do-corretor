'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Chip } from '@/components/ui/sinal';
import { Icone } from '@/components/shell/icones';
import { cn } from '@/lib/ui';
import { atrasoEmPalavras, PRIORIDADES, TOM_DA_PRIORIDADE } from '@/dominio/tarefa';
import { dataHora } from '@/lib/formato';
import { alternarConclusao } from '@/server/acoes/tarefas';
import type { LinhaDeTarefa } from '@/server/consultas/tarefas';

/**
 * Uma tarefa na lista.
 *
 * A CAIXA DE MARCAR É O ELEMENTO PRINCIPAL, e fica à esquerda, grande.
 * Concluir tarefa é o gesto que o corretor faz dezenas de vezes por dia,
 * muitas vezes no celular, com uma mão só. Enterrá-lo num menu de três pontos
 * transformaria a ação mais frequente na mais custosa.
 */
function Tarefa({ tarefa }: { tarefa: LinhaDeTarefa }) {
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const concluida = tarefa.situacao === 'feita';
  const atraso = concluida ? null : atrasoEmPalavras(tarefa.prazo);

  return (
    <li
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors',
        pendente && 'opacity-50',
        !concluida && atraso && 'bg-perigo-sutil/40',
      )}
    >
      <button
        type="button"
        disabled={pendente}
        aria-pressed={concluida}
        // O rótulo diz o que o clique FAZ, não o estado. Leitor de tela anuncia
        // a ação; `aria-pressed` cobre o estado.
        aria-label={concluida ? `Reabrir: ${tarefa.titulo}` : `Concluir: ${tarefa.titulo}`}
        onClick={() =>
          iniciar(async () => {
            await alternarConclusao(tarefa.id, !concluida);
            router.refresh();
          })
        }
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          concluida
            ? 'border-sucesso bg-sucesso text-acao-texto'
            : 'border-borda-controle hover:border-acao',
        )}
      >
        {concluida && <Icone nome="escudo" className="size-3" />}
      </button>

      <div className="min-w-0 flex-grow">
        <p
          className={cn(
            'font-medium leading-snug',
            concluida ? 'text-texto-apoio line-through' : 'text-texto',
          )}
        >
          {tarefa.titulo}
        </p>

        {tarefa.descricao && (
          <p className="linhas-2 mt-0.5 text-sm text-texto-secundario">{tarefa.descricao}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-texto-apoio">
          {tarefa.prioridade !== 'media' && tarefa.prioridade !== 'baixa' && (
            <Chip tom={TOM_DA_PRIORIDADE[tarefa.prioridade]}>
              {PRIORIDADES[tarefa.prioridade]}
            </Chip>
          )}

          {/* O atraso vem em PALAVRAS, não em data: "venceu há 3 dias" diz o
              tamanho do problema sem o corretor calcular nada. */}
          {atraso && <span className="font-semibold text-perigo-texto">{atraso}</span>}
          {!atraso && tarefa.prazo && !concluida && <span>{dataHora(tarefa.prazo)}</span>}

          {tarefa.pessoa && (
            <Link
              href={`/clientes/${tarefa.pessoa.id}`}
              className="text-link hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {tarefa.pessoa.nome}
            </Link>
          )}

          {tarefa.negocio && (
            <Link
              href={`/negocios/${tarefa.negocio.id}`}
              className="text-link hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {tarefa.negocio.codigo}
            </Link>
          )}

          {tarefa.responsavel && <span>{tarefa.responsavel.nome}</span>}
        </div>
      </div>
    </li>
  );
}

export function BlocoDeTarefas({
  titulo,
  tarefas,
  tom,
  nota,
}: {
  titulo: string;
  tarefas: LinhaDeTarefa[];
  tom?: 'perigo' | 'atencao';
  nota?: string;
}) {
  if (tarefas.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2
          className={cn(
            'text-sm font-bold uppercase tracking-wide',
            tom === 'perigo'
              ? 'text-perigo-texto'
              : tom === 'atencao'
                ? 'text-atencao-texto'
                : 'text-texto-apoio',
          )}
        >
          {titulo}
        </h2>
        <span className="text-sm text-texto-apoio">{tarefas.length}</span>
        {nota && <span className="text-xs text-texto-apoio">{nota}</span>}
      </div>

      <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
        <ul className="divide-y divide-borda">
          {tarefas.map((tarefa) => (
            <Tarefa key={tarefa.id} tarefa={tarefa} />
          ))}
        </ul>
      </div>
    </section>
  );
}
