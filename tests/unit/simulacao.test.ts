import { describe, expect, it } from 'vitest';

import {
  analisarComprometimento,
  calcularPrice,
  calcularSac,
  conservacaoParaHomefin,
  entradaMinima,
  estimarParcela,
  lerFormularioDeSimulacao,
  situacaoDaHomefin,
  taxaMensalDeAnual,
  tipoImovelParaHomefin,
} from '@/dominio/simulacao';

/**
 * Matemática de financiamento e tradução para a Homefin.
 *
 * Erro aqui é caro e silencioso: o número aparece bonito na tela, o corretor o
 * repete para o cliente, e o banco depois apresenta outro. Os valores
 * esperados abaixo foram calculados de forma independente da implementação —
 * pela definição de cada sistema de amortização, não rodando o código e
 * anotando o que saiu.
 */

describe('taxaMensalDeAnual', () => {
  it('converte geometricamente, não dividindo por 12', () => {
    // 10% ao ano → (1,10)^(1/12) − 1 = 0,7974%. Dividir por 12 daria 0,8333%.
    // A diferença passa de vinte mil reais em 360 meses.
    const mensal = taxaMensalDeAnual(10);
    expect(mensal).toBeCloseTo(0.0079741, 6);
    expect(mensal).not.toBeCloseTo(10 / 100 / 12, 5);
  });

  it('a taxa mensal composta 12 vezes devolve a anual', () => {
    // É a definição de equivalência. Se isto falha, a conversão está errada.
    const mensal = taxaMensalDeAnual(11.5);
    expect(Math.pow(1 + mensal, 12) - 1).toBeCloseTo(0.115, 10);
  });

  it('taxa zero devolve zero', () => {
    expect(taxaMensalDeAnual(0)).toBe(0);
  });
});

describe('calcularSac', () => {
  it('amortiza em parcelas constantes', () => {
    // 120.000 em 120 meses → amortização de 1.000 por mês, sempre.
    // Primeira parcela = 1.000 + 120.000 × i
    // Última parcela   = 1.000 + 1.000 × i
    const i = taxaMensalDeAnual(12);
    const r = calcularSac(120000, 120, 12);

    expect(r.primeira).toBeCloseTo(1000 + 120000 * i, 2);
    expect(r.ultima).toBeCloseTo(1000 + 1000 * i, 2);
  });

  it('a primeira parcela é maior que a última', () => {
    const r = calcularSac(500000, 360, 11.5);
    expect(r.primeira).toBeGreaterThan(r.ultima);
  });

  it('a soma bate com a progressão aritmética', () => {
    // Os juros caem linearmente porque o saldo cai linearmente, então o total
    // é a média das pontas vezes o número de parcelas.
    const r = calcularSac(300000, 240, 10);
    expect(r.total).toBeCloseTo(((r.primeira + r.ultima) / 2) * 240, 0);
  });

  it('juros é o total pago menos o principal', () => {
    const r = calcularSac(300000, 240, 10);
    expect(r.juros).toBeCloseTo(r.total - 300000, 1);
  });

  it('sem juros, a parcela é o principal dividido pelo prazo', () => {
    const r = calcularSac(120000, 120, 0);
    expect(r.primeira).toBe(1000);
    expect(r.ultima).toBe(1000);
    expect(r.juros).toBe(0);
  });
});

describe('calcularPrice', () => {
  it('mantém todas as parcelas iguais', () => {
    const r = calcularPrice(500000, 360, 11.5);
    expect(r.primeira).toBe(r.ultima);
  });

  it('bate com a fórmula da série uniforme', () => {
    // PMT = PV × i / (1 − (1+i)^−n)
    const i = taxaMensalDeAnual(11.5);
    const esperado = (500000 * i) / (1 - Math.pow(1 + i, -360));
    expect(calcularPrice(500000, 360, 11.5).primeira).toBeCloseTo(esperado, 2);
  });

  it('não devolve NaN com taxa zero', () => {
    // A fórmula divide por zero nesse caso. Acontece em simulação de teste, e
    // NaN na tela é pior que um número errado: quebra a formatação inteira.
    const r = calcularPrice(120000, 120, 0);
    expect(r.primeira).toBe(1000);
    expect(Number.isNaN(r.primeira)).toBe(false);
  });

  it('a primeira parcela é menor que a do SAC', () => {
    // É o que o cliente percebe primeiro, e o motivo de alguns escolherem PRICE.
    const sac = calcularSac(500000, 360, 11.5);
    const price = calcularPrice(500000, 360, 11.5);
    expect(price.primeira).toBeLessThan(sac.primeira);
  });

  it('mas o total pago é maior que no SAC', () => {
    // A contrapartida. Quem mostra só a parcela esconde isto do cliente.
    const sac = calcularSac(500000, 360, 11.5);
    const price = calcularPrice(500000, 360, 11.5);
    expect(price.total).toBeGreaterThan(sac.total);
  });
});

