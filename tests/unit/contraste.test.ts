/**
 * Acessibilidade do design system como teste, não como intenção.
 *
 * A seção 20 do documento do produto exige "contraste WCAG AA" e "interface
 * funcional sem depender apenas de cor". Este arquivo transforma essas frases
 * em condição de build: se alguém trocar um token por um tom mais bonito e
 * menos legível, o teste reprova antes de chegar no corretor.
 *
 * Lê `src/styles/globals.css` diretamente — nunca uma cópia dos valores.
 */

import { describe, expect, it } from 'vitest';
import { MINIMO, contraste, contrasteArredondado } from '@/lib/design/contraste';
import { lerTokens } from '@/lib/design/ler-tokens';
import { parMaisProximo, type TipoDaltonismo } from '@/lib/design/percepcao';

const tokens = lerTokens();

/** Pega o token e falha com mensagem útil se ele não existir. */
function cor(tema: 'claro' | 'escuro', nome: string): string {
  const valor = tokens[tema].get(nome);
  if (!valor) throw new Error(`Token "${nome}" não existe no tema ${tema}`);
  return valor;
}

/**
 * Pares de texto sobre fundo que precisam de 4.5:1.
 * Cada linha é uma combinação que a interface realmente produz.
 */
const PARES_DE_TEXTO: ReadonlyArray<readonly [string, string]> = [
  // Corpo sobre cartão e sobre o fundo da aplicação
  ['--cor-texto', '--cor-superficie'],
  ['--cor-texto', '--cor-fundo'],
  ['--cor-texto', '--cor-superficie-elevada'],
  ['--cor-texto', '--cor-superficie-afundada'],
  ['--cor-texto', '--cor-superficie-secundaria'],
  ['--cor-texto-secundario', '--cor-superficie'],
  ['--cor-texto-secundario', '--cor-fundo'],
  ['--cor-texto-secundario', '--cor-superficie-afundada'],
  ['--cor-texto-apoio', '--cor-superficie'],
  ['--cor-texto-apoio', '--cor-fundo'],

  // Ação como texto — é para isto que `--cor-link` existe separado de
  // `--cor-acao`: no tema escuro `--cor-acao` sobre grafite dá 2.33:1.
  ['--cor-link', '--cor-superficie'],
  ['--cor-link', '--cor-fundo'],
  ['--cor-link-hover', '--cor-superficie'],

  // Ação como preenchimento
  ['--cor-acao-texto', '--cor-acao'],
  ['--cor-acao-texto', '--cor-acao-hover'],
  ['--cor-acao-texto', '--cor-acao-ativa'],
  ['--cor-acao-sutil-texto', '--cor-acao-sutil'],

  // Estados como texto, sobre cartão e sobre a própria lavagem
  ['--cor-perigo-texto', '--cor-superficie'],
  ['--cor-perigo-texto', '--cor-perigo-sutil'],
  ['--cor-sucesso-texto', '--cor-superficie'],
  ['--cor-sucesso-texto', '--cor-sucesso-sutil'],
  ['--cor-atencao-texto', '--cor-superficie'],
  ['--cor-atencao-texto', '--cor-atencao-sutil'],
  ['--cor-info-texto', '--cor-info-sutil'],

  // Preenchimento de estado com texto em cima
  ['--cor-acao-texto', '--cor-perigo-forte'],
  ['--cor-acao-texto', '--cor-sucesso-forte'],
  // O âmbar leva texto grafite, nunca branco — é o que o Agilliza já faz certo.
  ['--cor-atencao-contraste', '--cor-atencao'],

  // Temperatura do cliente
  ['--cor-quente-texto', '--cor-superficie'],
  ['--cor-quente-texto', '--cor-quente-sutil'],
  ['--cor-morno-texto', '--cor-superficie'],
  ['--cor-morno-texto', '--cor-morno-sutil'],
  ['--cor-frio-texto', '--cor-superficie'],
  ['--cor-frio-texto', '--cor-frio-sutil'],

  // Conversa
  ['--cor-bolha-cliente-texto', '--cor-bolha-cliente'],
  ['--cor-bolha-time-texto', '--cor-bolha-time'],

  // Menu
  ['--cor-nav-texto', '--cor-nav-fundo'],
  ['--cor-nav-texto', '--cor-nav-item-ativo'],
  ['--cor-nav-texto', '--cor-nav-item-hover'],
  ['--cor-nav-texto-ativo', '--cor-nav-item-ativo'],
  ['--cor-nav-destaque', '--cor-nav-fundo'],
];

/** Limites de componente: 3:1 contra a superfície onde o componente vive. */
const PARES_DE_COMPONENTE: ReadonlyArray<readonly [string, string]> = [
  ['--cor-borda-controle', '--cor-superficie'],
  ['--cor-borda-controle', '--cor-fundo'],
  ['--cor-foco', '--cor-superficie'],
  ['--cor-foco', '--cor-fundo'],
  ['--cor-perigo', '--cor-superficie'],
  ['--cor-sucesso', '--cor-superficie'],
];

