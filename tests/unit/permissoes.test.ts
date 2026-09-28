import { describe, expect, it } from 'vitest';

import {
  ACOES,
  ROTULO_PAPEL,
  acoesDoPapel,
  administraConta,
  podeFazer,
  type Acao,
} from '@/dominio/permissoes';
import type { Papel } from '@/lib/supabase/tipos-banco';

/**
 * Matriz de permissões (seção 14).
 *
 * Aqui mora a diferença entre uma secretária ver a agenda e uma secretária ver
 * a comissão do corretor. Cada teste abaixo descreve uma regra de negócio real,
 * não a implementação — se a matriz mudar por um motivo legítimo, o teste que
 * falhar aponta exatamente qual promessa foi quebrada.
 */

const PAPEIS: Papel[] = [
  'proprietario',
  'admin_equipe',
  'corretor',
  'assistente',
  'secretaria',
  'sdr',
  'financeiro',
  'visualizacao',
];

describe('proprietário', () => {
  it('pode tudo: é quem paga e quem responde pelos dados', () => {
    for (const acao of ACOES) {
      expect(podeFazer('proprietario', acao), `proprietário deveria poder ${acao}`).toBe(true);
    }
  });
});

describe('administrador de equipe', () => {
  it('administra a operação inteira', () => {
    expect(podeFazer('admin_equipe', 'equipe.administrar')).toBe(true);
    expect(podeFazer('admin_equipe', 'configuracoes.editar')).toBe(true);
    expect(podeFazer('admin_equipe', 'integracoes.administrar')).toBe(true);
  });

  it('NÃO vê o financeiro: cobrança é do dono da conta', () => {
    expect(podeFazer('admin_equipe', 'financeiro.ver')).toBe(false);
  });
});

describe('corretor', () => {
  it('opera a venda de ponta a ponta', () => {
    for (const acao of [
      'crm.criar',
      'crm.editar',
      'sensivel.ver',
      'imoveis.criar',
      'simulacao.criar',
      'credito.consultar',
      'mensagens.enviar',
      'agenda.editar',
    ] as Acao[]) {
      expect(podeFazer('corretor', acao), `corretor deveria poder ${acao}`).toBe(true);
    }
  });

  it('não administra a equipe nem as integrações da conta', () => {
    expect(podeFazer('corretor', 'equipe.administrar')).toBe(false);
    expect(podeFazer('corretor', 'integracoes.administrar')).toBe(false);
    expect(podeFazer('corretor', 'financeiro.ver')).toBe(false);
  });

  it('não exclui cliente', () => {
    // Exclusão de cliente apaga histórico de venda. Fica com quem administra.
    expect(podeFazer('corretor', 'crm.excluir')).toBe(false);
  });
});

describe('assistente', () => {
  it('apoia o corretor no CRM', () => {
    expect(podeFazer('assistente', 'crm.criar')).toBe(true);
    expect(podeFazer('assistente', 'crm.editar')).toBe(true);
    expect(podeFazer('assistente', 'mensagens.enviar')).toBe(true);
  });

  it('NÃO consulta crédito', () => {
    // Consulta de crédito deixa registro no CPF do cliente e exige finalidade
    // declarada (seção 11). Não é tarefa de apoio.
    expect(podeFazer('assistente', 'credito.consultar')).toBe(false);
  });

  it('não exclui e não exporta a carteira', () => {
    expect(podeFazer('assistente', 'crm.excluir')).toBe(false);
    expect(podeFazer('assistente', 'crm.exportar')).toBe(false);
  });
});

describe('secretária', () => {
  it('cuida de agenda e atendimento', () => {
    expect(podeFazer('secretaria', 'agenda.editar')).toBe(true);
    expect(podeFazer('secretaria', 'mensagens.enviar')).toBe(true);
    expect(podeFazer('secretaria', 'crm.criar')).toBe(true);
  });

  it('NÃO vê dado sensível: não precisa de CPF nem renda para marcar visita', () => {
    expect(podeFazer('secretaria', 'sensivel.ver')).toBe(false);
    expect(podeFazer('secretaria', 'financeiro.ver')).toBe(false);
  });
});

