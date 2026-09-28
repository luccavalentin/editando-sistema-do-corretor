import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirAdmin } from '@/server/sessao';
import { visaoGeral } from '@/server/consultas';
import { numero } from '@/lib/formato';

export const metadata: Metadata = { title: 'Visão geral' };

export default async function PaginaInicial() {
  await exigirAdmin();
  const dados = await visaoGeral();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Visão geral da plataforma</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          Números agregados de todas as contas. Nenhum dado pessoal aparece aqui.
        </p>
      </div>

      {/* O que precisa de ação vem PRIMEIRO. Um painel que começa por
          "total de contas" faz o operador rolar para achar o problema. */}
      {(dados.contasInadimplentes > 0 ||
        dados.contasSuspensas > 0 ||
        dados.errosDeIntegracao > 0) && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-texto-apoio">
            Precisa de atenção
          </h2>
        <div className="console-stagger grid grid-cols-1 gap-3 sm:grid-cols-3">
            {dados.contasInadimplentes > 0 && (
              <Cartao
                rotulo="Contas inadimplentes"
                valor={numero(dados.contasInadimplentes)}
                tom="atencao"
                nota="Continuam no ar — a cobrança não derruba o portfólio"
                href="/contas?situacao=inadimplente"
              />
            )}
            {dados.contasSuspensas > 0 && (
              <Cartao
                rotulo="Contas suspensas"
                valor={numero(dados.contasSuspensas)}
                tom="perigo"
                nota="Portfólio fora do ar"
                href="/contas?situacao=suspenso"
              />
            )}
            {dados.errosDeIntegracao > 0 && (
              <Cartao
                rotulo="Erros de integração (24h)"
                valor={numero(dados.errosDeIntegracao)}
                tom="perigo"
                nota="Chamadas ao banco que falharam"
              />
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-texto-apoio">
          Contas
        </h2>
        <div className="console-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Cartao rotulo="Total" valor={numero(dados.contas)} href="/contas" />
          <Cartao rotulo="Ativas" valor={numero(dados.contasAtivas)} tom="sucesso" />
          <Cartao rotulo="Em teste" valor={numero(dados.contasEmTeste)} />
          <Cartao rotulo="Usuários" valor={numero(dados.usuarios)} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-texto-apoio">
          Uso
        </h2>
        <div className="console-stagger grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Cartao rotulo="Clientes cadastrados" valor={numero(dados.pessoas)} />
          <Cartao rotulo="Imóveis" valor={numero(dados.imoveis)} />
          <Cartao rotulo="No portfólio" valor={numero(dados.imoveisPublicados)} />
          <Cartao rotulo="Simulações" valor={numero(dados.simulacoes)} />
          <Cartao
            rotulo="Em análise no banco"
            valor={numero(dados.simulacoesEmAnalise)}
            tom={dados.simulacoesEmAnalise > 0 ? 'atencao' : undefined}
          />
        </div>
      </section>

      <p className="border-t border-borda pt-4 text-xs text-texto-apoio">
        Estes números vêm da mesma RLS que governa o sistema do corretor — o console não usa
        credencial que ignore o banco. Abrir a ficha de uma conta específica é registrado na
        auditoria daquele corretor, e ele pode ver.
      </p>
    </div>
  );
}

function Cartao({
  rotulo,
  valor,
  tom,
  nota,
  href,
}: {
  rotulo: string;
  valor: string;
  tom?: 'sucesso' | 'atencao' | 'perigo' | undefined;
  nota?: string | undefined;
  href?: string | undefined;
}) {
  const cor =
    tom === 'sucesso'
      ? 'text-sucesso'
      : tom === 'atencao'
        ? 'text-atencao'
        : tom === 'perigo'
          ? 'text-perigo'
          : 'text-texto';

  const conteudo = (
    <>
      <p className="text-xs text-texto-apoio">{rotulo}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${cor}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-texto-apoio">{nota}</p>}
    </>
  );

  const classe = 'console-card rounded-[--radius-padrao] bg-superficie p-4';

  return href ? (
    <Link href={href} className={`${classe} hover:bg-superficie-alta`}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}
