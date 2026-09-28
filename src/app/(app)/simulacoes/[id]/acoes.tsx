'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Botao } from '@/components/ui/botao';
import { Icone } from '@/components/shell/icones';
import { atualizarAndamento, enviarAosBancos, escolherBanco } from '@/server/acoes/simulacoes';

/**
 * Os botões que falam com o banco.
 *
 * Componentes de cliente porque precisam de estado de espera: a chamada à
 * Homefin passa por três ou quatro requisições encadeadas e pode levar alguns
 * segundos. Sem retorno visual, o corretor clica de novo — e cada clique é uma
 * consulta de crédito registrada no nome do cliente.
 */

export function BotaoEnviar({
  simulacaoId,
  integracaoLigada,
  podeEnviar,
}: {
  simulacaoId: string;
  integracaoLigada: boolean;
  podeEnviar: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<{ erro?: string; aviso?: string } | null>(null);
  const router = useRouter();

  if (!podeEnviar) {
    return (
      <p className="rounded-lg border border-borda bg-superficie-afundada px-3 py-2.5 text-xs text-texto-secundario">
        Seu papel não permite enviar simulações aos bancos. Peça a quem administra a conta.
      </p>
    );
  }

  if (!integracaoLigada) {
    return (
      <p className="rounded-lg border border-atencao-borda bg-atencao-sutil px-3 py-2.5 text-xs text-atencao-texto">
        A integração com os bancos não está configurada nesta instalação. A simulação está salva
        e pode ser enviada assim que ela for ligada.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Botao
        type="button"
        larguraTotal
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await enviarAosBancos(simulacaoId);
            setResultado(r);
            if (!r.erro) router.refresh();
          })
        }
      >
        {pendente ? 'Enviando aos bancos' : 'Enviar aos bancos'}
      </Botao>

      {pendente && (
        <p role="status" className="text-xs text-texto-apoio">
          Abrindo a oportunidade e enviando uma proposta por banco. Pode levar alguns segundos.
        </p>
      )}

      {resultado?.erro && (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-lg bg-perigo-sutil px-3 py-2 text-xs text-perigo-texto"
        >
          <Icone nome="alerta" className="mt-0.5 size-3 shrink-0" />
          {resultado.erro}
        </p>
      )}

      {resultado?.aviso && (
        <p
          role="status"
          className="flex items-start gap-1.5 rounded-lg bg-atencao-sutil px-3 py-2 text-xs text-atencao-texto"
        >
          <Icone nome="alerta" className="mt-0.5 size-3 shrink-0" />
          {resultado.aviso}
        </p>
      )}
    </div>
  );
}

export function BotaoAtualizar({ simulacaoId }: { simulacaoId: string }) {
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1.5">
      <Botao
        type="button"
        tipo="neutro"
        larguraTotal
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await atualizarAndamento(simulacaoId);
            // O banco responde em minutos ou horas, e o contrato da Homefin não
            // tem webhook. Dizer "nada mudou ainda" é melhor do que deixar o
            // corretor achar que o botão não funcionou.
            setMensagem(r.erro ?? (r.mudou ? null : 'Ainda sem novidade dos bancos.'));
            if (!r.erro) router.refresh();
          })
        }
      >
        <Icone nome="relogio" className="size-4" />
        {pendente ? 'Consultando' : 'Atualizar andamento'}
      </Botao>

      {mensagem && (
        <p role="status" className="text-xs text-texto-apoio">
          {mensagem}
        </p>
      )}
    </div>
  );
}

export function BotaoEscolherBanco({
  simulacaoId,
  bancoId,
  nomeBanco,
}: {
  simulacaoId: string;
  bancoId: string;
  nomeBanco: string;
}) {
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  return (
    <Botao
      type="button"
      tipo="secundario"
      tamanho="pequeno"
      disabled={pendente}
      aria-label={`Seguir com ${nomeBanco}`}
      onClick={() =>
        iniciar(async () => {
          await escolherBanco({ simulacaoId, bancoId });
          router.refresh();
        })
      }
    >
      {pendente ? 'Marcando' : 'Seguir com este'}
    </Botao>
  );
}
