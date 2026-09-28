/**
 * Build de produção, num diretório separado do `next dev`.
 *
 * POR QUE NÃO É SÓ `DIRETORIO_BUILD=.next-producao next build`
 *
 * Porque isso é sintaxe de shell POSIX. No Windows, `cmd` e o PowerShell não
 * aceitam a variável prefixada no comando — o script quebra na máquina onde o
 * projeto está sendo desenvolvido. A alternativa comum é somar o `cross-env`
 * às dependências; um invólucro de dez linhas evita a dependência e funciona
 * nos dois lados.
 *
 * O QUE ISTO RESOLVE
 *
 * `next dev` e `next build` usam o mesmo `.next` por padrão, e um apaga o
 * outro: sobe-se a produção para conferir algo, roda-se o `dev` para editar, e
 * o `server.js` do standalone desaparece. Aqui a produção escreve em
 * `.next-producao` e os dois convivem.
 *
 *   npm run build:producao
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const filho = spawn(
  process.execPath,
  [join(raiz, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build'],
  {
    cwd: raiz,
    stdio: 'inherit',
    env: { ...process.env, DIRETORIO_BUILD: process.env.DIRETORIO_BUILD ?? '.next-producao' },
  },
);

filho.on('exit', (codigo) => process.exit(codigo ?? 1));
