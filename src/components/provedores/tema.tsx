'use client';

import { ThemeProvider } from 'next-themes';

/**
 * Tema claro e escuro.
 *
 * `attribute="class"` porque o design system usa `@custom-variant dark` ligado à
 * classe `dark` no <html>.
 *
 * `disableTransitionOnChange` evita o piscar de 300ms em que metade da tela já
 * é escura e a outra ainda é clara — o pior efeito visual possível num painel
 * cheio de cartões.
 *
 * NOTA DE DIVERGÊNCIA: o CRM Agilliza mantém o conteúdo branco no modo escuro e
 * escurece apenas o menu. Aqui o tema escuro é completo, porque a seção 20 do
 * documento exige "suporte completo a tema claro e escuro". Para voltar ao
 * comportamento do Agilliza, basta não aplicar a classe `dark` fora do menu.
 */
export function ProvedorTema({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
