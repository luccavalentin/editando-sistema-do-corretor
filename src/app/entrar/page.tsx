import type { Metadata } from 'next';

import { Marca } from '@/components/shell/marca';
import { FormularioDeEntrada } from './formulario';

export const metadata: Metadata = {
  title: 'Entrar',
};

const PROMESSAS = [
  'Prioridades do dia, não relatório para interpretar',
  'Financiamento antes da visita, não depois',
  'Histórico completo de cada pessoa, para sempre',
];

/**
 * Tela de entrada.
 *
 * O painel de marca à esquerda é a assinatura visual do Agilliza: azul-noite com
 * gradientes radiais e a textura de pontos de 22px. Ele desaparece abaixo de
 * 1024px — num celular aquele espaço pertence ao formulário, e o corretor
 * entrando às 7h no ônibus não precisa de decoração.
 */
export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string }>;
}) {
  const { destino } = await searchParams;

  return (
    <main id="conteudo" className="flex min-h-dvh">
      <div className="painel-marca relative hidden w-[46%] flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="textura-pontos" />

        <div className="relative flex flex-col gap-1.5">
          <Marca variante="negativa" altura={46} prioritaria />
          <p className="text-micro tracking-widest text-[#b9c0e8]">COMMAND CENTER</p>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white">
            O sistema operacional da sua carreira de corretor.
          </h1>
          <p className="mt-4 text-md leading-relaxed text-[#dfe3f7]">
            Organiza o dia, protege o histórico, acelera o atendimento e valida a capacidade de
            compra antes da visita.
          </p>
        </div>

        <ul className="relative flex flex-col gap-2.5 text-sm text-[#dfe3f7]">
          {PROMESSAS.map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <svg
                viewBox="0 0 24 24"
                className="size-4 shrink-0 text-[#93a6ff]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-grow items-center justify-center bg-fundo px-5 py-10">
        <div className="w-full max-w-sm">
          {/* Só no celular: no desktop a marca já está no painel ao lado, e
              repeti-la duas vezes na mesma tela é ruído. */}
          <div className="mb-8 lg:hidden">
            <Marca altura={38} prioritaria />
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Entrar na sua conta</h2>
          <p className="mb-7 mt-1.5 text-sm text-texto-secundario">
            Bem-vindo de volta. Vamos ver o que precisa da sua atenção hoje.
          </p>

          <FormularioDeEntrada destino={destino} />

          <p className="mt-8 text-xs leading-relaxed text-texto-apoio">
            Ao entrar você concorda com os termos de uso e com a política de privacidade. Seus dados
            e os dos seus clientes pertencem a você.
          </p>
        </div>
      </div>
    </main>
  );
}