describe('estimarParcela', () => {
  it('encaminha para o sistema pedido', () => {
    expect(estimarParcela('sac', 300000, 240, 10)).toEqual(calcularSac(300000, 240, 10));
    expect(estimarParcela('price', 300000, 240, 10)).toEqual(calcularPrice(300000, 240, 10));
  });
});

describe('analisarComprometimento', () => {
  it('aprova parcela dentro do teto de 30%', () => {
    const r = analisarComprometimento(3000, 10000);
    expect(r.cabe).toBe(true);
    expect(r.percentual).toBe(30);
    expect(r.aviso).toBeNull();
  });

  it('reprova acima do teto e diz de quanto seria a renda necessária', () => {
    const r = analisarComprometimento(4500, 10000);
    expect(r.cabe).toBe(false);
    expect(r.percentual).toBe(45);
    expect(r.rendaNecessaria).toBe(15000);
    expect(r.aviso).toContain('45%');
    expect(r.aviso).toContain('compor renda');
  });

  it('não quebra com renda zero', () => {
    const r = analisarComprometimento(3000, 0);
    expect(r.cabe).toBe(false);
    expect(r.aviso).toContain('Informe a renda');
  });

  it('exatamente 30% ainda cabe', () => {
    expect(analisarComprometimento(3000, 10000).cabe).toBe(true);
    expect(analisarComprometimento(3000.01, 10000).cabe).toBe(false);
  });
});

describe('entradaMinima', () => {
  it('exige 20% em imóvel usado', () => {
    expect(entradaMinima(500000, 'U')).toBe(100000);
  });

  it('exige 10% em imóvel novo', () => {
    expect(entradaMinima(500000, 'N')).toBe(50000);
  });
});

describe('tradução para os códigos da Homefin', () => {
  it('mapeia os tipos que têm equivalente direto', () => {
    expect(tipoImovelParaHomefin('apartamento')).toBe('AP');
    expect(tipoImovelParaHomefin('casa')).toBe('CS');
    expect(tipoImovelParaHomefin('terreno')).toBe('TE');
    expect(tipoImovelParaHomefin('terreno_condominio')).toBe('TC');
    expect(tipoImovelParaHomefin('galpao')).toBe('GA');
  });

  it('agrupa o que o banco trata igual', () => {
    // O banco avalia a garantia, não o nome do anúncio.
    expect(tipoImovelParaHomefin('cobertura')).toBe('AP');
    expect(tipoImovelParaHomefin('kitnet')).toBe('AP');
    expect(tipoImovelParaHomefin('sobrado')).toBe('CS');
    expect(tipoImovelParaHomefin('casa_condominio')).toBe('CS');
    expect(tipoImovelParaHomefin('sala_comercial')).toBe('GA');
    expect(tipoImovelParaHomefin('loja')).toBe('GA');
  });

  it('cai em apartamento para tipo desconhecido, sem quebrar o envio', () => {
    expect(tipoImovelParaHomefin('chacara')).toBe('AP');
    expect(tipoImovelParaHomefin('inventado')).toBe('AP');
  });

  it('trata na planta e em construção como imóvel novo', () => {
    // Não houve transferência de propriedade anterior — para o banco, é novo.
    expect(conservacaoParaHomefin('novo')).toBe('N');
    expect(conservacaoParaHomefin('na_planta')).toBe('N');
    expect(conservacaoParaHomefin('em_construcao')).toBe('N');
    expect(conservacaoParaHomefin('usado')).toBe('U');
  });
});

describe('situacaoDaHomefin', () => {
  it('traduz os cinco códigos da SIMULAÇÃO', () => {
    expect(situacaoDaHomefin('A')).toBe('aprovado');
    expect(situacaoDaHomefin('R')).toBe('recusado');
    expect(situacaoDaHomefin('N')).toBe('em_analise');
    expect(situacaoDaHomefin('P')).toBe('erro_no_envio');
    expect(situacaoDaHomefin('S')).toBe('sem_integracao');
  });

  it('cai em "sem integração" para código desconhecido ou ausente', () => {
    expect(situacaoDaHomefin('X')).toBe('sem_integracao');
    expect(situacaoDaHomefin(null)).toBe('sem_integracao');
    expect(situacaoDaHomefin(undefined)).toBe('sem_integracao');
  });
});

