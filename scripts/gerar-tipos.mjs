/**
 * Gera `src/lib/supabase/tipos-banco.ts` a partir do schema real do banco.
 *
 * Os tipos NÃO são escritos à mão. Tipo escrito à mão mente: ele continua
 * compilando depois de uma migração que mudou a coluna, e o erro só aparece em
 * produção. Regenerar depois de cada migração é obrigatório.
 *
 * O ARQUIVO TEM DUAS PARTES, E SÓ UMA É GERADA
 *
 * O fim do arquivo traz a seção "APELIDOS DE DOMÍNIO", escrita à mão: são os
 * `LinhaPessoa`, `Papel`, `SituacaoImovel` que o resto do código importa, todos
 * DERIVADOS do tipo gerado. Uma versão anterior deste script sobrescrevia o
 * arquivo inteiro e apagava essa seção — o desenvolvedor rodava `npm run
 * db:types`, ganhava dezenas de erros de importação sem relação aparente com o
 * que tinha acabado de fazer, e perdia a tarde.
 *
 * Agora o script recorta: substitui só o miolo gerado e recoloca o cabeçalho e
 * os apelidos por cima.
 *
 * Uso:
 *   npx supabase login
 *   npm run db:types
 *
 * Sem a CLI da Supabase, use o painel (Project Settings > API > generate types)
 * e cole a saída num arquivo; depois rode:
 *   node scripts/gerar-tipos.mjs --de=caminho/para/o-arquivo.ts
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const REF = 'cdwcvbrcwyvvpjaqydmq'; // Agilliza Corretor Imob 1.0
const DESTINO = 'src/lib/supabase/tipos-banco.ts';

/**
 * A plataforma administrativa é uma aplicação separada, com `node_modules`
 * próprio, e não consegue importar de fora da própria pasta. Ela recebe uma
 * CÓPIA — gerada aqui, nunca editada à mão.
 *
 * Copiar é pior que compartilhar, e melhor que divergir: com duas fontes, um
 * schema mudado deixaria o console compilando e mentindo.
 */
const DESTINO_ADMIN = 'admin/src/lib/tipos-banco.ts';

/** Onde começa o tipo gerado. */
const INICIO_GERADO = 'export type Json';
/** Onde começa a parte escrita à mão. */
const MARCA_APELIDOS = '// APELIDOS DE DOM';

const CABECALHO_PADRAO = `// ARQUIVO GERADO — não editar à mão.
// Fonte: schema do projeto Supabase ${REF} (Agilliza Corretor Imob 1.0)
// Regenerar com \`npm run db:types\` depois de CADA migração.
//
// Escrever este tipo à mão foi tentado e não funciona: o cliente Supabase 2.117
// tem um contrato interno estreito (marcador \`__InternalSupabase\`, formato exato
// de \`Views\`, \`Relationships\` populado) e qualquer desvio faz TODAS as linhas e
// RPCs resolverem para \`never\`, com mensagens de erro que não apontam para a
// causa. Use sempre a saída do gerador.

`;

function obterTiposGerados() {
  const deArquivo = process.argv.find((a) => a.startsWith('--de='));
  if (deArquivo) {
    return readFileSync(deArquivo.slice('--de='.length), 'utf8');
  }

  return execFileSync(
    'npx',
    ['supabase', 'gen', 'types', 'typescript', '--project-id', REF, '--schema', 'public'],
    { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 },
  );
}

/** Tira cerca de markdown e embrulho JSON, que aparecem quando a saída vem do painel. */
function limpar(bruto) {
  let texto = bruto.trim();

  if (texto.startsWith('{')) {
    const objeto = JSON.parse(texto);
    for (const chave of ['types', 'content', 'result', 'data']) {
      if (typeof objeto[chave] === 'string') {
        texto = objeto[chave];
        break;
      }
    }
  }

  return texto.replace(/```typescript/g, '').replace(/```ts/g, '').replace(/```/g, '');
}

try {
  const gerado = limpar(obterTiposGerados());

  const inicio = gerado.indexOf(INICIO_GERADO);
  if (inicio < 0) {
    throw new Error(
      `A saída do gerador não contém "${INICIO_GERADO}". ` +
        'Ela veio vazia ou num formato inesperado — confira se a CLI está autenticada.',
    );
  }

  let miolo = gerado.slice(inicio);
  // `Constants` traz os valores dos enums em tempo de execução. Não usamos, e
  // ele acrescenta ~4 KB ao pacote de quem importar este arquivo sem querer.
  const constantes = miolo.indexOf('export const Constants');
  if (constantes > 0) miolo = miolo.slice(0, constantes);
  miolo = miolo.trimEnd() + '\n';

  // Recupera as duas partes escritas à mão do arquivo atual.
  let cabecalho = CABECALHO_PADRAO;
  let apelidos = '';

  try {
    const atual = readFileSync(DESTINO, 'utf8');

    const inicioAtual = atual.indexOf(INICIO_GERADO);
    if (inicioAtual > 0) cabecalho = atual.slice(0, inicioAtual);

    const marca = atual.indexOf(MARCA_APELIDOS);
    if (marca > 0) {
      // Volta até o início da linha de traços que abre o bloco de comentário.
      const linhaAnterior = atual.lastIndexOf('// ---', marca);
      apelidos = atual.slice(linhaAnterior > 0 ? linhaAnterior : marca);
    }
  } catch {
    // Primeira geração: não existe arquivo anterior. Segue com o padrão.
  }

  if (!apelidos) {
    console.warn(
      'Aviso: a seção "APELIDOS DE DOMÍNIO" não foi encontrada no arquivo atual.\n' +
        'Se ela existia, NÃO salve este resultado — verifique o arquivo antes.',
    );
  }

  writeFileSync(DESTINO, cabecalho + miolo + '\n' + apelidos.trimEnd() + '\n', 'utf8');

  console.warn(
    `Tipos gravados em ${DESTINO} ` +
      `(${miolo.length} caracteres gerados, ${apelidos.length} preservados à mão).`,
  );

  // A cópia do console administrativo acompanha, senão as duas aplicações
  // passam a conhecer schemas diferentes do MESMO banco.
  if (existsSync('admin/src/lib')) {
    copyFileSync(DESTINO, DESTINO_ADMIN);
    console.warn(`Cópia gravada em ${DESTINO_ADMIN}.`);
  }
  console.warn('Rode `npm run typecheck` agora: é ele que aponta o que a migração quebrou.');
} catch (erro) {
  console.error('Falhou ao gerar os tipos.');
  console.error(String(erro.message ?? erro));
  console.error(
    '\nAlternativas:\n' +
      '  1. `npx supabase login` e rode de novo.\n' +
      '  2. Gere pelo painel (Project Settings > API > generate types), salve num\n' +
      '     arquivo e rode: node scripts/gerar-tipos.mjs --de=esse-arquivo.ts',
  );
  process.exitCode = 1;
}
