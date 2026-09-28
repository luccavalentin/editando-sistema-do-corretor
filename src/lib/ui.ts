import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Junta classes resolvendo conflito do Tailwind.
 *
 * Sem o `twMerge`, passar `className="p-2"` para um componente que já tem `p-4`
 * gera as duas classes e quem ganha depende da ordem no CSS final — ou seja, do
 * acaso. Com ele, a última vence de forma previsível, que é o que a pessoa
 * escrevendo o componente espera.
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
