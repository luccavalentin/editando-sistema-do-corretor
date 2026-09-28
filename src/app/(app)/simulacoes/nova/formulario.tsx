'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoTitulo } from '@/components/ui/cartao';
import { Chip } from '@/components/ui/sinal';
import { Icone } from '@/components/shell/icones';
import { cn } from '@/lib/ui';
import { moeda } from '@/lib/formato';
import {
  analisarComprometimento,
  ESTADO_CIVIL_HOMEFIN,
  estimarParcela,
  entradaMinima,
  SITUACAO_IMOVEL_HOMEFIN,
  TAXA_REFERENCIA_ANUAL,
  TIPO_IMOVEL_HOMEFIN,
  USO_IMOVEL_HOMEFIN,
} from '@/dominio/simulacao';
import { criarSimulacao, type EstadoDeSimulacao } from '@/server/acoes/simulacoes';

const CLASSE_ENTRADA =
  'h-10 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-sm text-texto placeholder:text-texto-desabilitado aria-invalid:border-2 aria-invalid:border-perigo';

const CLASSE_SELECT =
  'h-10 w-full rounded-lg border border-borda-controle bg-superficie px-2.5 text-sm text-texto';

/** Bancos oferecidos. Os ids são os da Homefin, confirmados no contrato. */
const BANCOS = [
  { id: 45, nome: 'Bradesco' },
  { id: 61, nome: 'Itaú' },
  { id: 9, nome: 'Santander' },
];

const PRAZOS = [120, 180, 240, 300, 360, 420];

export interface OpcaoDePessoa {
  id: string;
  nome: string;
  temCpf: boolean;
  temNascimento: boolean;
  renda: number | null;
}

export interface OpcaoDeImovel {
  id: string;
  codigo: string;
  titulo: string;
  valor: number | null;
  tipoHomefin: string;
  usoHomefin: string;
  situacaoHomefin: string;
  uf: string | null;
}

function Campo({
  id,
  rotulo,
  erro,
  dica,
  children,
  className,
}: {
  id: string;
  rotulo: string;
  erro?: string;
  dica?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-texto-secundario">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p
          id={`${id}-erro`}
          role="alert"
          className="mt-1 flex items-start gap-1.5 text-xs text-perigo-texto"
        >
          <Icone nome="alerta" className="mt-0.5 size-3 shrink-0" />
          {erro}
        </p>
      ) : dica ? (
        <p className="mt-1 text-xs text-texto-apoio">{dica}</p>
      ) : null}
    </div>
  );
}

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" disabled={pending}>
      {pending ? 'Salvando' : 'Criar simulação'}
    </Botao>
  );
}

