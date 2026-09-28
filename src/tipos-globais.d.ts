/**
 * Declarações globais de tipos.
 *
 * Dois ajustes mínimos, sem efeito em tempo de execução:
 *
 * 1. Importar CSS por efeito colateral (`import '@/styles/globals.css'`) é
 *    entendido pelo empacotador, mas não pelo TypeScript — daí o módulo curinga.
 * 2. O cliente Supabase gerado lê `import.meta.env`, que o `next-env.d.ts` não
 *    declara.
 */

declare module '*.css';

interface ImportMetaEnv {
  readonly [chave: string]: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
