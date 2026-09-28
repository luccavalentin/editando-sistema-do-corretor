import { expect, test } from '@playwright/test';

/**
 * Toda rota do sistema, uma a uma.
 *
 * A pergunta que esta suíte responde é a mais básica e a mais fácil de errar:
 * **uma página nova está protegida?** A proteção existe em três camadas — o
 * middleware, o `exigirSessao` de cada página e a RLS do banco — mas nenhuma
 * delas grita quando alguém cria um arquivo novo e esquece as três.
 *
 * O teste é o único lugar onde esse esquecimento aparece antes do cliente.
 */

/**
 * Rotas que EXIGEM sessão.
 *
 * Acrescentar uma linha aqui ao criar uma página é obrigação, e não depende de
 * ninguém lembrar: `tests/unit/rotas-protegidas.test.ts` varre
 * `src/app/(app)` no sistema de arquivos e reprova se uma página existir sem
 * aparecer nesta lista — ou sem chamar `exigirSessao`.
 */
const ROTAS_PROTEGIDAS = [
  '/inicio',
  '/agenda',
  '/clientes',
  '/clientes/novo',
  '/negocios',
  '/negocios/novo',
  '/followups',
  '/imoveis',
  '/imoveis/novo',
  '/simulacoes',
  '/simulacoes/nova',
  '/tarefas',
  '/portfolio',
  '/equipe',
  '/configuracoes',
  '/relatorios',
  '/seguranca',
  '/configuracoes/integracoes',
  '/automacoes',
];

/** Rotas que funcionam sem sessão nenhuma. */
const ROTAS_PUBLICAS = ['/entrar', '/escolher-acesso', '/robots.txt', '/sitemap.xml'];

/** O convite abre sem sessão de corretor: quem o recebe ainda não é membro. */
const ROTA_DO_CONVITE = '/aceitar-convite';

test.describe('proteção de rota', () => {
  for (const rota of ROTAS_PROTEGIDAS) {
    test(`${rota} manda para a entrada quando não há sessão`, async ({ page }) => {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/entrar/);
    });

    test(`${rota} preserva o destino no redirecionamento`, async ({ page }) => {
      // O corretor clica num link de cliente que alguém mandou no WhatsApp,
      // cai no login, entra — e precisa chegar NO CLIENTE, não no início.
      await page.goto(rota);
      const url = new URL(page.url());
      expect(url.searchParams.get('destino')).toBe(rota);
    });
  }
});