// ---------------------------------------------------------------------------

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
  pessoaId: '11111111-1111-1111-1111-111111111111',
  valorImovel: '800.000,00',
  valorEntrada: '240.000,00',
  prazoMeses: '360',
  rendaTotal: '18.400,00',
  sistemaAmortizacao: 'sac',
  tipoImovelHomefin: 'AP',
  usoImovelHomefin: 'R',
  situacaoImovelHomefin: 'U',
  uf: 'SP',
  bancos: ['45', '61'],
};

function erroDoCampo(r: ReturnType<typeof lerFormularioDeSimulacao>, campo: string) {
  if (r.success) return undefined;
  return r.error.issues.find((i) => i.path[0] === campo)?.message;
}

describe('formulário de simulação', () => {
  it('aceita uma simulação completa', () => {
    const r = lerFormularioDeSimulacao(formulario(BASE));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.valorImovel).toBe(800000);
    expect(r.data.valorEntrada).toBe(240000);
    expect(r.data.bancos).toEqual([45, 61]);
  });

  it('exige pelo menos um banco', () => {
    const r = lerFormularioDeSimulacao(formulario({ ...BASE, bancos: [] }));
    expect(erroDoCampo(r, 'bancos')).toContain('pelo menos um banco');
  });

  it('avisa quando a entrada é menor que o mínimo do banco', () => {
    // Antes de gastar uma chamada que voltaria recusada.
    const r = lerFormularioDeSimulacao(formulario({ ...BASE, valorEntrada: '10.000,00' }));
    expect(erroDoCampo(r, 'valorEntrada')).toContain('entrada de pelo menos');
  });

  it('recusa entrada maior que o imóvel', () => {
    const r = lerFormularioDeSimulacao(
      formulario({ ...BASE, valorEntrada: '900.000,00' }),
    );
    expect(erroDoCampo(r, 'valorEntrada')).toBeTruthy();
  });

  it('recusa prazo fora do que os bancos praticam', () => {
    expect(lerFormularioDeSimulacao(formulario({ ...BASE, prazoMeses: '6' })).success).toBe(false);
    expect(lerFormularioDeSimulacao(formulario({ ...BASE, prazoMeses: '600' })).success).toBe(
      false,
    );
    expect(lerFormularioDeSimulacao(formulario({ ...BASE, prazoMeses: '420' })).success).toBe(true);
  });

  it('exige renda para simular', () => {
    const r = lerFormularioDeSimulacao(formulario({ ...BASE, rendaTotal: '0' }));
    expect(erroDoCampo(r, 'rendaTotal')).toBeTruthy();
  });

  it('compor renda exige nome e CPF', () => {
    const r = lerFormularioDeSimulacao(formulario({ ...BASE, compoeRenda: 'on' }));
    expect(erroDoCampo(r, 'nomeCoparticipante')).toBeTruthy();
    expect(erroDoCampo(r, 'cpfCoparticipante')).toBeTruthy();
  });

  it('aceita composição de renda completa', () => {
    const r = lerFormularioDeSimulacao(
      formulario({
        ...BASE,
        compoeRenda: 'on',
        nomeCoparticipante: 'Carlos Duarte',
        cpfCoparticipante: '529.982.247-25',
        rendaCoparticipante: '6.000,00',
      }),
    );
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.cpfCoparticipante).toBe('52998224725');
  });

  it('entrada que cobre o imóvel inteiro não é financiamento', () => {
    const r = lerFormularioDeSimulacao(
      formulario({ ...BASE, valorEntrada: '800.000,00' }),
    );
    expect(erroDoCampo(r, 'valorEntrada')).toContain('Não há o que financiar');
  });

  it('checkbox ausente vira falso', () => {
    const r = lerFormularioDeSimulacao(formulario(BASE));
    expect(r.success && r.data.usaFgts).toBe(false);
    expect(r.success && r.data.compoeRenda).toBe(false);
  });

  it('usa FGTS quando marcado', () => {
    // Mandar "N" fixo aqui fez oito simulações irem erradas ao banco antes.
    const r = lerFormularioDeSimulacao(formulario({ ...BASE, usaFgts: 'on' }));
    expect(r.success && r.data.usaFgts).toBe(true);
  });
});
