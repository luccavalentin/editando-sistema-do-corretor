import { describe, expect, it } from 'vitest';

import { comparar } from '@/server/consultas/relatorio';

/**
 * A comparação entre períodos.
 *
 * É a única coisa que um relatório faz que uma lista não faz: "42 negócios" é
 * um número; "42, contra 31 no mês anterior" é uma notícia. Errar o cálculo
 * aqui faz o corretor tomar decisão com base numa variação que não existe.
 */

describe('comparar', () => {
  it('calcula crescimento', () => {
    expect(comparar(42, 31).variacao).toBe(35.5);
  });

  it('calcula queda', () => {
    expect(comparar(31, 42).variacao).toBe(-26.2);
  });

  it('sem mudança dá zero, não nulo', () => {
    // Zero é uma informação ("ficou igual"); nulo significaria "não dá para
    // dizer", que é outra coisa.
    expect(comparar(10, 10).variacao).toBe(0);
  });

  it('sair do zero NÃO é percentual nenhum', () => {
    // De 0 para 3 não é "crescimento de 300%" nem "infinito": é a primeira vez.
    // Qualquer número aqui seria inventado, e a tela escreve "primeira vez".
    expect(comparar(3, 0).variacao).toBeNull();
  });

  it('zero contra zero também é indefinido', () => {
    expect(comparar(0, 0).variacao).toBeNull();
  });

  it('cair a zero é queda de 100%', () => {
    // Este caso TEM resposta: havia 8, agora não há nenhum.
    expect(comparar(0, 8).variacao).toBe(-100);
  });

  it('preserva os dois valores para a tela mostrar', () => {
    // A tela precisa escrever "42, eram 31" — só o percentual não basta.
    const c = comparar(42, 31);
    expect(c.atual).toBe(42);
    expect(c.anterior).toBe(31);
  });

  it('arredonda para uma casa decimal', () => {
    // Duas casas num indicador de negócio é ruído: ninguém decide nada com
    // base no segundo decimal de uma variação percentual.
    expect(comparar(1, 3).variacao).toBe(-66.7);
    expect(comparar(2, 3).variacao).toBe(-33.3);
  });

  it('funciona com valores em reais, não só contagens', () => {
    expect(comparar(780000, 600000).variacao).toBe(30);
  });
});
