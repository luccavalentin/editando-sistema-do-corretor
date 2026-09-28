import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Marca } from '@/components/shell/marca';
import { sessaoDoPortal } from '@/server/portal/sessao';
import { FormularioDoPortal } from './formulario';

export const metadata: Metadata = {
  title: 'Acompanhe seu processo',
  // O portal do cliente não é para ser indexado: ele existe para quem já é
  // cliente, e o link chega pelo corretor.
  robots: { index: false, follow: false },
};

export default async function PaginaDoPortal() {
  // Já entrou antes e o cookie ainda vale: não faz sentido pedir o CPF de novo.
  if (await sessaoDoPortal()) redirect('/portal/inicio');

  return (
    <main id="conteudo" className="flex min-h-dvh flex-col justify-center bg-fundo px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Marca altura={40} prioritaria />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Acompanhe seu processo</h1>
            <p className="mt-1 text-sm text-texto-secundario">
              Veja os imóveis que separamos para você e como está seu financiamento.
            </p>
          </div>
        </div>

        <FormularioDoPortal />
      </div>
    </main>
  );
}
