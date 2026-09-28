import type { Metadata } from 'next';
import Image from 'next/image';
import type { CSSProperties } from 'react';

import { Marca } from '@/components/shell/marca';
import { FormularioDeEntrada } from './formulario';

export const metadata: Metadata = {
  title: 'Entrar',
};

const PROMESSAS = [
  {
    titulo: 'Prioridades claras',
    texto: 'Saiba quem precisa da sua atenção antes de abrir qualquer relatório.',
  },
  {
    titulo: 'Jornada inteligente',
    texto: 'Financiamento, histórico e próximos passos conectados em uma única visão.',
  },
  {
    titulo: 'Relacionamento que escala',
    texto: 'Cada contato vira contexto para decisões melhores e conversas mais relevantes.',
  },
];

/**
 * Tela de entrada da Agilliza.
 *
 * Importante: esta página é exclusivamente visual. O fluxo de autenticação,
 * destino pós-login e tratamento de erros permanecem em FormularioDeEntrada
 * e em acoes.ts sem qualquer alteração de regra de negócio.
 */
export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string }>;
}) {
  const { destino } = await searchParams;

  return (
    <main id="conteudo" className="relative min-h-dvh overflow-hidden bg-fundo">
      <div className="pointer-events-none absolute inset-0 login-aurora" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 login-grade" aria-hidden="true" />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1800px] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden min-h-dvh overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14 2xl:p-16">
          <div className="absolute inset-0 login-painel-imagem">
            <Image
              src="/marca/abertura.jpg"
              alt=""
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1024px) 55vw, 0px"
            />
            <div className="absolute inset-0 login-overlay-imagem" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="rounded-[1.4rem] border border-white/12 bg-white/8 px-5 py-4 backdrop-blur-xl">
              <Marca variante="negativa" altura={44} prioritaria />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/75 backdrop-blur-xl">
              <span className="size-1.5 rounded-full bg-[#93a6ff] shadow-[0_0_16px_rgba(147,166,255,.9)]" />
              Revenue Workspace
            </div>
          </div>

          <div className="relative z-10 max-w-2xl pb-4 xl:pb-8">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur-xl">
              Tecnologia para transformar relacionamento em receita
            </div>

            <h1 className="max-w-xl text-[clamp(2.8rem,4.8vw,5.6rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-white">
              Venda melhor.
              <span className="mt-1 block text-[#b8c4ff]">Decida mais cedo.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[clamp(1rem,1.35vw,1.25rem)] leading-relaxed text-white/72">
              Um ambiente de trabalho desenhado para conectar atenção, contexto e oportunidade —
              sem transformar seu dia em uma sequência de telas.
            </p>

            <div className="mt-10 grid gap-3 xl:grid-cols-3">
              {PROMESSAS.map((item, indice) => (
                <div
                  key={item.titulo}
                  className="login-beneficio group rounded-[1.35rem] border border-white/12 bg-white/8 p-4 backdrop-blur-xl"
                  style={{ '--login-delay': `${indice * 90}ms` } as CSSProperties}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-[0.18em] text-white/45">
                      0{indice + 1}
                    </span>
                    <span className="h-px w-8 bg-white/20 transition-all duration-300 group-hover:w-12 group-hover:bg-white/45" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">{item.titulo}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-white/58">{item.texto}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/40">
            <span>Agilliza Tech</span>
            <span>Clareza que movimenta negócios</span>
          </div>
        </section>

        <section className="relative flex min-h-dvh items-center justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
          <div className="pointer-events-none absolute -right-24 top-[-5rem] size-[28rem] rounded-full bg-acao/8 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-28 left-10 size-[24rem] rounded-full bg-acao/6 blur-3xl" aria-hidden="true" />

          <div className="relative w-full max-w-[31rem] login-entrada">
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <Marca altura={40} prioritaria />
              <span className="rounded-full border border-borda bg-superficie/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-texto-apoio shadow-baixa backdrop-blur-lg">
                Acesso seguro
              </span>
            </div>

            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-acao-sutil px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-acao-sutil-texto">
                <span className="size-1.5 rounded-full bg-acao" />
                Seu command center
              </div>
              <h2 className="text-[clamp(2.25rem,5vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-texto">
                Bem-vindo de volta.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-texto-secundario sm:text-[15px]">
                Entre para continuar exatamente de onde parou e transformar as próximas ações em
                movimento de receita.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-borda-sutil bg-superficie/92 p-5 shadow-[var(--sombra-marca)] backdrop-blur-xl sm:p-7">
              <FormularioDeEntrada destino={destino} />
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-borda-sutil bg-superficie-afundada/70 px-4 py-3.5">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-acao-sutil text-acao-sutil-texto">
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-xs leading-relaxed text-texto-apoio">
                Seus dados e os dos seus clientes permanecem protegidos. Ao entrar, você concorda
                com os termos de uso e a política de privacidade.
              </p>
            </div>

            <p className="mt-8 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-desabilitado">
              Agilliza · tecnologia para operações imobiliárias
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
