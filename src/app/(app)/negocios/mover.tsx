'use client';

import { useState, useTransition } from 'react';

import { Botao } from '@/components/ui/botao';
import { Icone } from '@/components/shell/icones';
import { moverEtapa } from '@/server/acoes/negocios';

export interface EtapaDisponivel {
  id: string;
  nome: string;
  encerraComo: 'aberto' | 'ganho' | 'perdido' | 'pausado' | null;
}

/**
 * Move o negócio de etapa.
 *
 * É um `<select>`, e não arrastar-e-soltar, por três motivos concretos:
 * arrastar não funciona com teclado nem com leitor de tela; em tela de celular,
 * que é onde o corretor está na rua, arrastar entre colunas é impraticável; e um
 * arraste acidental move o negócio sem confirmação, o que aqui significa perder
 * o registro de quando ele realmente avançou.
 *
 * Quando a etapa de destino encerra o negócio como perdido, o campo de motivo
 * aparece antes de confirmar — é o dado que alimenta "onde a carteira está
 * vazando" no funil, e o banco recusa a perda sem ele.
 */
export function MoverEtapa({
  negocioId,
  etapaAtualId,
  etapas,
  compacto = false,
}: {
  negocioId: string;
  etapaAtualId: string;
  etapas: EtapaDisponivel[];
  compacto?: boolean;
}) {
  const [destino, setDestino] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const etapaDestino = etapas.find((e) => e.id === destino);
  const exigeMotivo = etapaDestino?.encerraComo === 'perdido';

  function confirmar() {
    if (!destino) return;
    iniciar(async () => {
      const r = await moverEtapa(negocioId, destino, exigeMotivo ? motivo : undefined);
      if (r.erro) {
        setErro(r.erro);
      } else {
        setErro(null);
        setDestino('');
        setMotivo('');
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`mover-${negocioId}`} className="so-leitor">
          Mover para a etapa
        </label>
        <select
          id={`mover-${negocioId}`}
          value={destino}
          onChange={(e) => {
            setDestino(e.target.value);
            setErro(null);
          }}
          disabled={salvando}
          className={
            compacto
              ? 'h-8 flex-grow rounded-md border border-borda-controle bg-superficie px-2 text-xs text-texto'
              : 'h-9 flex-grow rounded-lg border border-borda-controle bg-superficie px-2 text-sm text-texto'
          }
        >
          <option value="">Mover para…</option>
          {etapas
            .filter((e) => e.id !== etapaAtualId)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
                {e.encerraComo === 'ganho' ? ' (encerra como ganho)' : ''}
                {e.encerraComo === 'perdido' ? ' (encerra como perdido)' : ''}
              </option>
            ))}
        </select>

        {destino && !exigeMotivo && (
          <Botao tamanho={compacto ? 'pequeno' : 'medio'} onClick={confirmar} disabled={salvando}>
            {salvando ? 'Movendo' : 'Confirmar'}
          </Botao>
        )}
      </div>

      {exigeMotivo && (
        <div className="rounded-lg border border-perigo-borda bg-perigo-sutil p-3">
          <label
            htmlFor={`motivo-${negocioId}`}
            className="mb-1.5 block text-xs font-semibold text-perigo-texto"
          >
            Por que este negócio foi perdido?
          </label>
          <input
            id={`motivo-${negocioId}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Comprou com outro corretor, desistiu, crédito negado…"
            className="mb-2 h-9 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-sm text-texto"
          />
          <p className="mb-2 text-xs text-perigo-texto">
            É esse dado que mostra onde a carteira está vazando. Sem ele, o funil só diz que você
            perdeu — não diz por quê.
          </p>
          <div className="flex gap-2">
            <Botao
              tipo="perigo"
              tamanho="pequeno"
              onClick={confirmar}
              disabled={salvando || motivo.trim().length < 3}
            >
              {salvando ? 'Salvando' : 'Marcar como perdido'}
            </Botao>
            <Botao
              tipo="neutro"
              tamanho="pequeno"
              onClick={() => {
                setDestino('');
                setMotivo('');
              }}
            >
              Cancelar
            </Botao>
          </div>
        </div>
      )}

      {erro && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-perigo-texto">
          <Icone nome="alerta" className="mt-0.5 size-3 shrink-0" />
          {erro}
        </p>
      )}
    </div>
  );
}
