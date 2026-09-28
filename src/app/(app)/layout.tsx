import { exigirSessao } from '@/server/sessao';
import { clienteServidor } from '@/lib/supabase/servidor';
import { MenuLateral, NavegacaoInferior, type Contadores } from '@/components/shell/menu';
import { Cabecalho } from '@/components/shell/cabecalho';
import { itensDoCelular, menuPermitido } from '@/components/shell/navegacao';
import { sair } from '@/app/entrar/acoes';
import { RegistrarServiceWorker } from '@/components/provedores/service-worker';
import { InteracoesNativas } from '@/components/provedores/interacoes-nativas';

/**
 * Casca da operação do corretor.
 *
 * Toda rota deste grupo exige sessão. `exigirSessao` redireciona quando não há
 * usuário — é a segunda barreira, depois do middleware, e existe porque uma rota
 * nova herda a proteção sem ninguém precisar lembrar de adicioná-la.
 *
 * Os contadores são buscados aqui, uma vez, e descem para o menu. Buscar em cada
 * item de menu geraria quatro consultas por navegação.
 */
export default async function LayoutDaOperacao({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();
  const supabase = await clienteServidor();
  const tenantId = sessao.atual.tenant.id;
  const agora = new Date().toISOString();

  // `head: true` com `count: 'exact'` traz só o número, sem trazer as linhas: o
  // menu precisa do total, não dos registros.
  const [tarefas, followups, agendaHoje] = await Promise.all([
    supabase
      .from('tarefas')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('situacao', 'aberta')
      .lt('prazo', agora),
    supabase
      .from('followups')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('situacao', 'pendente')
      .lt('prazo', agora),
    supabase
      .from('compromissos')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('situacao', ['agendado', 'confirmado'])
      .gte('inicio', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .lte('inicio', new Date(new Date().setHours(23, 59, 59, 999)).toISOString()),
  ]);

  const contadores: Contadores = {
    tarefas: tarefas.count ?? 0,
    followups: followups.count ?? 0,
    agenda: agendaHoje.count ?? 0,
    // Mensagens entram quando a migração de atendimento existir. Zero é honesto:
    // melhor não mostrar contador do que mostrar número inventado.
    mensagens: 0,
  };

  const grupos = menuPermitido(sessao.pode);
  const itensCelular = itensDoCelular(sessao.pode);

  return (
    <div className="flex h-dvh overflow-hidden bg-fundo">
      {/* Aqui, e nao no layout raiz: a vitrine publica recebe desconhecidos, e
          nao se instala processo em segundo plano no navegador de quem so veio
          olhar um apartamento. */}
      <RegistrarServiceWorker />
      <InteracoesNativas />

      <MenuLateral
        grupos={grupos}
        contadores={contadores}
        limiteImoveis={undefined}
        imoveisUsados={undefined}
        nome={sessao.perfil.nome || sessao.perfil.email}
        papel={sessao.atual.papel}
        aoSair={sair}
      />

      <div className="flex min-w-0 flex-grow flex-col">
        <Cabecalho
          nome={sessao.perfil.nome || sessao.perfil.email}
          papel={sessao.atual.papel}
          naoLidas={contadores.followups ?? 0}
          aoSair={sair}
        />

        <main
          id="conteudo"
          className="flex-grow overflow-y-auto overscroll-contain scroll-smooth [view-transition-name:conteudo]"
        >
          {children}
        </main>

        <NavegacaoInferior itens={itensCelular} contadores={contadores} />
      </div>
    </div>
  );
}
