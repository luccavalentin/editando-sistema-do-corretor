import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/**
 * Configuração plana do ESLint.
 *
 * NÃO usa `eslint-config-next`. Aquele pacote carrega o
 * `@rushstack/eslint-patch`, que instrumenta o ESLint por dentro para emular o
 * formato antigo de configuração — e falha com o ESLint 9, derrubando o lint
 * inteiro com "Failed to patch ESLint". Usar os plugins diretamente entrega as
 * mesmas regras sem depender de remendo em biblioteca de terceiro.
 */
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      // `admin/` é uma APLICAÇÃO SEPARADA, com tsconfig, dependências e
      // configuração próprias. Varrê-la a partir daqui faria o `@/*` dela
      // resolver para o `src/` deste projeto, e os erros apontariam para
      // arquivos que não têm nada de errado.
      'admin/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    plugins: {
      '@next/next': next,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // ---- Next: erros que só aparecem em produção ----
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,

      // ---- Hooks: dependência esquecida vira dado velho na tela ----
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ---- Acessibilidade verificada no lint, não na revisão ----
      // A seção 20 exige foco visível, alvo grande e interface que não dependa
      // só de cor. Estas regras pegam a parte que é automatizável: div com
      // onClick que o Tab não alcança, label sem campo, imagem sem alt.
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',

      // ---- TypeScript ----
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `any` desliga o compilador justamente onde ele é mais necessário.
      '@typescript-eslint/no-explicit-any': 'error',

      // ---- Geral ----
      // `console.log` esquecido em Server Action vaza dado de cliente para o log
      // do servidor. `warn` e `error` passam, porque são intencionais.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Testes e scripts rodam no Node, fora do navegador: podem imprimir, usar
  // tipos soltos e acessar `process`. Os globais são declarados aqui porque a
  // configuração base do ESLint assume navegador e não conhece nenhum deles.
  {
    files: ['tests/**/*.ts', 'scripts/**/*.mjs', 'vitest.config.ts'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
