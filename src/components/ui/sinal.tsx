import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/ui';
import type { Temperatura } from '@/lib/supabase/tipos-banco';

/**
 * Etiqueta de estado.
 *
 * A seção 20 proíbe interface que dependa apenas de cor. Por isso todo chip
 * carrega TEXTO — e os de temperatura carregam ícone também. Um daltônico lê
 * "QUENTE" onde outra pessoa lê vermelho.
 */
const variantesChip = cva(
  'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
  {
    variants: {
      tom: {
        neutro: 'bg-superficie-afundada text-texto-secundario',
        acao: 'bg-acao-sutil text-acao-sutil-texto',
        sucesso: 'bg-sucesso-sutil text-sucesso-texto',
        atencao: 'bg-atencao-sutil text-atencao-texto',
        perigo: 'bg-perigo-sutil text-perigo-texto',
        frio: 'bg-frio-sutil text-frio-texto',
      },
      tamanho: {
        pequeno: 'px-2 py-0.5 text-micro tracking-wide',
        medio: 'px-2.5 py-1 text-xs',
      },
    },
    defaultVariants: { tom: 'neutro', tamanho: 'pequeno' },
  },
);

export interface PropsChip
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof variantesChip> {}

export function Chip({ className, tom, tamanho, children, ...props }: PropsChip) {
  return (
    <span className={cn(variantesChip({ tom, tamanho }), className)} {...props}>
      {children}
    </span>
  );
}

const ICONE_TEMPERATURA: Record<Temperatura, React.ReactNode> = {
  // Chama.
  quente: (
    <svg viewBox="0 0 24 24" className="size-3" fill="currentColor" aria-hidden="true">
      <path d="M12 2c2 4 5 5 5 9a5 5 0 0 1-10 0c0-4 3-5 5-9z" />
    </svg>
  ),
  // Traço horizontal: "estável".
  morno: (
    <svg
      viewBox="0 0 24 24"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
    >
      <path d="M4 12h16" />
    </svg>
  ),
  // Floco.
  frio: (
    <svg
      viewBox="0 0 24 24"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 4v16M4 12h16M6 6l12 12M18 6L6 18" />
    </svg>
  ),
};

const TOM_TEMPERATURA: Record<Temperatura, PropsChip['tom']> = {
  quente: 'perigo',
  morno: 'atencao',
  frio: 'frio',
};

const ROTULO_TEMPERATURA: Record<Temperatura, string> = {
  quente: 'QUENTE',
  morno: 'MORNO',
  frio: 'FRIO',
};

/** Chip de temperatura: cor + ícone + texto, sempre os três juntos. */
export function ChipTemperatura({
  temperatura,
  className,
}: {
  temperatura: Temperatura;
  className?: string;
}) {
  return (
    <Chip tom={TOM_TEMPERATURA[temperatura]} className={className}>
      {ICONE_TEMPERATURA[temperatura]}
      {ROTULO_TEMPERATURA[temperatura]}
    </Chip>
  );
}

/**
 * Bloco de carregamento.
 *
 * Obrigatório pela seção 20 em toda área que carrega. A utilidade `esqueleto`
 * está em globals.css e já traz o brilho que atravessa na direção da leitura.
 *
 * Importante: o esqueleto imita a FORMA do conteúdo que vem. Um retângulo
 * genérico no lugar de uma tabela faz a página "saltar" quando o dado chega, e
 * salto de layout é pior que espera.
 */
export function Esqueleto({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('esqueleto h-4 w-full', className)} {...props} />;
}

/** Várias linhas de esqueleto, com a última mais curta, como texto real. */
export function EsqueletoTexto({ linhas = 3, className }: { linhas?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} role="status" aria-live="polite">
      <span className="so-leitor">Carregando</span>
      {Array.from({ length: linhas }, (_, i) => (
        <Esqueleto key={i} className={i === linhas - 1 ? 'w-3/5' : undefined} />
      ))}
    </div>
  );
}

/** Ponto colorido com rótulo textual ao lado. Para legenda de gráfico. */
export function Legenda({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-texto-secundario">
      <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: cor }} />
      {children}
    </span>
  );
}
