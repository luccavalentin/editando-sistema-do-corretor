/**
 * Gera os ícones do app e do PWA a partir do símbolo OFICIAL.
 *
 * O QUE DEU ERRADO ANTES, E POR QUE ESTE ARQUIVO EXISTE
 *
 * O ícone anterior tinha só o telhado vermelho. O símbolo da Agilliza são DUAS
 * peças — o telhado e o "g" — e um recorte que ficou guardado em
 * `agilliza-simbolo.png` tinha decepado o "g". A partir dele, tudo que foi
 * gerado herdou a marca pela metade: o favicon, o ícone do iOS e o símbolo do
 * menu recolhido.
 *
 * Marca não se recorta a olho. Por isso este script parte sempre dos arquivos
 * oficiais em `public/marca/`, e nunca redimensiona um ícone já gerado.
 *
 * QUAL VARIANTE EM QUAL FUNDO
 *
 * O ícone do app tem fundo azul profundo da marca. Sobre azul, o "g" azul
 * desapareceria — então entra a NEGATIVA, que traz o "g" branco. É a mesma
 * regra que o componente `<Marca>` aplica nas telas.
 *
 * ANY E MASKABLE SÃO DESENHOS DIFERENTES, NÃO TAMANHOS
 *
 *   any       o símbolo com respiro normal, para onde o ícone aparece inteiro
 *   maskable  o mesmo símbolo menor, porque o Android recorta na forma que o
 *             fabricante quiser e só garante o círculo central de 80% do lado
 *
 * Gerar só o `any` e declará-lo como maskable é o erro comum: em metade dos
 * aparelhos o telhado fica cortado.
 *
 *   node scripts/gerar-icones-pwa.mjs
 */

import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const marca = join(raiz, 'public', 'marca');
const destino = join(raiz, 'public', 'icones');

/** Negativa: "g" branco, para sobreviver ao fundo azul. */
const SIMBOLO = join(marca, 'agilliza-simbolo-negativa.png');

/** Medido na logo oficial, não estimado. Ver `referencia-visual-agilliza`. */
const AZUL_PROFUNDO = { r: 0x0b, g: 0x10, b: 0x9f, alpha: 1 };

/**
 * Quanto do lado o símbolo ocupa em altura.
 *
 * O símbolo é alto (proporção 0.52), então quem manda é a altura. Em `any` o
 * respiro é o de um ícone comum; em `maskable` ele encolhe para caber no
 * círculo central de 80% mesmo depois do recorte mais agressivo.
 */
const OCUPACAO = { any: 0.72, maskable: 0.54 };

async function gerar(lado, modo, arquivo) {
  const altura = Math.round(lado * OCUPACAO[modo]);

  const simbolo = await sharp(SIMBOLO)
    .resize({ height: altura, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: lado, height: lado, channels: 4, background: AZUL_PROFUNDO },
  })
    .composite([{ input: simbolo, gravity: 'center' }])
    .png()
    .toFile(arquivo);

  return arquivo;
}

await mkdir(destino, { recursive: true });

const feitos = [];

// Ícones do manifest.
for (const lado of [192, 512]) {
  feitos.push(await gerar(lado, 'any', join(destino, `icone-${lado}.png`)));
  feitos.push(await gerar(lado, 'maskable', join(destino, `icone-${lado}-maskable.png`)));
}

// Os que o Next serve pelas convenções de `src/app/`: favicon e ícone do iOS.
// O iOS não aplica máscara — ele arredonda sozinho —, então usa o desenho `any`.
feitos.push(await gerar(512, 'any', join(raiz, 'src', 'app', 'icon.png')));
feitos.push(await gerar(180, 'any', join(raiz, 'src', 'app', 'apple-icon.png')));

for (const f of feitos) console.log('  ' + f.replace(raiz + '\\', '').replace(raiz + '/', ''));
console.log(`\n${feitos.length} ícones gerados a partir do símbolo completo.`);
