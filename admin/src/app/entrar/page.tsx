import type { Metadata } from 'next';

import { FormularioDoConsole } from './formulario';

export const metadata: Metadata = { title: 'Entrar' };

export default function PaginaDeEntrada() {
  return (
    <main className="flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8">
          <p className="identificador mb-1 uppercase tracking-widest">Agilliza</p>
          <h1 className="text-2xl font-bold tracking-tight">Console da plataforma</h1>
          <p className="mt-1 text-sm text-texto-secundario">
            Acesso restrito à administração. Corretores usam o sistema em outro endereço.
          </p>
        </div>

        <FormularioDoConsole />

        {/* O aviso está aqui, e não depois de entrar: quem vai operar precisa
            saber ANTES que o que fizer fica registrado com o nome dele. */}
        <p className="mt-6 border-t border-borda pt-4 text-xs text-texto-apoio">
          Toda leitura de dados de uma conta é registrada com seu usuário, data e
          justificativa. O corretor pode consultar esse registro.
        </p>
      </div>
    </main>
  );
}
