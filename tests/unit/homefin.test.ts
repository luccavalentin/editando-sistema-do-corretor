import { describe, expect, it } from 'vitest';

import {
  limparTextoLivre,
  mascararParaLog,
  mensagemParaOCorretor,
  traduzirSituacao,
} from '@/server/integracoes/homefin/cliente';

/**
 * Partes puras do cliente Homefin.
 *
 * Não tocam a rede, então podem ser testadas de verdade. As três primeiras são
 * de segurança e de privacidade — justamente as que ninguém percebe quando
 * quebram, porque o sistema continua "funcionando".
 */

describe('mascararParaLog', () => {
  it('esconde credencial e dado pessoal', () => {
    const payload = {
      secretId: 'id-secreto',
      secretKey: 'chave-secreta',
      nome: 'Mariana Duarte',
      cpfCnpj: '11144477735',
      email: 'mariana@email.com',
      celular: '11912345678',
      rendaTotal: 18400,
      valorImovel: 780000,
    };

    const mascarado = mascararParaLog(payload) as Record<string, unknown>;

    expect(mascarado.secretId).toBe('***');
    expect(mascarado.secretKey).toBe('***');
    expect(mascarado.cpfCnpj).toBe('***');
    expect(mascarado.email).toBe('***');
    expect(mascarado.celular).toBe('***');
    expect(mascarado.rendaTotal).toBe('***');

    // O que NÃO é sensível continua legível, senão o log não serve para
    // diagnosticar nada.
    expect(mascarado.nome).toBe('Mariana Duarte');
    expect(mascarado.valorImovel).toBe(780000);
  });

  it('mascara em profundidade, inclusive dentro de listas', () => {
    const payload = {
      participantes: [
        { nome: 'Titular', cpfCnpj: '11144477735' },
        { nome: 'Cônjuge', cpfConjuge: '52998224725', renda: 7200 },
      ],
    };

    const texto = JSON.stringify(mascararParaLog(payload));

    expect(texto).not.toContain('11144477735');
    expect(texto).not.toContain('52998224725');
    expect(texto).toContain('Titular');
  });

  it('não entra em recursão infinita com estrutura muito aninhada', () => {
    let profundo: Record<string, unknown> = { cpf: '11144477735' };
    for (let i = 0; i < 20; i++) profundo = { nivel: profundo };

    const texto = JSON.stringify(mascararParaLog(profundo));
    expect(texto).toContain('[profundo]');
    expect(texto).not.toContain('11144477735');
  });

  it('corta lista enorme antes de gravar', () => {
    const lista = Array.from({ length: 200 }, (_, i) => ({ i }));
    const saida = mascararParaLog(lista) as unknown[];
    expect(saida.length).toBeLessThanOrEqual(40);
  });
});

describe('limparTextoLivre', () => {
  it('remove o (a) de profissão, que o banco recusa', () => {
    expect(limparTextoLivre('Professor(a)')).toBe('Professor');
    expect(limparTextoLivre('Administrador(a) de empresas')).toBe('Administrador de empresas');
  });

  it('remove parênteses e colchetes sobrando', () => {
    expect(limparTextoLivre('Engenheiro [civil]')).toBe('Engenheiro civil');
    expect(limparTextoLivre('Comércio (varejo)')).toBe('Comércio varejo');
  });

  it('normaliza espaço e apara as pontas', () => {
    expect(limparTextoLivre('  Analista    de   sistemas  ')).toBe('Analista de sistemas');
  });

  it('deixa texto já limpo intacto', () => {
    expect(limparTextoLivre('Corretor de imóveis')).toBe('Corretor de imóveis');
  });
});

describe('mensagemParaOCorretor', () => {
  it('nunca vaza detalhe de infraestrutura', () => {
    // Entregar o nome da tecnologia para quem está sondando é ajuda gratuita.
    for (const bruta of [
      'supabase connection refused',
      'service_role key invalid',
      'Missing environment variable HOMEFIN_SECRET_ID',
      'postgres: relation does not exist',
      'at Object.<anonymous> (/app/server.js:12)',
    ]) {
      const saida = mensagemParaOCorretor(bruta);
      expect(saida).not.toContain('supabase');
      expect(saida).not.toContain('service_role');
      expect(saida).not.toContain('environment');
      expect(saida).not.toContain('postgres');
      expect(saida).toContain('banco não respondeu');
    }
  });

  it('não joga JSON cru na tela', () => {
    expect(mensagemParaOCorretor('{"code":"INT-006","detail":"falhou"}')).toContain(
      'banco não respondeu',
    );
    expect(mensagemParaOCorretor('[{"erro":1}]')).toContain('banco não respondeu');
  });

  it('corta mensagem longa demais para uma tela', () => {
    expect(mensagemParaOCorretor('a'.repeat(400))).toContain('banco não respondeu');
  });

  it('preserva mensagem útil do banco', () => {
    const util = 'Comprometimento de renda acima do limite do produto.';
    expect(mensagemParaOCorretor(util)).toBe(util);
  });

  it('tem texto para mensagem ausente', () => {
    expect(mensagemParaOCorretor(null)).toContain('banco não respondeu');
    expect(mensagemParaOCorretor('')).toContain('banco não respondeu');
  });
});

describe('traduzirSituacao', () => {
  it('traduz os cinco códigos do contrato', () => {
    // "P" não significa nada para quem está atendendo um cliente.
    expect(traduzirSituacao('A').rotulo).toBe('Crédito aprovado');
    expect(traduzirSituacao('R').rotulo).toBe('Crédito recusado');
    expect(traduzirSituacao('N').rotulo).toBe('Em análise de crédito');
    expect(traduzirSituacao('P').rotulo).toBe('Erro ao enviar ao banco');
    expect(traduzirSituacao('S').rotulo).toBe('Sem integração');
  });

  it('usa tons coerentes com o significado', () => {
    expect(traduzirSituacao('A').tom).toBe('sucesso');
    expect(traduzirSituacao('R').tom).toBe('perigo');
    expect(traduzirSituacao('N').tom).toBe('atencao');
  });

  it('cai em "sem integração" para código desconhecido, sem quebrar a tela', () => {
    expect(traduzirSituacao('X').rotulo).toBe('Sem integração');
    expect(traduzirSituacao(null).rotulo).toBe('Sem integração');
    expect(traduzirSituacao(undefined).rotulo).toBe('Sem integração');
  });
});
