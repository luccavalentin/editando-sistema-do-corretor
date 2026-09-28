import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Marca } from '@/components/shell/marca';
import { Icone } from '@/components/shell/icones';
import { sessaoDoPortal } from '@/server/portal/sessao';
import { obterResumo } from '@/server/portal/dados';
import { sairDoPortal } from '@/server/acoes/portal-entrada';
import { SECOES_DO_TERMO } from '@/dominio/termo-do-portal';
import { primeiroNome } from '@/lib/formato';
import { ExcluirMeusDados } from './excluir';

export const metadata: Metadata = {
  title: 'Meus dados',
  robots: { index: false, follow: false },
};

export default async function PaginaDoPerfil() {
  const sessao = await sessaoDoPortal();
  if (!sessao) redirect('/portal');

  const resumo = await obterResumo(sessao.pessoaId);
  if (!resumo) redirect('/portal');
  if (!resumo.lgpdAceito) redirect('/portal/consentimento');

  return (
    <>
      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3.5 lg:px-6">
          <Link href="/portal/inicio">
            <Marca altura={26} prioritaria />
          </Link>
          <form action={sairDoPortal}>
            <button type="submit" className="text-sm font-semibold text-link hover:underline">
              Sair
            </button>
          </form>
        </div>
      </header>

      <main id="conteudo" className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 lg:px-6">
        <div>
          <Link
            href="/portal/inicio"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-link hover:underline"
          >
            <Icone nome="voltar" className="size-4" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Meus dados</h1>
          <p className="mt-0.5 text-sm text-texto-secundario">
            O que este portal sabe sobre você, e o que você pode fazer a respeito.
          </p>
        </div>

        <section className="rounded-xl border border-borda bg-superficie p-5">
          <h2 className="mb-3 font-semibold">Quem responde pelos seus dados</h2>
          <p className="text-sm text-texto-secundario">
            <strong className="text-texto">{resumo.corretorNome}</strong>
            {resumo.corretorCreci ? ` (${resumo.corretorCreci})` : ''}. A Agilliza fornece o
            sistema; os dados são tratados por quem atende você.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {resumo.corretorWhatsapp && (
              <a
                href={`https://wa.me/55${resumo.corretorWhatsapp}?text=${encodeURIComponent(
                  `Olá! Sou ${resumo.nome} e gostaria de falar sobre meus dados cadastrais.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-lg border border-borda px-4 text-sm font-semibold text-texto"
              >
                Falar no WhatsApp
              </a>
            )}
            {resumo.corretorEmail && (
              <a
                href={`mailto:${resumo.corretorEmail}?subject=${encodeURIComponent('Sobre meus dados cadastrais')}`}
                className="inline-flex h-10 items-center rounded-lg border border-borda px-4 text-sm font-semibold text-texto"
              >
                Enviar e-mail
              </a>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-borda bg-superficie p-5">
          <h2 className="mb-3 font-semibold">O que aparece aqui</h2>
          <dl className="flex flex-col gap-3">
            {SECOES_DO_TERMO.map((secao) => (
              <div key={secao.titulo}>
                <dt className="text-sm font-medium text-texto">{secao.titulo}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-texto-secundario">
                  {secao.corpo}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-borda bg-superficie p-5">
          <h2 className="mb-1 font-semibold">Seus direitos</h2>
          <p className="mb-4 text-sm text-texto-secundario">
            Para corrigir um dado ou pedir uma cópia completa, fale com{' '}
            {primeiroNome(resumo.corretorNome)} — é ele quem responde por eles. Abaixo você pode
            apagar o que é deste portal.
          </p>

          <ExcluirMeusDados nomeDoCorretor={primeiroNome(resumo.corretorNome)} />
        </section>
      </main>
    </>
  );
}
