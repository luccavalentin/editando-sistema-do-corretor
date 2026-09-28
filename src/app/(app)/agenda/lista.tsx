'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Botao } from '@/components/ui/botao';
import { Chip } from '@/components/ui/sinal';
import { Icone } from '@/components/shell/icones';
import { cn } from '@/lib/ui';
import {
  SITUACOES_DE_COMPROMISSO,
  TIPOS_DE_COMPROMISSO,
  TOM_DA_SITUACAO,
} from '@/dominio/compromisso';
import { confirmarCompromisso, registrarComparecimento } from '@/server/acoes/agenda';
import type { CompromissoDaAgenda } from '@/server/consultas/agenda';

/** Hora no formato que se lê de relance: 14:30. */
function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function Compromisso({
  compromisso,
  emConflito,
  apertado,
  precisaConfirmar,
  podeEditar,
  jaPassou,
}: {
  compromisso: CompromissoDaAgenda;
  emConflito: boolean;
  apertado: { minutosDisponiveis: number; minutosNecessarios: number } | undefined;
  precisaConfirmar: boolean;
  podeEditar: boolean;
  jaPassou: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const situacao = SITUACOES_DE_COMPROMISSO[compromisso.situacao] ?? compromisso.situacao;
  const tom = TOM_DA_SITUACAO[compromisso.situacao] ?? 'neutro';
  const aindaVale = compromisso.situacao === 'agendado' || compromisso.situacao === 'confirmado';

  function agir(acao: () => Promise<{ erro?: string }>) {
    iniciar(async () => {
      await acao();
      router.refresh();
    });
  }

  return (
    <li
      className={cn(
        'flex gap-3 border-l-4 px-4 py-3 transition-colors',
        pendente && 'opacity-50',
        emConflito
          ? 'border-l-perigo bg-perigo-sutil/40'
          : apertado
            ? 'border-l-atencao bg-atencao-sutil/30'
            : compromisso.situacao === 'confirmado'
              ? 'border-l-sucesso'
              : 'border-l-transparent',
      )}
    >
      {/* A HORA é o que o corretor procura primeiro ao bater o olho na agenda.
          Fica à esquerda, em tamanho maior, com largura fixa para as linhas
          alinharem — coluna desalinhada obriga a ler cada uma. */}
      <div className="w-14 shrink-0 text-right">
        <p className="text-lg font-bold leading-tight tabular-nums text-texto">
          {hora(compromisso.inicio)}
        </p>
        <p className="text-xs tabular-nums text-texto-apoio">{hora(compromisso.fim)}</p>
      </div>

      <div className="min-w-0 flex-grow">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-texto">{compromisso.titulo}</span>
          <Chip tom={tom}>{situacao}</Chip>
          <Chip>{TIPOS_DE_COMPROMISSO[compromisso.tipo] ?? compromisso.tipo}</Chip>
        </div>

        {/* OS AVISOS VÊM ANTES DOS DETALHES. São o motivo de esta tela existir:
            uma grade de horários qualquer não conta nenhum dos dois. */}
        {emConflito && (
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-perigo-texto">
            <Icone nome="alerta" className="size-3.5 shrink-0" />
            Choca com outro compromisso deste dia
          </p>
        )}

        {apertado && (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-atencao-texto">
            <Icone nome="alerta" className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Só {apertado.minutosDisponiveis} min desde o compromisso anterior, e o
              deslocamento leva {apertado.minutosNecessarios}.
            </span>
          </p>
        )}

        {precisaConfirmar && (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-atencao-texto">
            <Icone nome="relogio" className="mt-0.5 size-3.5 shrink-0" />
            <span>Ainda não confirmado — confirme antes de sair.</span>
          </p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-texto-apoio">
          {compromisso.pessoa && (
            <Link href={`/clientes/${compromisso.pessoa.id}`} className="text-link hover:underline">
              {compromisso.pessoa.nome}
            </Link>
          )}
          {compromisso.negocio && (
            <Link
              href={`/negocios/${compromisso.negocio.id}`}
              className="text-link hover:underline"
            >
              {compromisso.negocio.codigo}
            </Link>
          )}
          {compromisso.endereco && <span className="linhas-1">{compromisso.endereco}</span>}
          {compromisso.responsavel && <span>{compromisso.responsavel.nome}</span>}
        </div>

        {podeEditar && aindaVale && (
          <div className="mt-2 flex flex-wrap gap-2">
            {/* O que o corretor faz na VÉSPERA, por telefone. */}
            {!jaPassou && (
              <Botao
                type="button"
                tipo={compromisso.situacao === 'confirmado' ? 'neutro' : 'secundario'}
                tamanho="pequeno"
                disabled={pendente}
                onClick={() =>
                  agir(() =>
                    confirmarCompromisso(
                      compromisso.id,
                      compromisso.situacao !== 'confirmado',
                    ),
                  )
                }
              >
                {compromisso.situacao === 'confirmado' ? 'Desfazer confirmação' : 'Confirmar'}
              </Botao>
            )}

            {/* O que ele faz DEPOIS, na rua. Só aparece quando a hora passou —
                registrar presença de algo que ainda não aconteceu não existe. */}
            {jaPassou && (
              <>
                <Botao
                  type="button"
                  tipo="secundario"
                  tamanho="pequeno"
                  disabled={pendente}
                  onClick={() => agir(() => registrarComparecimento(compromisso.id, true))}
                >
                  Aconteceu
                </Botao>
                <Botao
                  type="button"
                  tipo="neutro"
                  tamanho="pequeno"
                  disabled={pendente}
                  onClick={() => agir(() => registrarComparecimento(compromisso.id, false))}
                >
                  Cliente não veio
                </Botao>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
