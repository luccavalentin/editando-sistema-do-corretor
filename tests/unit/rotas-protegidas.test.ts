import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Nenhuma página do aplicativo pode nascer desprotegida.
 *
 * O PROBLEMA QUE ISTO RESOLVE
 *
 * A proteção existe em três camadas: o middleware redireciona, cada página
 * chama `exigirSessao`, e a RLS barra no banco. Parece bastante — e é
 * exatamente por isso que o buraco aparece: quem cria uma página nova assume
 * que "as outras camadas cobrem".
 *
 * Não cobrem sozinhas. O middleware protege por CAMINHO, e uma rota nova sob
 * um prefixo que ele não conhece passa direto. A RLS barra a leitura de dado
 * alheio, mas não impede uma página de renderizar para quem não está logado —
 * ela só viria vazia, o que é pior: parece funcionar.
 *
 * Este teste lê os ARQUIVOS, não uma lista escrita à mão. Página nova sem
 * `exigirSessao` reprova o build no mesmo minuto em que é criada.
 */

const RAIZ = join(process.cwd(), 'src', 'app');

function paginasEm(diretorio: string): string[] {
  const encontradas: string[] = [];

  for (const nome of readdirSync(diretorio)) {
    const caminho = join(diretorio, nome);
    if (statSync(caminho).isDirectory()) {
      encontradas.push(...paginasEm(caminho));
    } else if (nome === 'page.tsx') {
      encontradas.push(caminho);
    }
  }

  return encontradas;
}

/** Converte o caminho do arquivo na rota que o Next serve. */
function rotaDoArquivo(caminho: string): string {
  const relativo = relative(RAIZ, caminho).split(sep).slice(0, -1);
  const segmentos = relativo.filter((s) => !(s.startsWith('(') && s.endsWith(')')));
  return '/' + segmentos.join('/');
}

const TODAS_AS_PAGINAS = paginasEm(RAIZ).map((caminho) => ({
  caminho,
  rota: rotaDoArquivo(caminho),
  conteudo: readFileSync(caminho, 'utf8'),
}));

/**
 * As rotas que são públicas DE PROPÓSITO.
 *
 * Lista curta e explícita: acrescentar algo aqui é uma decisão, e aparece na
 * revisão. O contrário — presumir que o que não está protegido é público —
 * transforma esquecimento em funcionalidade.
 *
 * `/portal` é a tela de ENTRADA do cliente: ela precisa abrir sem sessão, como
 * `/entrar`. O que vem depois dela não é público, e é conferido abaixo.
 */
const PUBLICAS_POR_DECISAO = [
  '/entrar',
  // A porta de entrada. Precisa abrir sem sessão por definição: quem chega
  // nela é justamente quem ainda não sabe qual acesso é o dele.
  '/escolher-acesso',
  '/portal',
  // Quem clica no convite AINDA NÃO é membro de conta nenhuma: exigir sessão de
  // corretor aqui trancaria a porta pela qual ele entra. A conferência real é
  // no servidor, pelo hash do token e pelo e-mail.
  '/aceitar-convite',
  '/c/[slug]',
  '/c/[slug]/[imovel]',
];

/**
 * As três pontas do sistema têm TRÊS sessões diferentes, e o teste precisa
 * conhecer as três:
 *
 *   exigirSessao / exigirPermissao  o corretor, com sessão Supabase
 *   sessaoDoPortal                  o cliente, com cookie assinado por HMAC
 *
 * A do administrador da plataforma vive noutra aplicação (`admin/`), com
 * verificação própria — não é varrida aqui.
 *
 * Aceitar qualquer uma é o certo; aceitar NENHUMA é o que este teste impede.
 */
const FORMAS_DE_EXIGIR_SESSAO = ['exigirSessao', 'exigirPermissao', 'sessaoDoPortal'];

describe('toda página do aplicativo exige sessão', () => {
  const protegidas = TODAS_AS_PAGINAS.filter((p) => !PUBLICAS_POR_DECISAO.includes(p.rota));

  it('encontrou páginas para verificar', () => {
    // Se a varredura quebrar, o teste passaria vazio e não protegeria nada.
    expect(protegidas.length).toBeGreaterThan(5);
  });

  for (const pagina of protegidas) {
    it(`${pagina.rota} verifica a sessão`, () => {
      const exige = FORMAS_DE_EXIGIR_SESSAO.some((forma) => pagina.conteudo.includes(forma));

      expect(
        exige,
        `${pagina.rota} não verifica a sessão de nenhuma das formas conhecidas ` +
          `(${FORMAS_DE_EXIGIR_SESSAO.join(', ')}). Se for pública de propósito, ` +
          'acrescente em PUBLICAS_POR_DECISAO — com o motivo.',
      ).toBe(true);
    });
  }
});

describe('as páginas públicas não são acidentes', () => {
  for (const rota of PUBLICAS_POR_DECISAO) {
    it(`${rota} existe de fato`, () => {
      // Rota removida e esquecida na lista faz a lista mentir sobre o sistema.
      expect(TODAS_AS_PAGINAS.some((p) => p.rota === rota)).toBe(true);
    });
  }
});

describe('a suíte de ponta a ponta cobre as rotas fixas', () => {
  const spec = readFileSync(join(process.cwd(), 'tests', 'e2e', 'rotas.spec.ts'), 'utf8');

  // Rota com parâmetro precisa de um id real para ser visitada, e isso exige
  // conta de teste. Fica fora desta conferência.
  // As rotas do portal ficam de fora desta conferência: elas redirecionam para
  // `/portal`, não para `/entrar`, e por isso têm um grupo próprio na suíte de
  // ponta a ponta. Incluí-las aqui exigiria que aparecessem numa lista onde a
  // asserção seria a errada.
  const fixasProtegidas = TODAS_AS_PAGINAS.filter(
    (p) =>
      !PUBLICAS_POR_DECISAO.includes(p.rota) &&
      !p.rota.includes('[') &&
      !p.rota.startsWith('/portal'),
  );

  for (const pagina of fixasProtegidas) {
    it(`${pagina.rota} está na lista do Playwright`, () => {
      expect(
        spec.includes(`'${pagina.rota}'`),
        `Acrescente '${pagina.rota}' em ROTAS_PROTEGIDAS de tests/e2e/rotas.spec.ts.`,
      ).toBe(true);
    });
  }
});

describe('nenhuma página de aplicativo é cacheada por engano', () => {
  for (const pagina of TODAS_AS_PAGINAS) {
    if (PUBLICAS_POR_DECISAO.includes(pagina.rota)) continue;

    it(`${pagina.rota} não declara revalidate`, () => {
      // Cachear página autenticada é como um corretor ver o painel de outro:
      // o Next serviria a mesma resposta para sessões diferentes.
      expect(
        /export const revalidate/.test(pagina.conteudo),
        `${pagina.rota} declara revalidate, e é uma página com sessão.`,
      ).toBe(false);
    });
  }
});
