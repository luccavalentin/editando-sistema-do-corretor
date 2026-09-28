import { describe, expect, it } from 'vitest';

import { dataDigitadaParaIso, formatarDataDigitada } from '@/dominio/data-digitada';

/**
 * A data de nascimento do portal.
 *
 * O `<input type="date">` que existia aqui mostrava `dd/mm/aaaa` ou
 * `mm/dd/aaaa` conforme o idioma do SISTEMA OPERACIONAL. Quem tinha o Windows
 * em inglês digitava 11/03/1994 pensando em 11 de março e entrava 3 de
 * novembro — o login falhava e a tela dizia "não encontramos esse CPF com essa
 * data", mandando a pessoa conferir justamente o que ela tinha digitado certo.
 *
 * Por isso os testes de ordem (dia antes do mês) são os mais importantes deste
 * arquivo: é o erro que ninguém consegue diagnosticar sozinho.
 */

describe('formatarDataDigitada — enquanto a pessoa digita', () => {
  it.each([
    ['', ''],
    ['1', '1'],
    ['11', '11'],
    ['110', '11/0'],
    ['1103', '11/03'],
    ['11031', '11/03/1'],
    ['11031994', '11/03/1994'],
  ])('%s vira %s', (entrada, esperado) => {
    expect(formatarDataDigitada(entrada)).toBe(esperado);
  });

  it('não briga com quem ainda está digitando', () => {
    // Uma data incompleta não é uma data inválida. Recusar aqui seria o defeito
    // clássico de campo com máscara: o campo trava no primeiro dígito.
    expect(formatarDataDigitada('1')).toBe('1');
    expect(formatarDataDigitada('11/0')).toBe('11/0');
  });

  it('ignora o que não é número e não passa de 8 dígitos', () => {
    expect(formatarDataDigitada('11/03/1994')).toBe('11/03/1994');
    expect(formatarDataDigitada('abc11def03ghi1994')).toBe('11/03/1994');
    expect(formatarDataDigitada('110319941111')).toBe('11/03/1994');
  });
});

describe('dataDigitadaParaIso — o que vai para o banco', () => {
  it('lê na ordem brasileira: dia, mês, ano', () => {
    // O caso que motivou tudo. 11/03 é 11 de MARÇO, nunca 3 de novembro.
    expect(dataDigitadaParaIso('11/03/1994')).toBe('1994-03-11');
    expect(dataDigitadaParaIso('11031994')).toBe('1994-03-11');
  });

  it('aceita ISO também, caso o campo volte a ser nativo', () => {
    expect(dataDigitadaParaIso('1994-03-11')).toBe('1994-03-11');
  });

  it('completa com zero à esquerda', () => {
    expect(dataDigitadaParaIso('01/01/1990')).toBe('1990-01-01');
    expect(dataDigitadaParaIso('05/09/2000')).toBe('2000-09-05');
  });

  it.each([
    ['31/02/1994', '31 de fevereiro não existe'],
    ['30/02/2024', '30 de fevereiro num ano bissexto também não'],
    ['00/03/1994', 'dia zero'],
    ['11/13/1994', 'mês 13'],
    ['11/00/1994', 'mês zero'],
  ])('recusa %s (%s)', (entrada) => {
    expect(dataDigitadaParaIso(entrada)).toBeNull();
  });

  it('não deixa o Date "deslizar" para o mês seguinte', () => {
    // `new Date(Date.UTC(1994, 1, 31))` não estoura: vira 3 de março. Sem a
    // conferência de volta, 31/02 entraria no banco como 03/03 em silêncio.
    expect(dataDigitadaParaIso('31/02/1994')).not.toBe('1994-03-03');
  });

  it('aceita 29 de fevereiro em ano bissexto', () => {
    expect(dataDigitadaParaIso('29/02/2024')).toBe('2024-02-29');
    expect(dataDigitadaParaIso('29/02/2023')).toBeNull();
  });

  it.each([
    ['', 'vazio'],
    ['11/03', 'incompleto'],
    ['110319', 'seis dígitos'],
    ['11/03/94', 'ano de dois dígitos — ambíguo demais para adivinhar'],
  ])('recusa %s (%s)', (entrada) => {
    expect(dataDigitadaParaIso(entrada)).toBeNull();
  });

  it('recusa ano fora do que é plausível para nascimento', () => {
    expect(dataDigitadaParaIso('11/03/1899')).toBeNull();
    const proximoAno = new Date().getUTCFullYear() + 1;
    expect(dataDigitadaParaIso(`11/03/${proximoAno}`)).toBeNull();
  });

  it('aceita quem nasceu hoje e quem nasceu em 1900', () => {
    // Os limites são inclusivos: errar por um aqui barraria gente real.
    expect(dataDigitadaParaIso('01/01/1900')).toBe('1900-01-01');
    const anoAtual = new Date().getUTCFullYear();
    expect(dataDigitadaParaIso(`01/01/${anoAtual}`)).toBe(`${anoAtual}-01-01`);
  });
});
