import type { Metadata } from 'next';

import { exigirSessao } from '@/server/sessao';
import { quadroDaEquipe } from '@/server/consultas/equipe';
import { Cartao } from '@/components/ui/cartao';
import { EstadoSemPermissao } from '@/components/ui/estados';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { ConvidarPessoa } from './convidar';
import { Convite, Membro } from './lista';

export const metadata: Metadata = { title: 'Equipe' };

export default async function PaginaDaEquipe() {
  const sessao = await exigirSessao('/equipe');

  if (!sessao.pode('equipe.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Equipe" />
      </div>
    );
  }

  const quadro = await quadroDaEquipe(sessao.atual.tenant.id, sessao.usuarioId);
  const podeAdministrar = sessao.pode('equipe.administrar');

  const vagasLivres = Math.max(0, quadro.limite - quadro.ativos);
  const semVaga = vagasLivres === 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          {quadro.ativos} de {quadro.limite}{' '}
          {quadro.limite === 1 ? 'vaga usada' : 'vagas usadas'} no plano
          {vagasLivres > 0 && ` · ${vagasLivres} ${vagasLivres === 1 ? 'livre' : 'livres'}`}
        </p>
      </div>

      <ConvidarPessoa podeConvidar={podeAdministrar} temVaga={!semVaga} />

      {quadro.convites.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-texto-apoio">
            Convites enviados
            <span className="ml-2 font-normal">{quadro.convites.length}</span>
          </h2>
          <Cartao className="overflow-hidden p-0">
            <ul className="divide-y divide-borda">
              {quadro.convites.map((convite) => (
                <Convite
                  key={convite.id}
                  convite={convite}
                  podeAdministrar={podeAdministrar}
                />
              ))}
            </ul>
          </Cartao>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-texto-apoio">
          Pessoas
          <span className="ml-2 font-normal">{quadro.membros.length}</span>
        </h2>
        <Cartao className="overflow-hidden p-0">
          <ul className="divide-y divide-borda">
            {quadro.membros.map((membro) => (
              <Membro key={membro.id} membro={membro} podeAdministrar={podeAdministrar} />
            ))}
          </ul>
        </Cartao>
      </section>

      {/* Quem NÃO administra precisa saber por que não vê botão nenhum. Uma
          tela sem ações e sem explicação parece quebrada. */}
      {!podeAdministrar && (
        <p className="text-xs text-texto-apoio">
          Seu papel permite ver a equipe, mas não convidar nem alterar acessos. Peça a quem
          administra a conta.
        </p>
      )}
    </div>
  );
}
