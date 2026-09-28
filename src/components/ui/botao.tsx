import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/ui';

/**
 * Botão do sistema.
 *
 * Nenhuma cor crua aqui: só token semântico. É a regra herdada do CRM Agilliza,
 * e é ela que permite trocar o tema inteiro sem tocar em componente.
 *
 * A variante `perigo` usa `perigo-forte` e não `perigo`: a cor oficial de alerta
 * (#C8102E) já passa em AA com texto branco, mas o token `-forte` existe para
 * garantir que a regra continue valendo se a paleta mudar. Botão de excluir com
 * texto ilegível é um acidente esperando acontecer.
 */
const variantes = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg',
    'toque-premium font-semibold',
    // Duração curta e curva sem overshoot: a seção 20 pede movimento discreto.
    'duration-150 ease-padrao',
    // O anel de foco é global (globals.css). Aqui só garantimos o deslocamento.
    'focus-visible:outline-offset-2',
    // Desabilitado não some: fica visivelmente inativo, com cursor coerente.
    'disabled:cursor-not-allowed disabled:opacity-60',
    // Ícone dentro do botão nunca encolhe nem intercepta o clique.
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      tipo: {
        principal: 'bg-acao text-acao-texto hover:bg-acao-hover active:bg-acao-ativa',
        secundario:
          'border border-acao bg-superficie text-link hover:bg-acao-sutil',
        neutro:
          'border border-borda bg-superficie text-texto hover:bg-superficie-hover',
        fantasma: 'text-link hover:bg-acao-sutil',
        perigo: 'bg-perigo-forte text-acao-texto hover:brightness-95 active:brightness-90',
        // Texto sobre âmbar é grafite, nunca branco: branco sobre #EAB308 dá
        // 1.92:1 e reprova em AA.
        atencao: 'bg-atencao text-atencao-contraste hover:brightness-95',
      },
      tamanho: {
        pequeno: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        medio: 'h-9 px-4 text-base [&_svg]:size-4',
        grande: 'h-11 px-5 text-md [&_svg]:size-5',
        // Quadrado, para botão só de ícone. Sempre com aria-label.
        icone: 'size-9 [&_svg]:size-4',
        iconeGrande: 'size-11 [&_svg]:size-5',
      },
      larguraTotal: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      tipo: 'principal',
      tamanho: 'medio',
    },
  },
);

export interface PropsBotao
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variantes> {
  /**
   * Renderiza o filho em vez de <button>, herdando o estilo.
   * Use para transformar um <Link> em botão sem aninhar elemento clicável
   * dentro de elemento clicável, que quebra a navegação por teclado.
   */
  comoFilho?: boolean;
  'data-haptico'?: 'leve' | 'confirmacao' | 'erro' | 'selecao';
}

export const Botao = forwardRef<HTMLButtonElement, PropsBotao>(function Botao(
  {
    className,
    tipo,
    tamanho,
    larguraTotal,
    comoFilho = false,
    type,
    'data-haptico': dataHaptico = 'leve',
    ...props
  },
  ref,
) {
  const Componente = comoFilho ? Slot : 'button';

  return (
    <Componente
      ref={ref}
      // Botão sem `type` dentro de formulário submete por padrão. Já mordeu
      // gente suficiente: o padrão aqui é `button`, e quem quer submeter diz.
      type={comoFilho ? undefined : (type ?? 'button')}
      data-haptico={dataHaptico}
      className={cn(variantes({ tipo, tamanho, larguraTotal }), className)}
      {...props}
    />
  );
});
