'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Botao } from '@/components/ui/botao';
import { Cartao } from '@/components/ui/cartao';
import { Chip } from '@/components/ui/sinal';
import { Icone } from '@/components/shell/icones';
import { cn } from '@/lib/ui';
import { ORDEM_DAS_REGRAS, REGRAS, type RegraDeAutomacao } from '@/dominio/automacao';
import { tempoRelativo } from '@/lib/formato';
import {
  ajustarParametro,
  alternarRegra,
  executarAgora,
  type ResultadoDaExecucao,
} from '@/server/acoes/automacoes';

export interface EstadoDaRegra {
  regra: RegraDeAutomacao;
  ativa: boolean;
  parametro: number | null;
  ultimaExecucao: string | null;
}

function Regra({
  estado,
  podeEditar,
}: {
  estado: EstadoDaRegra;
  podeEditar: boolean;
}) {
  const definicao = REGRAS[estado.regra];
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const valor = estado.parametro ?? definicao.parametro?.padrao ?? 0;

  function agir(acao: () => Promise<{ erro?: string }>) {
    iniciar(async () => {
      const r = await acao();
      setErro(r.erro ?? null);
      if (!r.erro) router.refresh();
    });
  }

  return (
    <Cartao className={cn('p-4', pendente && 'opacity-60', estado.ativa && 'border-acao')}>
      <div className="flex items-start gap-3">
        {/* O interruptor à esquerda, grande. Ligar e desligar é a única ação
            desta tela — enterrá-la num menu seria esconder o que ela faz. */}
        <input
          id={`regra-${estado.regra}`}
          type="checkbox"
          checked={estado.ativa}
          disabled={!podeEditar || pendente}
          onChange={(e) => agir(() => alternarRegra(estado.regra, e.target.checked))}
          aria-describedby={`regra-${estado.regra}-explicacao`}
          className="mt-0.5 size-5 shrink-0 accent-[var(--cor-acao)]"
        />

        <div className="min-w-0 flex-grow">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={`regra-${estado.regra}`}
              className={cn(
                'font-semibold',
                podeEditar && 'cursor-pointer',
                estado.ativa ? 'text-texto' : 'text-texto-secundario',
              )}
            >
              {definicao.nome}
            </label>
            {estado.ativa ? <Chip tom="sucesso">Ligada</Chip> : <Chip>Desligada</Chip>}
          </div>

          <p id={`regra-${estado.regra}-explicacao`} className="mt-0.5 text-sm text-texto-secundario">
            {definicao.oQueFaz}
          </p>

          {/* O "por quê" fica visível, não num tooltip: é o que faz o corretor
              entender se a regra serve para ele. */}
          <p className="mt-1 text-xs text-texto-apoio">{definicao.quandoDispara}</p>

          {definicao.parametro && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <label
                htmlFor={`param-${estado.regra}`}
                className="text-xs font-semibold text-texto-secundario"
              >
                {definicao.parametro.rotulo}
              </label>
              <input
                id={`param-${estado.regra}`}
                type="number"
                min={definicao.parametro.min}
                max={definicao.parametro.max}
                defaultValue={valor}
                disabled={!podeEditar || pendente}
                onBlur={(e) => {
                  const novo = Number(e.currentTarget.value);
                  if (novo !== valor) agir(() => ajustarParametro(estado.regra, novo));
                }}
                className="h-8 w-20 rounded-lg border border-borda-controle bg-superficie px-2 text-sm tabular-nums text-texto"
              />
              <span className="text-xs text-texto-apoio">{definicao.parametro.unidade}</span>
            </div>
          )}

          {estado.ultimaExecucao && (
            <p className="mt-2 text-xs text-texto-apoio">
              Rodou {tempoRelativo(estado.ultimaExecucao)}
            </p>
          )}

          {erro && (
            <p role="alert" className="mt-2 rounded-lg bg-perigo-sutil px-3 py-2 text-xs text-perigo-texto">
              {erro}
            </p>
          )}
        </div>
      </div>
    </Cartao>
  );
}

export function PainelDeAutomacoes({
  regras,
  podeEditar,
}: {
  regras: EstadoDaRegra[];
  podeEditar: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoDaExecucao | null>(null);
  const router = useRouter();

  const porRegra = new Map(regras.map((r) => [r.regra, r]));
  const ativas = regras.filter((r) => r.ativa).length;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {ORDEM_DAS_REGRAS.map((regra) => (
          <li key={regra}>
            <Regra
              estado={
                porRegra.get(regra) ?? {
                  regra,
                  ativa: false,
                  parametro: null,
                  ultimaExecucao: null,
                }
              }
              podeEditar={podeEditar}
            />
          </li>
        ))}
      </ul>

      {podeEditar && (
        <div className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Botao
              type="button"
              disabled={pendente || ativas === 0}
              onClick={() =>
                iniciar(async () => {
                  const r = await executarAgora();
                  setResultado(r);
                  router.refresh();
                })
              }
            >
              {pendente ? 'Rodando' : 'Rodar agora'}
            </Botao>

            {ativas === 0 && (
              <p className="text-sm text-texto-apoio">Ligue pelo menos uma regra primeiro.</p>
            )}
          </div>

          {resultado?.erro && (
            <p role="alert" className="rounded-lg bg-perigo-sutil px-3 py-2.5 text-sm text-perigo-texto">
              {resultado.erro}
            </p>
          )}

          {resultado?.criados && (
            <div role="status" className="rounded-lg bg-sucesso-sutil px-3 py-2.5 text-sm text-sucesso-texto">
              {resultado.criados.every((r) => r.criados === 0) ? (
                // "Rodou e não achou nada" é informação. Sem esta frase, o
                // corretor clica, nada muda na tela, e ele não sabe se
                // funcionou.
                <p>Rodou e não encontrou nada novo para cobrar. Está tudo em dia.</p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {resultado.criados
                    .filter((r) => r.criados > 0)
                    .map((r) => (
                      <li key={r.regra}>
                        <strong>{REGRAS[r.regra as RegraDeAutomacao]?.nome ?? r.regra}</strong>:{' '}
                        {r.criados} follow-up{r.criados === 1 ? '' : 's'}
                        {/* O teto precisa ser dito. Um corretor que vir "50" e
                            não souber do limite acha que são todos. */}
                        {r.limitado && ' (limite de 50 por execução — rode de novo para o resto)'}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* A honestidade sobre o agendamento. Sem ela, o corretor liga as regras e
          espera que aconteçam sozinhas — e elas não acontecem. */}
      <div className="flex items-start gap-3 rounded-xl border border-atencao-borda bg-atencao-sutil p-4">
        <Icone nome="alerta" className="mt-0.5 size-4 shrink-0 text-atencao-texto" />
        <div className="text-sm text-atencao-texto">
          <p className="font-semibold">Por enquanto, as regras só rodam quando você clica.</p>
          <p className="mt-0.5">
            O agendamento automático depende de uma configuração no servidor que ainda não foi
            ligada — de propósito: um processo que cria follow-ups sozinho deve ser ligado por
            quem opera a instalação, não por quem escreveu o código. Enquanto isso, clique em
            &ldquo;Rodar agora&rdquo; quando quiser, e você vê exatamente o que foi criado.
          </p>
        </div>
      </div>
    </div>
  );
}
