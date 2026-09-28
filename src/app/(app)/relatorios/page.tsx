import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { carregarFunil } from '@/server/consultas/painel';
import { relatorioDeDesempenho, type Comparacao } from '@/server/consultas/relatorio';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoTitulo } from '@/components/ui/cartao';
import { EstadoPrimeiroAcesso, EstadoSemPermissao } from '@/components/ui/estados';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { cn } from '@/lib/ui';
import { moeda, numero, percentual } from '@/lib/formato';
import type { Periodo } from '@/server/consultas/painel';

export const metadata: Metadata = { title: 'Relatórios' };

const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: 7, rotulo: '7 dias' },
  { valor: 30, rotulo: '30 dias' },
  { valor: 90, rotulo: '90 dias' },
];

function periodoValido(bruto: string | undefined): Periodo {
  const n = Number(bruto);
  return n === 7 || n === 90 ? n : 30;
}

export default async function PaginaDeRelatorios({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const sessao = await exigirSessao('/relatorios');

  if (!sessao.pode('crm.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Relatórios" />
      </div>
    );
  }

  const params = await searchParams;
  const periodo = periodoValido(params.periodo);
  const tenantId = sessao.atual.tenant.id;

  const [relatorio, funil] = await Promise.all([
    relatorioDeDesempenho(tenantId, periodo),
    carregarFunil(tenantId),
  ]);

  const semDados =
    relatorio.negociosGanhos.atual === 0 &&
    relatorio.negociosGanhos.anterior === 0 &&
    relatorio.negociosAtivos === 0 &&
    relatorio.pessoasNovas.atual === 0;

  const totalNoFunil = funil.reduce((soma, etapa) => soma + etapa.quantidade, 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="mt-0.5 text-sm text-texto-secundario">
            Últimos {periodo} dias, comparados com os {periodo} anteriores.
          </p>
        </div>

        <nav aria-label="Período do relatório" className="flex gap-1">
          {PERIODOS.map((p) => (
            <Link
              key={p.valor}
              href={`/relatorios?periodo=${p.valor}`}
              aria-current={p.valor === periodo ? 'page' : undefined}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                p.valor === periodo
                  ? 'border-acao bg-acao-sutil text-acao-sutil-texto'
                  : 'border-borda bg-superficie text-texto-secundario hover:bg-superficie-hover',
              )}
            >
              {p.rotulo}
            </Link>
          ))}
        </nav>
      </div>

      {semDados ? (
        <EstadoPrimeiroAcesso
          titulo="Ainda não há o que comparar"
          descricao="Este relatório mostra como você foi no período contra o período anterior. Assim que houver negócios e visitas registrados, os números aparecem aqui."
          acao={{ rotulo: 'Ver meus negócios', href: '/negocios' }}
        />
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-texto-apoio">
              Resultado
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Indicador
                rotulo="Negócios fechados"
                comparacao={relatorio.negociosGanhos}
                formatar={numero}
                maiorEhMelhor
              />
              <Indicador
                rotulo="Valor fechado"
                comparacao={relatorio.valorFechado}
                formatar={moeda}
                maiorEhMelhor
              />
              <Indicador
                rotulo="Ticket médio"
                comparacao={relatorio.ticketMedio}
                formatar={moeda}
                maiorEhMelhor
              />
              <Indicador
                rotulo="Taxa de conversão"
                comparacao={relatorio.taxaConversao}
                formatar={(v) => percentual(v)}
                maiorEhMelhor
              />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-texto-apoio">
              Atividade
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Indicador
                rotulo="Clientes novos"
                comparacao={relatorio.pessoasNovas}
                formatar={numero}
                maiorEhMelhor
              />
              <Indicador
                rotulo="Visitas marcadas"
                comparacao={relatorio.visitasMarcadas}
                formatar={numero}
                maiorEhMelhor
              />
              <Indicador
                rotulo="Visitas realizadas"
                comparacao={relatorio.visitasRealizadas}
                formatar={numero}
                maiorEhMelhor
              />
              {/* Negócios perdidos é o único em que CAIR é bom. Sem essa
                  distinção, uma queda de 40% nas perdas apareceria em vermelho
                  como se fosse problema. */}
              <Indicador
                rotulo="Negócios perdidos"
                comparacao={relatorio.negociosPerdidos}
                formatar={numero}
                maiorEhMelhor={false}
              />
            </div>
          </section>

          {/* ------------------------------------------------- o funil */}
          {funil.length > 0 && totalNoFunil > 0 && (
            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>Onde estão seus negócios agora</CartaoTitulo>
              </CartaoCabecalho>
              <CartaoCorpo className="flex flex-col gap-2.5">
                {funil.map((etapa) => {
                  const fatia = Math.round((etapa.quantidade / totalNoFunil) * 100);
                  const diasMedios = Math.round((etapa.segundosMedios ?? 0) / 86400);

                  return (
                    <div key={etapa.etapaId}>
                      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium text-texto">{etapa.nome}</span>
                        <span className="flex flex-wrap items-center gap-3 text-xs text-texto-apoio">
                          {/* Negócio parado é o dado acionável do funil: ele
                              diz ONDE a esteira trava, não só quanto há nela. */}
                          {etapa.parados > 0 && (
                            <span className="font-semibold text-atencao-texto">
                              {etapa.parados} parado{etapa.parados === 1 ? '' : 's'}
                            </span>
                          )}
                          {diasMedios > 0 && <span>{diasMedios} d em média</span>}
                          <span className="tabular-nums text-texto-secundario">
                            {numero(etapa.quantidade)} · {moeda(etapa.valorTotal)}
                          </span>
                        </span>
                      </div>

                      {/* A barra é acompanhada do número ao lado: cor e largura
                          sozinhas não são lidas por quem usa leitor de tela. */}
                      <div
                        className="h-2 overflow-hidden rounded-full bg-superficie-afundada"
                        role="img"
                        aria-label={`${etapa.nome}: ${etapa.quantidade} de ${totalNoFunil} negócios`}
                      >
                        <div
                          className="h-full rounded-full bg-acao"
                          style={{ width: `${Math.max(fatia, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CartaoCorpo>
            </Cartao>
          )}

          {/* --------------------------------------------- o que trava */}
          {(relatorio.negociosParados > 0 ||
            relatorio.followupsVencidos > 0 ||
            relatorio.tarefasVencidas > 0) && (
            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>O que está travando agora</CartaoTitulo>
              </CartaoCabecalho>
              <CartaoCorpo className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Estes são FOTO DO AGORA, não do período — por isso vêm sem
                    comparação, e a tela diz isso em vez de inventar uma. */}
                <Travando
                  rotulo="Negócios parados"
                  valor={relatorio.negociosParados}
                  href="/negocios"
                />
                <Travando
                  rotulo="Follow-ups atrasados"
                  valor={relatorio.followupsVencidos}
                  href="/followups"
                />
                <Travando
                  rotulo="Tarefas vencidas"
                  valor={relatorio.tarefasVencidas}
                  href="/tarefas"
                />
              </CartaoCorpo>
            </Cartao>
          )}

          <p className="text-xs text-texto-apoio">
            A comparação usa os {periodo} dias anteriores, do mesmo tamanho — e não o mês do
            calendário. Comparar fevereiro com janeiro mostraria uma queda de 10% que é do
            calendário, não sua.
          </p>
        </>
      )}
    </div>
  );
}

function Indicador({
  rotulo,
  comparacao,
  formatar,
  maiorEhMelhor,
}: {
  rotulo: string;
  comparacao: Comparacao;
  formatar: (valor: number) => string;
  maiorEhMelhor: boolean;
}) {
  const { atual, anterior, variacao } = comparacao;

  const melhorou = variacao == null ? null : maiorEhMelhor ? variacao > 0 : variacao < 0;
  const mudou = variacao != null && variacao !== 0;

  return (
    <Cartao className="p-4">
      <p className="text-xs text-texto-apoio">{rotulo}</p>
      <p className="mt-1 text-2xl font-bold leading-tight tabular-nums text-texto">
        {formatar(atual)}
      </p>

      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
        {variacao == null ? (
          // Sair do zero não é percentual nenhum: é a primeira vez. Qualquer
          // número aqui seria inventado.
          <span className="text-texto-apoio">
            {atual > 0 ? 'primeira vez no período' : 'sem movimento'}
          </span>
        ) : (
          <>
            <span
              className={cn(
                'font-semibold',
                !mudou
                  ? 'text-texto-apoio'
                  : melhorou
                    ? 'text-sucesso-texto'
                    : 'text-perigo-texto',
              )}
            >
              {/* A seta acompanha o sinal, e o sinal acompanha o número: quem
                  não distingue as cores lê a mesma coisa. */}
              {mudou ? (variacao > 0 ? '↑' : '↓') : '='} {Math.abs(variacao)}%
            </span>
            <span className="text-texto-apoio">antes {formatar(anterior)}</span>
          </>
        )}
      </p>
    </Cartao>
  );
}

function Travando({ rotulo, valor, href }: { rotulo: string; valor: number; href: string }) {
  return (
    <div>
      <dt className="text-xs text-texto-apoio">{rotulo}</dt>
      <dd className="mt-0.5">
        <Link
          href={href}
          className={cn(
            'text-xl font-bold tabular-nums hover:underline',
            valor > 0 ? 'text-atencao-texto' : 'text-texto',
          )}
        >
          {numero(valor)}
        </Link>
        <span className="ml-2 text-xs text-texto-apoio">agora</span>
      </dd>
    </div>
  );
}