/** Séries categóricas sancionadas. */
const SERIES = [
  '--grafico-1',
  '--grafico-2',
  '--grafico-3',
  '--grafico-4',
  '--grafico-5',
  '--grafico-6',
] as const;

/** As 14 etapas da esteira do funil. */
const ETAPAS = Array.from({ length: 14 }, (_, i) => `--etapa-${i + 1}`);

const DICROMACIAS: readonly TipoDaltonismo[] = ['protanopia', 'deuteranopia', 'tritanopia'];

/**
 * Separação perceptual mínima exigida entre duas séries categóricas, medida em
 * OKLab no pior caso entre visão normal e as três dicromacias.
 *
 * 0.06 não é número escolhido a dedo: a paleta foi otimizada e mede 0.0746 no
 * tema claro e 0.0634 no escuro. O limite fica logo abaixo do pior caso real,
 * dando margem para ajuste fino sem permitir regressão silenciosa.
 */
const SEPARACAO_MINIMA = 0.06;

describe.each(['claro', 'escuro'] as const)('tema %s', (tema) => {
  describe('texto atinge AA (4.5:1)', () => {
    it.each(PARES_DE_TEXTO)('%s sobre %s', (frente, fundo) => {
      const razao = contraste(cor(tema, frente), cor(tema, fundo));
      expect(
        razao,
        `${frente} sobre ${fundo} = ${contrasteArredondado(cor(tema, frente), cor(tema, fundo))}:1`,
      ).toBeGreaterThanOrEqual(MINIMO.textoAA);
    });
  });

  describe('limite de componente atinge 3:1', () => {
    it.each(PARES_DE_COMPONENTE)('%s sobre %s', (frente, fundo) => {
      const razao = contraste(cor(tema, frente), cor(tema, fundo));
      expect(
        razao,
        `${frente} sobre ${fundo} = ${contrasteArredondado(cor(tema, frente), cor(tema, fundo))}:1`,
      ).toBeGreaterThanOrEqual(MINIMO.componenteAA);
    });
  });

  describe('séries categóricas de gráfico', () => {
    it.each(SERIES)('%s se distingue da superfície', (serie) => {
      expect(contraste(cor(tema, serie), cor(tema, '--cor-superficie'))).toBeGreaterThanOrEqual(
        MINIMO.componenteAA,
      );
    });

    // Razão de contraste NÃO serve aqui: ela mede só luminância, e duas cores
    // de matiz diferente com luminância igual dariam 1:1 sendo perfeitamente
    // distinguíveis. A métrica correta para cor categórica é distância
    // perceptual em OKLab.
    it('mantém separação perceptual com visão normal', () => {
      const cores = SERIES.map((s) => cor(tema, s));
      const { a, b, distancia } = parMaisProximo(cores);
      expect(
        distancia,
        `mais próximas: ${SERIES[a]} e ${SERIES[b]} a ${distancia.toFixed(4)}`,
      ).toBeGreaterThanOrEqual(SEPARACAO_MINIMA);
    });

    it.each(DICROMACIAS)('mantém separação perceptual em %s', (tipo) => {
      const cores = SERIES.map((s) => cor(tema, s));
      const { a, b, distancia } = parMaisProximo(cores, tipo);
      expect(
        distancia,
        `em ${tipo} as mais próximas são ${SERIES[a]} e ${SERIES[b]} a ${distancia.toFixed(4)}`,
      ).toBeGreaterThanOrEqual(SEPARACAO_MINIMA);
    });

    it('não usa cor semântica como categoria', () => {
      // Pintar "origem: indicação" de vermelho inventa um alerta que o dado não
      // tem. Cor de estado só entra em gráfico quando a série É o estado, e
      // para isso existem os tokens --grafico-ganho/perdido/pendente.
      const semanticas = new Set(
        [
          cor(tema, '--cor-perigo'),
          cor(tema, '--cor-sucesso'),
          cor(tema, '--cor-atencao'),
        ].map((c) => c.toLowerCase()),
      );

      const vazamentos = SERIES.filter((s) => semanticas.has(cor(tema, s).toLowerCase()));
      expect(vazamentos).toEqual([]);
    });
  });

  describe('esteira de 14 etapas', () => {
    // A esteira é ORDINAL, não categórica: é um gradiente azul -> verde onde
    // etapas vizinhas parecidas são o desenho correto. Medida em deuteranopia,
    // a separação entre vizinhas cai a 0.0085 — ou seja, a etapa é
    // INDISTINGUÍVEL por cor sozinha. Por isso o componente de esteira sempre
    // mostra número e nome da etapa; a cor é reforço, nunca o canal.
    // O que se pode exigir da cor é apenas que o chip seja visível.
    it.each(ETAPAS)('%s tem contraste suficiente para ser visível', (etapa) => {
      expect(contraste(cor(tema, etapa), cor(tema, '--cor-superficie'))).toBeGreaterThanOrEqual(
        MINIMO.componenteAA,
      );
    });

    it('as pontas da jornada permanecem distinguíveis em qualquer dicromacia', () => {
      // A jornada é azul -> verde, e esse é justamente o eixo que a tritanopia
      // comprime: sem o cone S, azul e verde convergem. Medido entre etapa 1 e
      // etapa 14: 0.108 no tema claro e 0.147 no escuro.
      //
      // Não dá para resolver subindo a separação: as 14 etapas precisam manter
      // 3:1 contra a superfície branca, o que limita a faixa de luminosidade
      // disponível, e a matiz azul->verde é a identidade herdada do Agilliza.
      //
      // O limite de 0.10 reflete o que a paleta realmente entrega e continua
      // pegando regressão. A garantia de que a etapa é sempre identificável não
      // vem daqui: vem do componente de esteira, que exibe número e nome da
      // etapa. A cor é reforço, nunca o canal — como a seção 20 exige.
      const primeira = cor(tema, '--etapa-1');
      const ultima = cor(tema, '--etapa-14');
      for (const tipo of DICROMACIAS) {
        const { distancia } = parMaisProximo([primeira, ultima], tipo);
        expect(distancia, `etapa 1 vs 14 em ${tipo} = ${distancia.toFixed(4)}`).toBeGreaterThanOrEqual(
          0.1,
        );
      }
    });
  });
});

