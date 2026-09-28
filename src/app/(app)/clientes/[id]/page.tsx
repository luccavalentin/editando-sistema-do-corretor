import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { exigirSessao } from '@/server/sessao';
import { carregarFicha } from '@/server/consultas/pessoas';
import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoTitulo } from '@/components/ui/cartao';
import { Chip, ChipTemperatura } from '@/components/ui/sinal';
import { EstadoSemPermissao, EstadoVazio } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { ROTULO_ORIGEM } from '@/dominio/pessoa';
import {
  data as formatarData,
  dataHora,
  duracaoEmDias,
  iniciais,
  moeda,
  moedaCurta,
  tempoRelativo,
} from '@/lib/formato';
import { mascararCelular, mascararCpf, mascararEmail } from '@/lib/privacidade/documentos';
import { ControlePortal, RevelarCpf } from './acoes-sensiveis';

export const metadata: Metadata = { title: 'Ficha do cliente' };

export default async function PaginaFichaDoCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await exigirSessao(`/clientes/${id}`);

  if (!sessao.pode('crm.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Ficha do cliente" />
      </div>
    );
  }

  const ficha = await carregarFicha(sessao.atual.tenant.id, id);

  // 404 cobre "não existe" e "é de outro tenant". Diferenciar as duas respostas
  // revelaria que o id existe em algum lugar do sistema.
  if (!ficha) notFound();

  const { pessoa, telefones, negocios, followups, tarefas, compromissos, historico } = ficha;

  const telefonePrincipal = telefones.find((t) => t.principal) ?? telefones[0];
  const rendaTotal = (pessoa.renda ?? 0) + (pessoa.renda_composta ?? 0);
  const followupsPendentes = followups.filter((f) => f.situacao === 'pendente');
  const vencidos = followupsPendentes.filter((f) => new Date(f.prazo) < new Date());
  const podeVerSensivel = sessao.pode('sensivel.ver');

  return (
    <div className="flex flex-col gap-4 px-4 py-5 lg:px-6">
      <Link
        href="/clientes"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-texto-secundario no-underline hover:text-texto"
      >
        <Icone nome="voltar" className="size-3.5" />
        Clientes
      </Link>

      {/* ===== Identidade ===== */}
      <Cartao>
        <CartaoCorpo className="flex flex-wrap items-start gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-acao-sutil text-xl font-bold text-acao-sutil-texto"
          >
            {iniciais(pessoa.nome)}
          </span>

          <div className="min-w-60 flex-grow">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{pessoa.nome}</h1>
              <ChipTemperatura temperatura={pessoa.temperatura} />
              {pessoa.portal_liberado && <Chip tom="sucesso">Portal liberado</Chip>}
            </div>

            <dl className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-texto-secundario">
              {pessoa.cpf && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">CPF</dt>
                  <dd>
                    {podeVerSensivel ? (
                      <RevelarCpf pessoaId={pessoa.id} mascarado={mascararCpf(pessoa.cpf)} />
                    ) : (
                      <span data-numerico>{mascararCpf(pessoa.cpf)}</span>
                    )}
                  </dd>
                </div>
              )}
              {telefonePrincipal && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Telefone</dt>
                  <Icone nome="telefone" className="size-3.5" />
                  <dd>{mascararCelular(telefonePrincipal.numero)}</dd>
                </div>
              )}
              {pessoa.email && (
                <div>
                  <dt className="sr-only">E-mail</dt>
                  <dd>{mascararEmail(pessoa.email)}</dd>
                </div>
              )}
              {pessoa.cidade && (
                <div>
                  <dt className="sr-only">Cidade</dt>
                  <dd>
                    {pessoa.cidade}
                    {pessoa.uf ? `/${pessoa.uf}` : ''}
                  </dd>
                </div>
              )}
              {pessoa.origem && (
                <div className="flex gap-1">
                  <dt>Origem</dt>
                  <dd className="font-semibold text-texto">
                    {ROTULO_ORIGEM[pessoa.origem] ?? pessoa.origem}
                  </dd>
                </div>
              )}
              {ficha.responsavelNome && (
                <div className="flex gap-1">
                  <dt>Responsável</dt>
                  <dd className="font-semibold text-texto">{ficha.responsavelNome}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="flex shrink-0 gap-2">
            {sessao.pode('mensagens.enviar') && (
              <Botao comoFilho>
                <Link href={`/atendimento?pessoa=${pessoa.id}`}>
                  <Icone nome="conversa" className="size-4" />
                  Responder
                </Link>
              </Botao>
            )}
            {sessao.pode('crm.criar') && (
              <Botao tipo="neutro" comoFilho>
                <Link href={`/negocios/novo?pessoa=${pessoa.id}`}>
                  <Icone nome="mais" className="size-4" />
                  Novo negócio
                </Link>
              </Botao>
            )}
          </div>
        </CartaoCorpo>

        {pessoa.objetivo && (
          <div className="mx-5 mb-5 rounded-lg bg-acao-sutil px-4 py-3">
            <p className="mb-1 text-micro font-bold tracking-wider text-acao-sutil-texto">
              O QUE ESSA PESSOA PROCURA
            </p>
            <p className="text-sm leading-relaxed text-acao-sutil-texto">{pessoa.objetivo}</p>
          </div>
        )}
      </Cartao>

      {/* Follow-up vencido é a coisa mais urgente da ficha: vem antes de tudo. */}
      {vencidos.length > 0 && (
        <Cartao className="border-perigo">
          <CartaoCorpo>
            <div className="mb-2 flex items-center gap-2">
              <Icone nome="alerta" className="size-4 text-perigo-texto" />
              <h2 className="text-sm font-bold text-perigo-texto">
                {vencidos.length === 1 ? 'Follow-up vencido' : `${vencidos.length} follow-ups vencidos`}
              </h2>
            </div>
            <ul className="flex flex-col gap-2">
              {vencidos.slice(0, 3).map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex-grow text-texto">{f.motivo}</span>
                  <span className="text-xs text-perigo-texto">
                    venceu {tempoRelativo(f.prazo)}
                  </span>
                  <Botao tamanho="pequeno" comoFilho>
                    <Link href={`/followups/${f.id}`}>Resolver</Link>
                  </Botao>
                </li>
              ))}
            </ul>
            {vencidos.some((f) => f.mensagemSugerida && !f.revisadoEm) && (
              <p className="mt-3 rounded-lg bg-superficie-afundada px-3 py-2 text-xs text-texto-secundario">
                Há mensagem sugerida pela IA aguardando <strong>sua revisão</strong>. Nada é enviado
                ao cliente sem você aprovar.
              </p>
            )}
          </CartaoCorpo>
        </Cartao>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {/* ===== Negócios ===== */}
          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>Negócios</CartaoTitulo>
              <span className="text-xs text-texto-secundario">
                {negocios.length === 0
                  ? 'Nenhum'
                  : `${negocios.length} ${negocios.length === 1 ? 'negócio' : 'negócios'}`}
              </span>
            </CartaoCabecalho>
            <CartaoCorpo>
              {negocios.length === 0 ? (
                <EstadoVazio
                  titulo="Nenhum negócio ainda"
                  descricao="Um negócio é o que faz esta pessoa entrar no funil e aparecer nas prioridades do painel."
                  acao={{ rotulo: 'Criar negócio', href: `/negocios/novo?pessoa=${pessoa.id}` }}
                  className="border-0 bg-transparent py-4"
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {negocios.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={`/negocios/${n.id}`}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-borda px-3 py-2.5 no-underline transition-colors hover:bg-superficie-hover"
                      >
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{ background: n.etapaCor ?? 'var(--grafico-1)' }}
                        />
                        <span className="min-w-0 flex-grow">
                          <span className="block truncate text-sm font-semibold text-texto">
                            {n.titulo ?? n.codigo}
                          </span>
                          <span className="block text-xs text-texto-secundario">
                            {n.etapaNome} · nesta etapa {tempoRelativo(n.etapaDesde)}
                          </span>
                        </span>
                        <span data-numerico className="text-sm font-semibold">
                          {moedaCurta(n.valor)}
                        </span>
                        {n.situacao !== 'aberto' && (
                          <Chip tom={n.situacao === 'ganho' ? 'sucesso' : 'perigo'}>
                            {n.situacao === 'ganho' ? 'GANHO' : 'PERDIDO'}
                          </Chip>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CartaoCorpo>
          </Cartao>

          {/* ===== Linha do tempo ===== */}
          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>Linha do tempo</CartaoTitulo>
            </CartaoCabecalho>
            <CartaoCorpo>
              {historico.length === 0 && compromissos.length === 0 ? (
                <EstadoVazio
                  titulo="O histórico começa no primeiro movimento"
                  descricao="Cada mudança de etapa, visita e follow-up entra aqui com data, hora e autor. É o patrimônio da ficha: nada se perde."
                  className="border-0 bg-transparent py-4"
                />
              ) : (
                <ol className="flex flex-col">
                  {historico.map((h, i) => (
                    <li key={h.id} className="flex gap-3 pb-4">
                      <div className="flex flex-col items-center">
                        <span
                          aria-hidden="true"
                          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-acao-sutil text-acao-sutil-texto"
                        >
                          <Icone nome="seta" className="size-3" />
                        </span>
                        {i < historico.length - 1 && (
                          <span aria-hidden="true" className="mt-1 w-0.5 flex-grow bg-borda-sutil" />
                        )}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <p className="text-sm font-semibold text-texto">
                          {h.etapaDe ? 'Mudou de etapa' : 'Entrou no funil'}
                        </p>
                        <p className="text-xs text-texto-secundario">
                          <time dateTime={h.criadoEm}>{dataHora(h.criadoEm)}</time>
                          {h.autorNome ? ` · ${h.autorNome}` : ' · sistema'}
                          {h.segundos !== null && ` · ficou ${duracaoEmDias(h.segundos)} na anterior`}
                        </p>
                      </div>
                    </li>
                  ))}

                  {compromissos.slice(0, 5).map((c) => (
                    <li key={c.id} className="flex gap-3 pb-4">
                      <span
                        aria-hidden="true"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-superficie-afundada text-texto-apoio"
                      >
                        <Icone nome="calendario" className="size-3" />
                      </span>
                      <div className="min-w-0 flex-grow">
                        <p className="text-sm font-semibold text-texto">{c.titulo}</p>
                        <p className="text-xs text-texto-secundario">
                          <time dateTime={c.inicio}>{dataHora(c.inicio)}</time>
                          {c.endereco ? ` · ${c.endereco}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CartaoCorpo>
          </Cartao>
        </div>

        {/* ===== Trilho lateral ===== */}
        <aside className="flex flex-col gap-4">
          {sessao.pode('sensivel.ver') && (rendaTotal > 0 || pessoa.faixa_valor_max) && (
            <Cartao>
              <CartaoCorpo>
                <h2 className="mb-3 text-sm font-semibold">Capacidade declarada</h2>
                <dl className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs text-texto-apoio">Renda total</dt>
                    <dd data-numerico className="text-md font-bold">
                      {moeda(rendaTotal || null)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-texto-apoio">Faixa procurada</dt>
                    <dd data-numerico className="text-md font-bold">
                      {pessoa.faixa_valor_max ? moedaCurta(pessoa.faixa_valor_max) : '—'}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 rounded-lg bg-superficie-afundada px-3 py-2 text-xs text-texto-secundario">
                  Isto é o que a pessoa <strong>declarou</strong>. A capacidade oficial vem da
                  simulação com o banco.
                </p>
                {sessao.pode('simulacao.criar') && (
                  <Botao tipo="secundario" tamanho="pequeno" larguraTotal className="mt-3" comoFilho>
                    <Link href={`/simulacoes/nova?pessoa=${pessoa.id}`}>Simular financiamento</Link>
                  </Botao>
                )}
              </CartaoCorpo>
            </Cartao>
          )}

          <Cartao>
            <CartaoCorpo>
              {sessao.pode('crm.editar') ? (
                <ControlePortal
                  pessoaId={pessoa.id}
                  liberado={pessoa.portal_liberado}
                  podeLiberar={Boolean(pessoa.cpf && pessoa.data_nascimento)}
                />
              ) : (
                <div>
                  <h3 className="mb-1 text-sm font-semibold">Portal do cliente</h3>
                  <p className="text-xs text-texto-secundario">
                    {pessoa.portal_liberado ? 'Liberado' : 'Pausado'}. Seu papel não permite alterar.
                  </p>
                </div>
              )}
              {pessoa.portal_ultimo_acesso_em && (
                <p className="mt-2 text-micro text-texto-apoio">
                  Último acesso do cliente: {tempoRelativo(pessoa.portal_ultimo_acesso_em)}
                </p>
              )}
            </CartaoCorpo>
          </Cartao>

          <Cartao>
            <CartaoCorpo>
              <h2 className="mb-3 text-sm font-semibold">Tarefas</h2>
              {tarefas.length === 0 ? (
                <p className="text-xs text-texto-secundario">Nenhuma tarefa para esta pessoa.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {tarefas.slice(0, 6).map((t) => (
                    <li key={t.id} className="flex items-start gap-2 text-sm">
                      <span
                        aria-hidden="true"
                        className="mt-1 size-3.5 shrink-0 rounded border border-borda-controle"
                      />
                      <span className="min-w-0 flex-grow">
                        <span className="block truncate text-texto">{t.titulo}</span>
                        {t.prazo && (
                          <span className="block text-micro text-texto-apoio">
                            {formatarData(t.prazo)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CartaoCorpo>
          </Cartao>

          <Cartao>
            <CartaoCorpo>
              <h2 className="mb-2 text-sm font-semibold">Cadastro</h2>
              <dl className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-texto-apoio">Criado em</dt>
                  <dd>{formatarData(pessoa.criado_em)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-texto-apoio">Última interação</dt>
                  <dd>
                    {pessoa.ultima_interacao_em ? tempoRelativo(pessoa.ultima_interacao_em) : 'Nunca'}
                  </dd>
                </div>
                {pessoa.data_nascimento && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-texto-apoio">Nascimento</dt>
                    <dd>{formatarData(pessoa.data_nascimento)}</dd>
                  </div>
                )}
              </dl>
            </CartaoCorpo>
          </Cartao>
        </aside>
      </div>

      {pessoa.observacoes && (
        <Cartao>
          <CartaoCorpo>
            <h2 className="mb-2 text-sm font-semibold">Observações internas</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-texto-secundario">
              {pessoa.observacoes}
            </p>
          </CartaoCorpo>
        </Cartao>
      )}
    </div>
  );
}
