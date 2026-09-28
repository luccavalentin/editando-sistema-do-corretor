import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { agendaDoPeriodo, resumoDaSemana } from '@/server/consultas/agenda';
import { Cartao } from '@/components/ui/cartao';
import { Icone } from '@/components/shell/icones';
import { EstadoPrimeiroAcesso, EstadoSemPermissao } from '@/components/ui/estados';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { cn } from '@/lib/ui';
import { Compromisso } from './lista';

export const metadata: Metadata = { title: 'Agenda' };

/** Meia-noite do dia pedido, no fuso de quem está lendo. */
function inicioDoDia(iso: string | undefined): Date {
  const base = iso ? new Date(`${iso}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
  }
  base.setHours(0, 0, 0, 0);
  return base;
}

function somarDias(data: Date, dias: number): Date {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

function comoParametro(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export default async function PaginaDaAgenda({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const sessao = await exigirSessao('/agenda');

  if (!sessao.pode('agenda.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Agenda" />
      </div>
    );
  }

  const params = await searchParams;
  const dia = inicioDoDia(params.dia);
  const amanha = somarDias(dia, 1);

  // A faixa de navegação começa ONTEM: o corretor volta um dia com frequência,
  // para registrar o que aconteceu, e raramente mais que isso.
  const inicioDaFaixa = somarDias(dia, -1);
  const fimDaFaixa = somarDias(dia, 6);

  const tenantId = sessao.atual.tenant.id;
  const [agenda, semana] = await Promise.all([
    agendaDoPeriodo(tenantId, dia, amanha),
    resumoDaSemana(tenantId, inicioDaFaixa, fimDaFaixa),
  ]);

  const podeEditar = sessao.pode('agenda.editar');
  const agora = new Date();
  const ehHoje = comoParametro(dia) === comoParametro(new Date());

  const totalPorDia = new Map(semana.porDia.map((d) => [d.data, d]));
  const diasDaFaixa = Array.from({ length: 7 }, (_, i) => somarDias(inicioDaFaixa, i));

  const conflitos = agenda.emConflito.size;
  const aConfirmar = agenda.porConfirmar.size;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold tracking-tight">
            {ehHoje
              ? 'Hoje'
              : dia.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                })}
          </h1>
          <p className="mt-0.5 text-sm text-texto-secundario">
            {agenda.compromissos.length === 0
              ? 'Nenhum compromisso'
              : `${agenda.compromissos.length} ${
                  agenda.compromissos.length === 1 ? 'compromisso' : 'compromissos'
                }`}
          </p>
        </div>

        {!ehHoje && (
          <Link href="/agenda" className="text-sm font-semibold text-link hover:underline">
            Voltar para hoje
          </Link>
        )}
      </div>

      {/* Faixa de dias. Mostra ONDE há trabalho antes de o corretor clicar —
          uma seta de "próximo dia" o obrigaria a descobrir isso um a um. */}
      <nav aria-label="Escolher o dia" className="flex gap-1.5 overflow-x-auto pb-1">
        {diasDaFaixa.map((d) => {
          const chave = comoParametro(d);
          const resumo = totalPorDia.get(chave);
          const selecionado = chave === comoParametro(dia);

          return (
            <Link
              key={chave}
              href={`/agenda?dia=${chave}`}
              aria-current={selecionado ? 'page' : undefined}
              className={cn(
                'flex min-w-16 shrink-0 flex-col items-center rounded-lg border px-3 py-2 transition-colors',
                selecionado
                  ? 'border-acao bg-acao-sutil text-acao-sutil-texto'
                  : 'border-borda bg-superficie hover:bg-superficie-hover',
              )}
            >
              <span className="text-micro uppercase tracking-wide text-texto-apoio">
                {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
              </span>
              <span className="text-lg font-bold leading-tight tabular-nums">{d.getDate()}</span>
              <span className="flex h-4 items-center gap-1">
                {resumo && resumo.total > 0 && (
                  <span className="text-micro tabular-nums text-texto-apoio">{resumo.total}</span>
                )}
                {/* O ponto vermelho não é a única pista: o dia com choque
                    também aparece com o aviso escrito ao ser aberto. */}
                {resumo?.temConflito && (
                  <span
                    aria-label="tem conflito de horário"
                    className="size-1.5 rounded-full bg-perigo"
                  />
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* O RESUMO DE PROBLEMAS vem antes da lista. Se o dia tem um choque de
          horário, o corretor precisa saber antes de rolar a tela. */}
      {(conflitos > 0 || aConfirmar > 0) && (
        <div className="flex flex-col gap-2">
          {conflitos > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-perigo-sutil px-3 py-2.5 text-sm text-perigo-texto">
              <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong>
                  {conflitos === 2
                    ? 'Dois compromissos se chocam'
                    : `${conflitos} compromissos se chocam`}
                </strong>{' '}
                neste dia. Um deles vai atrasar ou não acontecer.
              </span>
            </p>
          )}
          {aConfirmar > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-atencao-sutil px-3 py-2.5 text-sm text-atencao-texto">
              <Icone nome="relogio" className="mt-0.5 size-4 shrink-0" />
              <span>
                {aConfirmar === 1 ? 'Uma visita' : `${aConfirmar} visitas`} nas próximas 24 horas
                ainda sem confirmação. Confirmar evita a viagem perdida.
              </span>
            </p>
          )}
        </div>
      )}

      {agenda.compromissos.length === 0 ? (
        <EstadoPrimeiroAcesso
          titulo={ehHoje ? 'Dia livre' : 'Nada marcado neste dia'}
          descricao="A agenda mostra visitas, retornos e assinaturas — e avisa quando dois compromissos se chocam ou quando não há tempo de atravessar a cidade entre eles."
        />
      ) : (
        <Cartao className="overflow-hidden p-0">
          <ul className="divide-y divide-borda">
            {agenda.compromissos.map((compromisso) => (
              <Compromisso
                key={compromisso.id}
                compromisso={compromisso}
                emConflito={agenda.emConflito.has(compromisso.id)}
                apertado={agenda.apertados.get(compromisso.id)}
                precisaConfirmar={agenda.porConfirmar.has(compromisso.id)}
                podeEditar={podeEditar}
                jaPassou={new Date(compromisso.fim) < agora}
              />
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
