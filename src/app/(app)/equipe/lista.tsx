'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Botao } from '@/components/ui/botao';
import { Chip } from '@/components/ui/sinal';
import { Icone } from '@/components/shell/icones';
import { cn } from '@/lib/ui';
import { PAPEIS_ATRIBUIVEIS, RESUMO_DO_PAPEL, ROTULO_PAPEL } from '@/dominio/permissoes';
import { dataHora, tempoRelativo } from '@/lib/formato';
import { alterarPapel, alterarSituacao, revogarConvite } from '@/server/acoes/equipe';
import type { ConvitePendente, MembroDaEquipe } from '@/server/consultas/equipe';
import type { Papel } from '@/lib/supabase/tipos-banco';

const TOM_DA_SITUACAO = {
  ativo: 'sucesso',
  convidado: 'atencao',
  suspenso: 'neutro',
  removido: 'neutro',
} as const;

const ROTULO_DA_SITUACAO = {
  ativo: 'Ativo',
  convidado: 'Convidado',
  suspenso: 'Acesso suspenso',
  removido: 'Removido',
} as const;

export function Membro({
  membro,
  podeAdministrar,
}: {
  membro: MembroDaEquipe;
  podeAdministrar: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const ehProprietario = membro.papel === 'proprietario';
  const suspenso = membro.situacao === 'suspenso';

  function agir(acao: () => Promise<{ erro?: string }>) {
    iniciar(async () => {
      const r = await acao();
      setErro(r.erro ?? null);
      if (!r.erro) router.refresh();
    });
  }

  return (
    <li className={cn('px-4 py-3.5 transition-colors', pendente && 'opacity-50')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-grow">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('font-semibold', suspenso ? 'text-texto-apoio' : 'text-texto')}>
              {membro.nome}
            </span>
            {membro.souEu && <Chip tom="acao">Você</Chip>}
            <Chip tom={TOM_DA_SITUACAO[membro.situacao]}>
              {ROTULO_DA_SITUACAO[membro.situacao]}
            </Chip>
          </div>

          <p className="text-sm text-texto-secundario">{membro.email}</p>

          <p className="mt-0.5 text-xs text-texto-apoio">
            {membro.ultimo_acesso_em
              ? `Último acesso ${tempoRelativo(membro.ultimo_acesso_em)}`
              : 'Nunca entrou'}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {ehProprietario || !podeAdministrar ? (
            <span className="text-sm font-medium text-texto">{ROTULO_PAPEL[membro.papel]}</span>
          ) : (
            <div>
              <label htmlFor={`papel-${membro.id}`} className="so-leitor">
                Papel de {membro.nome}
              </label>
              <select
                id={`papel-${membro.id}`}
                value={membro.papel}
                disabled={pendente}
                onChange={(e) => agir(() => alterarPapel(membro.id, e.target.value as Papel))}
                className="h-9 rounded-lg border border-borda-controle bg-superficie px-2 text-sm text-texto"
              >
                {PAPEIS_ATRIBUIVEIS.map((p) => (
                  <option key={p} value={p}>
                    {ROTULO_PAPEL[p]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* O proprietário não aparece com botão de desativar, e quem está
              lendo também não vê o próprio: trancar a si mesmo para fora da
              conta é irreversível sem suporte mexendo no banco. */}
          {podeAdministrar && !ehProprietario && !membro.souEu && (
            <Botao
              type="button"
              tipo={suspenso ? 'secundario' : 'fantasma'}
              tamanho="pequeno"
              disabled={pendente}
              onClick={() => agir(() => alterarSituacao(membro.id, suspenso))}
            >
              {suspenso ? 'Reativar acesso' : 'Suspender acesso'}
            </Botao>
          )}
        </div>
      </div>

      {/* O resumo do papel fica sempre visível, não num tooltip: quem administra
          precisa saber o que cada papel dá sem precisar descobrir. */}
      <p className="mt-1.5 text-xs text-texto-apoio">{RESUMO_DO_PAPEL[membro.papel]}</p>

      {erro && (
        <p role="alert" className="mt-2 rounded-lg bg-perigo-sutil px-3 py-2 text-xs text-perigo-texto">
          {erro}
        </p>
      )}
    </li>
  );
}

export function Convite({
  convite,
  podeAdministrar,
}: {
  convite: ConvitePendente;
  podeAdministrar: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  return (
    <li className={cn('flex flex-wrap items-center gap-3 px-4 py-3', pendente && 'opacity-50')}>
      <div className="min-w-0 flex-grow">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-texto">{convite.email}</span>
          <Chip tom={convite.expirado ? 'perigo' : 'atencao'}>
            {convite.expirado ? 'Expirou' : 'Aguardando'}
          </Chip>
        </div>
        <p className="mt-0.5 text-xs text-texto-apoio">
          {ROTULO_PAPEL[convite.papel]} ·{' '}
          {convite.expirado
            ? `expirou em ${dataHora(convite.expira_em)}`
            : `vale até ${dataHora(convite.expira_em)}`}
        </p>
      </div>

      {podeAdministrar && (
        <Botao
          type="button"
          tipo="fantasma"
          tamanho="pequeno"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              await revogarConvite(convite.id);
              router.refresh();
            })
          }
        >
          <Icone nome="alerta" className="size-3.5" />
          {convite.expirado ? 'Remover' : 'Revogar'}
        </Botao>
      )}
    </li>
  );
}
