import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` lança ao ser importado fora do contexto de servidor do
      // Next. No vitest, que roda em Node puro, isso impediria testar qualquer
      // módulo de servidor. O substituto vazio é o mesmo comportamento que o
      // Next aplica no build de servidor; a proteção real continua no build.
      'server-only': fileURLToPath(
        new URL('./tests/apoio/server-only-vazio.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],

    /**
     * Ambiente dos testes.
     *
     * Valores próprios, e NÃO o `.env.local` da máquina. Três motivos: o teste
     * roda igual em qualquer computador e na integração contínua; nenhuma
     * credencial real entra no processo de teste; e o teste não passa a
     * depender de um arquivo que está no `.gitignore` e pode simplesmente não
     * existir.
     *
     * A chave de criptografia é 32 bytes em base64 porque `ambiente.ts` confere
     * o tamanho — chave curta é chave fraca, e cifrar credencial com ela dá
     * falsa sensação de proteção.
     *
     * A Homefin fica DESLIGADA de propósito: o teste do cliente exercita as
     * funções puras, e nenhum teste pode alcançar a rede.
     */
    env: {
      NEXT_PUBLIC_URL_APP: 'http://localhost:3000',
      NEXT_PUBLIC_SUPABASE_URL: 'https://teste.supabase.co',
      NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA: 'sb_publishable_teste_0000000000000000',
      SUPABASE_CHAVE_SERVICO: 'chave-de-servico-de-teste',
      CHAVE_CRIPTOGRAFIA_SEGREDOS: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      SEGREDO_SESSAO_PORTAL: 'segredo-de-portal-para-teste',
    },

    coverage: {
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/server/**', 'src/dominio/**'],
    },
  },
});
