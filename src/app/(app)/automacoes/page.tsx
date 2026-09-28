import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { clienteServidor } from '@/lib/supabase/servidor';
import { EstadoSemPermissao } from '@/components/ui/estados';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import type { RegraDeAutomacao } from '@/dominio/automacao';
import { PainelDeAutomacoes, type EstadoDaRegra } from './painel';

export const metadata: Metadata = { title: 'Automações' };

export default async function PaginaDeAutomacoes() {
  const sessao = await exigirSessao('/automacoes');

  if (!sessao.pode('configuracoes.editar')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Automações" />
      </div>
    );
  }

  const supabase = await clienteServidor();

  const { data } = await supabase
    .from('automacoes')
    .select('regra, ativa, parametros, ultima_execucao_em')
    .eq('tenant_id', sessao.atual.tenant.id);

  const regras: EstadoDaRegra[] = (data ?? []).map((linha) => {
    // O parâmetro vem como jsonb com UMA chave, que varia por regra. Ler o
    // primeiro valor numérico evita um `switch` que precisaria ser atualizado
    // toda vez que uma regra nova aparecesse.
    const parametros = (linha.parametros ?? {}) as Record<string, unknown>;
    const primeiro = Object.values(parametros).find((v) => typeof v === 'number');

    return {
      regra: linha.regra as RegraDeAutomacao,
      ativa: linha.ativa,
      parametro: typeof primeiro === 'number' ? primeiro : null,
      ultimaExecucao: linha.ultima_execucao_em,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Automações</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          Regras que criam follow-ups sozinhas, para você não precisar lembrar de lembrar.
        </p>
      </div>

      {/* O que cada regra produz fica dito ANTES da lista: o corretor precisa
          saber que o resultado aparece em outro lugar, senão liga tudo e fica
          esperando algo acontecer nesta tela. */}
      <p className="rounded-lg bg-superficie-afundada px-4 py-3 text-sm text-texto-secundario">
        Tudo que estas regras criam aparece em{' '}
        <Link href="/followups" className="text-link hover:underline">
          Follow-ups
        </Link>
        , marcado como automático. Nenhuma delas manda mensagem para ninguém — elas só avisam
        você.
      </p>

      <PainelDeAutomacoes regras={regras} podeEditar={sessao.pode('configuracoes.editar')} />
    </div>
  );
}
