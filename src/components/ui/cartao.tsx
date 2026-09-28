import { cn } from '@/lib/ui';

/**
 * Superfície elevada. "Profundidade sutil", nunca sombra pesada (seção 20).
 */
export function Cartao({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'cartao-premium rounded-xl bg-superficie',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CartaoCabecalho({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-3 border-b border-borda px-5 py-3.5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CartaoTitulo({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('flex-grow text-lg font-semibold', className)} {...props}>
      {children}
    </h2>
  );
}

export function CartaoCorpo({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  );
}