/** Lê "R$ 780.000,00" como número, para o cálculo acompanhar a digitação. */
function comoNumero(texto: string): number {
  const limpo = texto.replace(/[R$\s.]/g, '').replace(',', '.');
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

export function FormularioDeSimulacao({
  pessoas,
  imoveis,
  pessoaInicial,
  imovelInicial,
}: {
  pessoas: OpcaoDePessoa[];
  imoveis: OpcaoDeImovel[];
  pessoaInicial?: string | undefined;
  imovelInicial?: string | undefined;
}) {
  const [estado, acao] = useActionState<EstadoDeSimulacao, FormData>(criarSimulacao, {});
  const campos = estado.campos ?? {};

  const imovelPre = imoveis.find((i) => i.id === imovelInicial);

  const [pessoaId, setPessoaId] = useState(pessoaInicial ?? '');
  const [imovelId, setImovelId] = useState(imovelInicial ?? '');
  const [valorImovel, setValorImovel] = useState(
    imovelPre?.valor != null ? String(imovelPre.valor).replace('.', ',') : '',
  );
  const [valorEntrada, setValorEntrada] = useState('');
  const [prazo, setPrazo] = useState('360');
  const [renda, setRenda] = useState('');
  const [sistema, setSistema] = useState<'sac' | 'price'>('sac');
  const [situacaoImovel, setSituacaoImovel] = useState(imovelPre?.situacaoHomefin ?? 'U');
  const [compoeRenda, setCompoeRenda] = useState(false);
  const [rendaCo, setRendaCo] = useState('');

  const pessoa = pessoas.find((p) => p.id === pessoaId);

  /**
   * A estimativa, recalculada a cada tecla.
   *
   * É o motivo de esta tela ser um componente de cliente: o corretor está com
   * o comprador na frente, mexendo na entrada e no prazo para achar a parcela
   * que cabe. Uma ida ao servidor por ajuste tornaria isso insuportável.
   */
  const estimativa = useMemo(() => {
    const imovel = comoNumero(valorImovel);
    const entrada = comoNumero(valorEntrada);
    const financiado = imovel - entrada;
    const meses = Number(prazo) || 0;

    if (financiado <= 0 || meses <= 0) return null;

    const parcelas = estimarParcela(sistema, financiado, meses, TAXA_REFERENCIA_ANUAL);
    const rendaTotal = comoNumero(renda) + (compoeRenda ? comoNumero(rendaCo) : 0);

    return {
      financiado,
      parcelas,
      comprometimento: analisarComprometimento(parcelas.primeira, rendaTotal),
      rendaTotal,
      minimaExigida: entradaMinima(imovel, situacaoImovel === 'N' ? 'N' : 'U'),
      entrada,
    };
  }, [valorImovel, valorEntrada, prazo, renda, sistema, compoeRenda, rendaCo, situacaoImovel]);

  function props(nome: string) {
    return {
      'aria-invalid': campos[nome] ? (true as const) : undefined,
      'aria-describedby': campos[nome] ? `${nome}-erro` : undefined,
    };
  }

  /** Preenche o que já se sabe quando o corretor escolhe o imóvel. */
  function aoEscolherImovel(id: string) {
    setImovelId(id);
    const imovel = imoveis.find((i) => i.id === id);
    if (imovel) {
      if (imovel.valor != null) setValorImovel(String(imovel.valor).replace('.', ','));
      setSituacaoImovel(imovel.situacaoHomefin);
    }
  }

  function aoEscolherPessoa(id: string) {
    setPessoaId(id);
    const escolhida = pessoas.find((p) => p.id === id);
    if (escolhida?.renda != null && renda === '') {
      setRenda(String(escolhida.renda).replace('.', ','));
    }
  }

  return (
    <form action={acao} className="grid grid-cols-1 gap-4 lg:grid-cols-3" noValidate>
      <div className="flex flex-col gap-4 lg:col-span-2">
        {estado.erro && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-perigo-sutil px-3 py-2.5 text-sm text-perigo-texto"
          >
            <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
            {estado.erro}
          </p>
        )}

        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>Para quem</CartaoTitulo>
          </CartaoCabecalho>
          <CartaoCorpo className="flex flex-col gap-3">
            <Campo
              id="pessoaId"
              rotulo="Cliente"
              erro={campos.pessoaId}
              dica="O CPF e a data de nascimento vêm do cadastro. O banco não analisa crédito sem os dois."
            >
              <select
                id="pessoaId"
                name="pessoaId"
                value={pessoaId}
                onChange={(e) => aoEscolherPessoa(e.currentTarget.value)}
                required
                className={CLASSE_SELECT}
                {...props('pessoaId')}
              >
                <option value="">Escolha o cliente</option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                    {!p.temCpf || !p.temNascimento ? ' — cadastro incompleto' : ''}
                  </option>
                ))}
              </select>
            </Campo>

            {/* O aviso aparece ANTES de tentar salvar, com o caminho para
                resolver. Descobrir isso depois do envio recusado é pior. */}
            {pessoa && (!pessoa.temCpf || !pessoa.temNascimento) && (
              <div className="rounded-lg border border-atencao-borda bg-atencao-sutil px-3 py-2.5">
                <p className="text-sm font-medium text-atencao-texto">
                  Falta {!pessoa.temCpf && !pessoa.temNascimento
                    ? 'CPF e data de nascimento'
                    : !pessoa.temCpf
                      ? 'o CPF'
                      : 'a data de nascimento'}{' '}
                  no cadastro de {pessoa.nome}.
                </p>
                <p className="mt-0.5 text-xs text-atencao-texto">
                  O banco exige para analisar. Você pode montar a simulação agora, mas o envio
                  só funciona depois de completar.
                </p>
                <Link
                  href={`/clientes/${pessoa.id}`}
                  className="mt-1.5 inline-block text-xs font-semibold text-link hover:underline"
                >
                  Abrir cadastro
                </Link>
              </div>
            )}

            <Campo
              id="imovelId"
              rotulo="Imóvel"
              erro={campos.imovelId}
              dica="Opcional. Escolher preenche o valor e o tipo automaticamente."
            >
              <select
                id="imovelId"
                name="imovelId"
                value={imovelId}
                onChange={(e) => aoEscolherImovel(e.currentTarget.value)}
                className={CLASSE_SELECT}
              >
                <option value="">Sem imóvel definido ainda</option>
                {imoveis.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.codigo} — {i.titulo}
                  </option>
                ))}
              </select>
            </Campo>
          </CartaoCorpo>
        </Cartao>

        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>Números</CartaoTitulo>
          </CartaoCabecalho>
          <CartaoCorpo className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo id="valorImovel" rotulo="Valor do imóvel" erro={campos.valorImovel}>
              <input
                id="valorImovel"
                name="valorImovel"
                inputMode="decimal"
                value={valorImovel}
                onChange={(e) => setValorImovel(e.currentTarget.value)}
                placeholder="800.000,00"
                required
                className={CLASSE_ENTRADA}
                {...props('valorImovel')}
              />
            </Campo>

            <Campo
              id="valorEntrada"
              rotulo="Entrada"
              erro={campos.valorEntrada}
              dica={
                estimativa && estimativa.minimaExigida > 0
                  ? `Mínimo usual: ${moeda(estimativa.minimaExigida)}`
                  : undefined
              }
            >
              <input
                id="valorEntrada"
                name="valorEntrada"
                inputMode="decimal"
                value={valorEntrada}
                onChange={(e) => setValorEntrada(e.currentTarget.value)}
                placeholder="240.000,00"
                className={CLASSE_ENTRADA}
                {...props('valorEntrada')}
              />
            </Campo>

            <Campo id="prazoMeses" rotulo="Prazo" erro={campos.prazoMeses}>
              <select
                id="prazoMeses"
                name="prazoMeses"
                value={prazo}
                onChange={(e) => setPrazo(e.currentTarget.value)}
                className={CLASSE_SELECT}
                {...props('prazoMeses')}
              >
                {PRAZOS.map((meses) => (
                  <option key={meses} value={meses}>
                    {meses} meses ({meses / 12} anos)
                  </option>
                ))}
              </select>
            </Campo>

            <Campo
              id="sistemaAmortizacao"
              rotulo="Sistema"
              dica={
                sistema === 'sac'
                  ? 'Parcela começa maior e cai todo mês'
                  : 'Parcela fixa, mas o total pago é maior'
              }
            >
              <select
                id="sistemaAmortizacao"
                name="sistemaAmortizacao"
                value={sistema}
                onChange={(e) => setSistema(e.currentTarget.value as 'sac' | 'price')}
                className={CLASSE_SELECT}
              >
                <option value="sac">SAC — parcela decrescente</option>
                <option value="price">PRICE — parcela fixa</option>
              </select>
            </Campo>

            <Campo
              id="rendaTotal"
              rotulo="Renda do cliente"
              erro={campos.rendaTotal}
              dica="Renda bruta mensal"
            >
              <input
                id="rendaTotal"
                name="rendaTotal"
                inputMode="decimal"
                value={renda}
                onChange={(e) => setRenda(e.currentTarget.value)}
                placeholder="18.400,00"
                required
                className={CLASSE_ENTRADA}
                {...props('rendaTotal')}
              />
            </Campo>

            <Campo id="uf" rotulo="UF do imóvel" erro={campos.uf}>
              <input
                id="uf"
                name="uf"
                maxLength={2}
                defaultValue={imovelPre?.uf ?? ''}
                placeholder="SP"
                required
                className={cn(CLASSE_ENTRADA, 'uppercase')}
                {...props('uf')}
              />
            </Campo>

            <Campo id="tipoImovelHomefin" rotulo="Tipo do imóvel">
              <select
                id="tipoImovelHomefin"
                name="tipoImovelHomefin"
                defaultValue={imovelPre?.tipoHomefin ?? 'AP'}
                className={CLASSE_SELECT}
              >
                {Object.entries(TIPO_IMOVEL_HOMEFIN).map(([chave, rotulo]) => (
                  <option key={chave} value={chave}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo id="situacaoImovelHomefin" rotulo="Novo ou usado">
              <select
                id="situacaoImovelHomefin"
                name="situacaoImovelHomefin"
                value={situacaoImovel}
                onChange={(e) => setSituacaoImovel(e.currentTarget.value)}
                className={CLASSE_SELECT}
              >
                {Object.entries(SITUACAO_IMOVEL_HOMEFIN).map(([chave, rotulo]) => (
                  <option key={chave} value={chave}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo id="usoImovelHomefin" rotulo="Uso">
              <select
                id="usoImovelHomefin"
                name="usoImovelHomefin"
                defaultValue={imovelPre?.usoHomefin ?? 'R'}
                className={CLASSE_SELECT}
              >
                {Object.entries(USO_IMOVEL_HOMEFIN).map(([chave, rotulo]) => (
                  <option key={chave} value={chave}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo id="estadoCivilHomefin" rotulo="Estado civil">
              <select
                id="estadoCivilHomefin"
                name="estadoCivilHomefin"
                className={CLASSE_SELECT}
              >
                <option value="">Não informado</option>
                {Object.entries(ESTADO_CIVIL_HOMEFIN).map(([chave, rotulo]) => (
                  <option key={chave} value={chave}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </Campo>

            {/* Texto direto no <label> e explicação por `aria-describedby`.
                Aninhar o rótulo em <span> o esconde de parte dos leitores de
                tela, e este campo muda o que o banco analisa. */}
            <div className="flex items-start gap-2.5 rounded-lg border border-borda p-3 sm:col-span-2">
              <input
                id="usaFgts"
                type="checkbox"
                name="usaFgts"
                aria-describedby="fgts-explicacao"
                className="mt-0.5 size-4 shrink-0 accent-[var(--cor-acao)]"
              />
              <div>
                <label
                  htmlFor="usaFgts"
                  className="block cursor-pointer text-sm font-medium text-texto"
                >
                  Vai usar FGTS
                </label>
                <p id="fgts-explicacao" className="mt-0.5 text-xs text-texto-apoio">
                  Muda a análise do banco. Marcar errado aqui faz a proposta sair diferente do
                  que o cliente pediu.
                </p>
              </div>
            </div>
          </CartaoCorpo>
        </Cartao>

        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>Composição de renda</CartaoTitulo>
          </CartaoCabecalho>
          <CartaoCorpo className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <input
                id="compoeRenda"
                name="compoeRenda"
                type="checkbox"
                checked={compoeRenda}
                onChange={(e) => setCompoeRenda(e.currentTarget.checked)}
                aria-describedby="compoe-explicacao"
                className="mt-1 size-4 shrink-0 accent-[var(--cor-acao)]"
              />
              <div>
                <label
                  htmlFor="compoeRenda"
                  className="block cursor-pointer text-sm font-medium text-texto"
                >
                  Somar a renda de outra pessoa
                </label>
                <p id="compoe-explicacao" className="mt-0.5 text-xs text-texto-apoio">
                  Cônjuge, filho, sócio. É o caminho mais comum quando a parcela passa de 30% da
                  renda.
                </p>
              </div>
            </div>

            {compoeRenda && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo
                  id="nomeCoparticipante"
                  rotulo="Nome"
                  erro={campos.nomeCoparticipante}
                  className="sm:col-span-2"
                >
                  <input
                    id="nomeCoparticipante"
                    name="nomeCoparticipante"
                    className={CLASSE_ENTRADA}
                    {...props('nomeCoparticipante')}
                  />
                </Campo>

                <Campo
                  id="cpfCoparticipante"
                  rotulo="CPF"
                  erro={campos.cpfCoparticipante}
                  dica="Precisa ser diferente do CPF do titular"
                >
                  <input
                    id="cpfCoparticipante"
                    name="cpfCoparticipante"
                    inputMode="numeric"
                    className={CLASSE_ENTRADA}
                    {...props('cpfCoparticipante')}
                  />
                </Campo>

                <Campo id="dataNascimentoCoparticipante" rotulo="Nascimento">
                  <input
                    id="dataNascimentoCoparticipante"
                    name="dataNascimentoCoparticipante"
                    type="date"
                    className={CLASSE_ENTRADA}
                  />
                </Campo>

                <Campo id="rendaCoparticipante" rotulo="Renda" className="sm:col-span-2">
                  <input
                    id="rendaCoparticipante"
                    name="rendaCoparticipante"
                    inputMode="decimal"
                    value={rendaCo}
                    onChange={(e) => setRendaCo(e.currentTarget.value)}
                    placeholder="6.000,00"
                    className={CLASSE_ENTRADA}
                  />
                </Campo>
              </div>
            )}
          </CartaoCorpo>
        </Cartao>

        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>Bancos a consultar</CartaoTitulo>
          </CartaoCabecalho>
          <CartaoCorpo>
            <fieldset>
              <legend className="so-leitor">Escolha os bancos</legend>
              <div className="flex flex-wrap gap-2">
                {BANCOS.map((banco) => (
                  <label
                    key={banco.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-borda px-3.5 py-2.5 text-sm transition-colors hover:bg-superficie-hover has-[:checked]:border-acao has-[:checked]:bg-acao-sutil has-[:checked]:text-acao-sutil-texto"
                  >
                    <input
                      type="checkbox"
                      name="bancos"
                      value={banco.id}
                      defaultChecked
                      className="size-4 accent-[var(--cor-acao)]"
                    />
                    {banco.nome}
                  </label>
                ))}
              </div>
            </fieldset>
            {campos.bancos && (
              <p role="alert" className="mt-2 text-xs text-perigo-texto">
                {campos.bancos}
              </p>
            )}
            <p className="mt-2 text-xs text-texto-apoio">
              Consultar mais bancos dá mais opções ao cliente e não custa nada a mais — cada um
              analisa por conta própria.
            </p>
          </CartaoCorpo>
        </Cartao>

        <Cartao>
          <CartaoCorpo>
            <Campo id="observacoes" rotulo="Observações internas">
              <textarea
                id="observacoes"
                name="observacoes"
                rows={3}
                maxLength={2000}
                placeholder="Cliente prefere parcela menor mesmo pagando mais no total"
                className="w-full rounded-lg border border-borda-controle bg-superficie px-3 py-2 text-sm text-texto placeholder:text-texto-desabilitado"
              />
            </Campo>
          </CartaoCorpo>
        </Cartao>

        <div className="flex flex-wrap items-center gap-2 pb-2">
          <BotaoSalvar />
          <Botao tipo="neutro" comoFilho>
            <Link href="/simulacoes">Cancelar</Link>
          </Botao>
          <p className="text-xs text-texto-apoio">
            Salvar não envia nada aos bancos. O envio é um passo separado.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------
          A ESTIMATIVA, ao lado e fixa.
          Fica visível enquanto o corretor mexe nos números porque é assim que
          a conversa acontece: "e se eu der mais de entrada?", "e em 30 anos?".
      ------------------------------------------------------------------- */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>
              <span className="flex items-center gap-2">
                <Icone nome="calculadora" className="size-4" />
                Estimativa
              </span>
            </CartaoTitulo>
          </CartaoCabecalho>
          <CartaoCorpo>
            {/* O aviso vem PRIMEIRO, antes do número. É o princípio 7 do
                produto: nunca apresentar cálculo próprio como se fosse
                resposta de banco. */}
            <p className="mb-3 rounded-lg bg-superficie-afundada px-3 py-2 text-xs text-texto-secundario">
              Cálculo feito aqui, com taxa de referência de{' '}
              <strong>{TAXA_REFERENCIA_ANUAL}% ao ano</strong>. Não é proposta de banco — serve
              para conversar com o cliente enquanto a resposta real não chega.
            </p>

            {!estimativa ? (
              <p className="py-4 text-center text-sm text-texto-apoio">
                Preencha o valor do imóvel e a entrada para ver a parcela.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs text-texto-apoio">
                    {sistema === 'sac' ? 'Primeira parcela' : 'Parcela fixa'}
                  </p>
                  <p className="text-3xl font-bold leading-tight text-texto">
                    {moeda(estimativa.parcelas.primeira)}
                  </p>
                  {sistema === 'sac' && (
                    <p className="text-xs text-texto-secundario">
                      Última: {moeda(estimativa.parcelas.ultima)}
                    </p>
                  )}
                </div>

                {estimativa.rendaTotal > 0 && (
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2.5',
                      estimativa.comprometimento.cabe
                        ? 'bg-sucesso-sutil'
                        : 'bg-atencao-sutil',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          estimativa.comprometimento.cabe
                            ? 'text-sucesso-texto'
                            : 'text-atencao-texto',
                        )}
                      >
                        Compromete {estimativa.comprometimento.percentual}% da renda
                      </span>
                      <Chip tom={estimativa.comprometimento.cabe ? 'sucesso' : 'atencao'}>
                        {estimativa.comprometimento.cabe ? 'Cabe' : 'Apertado'}
                      </Chip>
                    </div>
                    {estimativa.comprometimento.aviso && (
                      <p className="mt-1 text-xs text-atencao-texto">
                        {estimativa.comprometimento.aviso}
                      </p>
                    )}
                  </div>
                )}

                <dl className="flex flex-col gap-1.5 border-t border-borda pt-3 text-sm">
                  <Linha rotulo="Financiado" valor={moeda(estimativa.financiado)} />
                  <Linha rotulo="Entrada" valor={moeda(estimativa.entrada)} />
                  <Linha rotulo="Total de juros" valor={moeda(estimativa.parcelas.juros)} />
                  <Linha rotulo="Total pago" valor={moeda(estimativa.parcelas.total)} />
                </dl>

                {estimativa.entrada < estimativa.minimaExigida && (
                  <p className="flex items-start gap-1.5 rounded-lg bg-atencao-sutil px-3 py-2 text-xs text-atencao-texto">
                    <Icone nome="alerta" className="mt-0.5 size-3 shrink-0" />
                    Os bancos costumam exigir entrada de pelo menos{' '}
                    {moeda(estimativa.minimaExigida)} para imóvel{' '}
                    {situacaoImovel === 'N' ? 'novo' : 'usado'}.
                  </p>
                )}
              </div>
            )}
          </CartaoCorpo>
        </Cartao>
      </aside>
    </form>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-texto-apoio">{rotulo}</dt>
      <dd className="font-medium text-texto">{valor}</dd>
    </div>
  );
}
