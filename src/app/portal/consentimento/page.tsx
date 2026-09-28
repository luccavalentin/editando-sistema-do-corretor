import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Marca } from '@/components/shell/marca';
import { sessaoDoPortal } from '@/server/portal/sessao';
import { obterResumo } from '@/server/portal/dados';
import { SECOES_DO_TERMO, VERSAO_DO_TERMO } from '@/dominio/termo-do-portal';
import { FormularioDoTermo } from './formulario';

export const metadata: Metadata = {
  title: 'Antes de começar',
  robots: { index: false, follow: false },
};

/**
 * O portão de consentimento.
 *
 * Aparece uma vez, no primeiro acesso, e é a única tela do portal que não pode
 * ser pulada. A LGPD exige que o titular saiba o que é tratado e por quem —
 * e aqui há uma informação que ele quase sempre não tem: quem responde pelos
 * dados dele é o CORRETOR, não a Agilliza.
 */
export default async function PaginaDoConsentimento() {
  const sessao = await sessaoDoPortal();
  if (!sessao) redirect('/portal');

  const resumo = await obterResumo(sessao.pessoaId);
  if (!resumo) redirect('/portal');

  // Já aceitou: não faz sentido mostrar de novo, e voltar aqui pelo histórico
  // do navegador não pode travar quem já passou.
  if (resumo.lgpdAceito) redirect('/portal/inicio');

  return (
    <main id="conteudo" className="mx-auto w-full max-w-2xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Marca altura={34} prioritaria />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Antes de começar</h1>
          <p className="mt-1 text-sm text-texto-secundario">
            Leia como seus dados são tratados. Leva um minuto e você só precisa fazer isso uma
            vez.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-borda bg-superficie p-5">
        <dl className="flex flex-col gap-4">
          {SECOES_DO_TERMO.map((secao) => (
            <div key={secao.titulo}>
              <dt className="font-semibold text-texto">{secao.titulo}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-texto-secundario">{secao.corpo}</dd>
            </div>
          ))}
        </dl>

        {/* Quem é o responsável fica DEPOIS do termo e com o nome real, não
            "seu corretor": o titular precisa saber a quem recorrer. */}
        <p className="mt-5 rounded-lg bg-superficie-afundada px-4 py-3 text-sm text-texto-secundario">
          Neste portal, quem responde pelos seus dados é{' '}
          <strong className="text-texto">{resumo.corretorNome}</strong>
          {resumo.corretorCreci ? ` (${resumo.corretorCreci})` : ''}. É com essa pessoa que você
          fala para corrigir, copiar ou apagar qualquer informação.
        </p>
      </div>

      <FormularioDoTermo versao={VERSAO_DO_TERMO} />
    </main>
  );
}