describe('paridade entre os temas', () => {
  it('todo token semântico do claro tem contraparte declarada no escuro', () => {
    // Token declarado só em `:root` mantém o valor claro dentro de `.dark`,
    // porque a cascata do CSS não o substitui. O resultado é cinza claro sobre
    // grafite: invisível. Este teste é o que impede esse vazamento.
    expect(tokens.semParEscuro).toEqual([]);
  });

  it('nenhum token semântico ficou sem valor', () => {
    const vazios = [...tokens.claro.entries()]
      .filter(([nome]) => nome.startsWith('--cor-'))
      .filter(([, valor]) => valor === '' || valor.includes('var('))
      .map(([nome]) => nome);
    expect(vazios).toEqual([]);
  });
});

describe('regras visuais da seção 20', () => {
  it('vermelho só aparece em papel de alerta', () => {
    // A paleta reserva o vermelho para "erro, exclusão e atraso crítico". Se
    // ele vazar para ação, sucesso ou navegação, a interface passa a gritar.
    // Só a camada semântica é verificada: a camada `--paleta-*` é o inventário
    // cru e legitimamente guarda vermelho.
    const vermelhos = new Set(['#c8102e', '#8a0b20', '#e8455c', '#ff8a91']);
    const papeisPermitidos = /^--cor-(perigo|quente)/;

    const vazamentos = [...tokens.claro.entries()]
      .filter(([nome]) => nome.startsWith('--cor-'))
      .filter(([nome, valor]) => vermelhos.has(valor.toLowerCase()) && !papeisPermitidos.test(nome))
      .map(([nome]) => nome);

    expect(vazamentos).toEqual([]);
  });

  it('o menu usa o azul exato da logo oficial', () => {
    // #0B109F foi MEDIDO no arquivo da marca, pixel a pixel, e não copiado de
    // um documento. O menu fica encostado na logo no cabeçalho: um azul quase
    // igual — e antes havia #000F9F aqui — desenha uma emenda visível bem no
    // lugar onde a marca aparece.
    expect(tokens.claro.get('--cor-nav-fundo')).toBe('#0b109f');
    expect(tokens.escuro.get('--cor-nav-fundo')).toBe('#000a6e');
  });

  it('o vermelho da LOGO não é usado onde precisaria passar em AA', () => {
    // #F4313F dá 3.87:1 sobre branco: reprova para texto. Ele existe na paleta
    // porque é a cor da marca, e some da camada semântica de propósito —
    // quem precisar de vermelho legível usa `--cor-perigo`, que é #C8102E.
    const marca = tokens.claro.get('--paleta-vermelho-marca');
    expect(marca).toBe('#f4313f');

    const semanticosComOVermelhoDaMarca = [...tokens.claro.entries()]
      .filter(([nome, valor]) => nome.startsWith('--cor-') && valor === marca)
      .map(([nome]) => nome);

    expect(semanticosComOVermelhoDaMarca).toEqual([]);
  });

  it('o raio base é o do Agilliza', () => {
    expect(tokens.claro.get('--radius-lg')).toBe('0.625rem');
  });
});
