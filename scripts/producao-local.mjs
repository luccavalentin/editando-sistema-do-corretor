/**
 * Sobe o build de produção nesta máquina, para conferir o que só aparece fora
 * do modo de desenvolvimento.
 *
 * POR QUE ISTO EXISTE
 *
 * `next start` NÃO funciona com `output: 'standalone'` — ele avisa e serve um
 * 500 em toda rota. Quem usa standalone precisa rodar `.next/standalone/server.js`,
 * e esse servidor não copia sozinho os estáticos: sem os dois `cp` abaixo, a
 * página carrega sem CSS e sem JS, o que parece um erro de estilo e não é.
 *
 * O Dockerfile já faz essas cópias. Este script é o equivalente local, para
 * não precisar de Docker só para responder "isso também acontece em produção?".
 *
 *   node --env-file=.env.local scripts/producao-local.mjs
 */

import { cp, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.env.DIRETORIO_BUILD ?? '.next-producao';
const standalone = join(raiz, dir, 'standalone');

try {
  await access(join(standalone, 'server.js'));
} catch {
  console.error(`Build standalone não encontrado em ${dir}/. Rode \`npm run build:producao\` antes.`);
  process.exit(1);
}

// Os estáticos: o servidor standalone os serve, mas o build não os move.
await cp(join(raiz, dir, 'static'), join(standalone, dir, 'static'), { recursive: true });
await cp(join(raiz, 'public'), join(standalone, 'public'), { recursive: true });

process.env.PORT ??= '3200';
process.env.HOSTNAME ??= 'localhost';

// O servidor resolve caminhos a partir do diretório de trabalho.
process.chdir(standalone);
// `pathToFileURL`: no Windows, import() de caminho absoluto sem file:// é
// lido como se 'c:' fosse um protocolo, e o loader recusa.
await import(pathToFileURL(join(standalone, 'server.js')).href);
