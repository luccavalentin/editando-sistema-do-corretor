import Link from 'next/link';

import { exigirAdmin } from '@/server/sessao';
import { sairDoConsole } from '../entrar/acoes';

const MENU = [
  { rotulo: 'Visão geral', href: '/' },
  { rotulo: 'Contas', href: '/contas' },
  { rotulo: 'Auditoria', href: '/auditoria' },
];

export default async function LayoutDoConsole({ children }: { children: React.ReactNode }) {
  const sessao = await exigirAdmin();

  return (
    <div className="min-h-dvh">
      {/* ------------------------------------------------------------------
          A FAIXA. Ela existe porque este console mostra dados de contas de
          terceiros, e a pior confusão possível é achar que se está no sistema
          de um corretor quando se está olhando o de outro. Ela não some, não
          fecha e não depende de scroll.
      ------------------------------------------------------------------- */}
      <div className="faixa-atencao px-4 py-1.5 text-center text-xs font-semibold text-white">
        Console da plataforma — você está vendo dados de contas de clientes. Tudo é registrado.
      </div>

      <header className="console-vidro sticky top-0 z-20 border-b border-borda">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 lg:px-6">
          <Link href="/" className="text-sm font-bold tracking-tight">
            Agilliza <span className="text-texto-apoio">console</span>
          </Link>

          <nav aria-label="Navegação do console" className="flex flex-grow gap-1">
            {MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[--radius-padrao] px-3 py-1.5 text-sm text-texto-secundario transition-[background-color,color,transform] hover:bg-superficie-alta hover:text-texto active:scale-[0.98]"
              >
                {item.rotulo}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-xs text-texto-apoio">{sessao.email}</span>
            <form action={sairDoConsole}>
              <button
                type="submit"
                className="rounded-[--radius-padrao] px-2 py-1 text-xs font-semibold text-acento transition-[background-color,transform] hover:bg-acento-sutil active:scale-[0.98]"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main id="conteudo" className="console-entrada mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
        {children}
      </main>
    </div>
  );
}
