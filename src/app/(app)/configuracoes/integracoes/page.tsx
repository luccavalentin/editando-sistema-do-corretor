import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { estadoDasIntegracoes, type EstadoDaIntegracao } from '@/server/consultas/integracoes';
import { Cartao } from '@/components/ui/cartao';
import { Chip } from '@/components/ui/sinal';
import { Icone } from '@/components/shell/icones';
import { EstadoSemPermissao } from '@/components/ui/estados';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { cn } from '@/lib/ui';
import { numero, tempoRelativo } from '@/lib/formato';

export const metadata: Metadata = { title: 'Integrações' };

export default async function PaginaDeIntegracoes() {
  const sessao = await exigirSessao('/configuracoes/integracoes');

  if (!sessao.pode('integracoes.administrar')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Integrações" />
      </div>
    );
  }

  const integracoes = await estadoDasIntegracoes(sessao.atual.tenant.id);

  const desligadas = integracoes.filter((i) => !i.configurada).length;
  const comFalha = integracoes.filter((i) => i.saude && i.saude.falhas24h > 0).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 lg:px-6">
      <div>
        <Link
          href="/configuracoes"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-link hover:underline"
        >
          <Icone nome="voltar" className="size-4" />
          Configurações
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          O que o sistema conversa com o mundo de fora, e se está funcionando.
        </p>
      </div>

      {/* O que exige ação vem primeiro. Um resumo que começa por "3 integrações"
          faz o corretor procurar o problema entre as que estão bem. */}
      {comFalha > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-perigo-sutil px-3 py-2.5 text-sm text-perigo-texto">
          <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
          <span>
            {comFalha === 1 ? 'Uma integração falhou' : `${comFalha} integrações falharam`} nas
            últimas 24 horas. Isso costuma ser do outro lado, não do seu sistema — mas vale
            conferir antes de prometer prazo ao cliente.
          </span>
        </p>
      )}

      {desligadas > 0 && comFalha === 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-atencao-sutil px-3 py-2.5 text-sm text-atencao-texto">
          <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
          <span>
            {desligadas === 1
              ? 'Uma integração não está configurada'
              : `${desligadas} integrações não estão configuradas`}
            . O sistema funciona sem elas — mas com menos.
          </span>
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {integracoes.map((integracao) => (
          <li key={integracao.chave}>
            <Integracao integracao={integracao} />
          </li>
        ))}
      </ul>

      {/* Quem configura não é o corretor. Dizer isso evita que ele procure um
          botão que não existe, e diz a quem ele deve pedir. */}
      <div className="rounded-xl border border-borda bg-superficie-afundada p-4">
        <h2 className="mb-1 text-sm font-bold text-texto">Como ligar o que está desligado</h2>
        <p className="text-sm text-texto-secundario">
          Estas integrações são configuradas no servidor onde o sistema está instalado, e não
          aqui — as credenciais são da instalação inteira, não da sua conta. Fale com quem cuida
          da hospedagem do seu Agilliza e passe o nome das variáveis que aparecem em cada cartão.
        </p>
      </div>
    </div>
  );
}

function Integracao({ integracao }: { integracao: EstadoDaIntegracao }) {
  const { saude } = integracao;
  const falhando = Boolean(saude && saude.falhas24h > 0);

  return (
    <Cartao
      className={cn(
        'p-4',
        falhando ? 'border-perigo-borda' : !integracao.configurada ? 'border-atencao-borda' : undefined,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-grow">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-texto">{integracao.nome}</h2>
            {!integracao.configurada ? (
              <Chip tom="atencao">Não configurada</Chip>
            ) : falhando ? (
              <Chip tom="perigo">Com falhas</Chip>
            ) : (
              <Chip tom="sucesso">Ligada</Chip>
            )}
          </div>

          <p className="mt-1 text-sm text-texto-secundario">{integracao.oQueFaz}</p>
        </div>
      </div>

      {/* As variáveis que faltam, com o nome exato. É o que quem cuida do
          servidor precisa receber — "configure a Homefin" não é acionável. */}
      {integracao.faltando.length > 0 && (
        <div className="mt-3 rounded-lg bg-superficie-afundada px-3 py-2.5">
          <p className="text-xs font-semibold text-texto-secundario">
            Falta definir no servidor:
          </p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {integracao.faltando.map((variavel) => (
              <li
                key={variavel}
                className="rounded border border-borda bg-superficie px-2 py-0.5 font-mono text-xs text-texto"
              >
                {variavel}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* A SAÚDE é o que distingue "sistema quebrado" de "banco fora do ar" —
          e evita o corretor ligar para o suporte errado. */}
      {saude && saude.chamadas24h > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-borda pt-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-texto-apoio">Chamadas (24h)</dt>
            <dd className="font-medium tabular-nums text-texto">{numero(saude.chamadas24h)}</dd>
          </div>
          <div>
            <dt className="text-xs text-texto-apoio">Falharam</dt>
            <dd
              className={cn(
                'font-medium tabular-nums',
                saude.falhas24h > 0 ? 'text-perigo-texto' : 'text-texto',
              )}
            >
              {numero(saude.falhas24h)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-texto-apoio">Última resposta boa</dt>
            <dd className="font-medium text-texto">
              {saude.ultimoSucesso ? tempoRelativo(saude.ultimoSucesso) : '—'}
            </dd>
          </div>
        </dl>
      )}

      {saude?.ultimaFalha && (
        <div className="mt-2 rounded-lg bg-perigo-sutil px-3 py-2.5">
          <p className="text-xs font-semibold text-perigo-texto">
            Última falha · {tempoRelativo(saude.ultimaFalha.quando)} · {saude.ultimaFalha.operacao}
          </p>
          {saude.ultimaFalha.mensagem && (
            // A mensagem já vem humanizada e sem rastro de sistema interno: o
            // cliente da Homefin a trata antes de gravar no log.
            <p className="mt-0.5 text-xs text-perigo-texto">{saude.ultimaFalha.mensagem}</p>
          )}
        </div>
      )}
    </Cartao>
  );
}