describe('SDR', () => {
  it('prospecta e conversa', () => {
    expect(podeFazer('sdr', 'crm.criar')).toBe(true);
    expect(podeFazer('sdr', 'mensagens.enviar')).toBe(true);
  });

  it('não entra em simulação, imóvel nem dado sensível', () => {
    expect(podeFazer('sdr', 'simulacao.ver')).toBe(false);
    expect(podeFazer('sdr', 'imoveis.ver')).toBe(false);
    expect(podeFazer('sdr', 'sensivel.ver')).toBe(false);
  });
});

describe('financeiro', () => {
  it('vê o financeiro, mas NÃO a auditoria', () => {
    expect(podeFazer('financeiro', 'financeiro.ver')).toBe(true);

    // Este teste afirmava o contrário, e a afirmação estava errada: a política
    // `auditoria_ler` do banco exige `administra_tenant`, e o financeiro não
    // administra. Ele passava pela permissão do aplicativo, chegava à tela de
    // segurança e via zero linhas — sem erro e sem explicação.
    //
    // O registro de auditoria mostra quem revelou o CPF de qual cliente. Isso
    // não é assunto de quem cuida de comissão.
    expect(podeFazer('financeiro', 'auditoria.ver')).toBe(false);
  });

  it('não abre a ficha sensível nem envia mensagem ao cliente', () => {
    expect(podeFazer('financeiro', 'sensivel.ver')).toBe(false);
    expect(podeFazer('financeiro', 'mensagens.enviar')).toBe(false);
    expect(podeFazer('financeiro', 'crm.editar')).toBe(false);
  });
});

describe('visualização', () => {
  it('é somente leitura', () => {
    const escritas: Acao[] = [
      'crm.criar',
      'crm.editar',
      'crm.excluir',
      'imoveis.criar',
      'imoveis.editar',
      'simulacao.criar',
      'mensagens.enviar',
      'agenda.editar',
      'configuracoes.editar',
      'equipe.administrar',
      'integracoes.administrar',
    ];
    for (const acao of escritas) {
      expect(podeFazer('visualizacao', acao), `visualização não deveria poder ${acao}`).toBe(false);
    }
  });

  it('não vê dado sensível nem financeiro', () => {
    expect(podeFazer('visualizacao', 'sensivel.ver')).toBe(false);
    expect(podeFazer('visualizacao', 'financeiro.ver')).toBe(false);
  });

  it('ainda consegue acompanhar a operação', () => {
    expect(podeFazer('visualizacao', 'crm.ver')).toBe(true);
    expect(podeFazer('visualizacao', 'agenda.ver')).toBe(true);
  });
});

describe('permissões pontuais (a exceção negociada)', () => {
  it('concedem o que o papel não dá', () => {
    // O cliente negocia "meu assistente precisa consultar crédito". Sem isto,
    // a saída seria criar um papel novo a cada negociação.
    expect(podeFazer('assistente', 'credito.consultar')).toBe(false);
    expect(podeFazer('assistente', 'credito.consultar', { 'credito.consultar': true })).toBe(true);
  });

  it('retiram o que o papel dá', () => {
    expect(podeFazer('corretor', 'crm.exportar')).toBe(true);
    expect(podeFazer('corretor', 'crm.exportar', { 'crm.exportar': false })).toBe(false);
  });

  it('valem inclusive contra o proprietário', () => {
    // Um dono pode querer travar a própria exportação por política interna.
    expect(podeFazer('proprietario', 'crm.exportar', { 'crm.exportar': false })).toBe(false);
  });

  it('ignoram chaves que não são da ação consultada', () => {
    expect(podeFazer('sdr', 'simulacao.ver', { 'crm.excluir': true })).toBe(false);
  });
});

describe('acoesDoPapel', () => {
  it('devolve o conjunto efetivo, já com os ajustes', () => {
    const base = acoesDoPapel('secretaria');
    expect(base.has('agenda.editar')).toBe(true);
    expect(base.has('sensivel.ver')).toBe(false);

    const ajustado = acoesDoPapel('secretaria', { 'sensivel.ver': true });
    expect(ajustado.has('sensivel.ver')).toBe(true);
  });

  it('concorda com podeFazer para todo papel e toda ação', () => {
    // Duas portas para a mesma decisão: se elas divergirem, a interface mostra
    // um botão que a Server Action recusa.
    for (const papel of PAPEIS) {
      const conjunto = acoesDoPapel(papel);
      for (const acao of ACOES) {
        expect(conjunto.has(acao), `${papel} / ${acao}`).toBe(podeFazer(papel, acao));
      }
    }
  });
});

