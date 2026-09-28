import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import {
  carregarAgendaDeHoje,
  carregarFunil,
  carregarIndicadores,
  carregarPrioridades,
  contaTemDados,
  type Periodo,
} from '@/server/consultas/painel';
import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCabecalho, CartaoTitulo } from '@/components/ui/cartao';
import { ChipTemperatura, Chip } from '@/components/ui/sinal';
import { EstadoPrimeiroAcesso, EstadoVazio } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import {
  dataLonga,
  duracaoEmDias,
  hora,
  moeda,
  moedaCurta,
  numero,
  percentual,
  primeiroNome,
  tempoCurto,
} from '@/lib/formato';
import { SeletorDePeriodo } from './seletor-de-periodo';

export const metadata: Metadata = { title: 'Início' };

const PERIODOS_VALIDOS: Periodo[] = [7, 30, 90];

function saudacao(): string {
  const h = Number(
    new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(
      new Date(),
    ),
  );
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Início — Centro de Comando (seção 5).
 *
 * A ordem dos blocos é a tese do produto: "ação antes de informação". As
 * prioridades vêm ANTES dos indicadores, e os indicadores antes dos gráficos.
 * Um painel que abre com gráfico obriga o corretor a interpretar antes de agir.
 */
export default async function PaginaInicio({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const sessao = await exigirSessao('/inicio');
  const tenantId = sessao.atual.tenant.id;

  const { periodo: periodoBruto } = await searchParams;
  const pedido = Number(periodoBruto);
  const periodo: Periodo = PERIODOS_VALIDOS.includes(pedido as Periodo) ? (pedido as Periodo) : 30;

  const temDados = await contaTemDados(tenantId);

  if (!temDados) {
    return (
      <div className="motion-entrada mx-auto max-w-3xl px-4 py-10 lg:px-6">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">
          {saudacao()}, {primeiroNome(sessao.perfil.nome) || 'corretor'}
        </h1>
        <p className="mb-8 text-sm text-texto-secundario">{dataLonga(new Date())}</p>

        <EstadoPrimeiroAcesso
          titulo="Sua conta está pronta. Falta o primeiro cliente."
          descricao="Cadastre uma pessoa e o Agilliza começa a trabalhar: cria o negócio, acompanha a etapa, lembra do follow-up e monta o painel a partir da sua operação real. Nada aqui é número de exemplo."
          acao={{ rotulo: 'Cadastrar primeiro cliente', href: '/clientes/novo' }}
        />

        <div className="motion-stagger mt-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              titulo: 'Traga seus clientes',
              texto: 'Importe de planilha ou cadastre um a um. O CPF impede cadastro duplicado.',
              href: '/clientes/novo',
              icone: 'pessoas',
            },
            {
              titulo: 'Cadastre um imóvel',
              texto: 'Depois publique no seu portfólio e nos portais conectados.',
              href: '/imoveis/novo',
              icone: 'predio',
            },
            {
              titulo: 'Conecte as integrações',
              texto: 'Homefin, agenda e WhatsApp. Sem credencial, elas ficam declaradamente inativas.',
              href: '/configuracoes/integracoes',
              icone: 'plugue',
            },
          ].map((c, indice) => (
            <Link
              key={c.href}
              href={c.href}
              className="cartao-premium toque-premium rounded-xl bg-superficie p-4 no-underline"
              style={{ '--ordem': indice } as React.CSSProperties}
              data-haptico="selecao"
            >
              <span className="mb-2 flex size-8 items-center justify-center rounded-lg bg-acao-sutil text-acao-sutil-texto">
                <Icone nome={c.icone} className="size-4" />
              </span>
              <span className="block text-sm font-semibold text-texto">{c.titulo}</span>
              <span className="mt-0.5 block text-xs text-texto-secundario">{c.texto}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const [indicadores, prioridades, funil, agenda] = await Promise.all([
    carregarIndicadores(tenantId, periodo),
    carregarPrioridades(tenantId, 5),
    carregarFunil(tenantId),
    carregarAgendaDeHoje(tenantId),
  ]);

  const maiorEtapa = Math.max(1, ...funil.map((e) => e.quantidade));
  const etapaQueMaisTrava = [...funil]
    .filter((e) => e.quantidade > 0)
    .sort((a, b) => (b.segundosMedios ?? 0) - (a.segundosMedios ?? 0))[0];

  const destaques = [
    {
      rotulo: 'Em negociação',
      valor: moedaCurta(indicadores.valorEmNegociacao),
      apoio: `${numero(indicadores.negociosAtivos)} ${indicadores.negociosAtivos === 1 ? 'negócio ativo' : 'negócios ativos'}`,
      href: '/negocios',
    },
    {
      rotulo: 'Fechado no período',
      valor: moedaCurta(indicadores.valorFechado),
      apoio: `${numero(indicadores.negociosGanhos)} ganhos · ${numero(indicadores.negociosPerdidos)} perdidos`,
      href: '/negocios?situacao=ganho',
    },
    {
      rotulo: 'Taxa de conversão',
      valor: percentual(indicadores.taxaConversao),
      apoio: `Ticket médio ${moedaCurta(indicadores.ticketMedio)}`,
      href: '/relatorios',
    },
    {
      rotulo: 'Clientes quentes',
      valor: numero(indicadores.pessoasQuentes),
      apoio: `${numero(indicadores.pessoasNovas)} ${indicadores.pessoasNovas === 1 ? 'novo' : 'novos'} no período`,
      href: '/clientes?temperatura=quente',
    },
  ];

  const miudos = [
    { rotulo: 'Visitas marcadas', valor: numero(indicadores.visitasMarcadas), href: '/agenda' },
    { rotulo: 'Visitas realizadas', valor: numero(indicadores.visitasRealizadas), href: '/agenda' },
    { rotulo: 'Follow-ups pendentes', valor: numero(indicadores.followupsPendentes), href: '/followups' },
    { rotulo: 'Follow-ups vencidos', valor: numero(indicadores.followupsVencidos), href: '/followups?situacao=vencido' },
    { rotulo: 'Tarefas vencidas', valor: numero(indicadores.tarefasVencidas), href: '/tarefas' },
    { rotulo: 'Negócios parados', valor: numero(indicadores.negociosParados), href: '/negocios?parados=1' },
  ];

  return (
    <div className="motion-entrada flex flex-col gap-5 px-4 py-5 lg:px-6">
      {/* Cabeçalho e período */}
      <div className="sticky top-0 z-elevado -mx-4 flex flex-wrap items-end gap-4 border-b border-borda-sutil px-4 py-3 vidro-sticky lg:-mx-6 lg:px-6">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold tracking-tight">
            {saudacao()}, {primeiroNome(sessao.perfil.nome) || 'corretor'}
          </h1>
          <p className="mt-0.5 text-sm text-texto-secundario">
            {prioridades.length === 0
              ? 'Nada vencido no seu nome. Bom momento para prospectar.'
              : `${prioridades.length} ${prioridades.length === 1 ? 'coisa precisa' : 'coisas precisam'} da sua atenção agora.`}
          </p>
        </div>

        <SeletorDePeriodo atual={periodo} />

        <Botao comoFilho>
          <Link href="/negocios/novo">
            <Icone nome="mais" className="size-4" />
            Novo negócio
          </Link>
        </Botao>
      </div>

      {/* BLOCO 1 — PRIORIDADES, antes de qualquer gráfico */}
      <Cartao className="revelar-no-scroll">
        <CartaoCabecalho>
          <span className="flex size-6 items-center justify-center rounded-md bg-perigo-sutil text-perigo-texto">
            <Icone nome="alerta" className="size-3.5" />
          </span>
          <CartaoTitulo>Prioridades de agora</CartaoTitulo>
          <span className="text-xs text-texto-secundario">Ordenadas por impacto comercial</span>
        </CartaoCabecalho>

        {prioridades.length === 0 ? (
          <div className="p-5">
            <EstadoVazio
              titulo="Nada atrasado no seu nome"
              descricao="Nenhum follow-up vencido, nenhuma visita sem confirmação e nenhum cliente quente esquecido. Use o tempo livre para prospectar."
              acao={{ rotulo: 'Ver clientes parados', href: '/clientes?parados=1' }}
              className="border-0 bg-transparent py-6"
            />
          </div>
        ) : (
          <ul className="divide-y divide-borda-sutil">
            {prioridades.map((p, indice) => (
              <li
                key={`${p.tipo}-${p.pessoaId}-${p.negocioId ?? 'sem-negocio'}`}
                className="motion-subir flex flex-wrap items-center gap-3 px-5 py-3.5"
                style={{ '--ordem': indice } as React.CSSProperties}
              >
                <span
                  aria-hidden="true"
                  className="h-10 w-1 shrink-0 rounded-full"
                  style={{
                    background:
                      p.temperatura === 'quente'
                        ? 'var(--cor-quente)'
                        : p.temperatura === 'morno'
                          ? 'var(--cor-morno)'
                          : 'var(--cor-frio)',
                  }}
                />

                <div className="w-52 shrink-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/clientes/${p.pessoaId}`}
                      className="truncate text-base font-semibold text-texto no-underline hover:text-link"
                    >
                      {p.pessoaNome}
                    </Link>
                    <ChipTemperatura temperatura={p.temperatura} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-texto-secundario">
                    {p.negocioCodigo
                      ? `${p.negocioCodigo}${p.negocioValor ? ` · ${moedaCurta(p.negocioValor)}` : ''}`
                      : 'Sem negócio aberto'}
                  </p>
                </div>

                <div className="flex w-20 shrink-0 items-center gap-1.5 text-xs font-semibold text-texto-secundario">
                  <Icone nome="relogio" className="size-3.5" />
                  {tempoCurto(p.paradoDesde)}
                </div>

                <div className="min-w-48 flex-grow">
                  <p className="text-sm text-texto">{p.motivo}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-atencao-texto">
                    <Icone nome="grafico" className="size-3" />
                    {p.risco}
                  </p>
                </div>

                <Botao tamanho="pequeno" comoFilho>
                  <Link href={p.negocioId ? `/negocios/${p.negocioId}` : `/clientes/${p.pessoaId}`}>
                    {p.acao}
                    <Icone nome="seta" className="size-3.5" />
                  </Link>
                </Botao>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      {/* BLOCO 2 — INDICADORES. Cada um abre a lista que o originou. */}
      <section aria-label="Indicadores comerciais" className="motion-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {destaques.map((k, indice) => (
          <Link
            key={k.rotulo}
            href={k.href}
            className="cartao-premium toque-premium rounded-xl bg-superficie p-4 no-underline"
            style={{ '--ordem': indice } as React.CSSProperties}
            data-haptico="selecao"
          >
            <p className="mb-1.5 text-xs text-texto-secundario">{k.rotulo}</p>
            <p data-numerico className="text-3xl font-bold leading-none tracking-tight text-texto">
              {k.valor}
            </p>
            <p className="mt-1.5 text-xs text-texto-apoio">{k.apoio}</p>
          </Link>
        ))}
      </section>

      <section aria-label="Indicadores detalhados" className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {miudos.map((m, indice) => (
          <Link
            key={m.rotulo}
            href={m.href}
            className="cartao-premium toque-premium rounded-lg bg-superficie p-3 no-underline"
            style={{ '--ordem': indice } as React.CSSProperties}
            data-haptico="selecao"
          >
            <p className="mb-1 truncate text-xs text-texto-secundario">{m.rotulo}</p>
            <p data-numerico className="text-xl font-bold tracking-tight text-texto">
              {m.valor}
            </p>
          </Link>
        ))}
      </section>

      {/* BLOCO 4 e 5 — FUNIL + AGENDA */}
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <Cartao className="revelar-no-scroll">
          <CartaoCabecalho>
            <CartaoTitulo>Funil de negócios</CartaoTitulo>
            <Link href="/negocios" className="text-xs font-semibold no-underline">
              Ver todos
            </Link>
          </CartaoCabecalho>

          <div className="px-5 py-4">
            {funil.every((e) => e.quantidade === 0) ? (
              <EstadoVazio
                titulo="Nenhum negócio aberto"
                descricao="Crie um negócio para um cliente e ele aparece aqui, com valor, tempo em cada etapa e onde a carteira está travando."
                acao={{ rotulo: 'Criar negócio', href: '/negocios/novo' }}
                className="border-0 bg-transparent py-4"
              />
            ) : (
              <>
                <ul className="flex flex-col gap-3">
                  {funil.map((e, indice) => (
                    <li
                      key={e.etapaId}
                      className="motion-subir"
                      style={{ '--ordem': indice } as React.CSSProperties}
                    >
                      <div className="mb-1 flex items-baseline gap-2">
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{ background: e.cor ?? 'var(--grafico-1)' }}
                        />
                        <span className="flex-grow truncate text-xs font-semibold text-texto">
                          {e.nome}
                        </span>
                        {e.parados > 0 && (
                          <Chip tom="atencao">{e.parados} parado{e.parados > 1 ? 's' : ''}</Chip>
                        )}
                        <span data-numerico className="text-xs text-texto-secundario">
                          {numero(e.quantidade)}
                        </span>
                        <span data-numerico className="w-20 text-right text-xs font-semibold text-texto">
                          {moedaCurta(e.valorTotal)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-superficie-afundada">
                        <div
                          className="progresso-vivo h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round((e.quantidade / maiorEtapa) * 100)}%`,
                            background: e.cor ?? 'var(--grafico-1)',
                          }}
                        />
                      </div>
                      {e.segundosMedios !== null && (
                        <p className="mt-0.5 text-micro text-texto-apoio">
                          Média de {duracaoEmDias(e.segundosMedios)} nesta etapa
                        </p>
                      )}
                    </li>
                  ))}
                </ul>

                {/* A conclusão em linguagem natural que a seção 5 exige. Sai do
                    dado real — não é frase fixa. */}
                {etapaQueMaisTrava && etapaQueMaisTrava.segundosMedios !== null && (
                  <p className="mt-4 rounded-lg border border-atencao-borda bg-atencao-sutil px-3 py-2.5 text-xs text-atencao-texto">
                    <strong className="block">Onde o dinheiro está travando</strong>
                    Os negócios ficam em média {duracaoEmDias(etapaQueMaisTrava.segundosMedios)} na
                    etapa {etapaQueMaisTrava.nome.toLowerCase()} — o maior tempo do seu funil.
                    {indicadores.negociosParados > 0 &&
                      ` ${indicadores.negociosParados} ${indicadores.negociosParados === 1 ? 'negócio está' : 'negócios estão'} sem avançar há mais de uma semana.`}
                  </p>
                )}
              </>
            )}
          </div>
        </Cartao>

        <Cartao className="revelar-no-scroll">
          <CartaoCabecalho>
            <CartaoTitulo>Agenda de hoje</CartaoTitulo>
            <Link href="/agenda" className="text-xs font-semibold no-underline">
              Ver semana
            </Link>
          </CartaoCabecalho>

          <div className="px-5 py-4">
            {agenda.length === 0 ? (
              <EstadoVazio
                titulo="Nenhum compromisso hoje"
                descricao="Dia livre para prospectar ou adiantar follow-ups. Agende uma visita e o lembrete de saída aparece aqui."
                acao={{ rotulo: 'Agendar visita', href: '/agenda/novo' }}
                className="border-0 bg-transparent py-4"
              />
            ) : (
              <ol className="flex flex-col gap-3">
                {agenda.map((c) => {
                  const confirmado = c.confirmadoEm !== null || c.situacao === 'confirmado';
                  return (
                    <li key={c.id} className="flex gap-3">
                      <div className="w-11 shrink-0 text-right">
                        <p data-numerico className="text-sm font-bold">
                          {hora(c.inicio)}
                        </p>
                        <p className="text-micro text-texto-apoio">{hora(c.fim)}</p>
                      </div>
                      <div
                        aria-hidden="true"
                        className="w-0.5 shrink-0 rounded-full"
                        style={{
                          background: confirmado ? 'var(--cor-sucesso)' : 'var(--cor-atencao)',
                        }}
                      />
                      <div className="min-w-0 flex-grow">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{c.titulo}</span>
                          {confirmado ? (
                            <Chip tom="sucesso">Confirmada</Chip>
                          ) : (
                            <Chip tom="atencao">Sem confirmação</Chip>
                          )}
                        </div>
                        {c.pessoaNome && (
                          <p className="mt-0.5 truncate text-xs text-texto-secundario">
                            {c.pessoaNome}
                          </p>
                        )}
                        {c.deslocamentoMin !== null && (
                          <p className="mt-0.5 text-micro text-sucesso-texto">
                            {c.deslocamentoMin} min de deslocamento
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </Cartao>
      </div>

      <p className="text-micro text-texto-apoio">
        Valor total em negociação: {moeda(indicadores.valorEmNegociacao)} · período de {periodo} dias
        · conta {sessao.atual.tenant.nome}
      </p>
    </div>
  );
}
