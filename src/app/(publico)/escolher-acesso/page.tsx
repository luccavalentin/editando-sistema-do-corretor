import type { Metadata } from 'next';
import Link from 'next/link';

import { Marca } from '@/components/shell/marca';
import { Icone } from '@/components/shell/icones';

export const metadata: Metadata = {
  title: 'Escolha seu acesso',
  robots: { index: false, follow: false },
};

/**
 * A porta de entrada.
 *
 * O PROBLEMA QUE ELA RESOLVE
 *
 * O sistema tem duas entradas nesta aplicação, e o cliente não tem como saber
 * disso. O corretor manda "acessa lá o sistema" com o endereço principal; o
 * comprador chega, vê um formulário pedindo e-mail e senha, e não tem nem uma
 * coisa nem outra. Ele desiste e liga — que é justamente o telefonema que o
 * portal existe para evitar.
 *
 * Duas portas, e não três: o console da plataforma é outra aplicação, em outro
 * domínio, e não se anuncia. Quem precisa dele sabe o endereço.
 */

const ACESSOS = [
  {
    titulo: 'Sou corretor',
    descricao: 'Clientes, imóveis, financiamento e seu portfólio público.',
    href: '/entrar',
    icone: 'maleta' as const,
    nota: 'Entra com e-mail e senha',
  },
  {
    titulo: 'Sou cliente',
    descricao: 'Acompanhe os imóveis que separaram para você e seu financiamento.',
    href: '/portal',
    icone: 'pessoas' as const,
    nota: 'Entra com CPF e data de nascimento, sem senha',
  },
];

export default function EscolherAcesso() {
  return (
    <main id="conteudo" className="flex min-h-dvh flex-col justify-center bg-fundo px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Marca altura={44} prioritaria />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Como você quer entrar?</h1>
            <p className="mt-1 text-sm text-texto-secundario">
              São dois acessos diferentes. Escolha o seu.
            </p>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACESSOS.map((acesso) => (
            <li key={acesso.href}>
              <Link
                href={acesso.href}
                className="flex h-full flex-col gap-2 rounded-xl border border-borda bg-superficie p-5 transition-colors hover:border-acao hover:bg-superficie-hover"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-acao-sutil">
                  <Icone nome={acesso.icone} className="size-5 text-acao-sutil-texto" />
                </span>

                <span className="mt-1 block text-lg font-bold text-texto">{acesso.titulo}</span>
                <span className="block text-sm leading-relaxed text-texto-secundario">
                  {acesso.descricao}
                </span>

                {/* Dizer COMO se entra é o que evita a pessoa escolher errado,
                    tentar, falhar e desistir. */}
                <span className="mt-auto block pt-2 text-xs text-texto-apoio">{acesso.nota}</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-xs text-texto-apoio">
          É cliente e não consegue entrar? Seu corretor precisa liberar seu acesso primeiro.
        </p>
      </div>
    </main>
  );
}
