import Image from 'next/image';

import { cn } from '@/lib/ui';

/**
 * A marca Agilliza.
 *
 * Existe como componente para haver UM lugar que decide qual arquivo entra em
 * qual fundo. A regra é simples e é onde as marcas costumam se estragar: sobre
 * fundo escuro entra a versão negativa, sobre fundo claro entra a colorida.
 * Espalhar `<img src="...">` pelas telas garante que, em seis meses, alguém use
 * a azul sobre o menu azul e a logo suma.
 *
 * SOBRE OS ARQUIVOS
 *
 * São PNG, e não SVG, por uma razão honesta: o conjunto oficial traz vetor em
 * .ai, .eps e .pdf, e não há como convertê-los para SVG aqui sem redesenhar a
 * marca à mão. Redesenhar seria inventá-la. O PNG de 720 px de largura cobre
 * qualquer uso de interface com folga, e o `next/image` serve WebP nos
 * navegadores que aceitam.
 *
 * Quando houver um SVG oficial, é trocar os arquivos em `public/marca/` — os
 * nomes são estáveis e nenhuma tela precisa mudar.
 */

/** Proporções reais dos arquivos, para o navegador reservar o espaço certo. */
const HORIZONTAL = { largura: 720, altura: 262 };

/**
 * O símbolo é ALTO, não largo: 930 × 1785.
 *
 * Aqui já houve um erro caro. Estes números eram `407 × 185` — a proporção de
 * um recorte que continha só o telhado, com o "g" decepado. Como todo ícone
 * saía desse arquivo, a marca foi para o favicon, para o ícone do iOS e para o
 * menu recolhido pela metade.
 */
const SIMBOLO = { largura: 930, altura: 1785 };

export function Marca({
  variante = 'colorida',
  altura = 34,
  className,
  prioritaria = false,
}: {
  /** `negativa` para fundo escuro — menu, painel de entrada, rodapé azul. */
  variante?: 'colorida' | 'negativa';
  /** Altura em pixels. A largura acompanha a proporção do arquivo. */
  altura?: number;
  className?: string;
  prioritaria?: boolean;
}) {
  const largura = Math.round((altura * HORIZONTAL.largura) / HORIZONTAL.altura);

  return (
    <Image
      src={
        variante === 'negativa'
          ? '/marca/agilliza-horizontal-negativa.png'
          : '/marca/agilliza-horizontal.png'
      }
      // O texto alternativo é o NOME, não "logo da Agilliza": quem usa leitor
      // de tela ouve o nome da empresa, que é a informação. "Logo" é ruído.
      alt="Agilliza"
      width={largura}
      height={altura}
      priority={prioritaria}
      className={cn('h-auto w-auto select-none', className)}
      style={{ height: altura, width: largura }}
    />
  );
}

/**
 * O símbolo: o telhado e o "g", juntos.
 *
 * Para onde a marca inteira não cabe — o menu recolhido, o ícone de uma aba, um
 * selo. São DUAS peças, e é isso que torna o símbolo reconhecível: o telhado
 * sozinho não é a marca da Agilliza, é um acento solto.
 *
 * A mesma regra de fundo do `<Marca>` vale aqui, e por um motivo mais concreto:
 * a versão colorida tem o "g" AZUL. Sobre o menu azul ele simplesmente some, e
 * sobra o telhado — o erro exato que este componente já cometeu. Sobre fundo
 * escuro, `negativa`, que traz o "g" branco.
 */
export function SimboloDaMarca({
  variante = 'colorida',
  altura = 28,
  className,
}: {
  /** `negativa` para fundo escuro — sem isso o "g" desaparece. */
  variante?: 'colorida' | 'negativa';
  /** Altura em pixels. A largura acompanha a proporção do arquivo. */
  altura?: number;
  className?: string;
}) {
  const largura = Math.round((altura * SIMBOLO.largura) / SIMBOLO.altura);

  return (
    <Image
      src={
        variante === 'negativa'
          ? '/marca/agilliza-simbolo-negativa.png'
          : '/marca/agilliza-simbolo.png'
      }
      alt="Agilliza"
      width={largura}
      height={altura}
      className={cn('select-none', className)}
      style={{ height: altura, width: largura }}
    />
  );
}