describe('administraConta', () => {
  it('só o dono e o administrador de equipe', () => {
    expect(administraConta('proprietario')).toBe(true);
    expect(administraConta('admin_equipe')).toBe(true);
    for (const papel of PAPEIS.filter((p) => p !== 'proprietario' && p !== 'admin_equipe')) {
      expect(administraConta(papel), `${papel} não administra`).toBe(false);
    }
  });
});

describe('integridade da matriz', () => {
  it('todo papel tem rótulo em português para a interface', () => {
    for (const papel of PAPEIS) {
      expect(ROTULO_PAPEL[papel], `${papel} sem rótulo`).toBeTruthy();
    }
  });

  it('todo papel consegue fazer ao menos uma coisa', () => {
    // Papel que não pode nada é papel que ninguém deveria receber: melhor
    // descobrir aqui que num usuário real olhando para uma tela vazia.
    for (const papel of PAPEIS) {
      expect(acoesDoPapel(papel).size, `${papel} não pode nada`).toBeGreaterThan(0);
    }
  });

  it('nenhum papel além do proprietário pode absolutamente tudo', () => {
    for (const papel of PAPEIS.filter((p) => p !== 'proprietario')) {
      expect(acoesDoPapel(papel).size, `${papel} tem poder total`).toBeLessThan(ACOES.length);
    }
  });

  it('ver é pré-requisito de editar', () => {
    // Poder editar sem poder ver é um estado impossível que só produz tela em
    // branco com botão de salvar.
    const pares: [Acao, Acao][] = [
      ['crm.editar', 'crm.ver'],
      ['crm.criar', 'crm.ver'],
      ['imoveis.editar', 'imoveis.ver'],
      ['agenda.editar', 'agenda.ver'],
      ['mensagens.enviar', 'mensagens.ver'],
    ];

    for (const papel of PAPEIS) {
      for (const [escrita, leitura] of pares) {
        if (podeFazer(papel, escrita)) {
          expect(podeFazer(papel, leitura), `${papel} pode ${escrita} mas não ${leitura}`).toBe(
            true,
          );
        }
      }
    }
  });
});

describe('a matriz não pode divergir das políticas do banco', () => {
  /**
   * `auditoria.ver` é o caso que já divergiu uma vez.
   *
   * A política `auditoria_ler` do banco exige `app.administra_tenant()`, que é
   * `proprietario` ou `admin_equipe`. Enquanto a matriz dava `auditoria.ver` ao
   * `financeiro`, ele passava pela permissão do aplicativo, chegava à tela e o
   * banco devolvia zero linhas — sem erro, sem explicação. A conclusão razoável
   * de quem visse aquilo seria "o sistema quebrou".
   *
   * Este teste é o acordo escrito entre as duas camadas. Se alguém devolver
   * `auditoria.ver` a outro papel, precisa mexer na política junto.
   */
  it('só quem administra a conta tem auditoria.ver', () => {
    const administram: Papel[] = ['proprietario', 'admin_equipe'];

    const comAuditoria = (Object.keys(ROTULO_PAPEL) as Papel[]).filter((papel) =>
      acoesDoPapel(papel).has('auditoria.ver'),
    );

    expect(
      comAuditoria.sort(),
      'A política `auditoria_ler` do banco exige `administra_tenant`. Um papel com ' +
        '`auditoria.ver` fora dessa lista vê uma tela vazia sem explicação.',
    ).toEqual(administram.sort());
  });

  it('quem não administra a conta não vê auditoria', () => {
    for (const papel of ['corretor', 'assistente', 'secretaria', 'sdr', 'financeiro', 'visualizacao'] as Papel[]) {
      expect(acoesDoPapel(papel).has('auditoria.ver'), `${papel} não deveria ver auditoria`).toBe(
        false,
      );
    }
  });
});
