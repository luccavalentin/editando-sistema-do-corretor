import type { Metadata } from 'next';

import { exigirSessao } from '@/server/sessao';
import { quadroDeFollowups } from '@/server/consultas/followups';
import { EstadoPrimeiroAcesso, EstadoSemPermissao } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { numero } from '@/lib/formato';
import { BlocoDeFollowups } from './lista';

export const metadata: Metadata = { title: 'Follow-ups' };

export default async function PaginaDeFollowups() {
  const sessao = await exigirSessao('/followups');

  if (!sessao.pode('crm.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Follow-ups" />
      </div>
    );
  }

  const quadro = await quadroDeFollowups(sessao.atual.tenant.id);
  const podeEditar = sessao.pode('crm.editar');

  const vazio = quadro.total === 0 && quadro.semResposta.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Follow-ups</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          {quadro.vencidos.length > 0
            ? `${numero(quadro.vencidos.length)} ${
                quadro.vencidos.length === 1
                  ? 'pessoa esperando resposta'
                  : 'pessoas esperando resposta'
              }`
            : quadro.total === 0
              ? 'Ninguém esperando'
              : `${numero(quadro.total)} em aberto`}
        </p>
      </div>

      {/* A distinção entre esta tela e a de tarefas precisa ficar explícita, ou
          o corretor usa as duas para a mesma coisa e nenhuma serve. */}
      {quadro.vencidos.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-perigo-sutil px-3 py-2.5 text-sm text-perigo-texto">
          <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
          <span>
            Follow-up vencido não é trabalho atrasado — é alguém sem resposta. É assim que uma
            venda que já estava andando se perde.
          </span>
        </p>
      )}

      {vazio ? (
        <EstadoPrimeiroAcesso
          titulo="Ninguém esperando resposta"
          descricao="Follow-up é a promessa de voltar a falar com alguém. Ele nasce quando você combina um retorno, ou automaticamente quando um negócio fica parado tempo demais."
        />
      ) : (
        <>
          <BlocoDeFollowups
            titulo="Atrasados"
            followups={quadro.vencidos}
            tom="perigo"
            nota="o prazo que você combinou já passou"
            podeEditar={podeEditar}
          />
          <BlocoDeFollowups
            titulo="Para hoje"
            followups={quadro.hoje}
            tom="atencao"
            podeEditar={podeEditar}
          />
          <BlocoDeFollowups
            titulo="Próximos"
            followups={quadro.proximos}
            podeEditar={podeEditar}
          />
          <BlocoDeFollowups
            titulo="Tentou e não teve resposta"
            followups={quadro.semResposta}
            nota="precisam de outra abordagem, não de mais uma ligação igual"
            podeEditar={podeEditar}
          />
        </>
      )}
    </div>
  );
}
