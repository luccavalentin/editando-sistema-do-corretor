import { describe, expect, it } from 'vitest';

import {
  gerarSlug,
  lerFormularioDeImovel,
  MINIMO_DESCRICAO_PUBLICA,
  resumirCaracteristicas,
} from '@/dominio/imovel';

/**
 * Regras do cadastro de imóvel.
 *
 * O foco está nas regras que CRUZAM campos, porque são as que quebram em
 * silêncio: cada campo isolado parece válido e a combinação é que está errada.
 * Elas existem em duplicata no banco — aqui se testa que o corretor recebe a
 * mensagem certa antes de esbarrar na constraint.
 */

/** Monta um FormData como o navegador enviaria. */
function formulario(campos: Record<string, string | string[] | undefined>): FormData {
  const dados = new FormData();
  for (const [nome, valor] of Object.entries(campos)) {
    if (valor === undefined) continue;
    if (Array.isArray(valor)) valor.forEach((v) => dados.append(nome, v));
    else dados.set(nome, valor);
  }
  return dados;
}

const BASE = {
  titulo: 'Apartamento 3 dormitórios na Vila Mariana',
  tipo: 'apartamento',
  finalidade: 'venda',
  situacao: 'disponivel',
  uso: 'residencial',
  conservacao: 'usado',
  valor: '780.000,00',
  cidade: 'São Paulo',
};

/** Texto com o tamanho exato pedido, para testar o limite da descrição. */
function descricaoCom(caracteres: number): string {
  return 'a'.repeat(caracteres);
}

function erroDoCampo(resultado: ReturnType<typeof lerFormularioDeImovel>, campo: string) {
  if (resultado.success) return undefined;
  return resultado.error.issues.find((i) => i.path[0] === campo)?.message;
}

describe('checkbox do formulário', () => {
  it('trata ausência como falso, que é como o navegador se comporta', () => {
    // Checkbox desmarcado NÃO é enviado. Se isto virasse `undefined` em vez de
    // `false`, o banco receberia null num campo `not null` e o cadastro falharia
    // com erro incompreensível.
    const r = lerFormularioDeImovel(formulario(BASE));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.mobiliado).toBe(false);
    expect(r.data.exclusividade).toBe(false);
    expect(r.data.publicadoNoPortfolio).toBe(false);
    expect(r.data.mostrarEnderecoNoPortfolio).toBe(false);
  });

  it('lê "on" como verdadeiro', () => {
    const r = lerFormularioDeImovel(formulario({ ...BASE, mobiliado: 'on', aceitaPet: 'on' }));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.mobiliado).toBe(true);
    expect(r.data.aceitaPet).toBe(true);
  });

  it('mantém aceita financiamento como escolha explícita', () => {
    const desmarcado = lerFormularioDeImovel(formulario(BASE));
    const marcado = lerFormularioDeImovel(formulario({ ...BASE, aceitaFinanciamento: 'on' }));
    expect(desmarcado.success && desmarcado.data.aceitaFinanciamento).toBe(false);
    expect(marcado.success && marcado.data.aceitaFinanciamento).toBe(true);
  });
});

describe('valores em reais', () => {
  it('entende o formato que o corretor digita', () => {
    const r = lerFormularioDeImovel(formulario({ ...BASE, valor: 'R$ 780.000,00' }));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.valor).toBe(780000);
  });

  it('entende sem separador de milhar', () => {
    const r = lerFormularioDeImovel(formulario({ ...BASE, valor: '780000,50' }));
    expect(r.success && r.data.valor).toBe(780000.5);
  });

  it('recusa texto que não é número', () => {
    const r = lerFormularioDeImovel(formulario({ ...BASE, valor: 'a combinar' }));
    expect(r.success).toBe(false);
  });

  it('campo de valor vazio vira nulo, não zero', () => {
    // Zero significaria "imóvel de graça" e entraria no portfólio assim.
    const r = lerFormularioDeImovel(
      formulario({ ...BASE, situacao: 'rascunho', valor: '', valorCondominio: '' }),
    );
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.valor).toBeNull();
    expect(r.data.valorCondominio).toBeNull();
  });
});

