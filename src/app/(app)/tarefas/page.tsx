import type { Metadata } from 'next';

import { exigirSessao } from '@/server/sessao';
import { clienteServidor } from '@/lib/supabase/servidor';
import { quadroDeTarefas } from '@/server/consultas/tarefas';
import { EstadoPrimeiroAcesso, EstadoSemPermissao } from '@/components/ui/estados';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { numero } from '@/lib/formato';
import { BlocoDeTarefas } from './lista';
import { FormularioDeTarefa } from './formulario';

export const metadata: Metadata = { title: 'Tarefas' };

export default async function PaginaDeTarefas() {
  const sessao = await exigirSessao('/tarefas');

  if (!sessao.pode('agenda.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Tarefas" />
      </div>
    );
  }

  const tenantId = sessao.atual.tenant.id;
  const podeEditar = sessao.pode('agenda.editar');

  const [quadro, { data: pessoas }, { data: negocios }] = await Promise.all([
    quadroDeTarefas(tenantId),
    listarPessoas(tenantId),
    listarNegocios(tenantId),
  ]);

  const vazio = quadro.total === 0 && quadro.concluidasRecentes.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
          <p className="mt-0.5 text-sm text-texto-secundario">
            {quadro.vencidas.length > 0
              ? `${numero(quadro.vencidas.length)} ${quadro.vencidas.length === 1 ? 'vencida' : 'vencidas'} — comece por elas`
              : quadro.total === 0
                ? 'Nada em aberto'
                : `${numero(quadro.total)} em aberto`}
          </p>
        </div>
      </div>

      {podeEditar && (
        <FormularioDeTarefa pessoas={pessoas ?? []} negocios={negocios ?? []} />
      )}

      {vazio ? (
        <EstadoPrimeiroAcesso
          titulo="Nada pendente por aqui"
          descricao="Tarefa é o que você anota para não esquecer: ligar de volta, buscar a matrícula, confirmar a visita. O que vence primeiro aparece no topo."
        />
      ) : (
        <>
          {/* A ORDEM DOS BLOCOS É A DECISÃO DE PRODUTO desta tela. O corretor
              abre para saber o que fazer AGORA — uma lista cronológica o
              obrigaria a varrer tudo para achar o que venceu. */}
          <BlocoDeTarefas
            titulo="Vencidas"
            tarefas={quadro.vencidas}
            tom="perigo"
            nota="prazo já passou"
          />
          <BlocoDeTarefas titulo="Para hoje" tarefas={quadro.hoje} tom="atencao" />
          <BlocoDeTarefas titulo="Próximas" tarefas={quadro.proximas} />
          <BlocoDeTarefas
            titulo="Sem prazo"
            tarefas={quadro.semPrazo}
            nota="existem, mas não cobram"
          />
          <BlocoDeTarefas titulo="Concluídas recentemente" tarefas={quadro.concluidasRecentes} />
        </>
      )}
    </div>
  );
}

/**
 * As listas do formulário, cada uma na própria função.
 *
 * Uma função só que trocasse de tabela por parâmetro pareceria mais enxuta e
 * apagaria o tipo: o retorno viraria a união das duas formas, e o compilador
 * deixaria de conferir as colunas de cada uma.
 *
 * O limite existe porque um `<select>` não é lugar de 5.000 itens — nem para o
 * navegador, nem para quem precisa achar um nome ali dentro.
 */
async function listarPessoas(tenantId: string) {
  const supabase = await clienteServidor();
  return supabase
    .from('pessoas')
    .select('id, nome')
    .eq('tenant_id', tenantId)
    .is('excluido_em', null)
    .order('nome', { ascending: true })
    .limit(500);
}

async function listarNegocios(tenantId: string) {
  const supabase = await clienteServidor();
  return supabase
    .from('negocios')
    .select('id, codigo, titulo')
    .eq('tenant_id', tenantId)
    .is('excluido_em', null)
    .eq('situacao', 'aberto')
    .order('atualizado_em', { ascending: false })
    .limit(200);
}
