'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Botao } from '@/components/ui/botao';
import { Chip } from '@/components/ui/sinal';
import { Icone } from '@/components/shell/icones';
import { cn } from '@/lib/ui';
import { atrasoEmPalavras, PRIORIDADES, TOM_DA_PRIORIDADE } from '@/dominio/tarefa';
import { dataHora, primeiroNome } from '@/lib/formato';
import { adiarFollowup, registrarFollowup } from '@/server/acoes/followups';
import type { LinhaDeFollowup } from '@/server/consultas/followups';

const ROTULO_DO_CANAL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telefone: 'Telefone',
  email: 'E-mail',
  presencial: 'Presencial',
  portal: 'Portal',
  portal_imobiliario: 'Portal imobiliário',
  indicacao: 'Indicação',
  outro: 'Outro',
};

/** Amanhã às 9h — o adiamento que o corretor mais usa. */
function amanhaDeManha(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function Followup({
  followup,
  podeEditar,
}: {
  followup: LinhaDeFollowup;
  podeEditar: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [registrando, setRegistrando] = useState(false);
  const [resultado, setResultado] = useState('');
  const router = useRouter();

  const atraso = atrasoEmPalavras(followup.prazo);

  function agir(acao: () => Promise<{ erro?: string }>) {
    iniciar(async () => {
      await acao();
      setRegistrando(false);
      setResultado('');
      router.refresh();
    });
  }

  /**
   * Mensagem pronta no WhatsApp.
   *
   * O atrito entre "ver que preciso responder" e "responder" precisa ser o
   * menor possível — é nesse intervalo que o follow-up morre. Quando há
   * mensagem sugerida, ela vai junto; senão, uma abertura neutra que o corretor
   * completa.
   */
  const whatsapp =
    followup.pessoa?.celular &&
    `https://wa.me/55${followup.pessoa.celular}?text=${encodeURIComponent(
      followup.mensagem_sugerida ??
        `Olá, ${primeiroNome(followup.pessoa.nome)}! Tudo bem? Estou retomando nosso contato.`,
    )}`;

  return (
    <li className={cn('px-4 py-3.5 transition-colors', pendente && 'opacity-50')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-grow">
          <div className="flex flex-wrap items-center gap-1.5">
            {followup.pessoa ? (
              <Link
                href={`/clientes/${followup.pessoa.id}`}
                className="font-semibold text-texto hover:underline"
              >
                {followup.pessoa.nome}
              </Link>
            ) : (
              <span className="font-semibold text-texto-apoio">Cliente removido</span>
            )}

            {followup.prioridade !== 'media' && followup.prioridade !== 'baixa' && (
              <Chip tom={TOM_DA_PRIORIDADE[followup.prioridade]}>
                {PRIORIDADES[followup.prioridade]}
              </Chip>
            )}

            {/* Quem já foi procurado três vezes precisa de OUTRA abordagem, não
                de uma quarta ligação igual. O número torna isso visível. */}
            {followup.tentativas > 0 && (
              <Chip tom={followup.tentativas >= 3 ? 'perigo' : 'atencao'}>
                {followup.tentativas}ª tentativa
              </Chip>
            )}

            {followup.automatico && <Chip>Automático</Chip>}
          </div>

          <p className="mt-0.5 text-sm text-texto">{followup.motivo}</p>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-texto-apoio">
            {atraso ? (
              <span className="font-semibold text-perigo-texto">{atraso}</span>
            ) : (
              <span>{dataHora(followup.prazo)}</span>
            )}
            {followup.canal_sugerido && (
              <span>por {ROTULO_DO_CANAL[followup.canal_sugerido] ?? followup.canal_sugerido}</span>
            )}
            {followup.negocio && (
              <Link href={`/negocios/${followup.negocio.id}`} className="text-link hover:underline">
                {followup.negocio.codigo}
              </Link>
            )}
            {followup.responsavel && <span>{followup.responsavel.nome}</span>}
          </div>
        </div>

        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-acao px-3.5 text-sm font-semibold text-acao-texto transition-colors hover:bg-acao-hover"
          >
            <Icone nome="conversa" className="size-4" />
            Responder
          </a>
        )}
      </div>

      {followup.mensagem_sugerida && (
        <p className="mt-2 rounded-lg bg-superficie-afundada px-3 py-2 text-sm text-texto-secundario">
          {followup.mensagem_sugerida}
        </p>
      )}

      {podeEditar &&
        (registrando ? (
          <div className="mt-2.5 flex flex-col gap-2 rounded-lg border border-borda p-3">
            <label htmlFor={`resultado-${followup.id}`} className="text-xs font-semibold text-texto-secundario">
              O que aconteceu
            </label>
            <input
              id={`resultado-${followup.id}`}
              value={resultado}
              onChange={(e) => setResultado(e.currentTarget.value)}
              placeholder="Ficou de responder até sexta"
              className="h-9 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-sm text-texto"
            />
            <div className="flex flex-wrap gap-2">
              <Botao
                type="button"
                tamanho="pequeno"
                disabled={pendente}
                onClick={() =>
                  agir(() =>
                    registrarFollowup({
                      followupId: followup.id,
                      desfecho: 'feito',
                      resultado: resultado || undefined,
                    }),
                  )
                }
              >
                Falei com o cliente
              </Botao>
              {/* Separado de propósito: "tentei e ninguém atendeu" é a
                  informação mais útil que esta tela produz. */}
              <Botao
                type="button"
                tipo="neutro"
                tamanho="pequeno"
                disabled={pendente}
                onClick={() =>
                  agir(() =>
                    registrarFollowup({
                      followupId: followup.id,
                      desfecho: 'sem_resposta',
                      resultado: resultado || undefined,
                    }),
                  )
                }
              >
                Tentei, sem resposta
              </Botao>
              <Botao
                type="button"
                tipo="fantasma"
                tamanho="pequeno"
                onClick={() => setRegistrando(false)}
              >
                Cancelar
              </Botao>
            </div>
          </div>
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Botao
              type="button"
              tipo="secundario"
              tamanho="pequeno"
              disabled={pendente}
              onClick={() => setRegistrando(true)}
            >
              Registrar
            </Botao>
            {/* Adiar existe porque a alternativa é pior: sem ele, o corretor
                marca como feito o que não fez, só para limpar a lista — e aí a
                lista para de dizer a verdade. */}
            <Botao
              type="button"
              tipo="fantasma"
              tamanho="pequeno"
              disabled={pendente}
              onClick={() => agir(() => adiarFollowup(followup.id, amanhaDeManha()))}
            >
              Adiar para amanhã
            </Botao>
            <Botao
              type="button"
              tipo="fantasma"
              tamanho="pequeno"
              disabled={pendente}
              onClick={() =>
                agir(() =>
                  registrarFollowup({ followupId: followup.id, desfecho: 'cancelado' }),
                )
              }
            >
              Não precisa mais
            </Botao>
          </div>
        ))}
    </li>
  );
}

export function BlocoDeFollowups({
  titulo,
  followups,
  tom,
  nota,
  podeEditar,
}: {
  titulo: string;
  followups: LinhaDeFollowup[];
  tom?: 'perigo' | 'atencao';
  nota?: string;
  podeEditar: boolean;
}) {
  if (followups.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
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
        <span className="text-sm text-texto-apoio">{followups.length}</span>
        {nota && <span className="text-xs text-texto-apoio">{nota}</span>}
      </div>

      <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
        <ul className="divide-y divide-borda">
          {followups.map((followup) => (
            <Followup key={followup.id} followup={followup} podeEditar={podeEditar} />
          ))}
        </ul>
      </div>
    </section>
  );
}