describe('valor coerente com a finalidade', () => {
  it('imóvel à venda sem preço de venda é recusado', () => {
    const r = lerFormularioDeImovel(formulario({ ...BASE, valor: '' }));
    expect(r.success).toBe(false);
    expect(erroDoCampo(r, 'valor')).toContain('valor de venda');
  });

  it('imóvel para alugar sem preço de aluguel é recusado', () => {
    const r = lerFormularioDeImovel(
      formulario({ ...BASE, finalidade: 'aluguel', valor: '', valorAluguel: '' }),
    );
    expect(erroDoCampo(r, 'valorAluguel')).toContain('valor de aluguel');
  });

  it('venda e aluguel exige os dois preços', () => {
    const r = lerFormularioDeImovel(
      formulario({ ...BASE, finalidade: 'venda_aluguel', valorAluguel: '' }),
    );
    expect(erroDoCampo(r, 'valorAluguel')).toBeTruthy();
  });

  it('rascunho fica livre dessa exigência', () => {
    // O corretor anota o imóvel na visita e completa depois. Exigir preço para
    // salvar um rascunho faz ele digitar qualquer número, e o número fica.
    const r = lerFormularioDeImovel(formulario({ ...BASE, situacao: 'rascunho', valor: '' }));
    expect(r.success).toBe(true);
  });
});

describe('coerência entre características', () => {
  it('recusa mais suítes do que quartos', () => {
    const r = lerFormularioDeImovel(formulario({ ...BASE, quartos: '2', suites: '3' }));
    expect(erroDoCampo(r, 'suites')).toContain('suítes do que quartos');
  });

  it('aceita todas as suítes sendo quartos', () => {
    const r = lerFormularioDeImovel(formulario({ ...BASE, quartos: '3', suites: '3' }));
    expect(r.success).toBe(true);
  });

  it('recusa área útil maior que a total', () => {
    const r = lerFormularioDeImovel(formulario({ ...BASE, areaUtil: '120', areaTotal: '90' }));
    expect(erroDoCampo(r, 'areaUtil')).toContain('área total');
  });

  it('recusa ano de construção fora do plausível', () => {
    expect(lerFormularioDeImovel(formulario({ ...BASE, anoConstrucao: '1500' })).success).toBe(
      false,
    );
    expect(lerFormularioDeImovel(formulario({ ...BASE, anoConstrucao: '2020' })).success).toBe(
      true,
    );
  });

  it('recusa exclusividade sem prazo', () => {
    const r = lerFormularioDeImovel(formulario({ ...BASE, exclusividade: 'on' }));
    expect(erroDoCampo(r, 'exclusividadeAte')).toContain('data de término');
  });

  it('aceita exclusividade com prazo', () => {
    const r = lerFormularioDeImovel(
      formulario({ ...BASE, exclusividade: 'on', exclusividadeAte: '2027-06-30' }),
    );
    expect(r.success).toBe(true);
  });
});

describe('publicar no portfólio', () => {
  const publicado = {
    ...BASE,
    publicadoNoPortfolio: 'on',
    descricaoPublica: descricaoCom(MINIMO_DESCRICAO_PUBLICA),
  };

  it('aceita anúncio completo', () => {
    expect(lerFormularioDeImovel(formulario(publicado)).success).toBe(true);
  });

  it('recusa descrição curta demais para converter', () => {
    const r = lerFormularioDeImovel(
      formulario({ ...publicado, descricaoPublica: descricaoCom(MINIMO_DESCRICAO_PUBLICA - 1) }),
    );
    expect(erroDoCampo(r, 'descricaoPublica')).toContain(String(MINIMO_DESCRICAO_PUBLICA));
  });

  it('recusa anúncio sem cidade', () => {
    const r = lerFormularioDeImovel(formulario({ ...publicado, cidade: '' }));
    expect(erroDoCampo(r, 'cidade')).toContain('cidade');
  });

  it('recusa publicar imóvel vendido', () => {
    // Anúncio de imóvel já vendido gera contato que o corretor não pode
    // atender, e queima a credibilidade do portfólio.
    const r = lerFormularioDeImovel(formulario({ ...publicado, situacao: 'vendido' }));
    expect(erroDoCampo(r, 'situacao')).toContain('disponível ou reservado');
  });

  it('deixa publicar imóvel reservado', () => {
    const r = lerFormularioDeImovel(formulario({ ...publicado, situacao: 'reservado' }));
    expect(r.success).toBe(true);
  });

  it('não exige nada disso em rascunho não publicado', () => {
    const r = lerFormularioDeImovel(
      formulario({ ...BASE, situacao: 'rascunho', valor: '', cidade: '' }),
    );
    expect(r.success).toBe(true);
  });
});

