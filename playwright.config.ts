import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de ponta a ponta.
 *
 * O QUE ESTA SUÍTE COBRE, E O QUE NÃO
 *
 * Ela roda SEM conta de teste no banco. Isso é uma limitação deliberada: criar
 * usuário e tenant de mentira no banco de trabalho suja o dado real do cliente,
 * e um `beforeAll` que insere linha em produção é o tipo de coisa que um dia
 * roda no ambiente errado.
 *
 * O que dá para verificar sem credencial é mais do que parece, e é justamente a
 * camada que mais quebra em silêncio:
 *
 *   - Toda rota protegida REDIRECIONA para a entrada. Uma página nova que
 *     esqueça a verificação de sessão aparece aqui na hora.
 *   - O destino é preservado no redirecionamento, para o corretor voltar ao
 *     que estava tentando abrir.
 *   - As rotas públicas respondem sem sessão e têm os metadados certos.
 *   - Os cabeçalhos de segurança estão em toda resposta.
 *   - Nenhuma página vaza rastro de pilha, nome de tabela ou chave.
 *
 * Para exercitar o fluxo autenticado, veja `tests/e2e/README.md`: basta
 * apontar as variáveis para um projeto Supabase de teste.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,

  // Em integração contínua, `.only` esquecido num arquivo faria a suíte passar
  // testando uma coisa só. Aqui isso reprova o build.
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: process.env.URL_DOS_TESTES ?? 'http://localhost:3000',
    // Rastro só na repetição: gravar sempre deixa a suíte lenta e enche o disco.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // O corretor trabalha no celular, em pé, na frente do imóvel. Se a suíte só
    // rodar em desktop, o que quebra é exatamente onde ele mais usa.
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],

  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',

    // ATENÇÃO: se houver um `npm run dev` na porta 3000, o Playwright REUSA
    // ele em vez de subir o build. Isso já causou uma reprovação falsa aqui —
    // o servidor de desenvolvimento emite um mapa de módulos com caminhos de
    // `node_modules`, e o teste de vazamento acusou. O teste passou a detectar
    // o modo e anotar o que pulou, mas o jeito certo de rodar a suíte é com o
    // dev parado.
    reuseExistingServer: !process.env.CI,
    // O build do Next demora; dois minutos não bastam em máquina modesta.
    timeout: 5 * 60 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
