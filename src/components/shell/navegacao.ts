import type { Acao } from '@/dominio/permissoes';

/**
 * Estrutura do menu (seção 4 do documento do produto).
 *
 * É dado, não markup, por três motivos: o menu lateral do desktop, a navegação
 * inferior do celular e a busca de comandos precisam da MESMA lista — três
 * cópias divergem na primeira semana. E porque cada item declara a permissão que
 * exige, o menu se ajusta ao papel sem nenhum `if` espalhado na interface.
 *
 * Um item escondido por permissão não é segurança: a rota também é protegida no
 * servidor e a RLS barra no banco. Esconder serve para não oferecer ao SDR um
 * caminho que vai terminar em "sem permissão".
 */

export interface ItemDeMenu {
  rotulo: string;
  href: string;
  /** Nome do ícone, resolvido em `icones.tsx`. */
  icone: string;
  /** Sem isto, o item aparece para todos. */
  exige?: Acao;
  /** Mostra contador vindo do servidor (mensagens não lidas, tarefas vencidas). */
  contador?: 'mensagens' | 'tarefas' | 'followups' | 'agenda';
  /** Aparece na navegação inferior do celular. */
  noCelular?: boolean;

  /**
   * A tela ainda não existe.
   *
   * O item aparece no menu, mas NÃO é link: ele mostra "em breve" e não leva a
   * lugar nenhum. É o princípio 7 do produto aplicado à navegação — mostrar o
   * que não está pronto, nunca fingir que está.
   *
   * A alternativa que havia antes era pior: o item parecia um link normal e
   * dava 404. O corretor concluía que o sistema tinha quebrado, não que a tela
   * ainda não tinha sido feita.
   *
   * Esconder o item também seria pior: ele deixa de saber que o recurso está a
   * caminho, e a lista de menu vira uma lista curta demais para um sistema que
   * se apresenta como centro de comando.
   *
   * QUEM CONSTRUIR A TELA, APAGUE ESTA LINHA. O teste
   * `tests/unit/menu-honesto.test.ts` reprova nos dois sentidos: item marcado
   * que já tem página, e item sem marca que não tem.
   */
  emBreve?: true;
}

export interface GrupoDeMenu {
  titulo: string;
  itens: ItemDeMenu[];
}

export const MENU: GrupoDeMenu[] = [
  {
    titulo: 'Visão geral',
    itens: [
      { rotulo: 'Início', href: '/inicio', icone: 'casa', noCelular: true },
      {
        rotulo: 'Agenda',
        href: '/agenda',
        icone: 'calendario',
        exige: 'agenda.ver',
        contador: 'agenda',
        noCelular: true,
      },
      {
        rotulo: 'Tarefas',
        href: '/tarefas',
        icone: 'checklist',
        exige: 'agenda.ver',
        contador: 'tarefas',
      },
    ],
  },
  {
    titulo: 'CRM',
    itens: [
      { rotulo: 'Negócios', href: '/negocios', icone: 'funil', exige: 'crm.ver' },
      { rotulo: 'Clientes', href: '/clientes', icone: 'pessoas', exige: 'crm.ver', noCelular: true },
      {
        rotulo: 'Atendimento',
        href: '/atendimento',
        icone: 'conversa',
        exige: 'mensagens.ver',
        contador: 'mensagens',
        noCelular: true,
        emBreve: true,
      },
      {
        rotulo: 'Follow-ups',
        href: '/followups',
        icone: 'relogio',
        exige: 'crm.ver',
        contador: 'followups',
      },
    ],
  },
  {
    titulo: 'Imóveis e vendas',
    itens: [
      { rotulo: 'Imóveis', href: '/imoveis', icone: 'predio', exige: 'imoveis.ver' },
      { rotulo: 'Simulações', href: '/simulacoes', icone: 'calculadora', exige: 'simulacao.ver' },
      {
        rotulo: 'Análise de crédito',
        href: '/analise-credito',
        icone: 'medidor',
        exige: 'credito.consultar',
        emBreve: true,
      },
      { rotulo: 'Relatórios', href: '/relatorios', icone: 'grafico', exige: 'crm.ver' },
    ],
  },
  {
    titulo: 'Crescimento',
    itens: [
      { rotulo: 'Meu portfólio', href: '/portfolio', icone: 'vitrine', exige: 'imoveis.publicar' },
      {
        rotulo: 'Portais imobiliários',
        href: '/portais',
        icone: 'globo',
        exige: 'imoveis.publicar',
        emBreve: true,
      },
      { rotulo: 'Parceiros', href: '/parceiros', icone: 'maleta', emBreve: true },
      { rotulo: 'Automações', href: '/automacoes', icone: 'engrenagem', exige: 'configuracoes.editar' },
      { rotulo: 'Inteligência artificial', href: '/ia', icone: 'brilho', emBreve: true },
    ],
  },
  {
    titulo: 'Administração',
    itens: [
      { rotulo: 'Equipe', href: '/equipe', icone: 'equipe', exige: 'equipe.ver' },
      {
        rotulo: 'Configurações',
        href: '/configuracoes',
        icone: 'ajustes',
        exige: 'configuracoes.editar',
      },
      {
        rotulo: 'Integrações',
        href: '/configuracoes/integracoes',
        icone: 'plugue',
        exige: 'integracoes.administrar',
      },
      { rotulo: 'Segurança', href: '/seguranca', icone: 'escudo', exige: 'auditoria.ver' },
    ],
  },
];

/**
 * Itens da navegação inferior do celular. No máximo quatro.
 *
 * Aqui o que ainda não existe é REMOVIDO, não marcado como no menu lateral. São
 * só quatro vagas na barra que o corretor usa em pé, na frente do imóvel —
 * gastar uma com algo que não abre é pior do que mostrar uma barra mais curta.
 */
export function itensDoCelular(pode: (acao: Acao) => boolean): ItemDeMenu[] {
  return MENU.flatMap((g) => g.itens)
    .filter((i) => i.noCelular && !i.emBreve)
    .filter((i) => !i.exige || pode(i.exige))
    .slice(0, 4);
}

/** Grupos com os itens que o papel alcança; grupo que esvazia não aparece. */
export function menuPermitido(pode: (acao: Acao) => boolean): GrupoDeMenu[] {
  return MENU.map((grupo) => ({
    titulo: grupo.titulo,
    itens: grupo.itens.filter((i) => !i.exige || pode(i.exige)),
  })).filter((grupo) => grupo.itens.length > 0);
}
