import { describe, expect, it } from 'vitest';

import {
  acharIntervalosApertados,
  acharSobreposicoes,
  porConfirmar,
  type JanelaDeCompromisso,
} from '@/dominio/compromisso';

/**
 * A agenda de um corretor não é uma lista de horários: é uma sequência de
 * deslocamentos pela cidade. Os dois erros que custam o dia dele — visita não
 * confirmada e intervalo curto demais — não aparecem numa grade comum, e são
 * exatamente o que estas funções procuram.
 *
 * Erro aqui é silencioso: o aviso simplesmente não aparece, e o corretor
 * descobre na rua.
 */

function janela(
  parcial: Partial<JanelaDeCompromisso> & { id: string; inicio: string; fim: string },
): JanelaDeCompromisso {
  return {
    tipo: 'visita',
    situacao: 'agendado',
    deslocamentoMin: null,
    ...parcial,
  };
}

describe('acharSobreposicoes', () => {
  it('encontra dois compromissos no mesmo horário', () => {
    const conflitos = acharSobreposicoes([
      janela({ id: 'a', inicio: '2026-09-25T14:00:00Z', fim: '2026-09-25T15:00:00Z' }),
      janela({ id: 'b', inicio: '2026-09-25T14:30:00Z', fim: '2026-09-25T15:30:00Z' }),
    ]);

    // Aponta os DOIS lados: o corretor precisa ver o aviso em qualquer um que
    // esteja olhando.
    expect(conflitos.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('encostar não é sobrepor', () => {
    // Faixa meio-aberta, igual à do banco: um termina 15h, o outro começa 15h.
    // Tratar isso como conflito faria a agenda cheia de aviso falso, e aviso
    // falso treina o corretor a ignorar os verdadeiros.
    const conflitos = acharSobreposicoes([
      janela({ id: 'a', inicio: '2026-09-25T14:00:00Z', fim: '2026-09-25T15:00:00Z' }),
      janela({ id: 'b', inicio: '2026-09-25T15:00:00Z', fim: '2026-09-25T16:00:00Z' }),
    ]);

    expect(conflitos).toEqual([]);
  });

  it('um compromisso dentro do outro é conflito', () => {
    const conflitos = acharSobreposicoes([
      janela({ id: 'longo', inicio: '2026-09-25T09:00:00Z', fim: '2026-09-25T18:00:00Z' }),
      janela({ id: 'curto', inicio: '2026-09-25T12:00:00Z', fim: '2026-09-25T13:00:00Z' }),
    ]);

    expect(conflitos.map((c) => c.id).sort()).toEqual(['curto', 'longo']);
  });

  it('cancelado sobre confirmado não é conflito', () => {
    // É histórico, não problema. Avisar aqui seria ruído puro.
    const conflitos = acharSobreposicoes([
      janela({
        id: 'vale',
        inicio: '2026-09-25T14:00:00Z',
        fim: '2026-09-25T15:00:00Z',
        situacao: 'confirmado',
      }),
      janela({
        id: 'morto',
        inicio: '2026-09-25T14:00:00Z',
        fim: '2026-09-25T15:00:00Z',
        situacao: 'cancelado',
      }),
    ]);

    expect(conflitos).toEqual([]);
  });

  it('realizado também não conflita', () => {
    const conflitos = acharSobreposicoes([
      janela({
        id: 'a',
        inicio: '2026-09-25T14:00:00Z',
        fim: '2026-09-25T15:00:00Z',
        situacao: 'realizado',
      }),
      janela({
        id: 'b',
        inicio: '2026-09-25T14:00:00Z',
        fim: '2026-09-25T15:00:00Z',
        situacao: 'realizado',
      }),
    ]);

    expect(conflitos).toEqual([]);
  });

  it('agenda tranquila não acusa nada', () => {
    const conflitos = acharSobreposicoes([
      janela({ id: 'a', inicio: '2026-09-25T09:00:00Z', fim: '2026-09-25T10:00:00Z' }),
      janela({ id: 'b', inicio: '2026-09-25T14:00:00Z', fim: '2026-09-25T15:00:00Z' }),
      janela({ id: 'c', inicio: '2026-09-25T17:00:00Z', fim: '2026-09-25T18:00:00Z' }),
    ]);

    expect(conflitos).toEqual([]);
  });

  it('lista vazia não quebra', () => {
    expect(acharSobreposicoes([])).toEqual([]);
  });
});

describe('acharIntervalosApertados', () => {
  it('acusa quando o tempo não dá para chegar', () => {
    // Termina 15h, próxima às 15h15, e o deslocamento é de 40 minutos.
    const apertados = acharIntervalosApertados([
      janela({ id: 'primeira', inicio: '2026-09-25T14:00:00Z', fim: '2026-09-25T15:00:00Z' }),
      janela({
        id: 'segunda',
        inicio: '2026-09-25T15:15:00Z',
        fim: '2026-09-25T16:00:00Z',
        deslocamentoMin: 40,
      }),
    ]);

    expect(apertados).toEqual([
      { id: 'segunda', minutosDisponiveis: 15, minutosNecessarios: 40 },
    ]);
  });

  it('não acusa quando o tempo é exatamente o necessário', () => {
    const apertados = acharIntervalosApertados([
      janela({ id: 'primeira', inicio: '2026-09-25T14:00:00Z', fim: '2026-09-25T15:00:00Z' }),
      janela({
        id: 'segunda',
        inicio: '2026-09-25T15:40:00Z',
        fim: '2026-09-25T16:00:00Z',
        deslocamentoMin: 40,
      }),
    ]);

    expect(apertados).toEqual([]);
  });

  it('não inventa aviso quando o deslocamento não foi informado', () => {
    // Fingir que o sistema sabe a distância seria pior do que calar: aviso
    // falso treina o corretor a ignorar os verdadeiros.
    const apertados = acharIntervalosApertados([
      janela({ id: 'primeira', inicio: '2026-09-25T14:00:00Z', fim: '2026-09-25T15:00:00Z' }),
      janela({ id: 'segunda', inicio: '2026-09-25T15:01:00Z', fim: '2026-09-25T16:00:00Z' }),
    ]);

    expect(apertados).toEqual([]);
  });

  it('ligação seguida de ligação não precisa de intervalo', () => {
    const apertados = acharIntervalosApertados([
      janela({
        id: 'a',
        inicio: '2026-09-25T14:00:00Z',
        fim: '2026-09-25T14:30:00Z',
        tipo: 'ligacao',
      }),
      janela({
        id: 'b',
        inicio: '2026-09-25T14:30:00Z',
        fim: '2026-09-25T15:00:00Z',
        tipo: 'ligacao',
        deslocamentoMin: 30,
      }),
    ]);

    expect(apertados).toEqual([]);
  });

  it('sobreposição não vira aviso de intervalo', () => {
    // Já é apontada como conflito. Avisar duas vezes a mesma coisa dilui as duas.
    const apertados = acharIntervalosApertados([
      janela({ id: 'a', inicio: '2026-09-25T14:00:00Z', fim: '2026-09-25T16:00:00Z' }),
      janela({
        id: 'b',
        inicio: '2026-09-25T15:00:00Z',
        fim: '2026-09-25T17:00:00Z',
        deslocamentoMin: 30,
      }),
    ]);

    expect(apertados).toEqual([]);
  });

  it('funciona com a lista fora de ordem', () => {
    // O banco devolve ordenado, mas a função não pode depender disso.
    const apertados = acharIntervalosApertados([
      janela({
        id: 'segunda',
        inicio: '2026-09-25T15:15:00Z',
        fim: '2026-09-25T16:00:00Z',
        deslocamentoMin: 40,
      }),
      janela({ id: 'primeira', inicio: '2026-09-25T14:00:00Z', fim: '2026-09-25T15:00:00Z' }),
    ]);

    expect(apertados.map((a) => a.id)).toEqual(['segunda']);
  });

  it('o primeiro do dia nunca é apertado', () => {
    // Não há nada antes dele.
    const apertados = acharIntervalosApertados([
      janela({
        id: 'unico',
        inicio: '2026-09-25T09:00:00Z',
        fim: '2026-09-25T10:00:00Z',
        deslocamentoMin: 90,
      }),
    ]);

    expect(apertados).toEqual([]);
  });
});

describe('porConfirmar', () => {
  const agora = new Date('2026-09-25T10:00:00Z');

  it('aponta visita de amanhã ainda sem confirmação', () => {
    const ids = porConfirmar(
      [
        janela({ id: 'amanha', inicio: '2026-09-26T09:00:00Z', fim: '2026-09-26T10:00:00Z' }),
      ],
      agora,
    );

    expect(ids).toEqual(['amanha']);
  });

  it('não aponta o que já está confirmado', () => {
    const ids = porConfirmar(
      [
        janela({
          id: 'ok',
          inicio: '2026-09-26T09:00:00Z',
          fim: '2026-09-26T10:00:00Z',
          situacao: 'confirmado',
        }),
      ],
      agora,
    );

    expect(ids).toEqual([]);
  });

  it('não aponta o que está longe demais', () => {
    // Confirmar com uma semana de antecedência não evita nada: o cliente
    // esquece. A janela útil é a véspera.
    const ids = porConfirmar(
      [
        janela({ id: 'semana', inicio: '2026-10-02T09:00:00Z', fim: '2026-10-02T10:00:00Z' }),
      ],
      agora,
    );

    expect(ids).toEqual([]);
  });

  it('não aponta o que já passou', () => {
    const ids = porConfirmar(
      [
        janela({ id: 'ontem', inicio: '2026-09-24T09:00:00Z', fim: '2026-09-24T10:00:00Z' }),
      ],
      agora,
    );

    expect(ids).toEqual([]);
  });

  it('ligação não precisa de confirmação prévia', () => {
    // Ninguém atravessa a cidade para uma ligação. O aviso existe para evitar
    // viagem perdida.
    const ids = porConfirmar(
      [
        janela({
          id: 'ligar',
          inicio: '2026-09-26T09:00:00Z',
          fim: '2026-09-26T09:15:00Z',
          tipo: 'ligacao',
        }),
      ],
      agora,
    );

    expect(ids).toEqual([]);
  });

  it('assinatura e avaliação também exigem deslocamento', () => {
    // Ambos DENTRO da janela de 24 horas a partir das 10h de 25/09 — ou seja,
    // antes das 10h de 26/09. Escrevi 11h na primeira versão deste teste e ele
    // reprovou um código correto: 11h já está fora.
    const ids = porConfirmar(
      [
        janela({
          id: 'assinar',
          inicio: '2026-09-26T08:00:00Z',
          fim: '2026-09-26T09:00:00Z',
          tipo: 'assinatura',
        }),
        janela({
          id: 'avaliar',
          inicio: '2026-09-26T09:30:00Z',
          fim: '2026-09-26T10:00:00Z',
          tipo: 'avaliacao',
        }),
      ],
      agora,
    );

    expect(ids.sort()).toEqual(['assinar', 'avaliar']);
  });

  it('o limite de 24 horas é exato', () => {
    // Exatamente no limite entra; um minuto depois, não. Sem esta asserção, um
    // erro de fuso ou de sinal na comparação passaria despercebido.
    const noLimite = porConfirmar(
      [janela({ id: 'limite', inicio: '2026-09-26T10:00:00Z', fim: '2026-09-26T11:00:00Z' })],
      agora,
    );
    expect(noLimite).toEqual(['limite']);

    const logoDepois = porConfirmar(
      [janela({ id: 'depois', inicio: '2026-09-26T10:01:00Z', fim: '2026-09-26T11:00:00Z' })],
      agora,
    );
    expect(logoDepois).toEqual([]);
  });
});