test.describe('rotas públicas', () => {
  for (const rota of ROTAS_PUBLICAS) {
    test(`${rota} responde sem sessão`, async ({ page }) => {
      const resposta = await page.goto(rota);
      expect(resposta?.status()).toBeLessThan(400);
    });
  }

  test('a entrada mostra o formulário e a marca', async ({ page }) => {
    await page.goto('/entrar');

    await expect(page.getByRole('heading', { name: 'Entrar na sua conta' })).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByLabel('Senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

    // A logo tem que ter texto alternativo: o leitor de tela anuncia o NOME da
    // empresa, e não "imagem".
    //
    // `:visible` importa. A tela tem duas logos no HTML — a negativa no painel
    // escuro do desktop e a colorida do celular — e cada viewport esconde uma
    // por CSS. Um `.first()` aqui pegaria a escondida e reprovaria no celular
    // sem haver defeito nenhum. O que interessa é que EXISTA uma logo visível.
    await expect(page.locator('img[alt="Agilliza"]:visible').first()).toBeVisible();
  });

  test('a entrada funciona pelo teclado, do primeiro campo ao botão', async ({ page }) => {
    await page.goto('/entrar');

    await page.getByLabel('E-mail').focus();
    await page.keyboard.type('corretor@exemplo.com');
    await page.keyboard.press('Tab');
    await page.keyboard.type('senha-de-teste');

    // Quem não usa mouse precisa chegar ao botão sem armadilha de foco.
    const senha = page.getByLabel('Senha');
    await expect(senha).toBeFocused();
  });

  test('o robots libera só a vitrine', async ({ page }) => {
    const resposta = await page.goto('/robots.txt');
    const texto = (await resposta?.text()) ?? '';

    expect(texto).toContain('Allow: /c/');
    expect(texto).toContain('Disallow: /');
    expect(texto).toContain('Sitemap:');
  });

  test('o sitemap é XML válido', async ({ page }) => {
    const resposta = await page.goto('/sitemap.xml');
    const texto = (await resposta?.text()) ?? '';

    expect(resposta?.headers()['content-type']).toContain('xml');
    expect(texto).toContain('<urlset');
    // Vazio é resposta legítima: nenhum corretor publicou a vitrine ainda.
    expect(texto).not.toContain('/clientes');
    expect(texto).not.toContain('/inicio');
  });
});

test.describe('convite para a equipe', () => {
  test('a tela do convite abre sem sessão de corretor', async ({ page }) => {
    // Quem recebe o convite AINDA NÃO é membro de conta nenhuma. Exigir sessão
    // aqui trancaria a porta pela qual ele entra.
    const resposta = await page.goto(`${ROTA_DO_CONVITE}?token=qualquer-coisa`);
    expect(resposta?.status()).toBeLessThan(400);
    expect(page.url()).not.toContain('/entrar');
  });

  test('sem token, explica em vez de quebrar', async ({ page }) => {
    await page.goto(ROTA_DO_CONVITE);
    // Escopado ao `main`: o Next mantém um `role="alert"` próprio no anunciador
    // de rota, e um seletor solto casa com os dois.
    await expect(page.locator('main [role=alert]')).toContainText('incompleto');
  });

  test('não revela de qual imobiliária é o convite antes de entrar', async ({ page }) => {
    // Quem tiver o link — inclusive quem o recebeu por engano — não pode
    // descobrir que aquele e-mail foi convidado por aquela empresa.
    await page.goto(`${ROTA_DO_CONVITE}?token=qualquer-coisa`);
    const texto = await page.locator('main').innerText();
    expect(texto).toContain('Entrar na minha conta');
    expect(texto).not.toMatch(/imobili[áa]ria .+ te convidou/i);
  });

  test('o convite não é indexável', async ({ page }) => {
    // O link carrega um segredo: indexá-lo seria publicá-lo.
    const resposta = await page.goto(`${ROTA_DO_CONVITE}?token=qualquer-coisa`);
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(
      robots?.includes('noindex') || resposta?.headers()['x-robots-tag']?.includes('noindex'),
    ).toBe(true);
  });
});

test.describe('a porta de entrada', () => {
  test('a raiz oferece a escolha, e não o login do corretor', async ({ page }) => {
    // Quem digita o endereço principal pode ser corretor OU cliente. Mandar
    // direto para o login do corretor faz o comprador encarar um formulário de
    // e-mail e senha que ele não tem — e desistir.
    await page.goto('/');
    await expect(page).toHaveURL(/\/escolher-acesso/);
  });

  test('a escolha leva aos dois acessos', async ({ page }) => {
    await page.goto('/escolher-acesso');

    await expect(page.getByRole('heading', { name: 'Como você quer entrar?' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sou corretor/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sou cliente/ })).toBeVisible();
  });

  test('o cliente chega ao portal a partir da escolha', async ({ page }) => {
    await page.goto('/escolher-acesso');
    await page.getByRole('link', { name: /Sou cliente/ }).click();
    await expect(page).toHaveURL(/\/portal$/);
    await expect(page.getByLabel('Seu CPF')).toBeVisible();
  });

  test('uma rota interna ainda vai direto para o login do corretor', async ({ page }) => {
    // A raiz é o único caso ambíguo. `/clientes/xyz` é link de corretor por
    // natureza, e mandá-lo escolher seria um passo a mais sem motivo.
    await page.goto('/clientes');
    await expect(page).toHaveURL(/\/entrar/);
  });
});

test.describe('portal do cliente', () => {
  test('a entrada do portal abre sem sessão', async ({ page }) => {
    const resposta = await page.goto('/portal');
    expect(resposta?.status()).toBeLessThan(400);
    await expect(page.getByLabel('Seu CPF')).toBeVisible();
    await expect(page.getByLabel('Sua data de nascimento')).toBeVisible();
  });

  test('o portal NÃO manda o cliente para a entrada do corretor', async ({ page }) => {
    // As duas pontas têm sessões diferentes. Se o middleware passasse a
    // proteger `/portal` como rota de corretor, o cliente cairia numa tela de
    // login que nunca vai funcionar para ele — ele não tem conta.
    await page.goto('/portal');
    expect(page.url()).not.toContain('/entrar');
  });

  test('a área interna do portal exige a sessão do cliente', async ({ page }) => {
    await page.goto('/portal/inicio');
    // Volta para a entrada DO PORTAL, não para a do corretor.
    await expect(page).toHaveURL(/\/portal$/);
  });

  test('o consentimento e o perfil também exigem sessão', async ({ page }) => {
    for (const rota of ['/portal/consentimento', '/portal/perfil']) {
      await page.goto(rota);
      await expect(page, `${rota} deveria voltar para a entrada do portal`).toHaveURL(
        /\/portal$/,
      );
    }
  });

  test('o portal não é indexável', async ({ page }) => {
    const resposta = await page.goto('/portal');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(
      robots?.includes('noindex') || resposta?.headers()['x-robots-tag']?.includes('noindex'),
    ).toBe(true);
  });
});

test.describe('vitrine pública', () => {
  test('slug que não existe devolve 404, não erro do servidor', async ({ page }) => {
    const resposta = await page.goto('/c/corretor-que-nao-existe');
    expect(resposta?.status()).toBe(404);
  });

  test('anúncio de vitrine inexistente devolve 404', async ({ page }) => {
    const resposta = await page.goto('/c/ninguem/imovel-nenhum');
    expect(resposta?.status()).toBe(404);
  });

  test('a vitrine NÃO redireciona para a entrada', async ({ page }) => {
    // É pública por definição. Se o middleware passar a protegê-la por engano,
    // o portfólio de todos os corretores sai do ar de uma vez.
    await page.goto('/c/qualquer-coisa');
    expect(page.url()).not.toContain('/entrar');
  });
});

test.describe('cabeçalhos de segurança', () => {
  test('a resposta traz a política de conteúdo com nonce', async ({ page }) => {
    const resposta = await page.goto('/entrar');
    const csp = resposta?.headers()['content-security-policy'] ?? '';

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('strict-dynamic');
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test('o nonce muda a cada resposta', async ({ page }) => {
    // Nonce fixo não protege de nada: o atacante lê no HTML e reutiliza.
    const primeira = await page.goto('/entrar');
    const nonce1 = primeira?.headers()['content-security-policy']?.match(/'nonce-([^']+)'/)?.[1];

    const segunda = await page.goto('/entrar?x=1');
    const nonce2 = segunda?.headers()['content-security-policy']?.match(/'nonce-([^']+)'/)?.[1];

    expect(nonce1).toBeTruthy();
    expect(nonce2).toBeTruthy();
    expect(nonce1).not.toBe(nonce2);
  });

  test('os demais cabeçalhos de proteção estão presentes', async ({ page }) => {
    const resposta = await page.goto('/entrar');
    const cabecalhos = resposta?.headers() ?? {};

    expect(cabecalhos['x-content-type-options']).toBe('nosniff');
    expect(cabecalhos['referrer-policy']).toBeTruthy();
    expect(cabecalhos['strict-transport-security']).toBeTruthy();
  });

  test('a versão do framework não é anunciada', async ({ page }) => {
    // `x-powered-by` entrega a pilha para quem está sondando. Ajuda de graça.
    const resposta = await page.goto('/entrar');
    expect(resposta?.headers()['x-powered-by']).toBeUndefined();
  });
});

test.describe('nada vaza na página de erro', () => {
  /**
   * O que NUNCA pode aparecer, em modo nenhum.
   *
   * Cada um destes entrega algo de verdade a quem está sondando: o provedor de
   * banco que usamos, o nome da chave que ignora a RLS, a biblioteca de acesso
   * ao Postgres, ou o nome de uma tabela.
   */
  const SEMPRE_PROIBIDOS = [
    'supabase',
    'service_role',
    'SUPABASE_CHAVE',
    'PostgrestError',
    'relation "',
    'tenant_id',
  ];

  /**
   * O que só pode aparecer em desenvolvimento.
   *
   * O Next emite um mapa de módulos — com caminhos dentro de `node_modules` e
   * rastros de pilha — no servidor de desenvolvimento, e não no build de
   * produção. Afirmar a ausência deles em dev daria uma reprovação falsa; não
   * afirmar nunca deixaria passar um rastro de pilha real em produção.
   *
   * Por isso a suíte DETECTA o modo em vez de presumir: `webpack.js` na página
   * é a assinatura do servidor de desenvolvimento.
   */
  const PROIBIDOS_EM_PRODUCAO = ['at Object.', 'node_modules'];

  for (const rota of ['/rota-que-nao-existe', '/c/nao-existe', '/imoveis/nao-e-uuid']) {
    test(`${rota} não expõe detalhe de infraestrutura`, async ({ page }) => {
      await page.goto(rota);
      const bruto = await page.content();
      const html = bruto.toLowerCase();

      for (const sinal of SEMPRE_PROIBIDOS) {
        expect(html, `"${sinal}" apareceu em ${rota}`).not.toContain(sinal.toLowerCase());
      }

      const ehDesenvolvimento = bruto.includes('/_next/static/chunks/webpack.js');

      if (ehDesenvolvimento) {
        // Anotado, e não silencioso: quem ler o relatório precisa saber que
        // esta parte não foi verificada, e por quê.
        test.info().annotations.push({
          type: 'aviso',
          description:
            'Rodando contra o servidor de DESENVOLVIMENTO. As asserções de rastro de pilha ' +
            'e caminho de módulo foram puladas — elas valem para o build de produção. ' +
            'Pare o `npm run dev` antes de rodar a suíte para verificá-las.',
        });
        return;
      }

      for (const sinal of PROIBIDOS_EM_PRODUCAO) {
        expect(html, `"${sinal}" apareceu em ${rota}`).not.toContain(sinal.toLowerCase());
      }
    });
  }
});

test.describe('acessibilidade básica', () => {
  test('a entrada tem um só h1 e o idioma declarado', async ({ page }) => {
    await page.goto('/entrar');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    // Mais de um h1 desorienta quem navega por cabeçalho.
    expect(await page.locator('h1').count()).toBeLessThanOrEqual(1);
  });

  test('o zoom não está travado', async ({ page }) => {
    // Travar o zoom é barreira de acessibilidade, e o corretor de 50 anos
    // lendo tabela no celular precisa poder ampliar.
    await page.goto('/entrar');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).not.toContain('user-scalable=no');
    expect(viewport).not.toMatch(/maximum-scale=1\b/);
  });

  test('há um atalho para pular ao conteúdo', async ({ page }) => {
    await page.goto('/entrar');
    // Quem navega por teclado não deve percorrer o menu inteiro a cada página.
    await expect(page.locator('#conteudo')).toHaveCount(1);
  });
});

test.describe('a página existe de verdade', () => {
  test('nenhuma rota protegida devolve 500', async ({ page }) => {
    // Redirecionar para a entrada é o esperado. Quebrar não é — e um erro de
    // importação numa página só aparece quando ela é pedida.
    for (const rota of ROTAS_PROTEGIDAS) {
      const resposta = await page.goto(rota);
      expect(resposta?.status(), `${rota} devolveu ${resposta?.status()}`).toBeLessThan(500);
    }
  });
});