describe('endereço', () => {
  it('normaliza o CEP para oito dígitos', () => {
    const r = lerFormularioDeImovel(formulario({ ...BASE, cep: '04015-011' }));
    expect(r.success && r.data.cep).toBe('04015011');
  });

  it('recusa CEP incompleto', () => {
    expect(lerFormularioDeImovel(formulario({ ...BASE, cep: '0401' })).success).toBe(false);
  });

  it('aceita UF em minúscula e normaliza', () => {
    const r = lerFormularioDeImovel(formulario({ ...BASE, uf: 'sp' }));
    expect(r.success && r.data.uf).toBe('SP');
  });

  it('recusa UF que não existe', () => {
    expect(lerFormularioDeImovel(formulario({ ...BASE, uf: 'XX' })).success).toBe(false);
  });
});

describe('comodidades', () => {
  it('lê várias marcadas', () => {
    const r = lerFormularioDeImovel(
      formulario({ ...BASE, comodidades: ['Piscina', 'Elevador', 'Portaria 24h'] }),
    );
    expect(r.success && r.data.comodidades).toEqual(['Piscina', 'Elevador', 'Portaria 24h']);
  });

  it('nenhuma marcada vira lista vazia, não nulo', () => {
    const r = lerFormularioDeImovel(formulario(BASE));
    expect(r.success && r.data.comodidades).toEqual([]);
  });
});

describe('comissão', () => {
  it('aceita com vírgula', () => {
    const r = lerFormularioDeImovel(formulario({ ...BASE, comissaoPercentual: '5,5' }));
    expect(r.success && r.data.comissaoPercentual).toBe(5.5);
  });

  it('recusa acima de cem por cento', () => {
    expect(
      lerFormularioDeImovel(formulario({ ...BASE, comissaoPercentual: '120' })).success,
    ).toBe(false);
  });
});

describe('gerarSlug', () => {
  it('tira acento e pontuação', () => {
    expect(gerarSlug('Apartamento 3 dorm. na Vila Mariana', 'São Paulo', 'a1b2c3')).toBe(
      'apartamento-3-dorm-na-vila-mariana-sao-paulo-a1b2c3',
    );
  });

  it('não deixa traço duplicado nem sobrando na ponta', () => {
    const slug = gerarSlug('Casa   --  nova!!!', 'Santos', 'xyz123');
    expect(slug).not.toContain('--');
    expect(slug.startsWith('-')).toBe(false);
  });

  it('cabe no limite que o banco aceita', () => {
    const slug = gerarSlug('a'.repeat(300), 'b'.repeat(300), 'abc123');
    expect(slug.length).toBeLessThanOrEqual(82);
    // O banco exige começar e terminar em letra ou número.
    expect(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)).toBe(true);
  });

  it('aguenta título que vira vazio ao ser limpo', () => {
    // "!!!" não deixa nenhum caractere utilizável. Sem a saída de emergência, o
    // slug começaria com traço e o banco recusaria.
    const slug = gerarSlug('!!!', null, 'abc123');
    expect(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)).toBe(true);
    expect(slug).toBe('imovel-abc123');
  });

  it('funciona sem cidade', () => {
    expect(gerarSlug('Casa na praia', null, 'abc123')).toBe('casa-na-praia-abc123');
  });
});

describe('resumirCaracteristicas', () => {
  it('concorda em número', () => {
    expect(
      resumirCaracteristicas({ quartos: 1, vagas: 1, banheiros: 1, area_util: null }),
    ).toBe('1 quarto · 1 banheiro · 1 vaga');
  });

  it('usa o plural quando é mais de um', () => {
    expect(
      resumirCaracteristicas({ quartos: 3, vagas: 2, banheiros: 2, area_util: 78 }),
    ).toBe('3 quartos · 2 banheiros · 2 vagas · 78 m²');
  });

  it('omite o que não foi informado', () => {
    expect(
      resumirCaracteristicas({ quartos: 2, vagas: null, banheiros: null, area_util: null }),
    ).toBe('2 quartos');
  });

  it('aceita a área como texto, que é como o Postgres devolve numeric', () => {
    expect(
      resumirCaracteristicas({ quartos: null, vagas: null, banheiros: null, area_util: '92.50' }),
    ).toBe('93 m²');
  });

  it('devolve vazio quando não há nada a dizer', () => {
    expect(
      resumirCaracteristicas({ quartos: null, vagas: null, banheiros: null, area_util: null }),
    ).toBe('');
  });

  it('não mostra área zero como característica', () => {
    expect(
      resumirCaracteristicas({ quartos: 1, vagas: null, banheiros: null, area_util: 0 }),
    ).toBe('1 quarto');
  });
});
