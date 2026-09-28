'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoTitulo } from '@/components/ui/cartao';
import { Icone } from '@/components/shell/icones';
import { cn } from '@/lib/ui';
import { cadastrarPessoa, type EstadoDeCadastro } from '@/server/acoes/pessoas';

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
        <p id={`${id}-erro`} role="alert" className="mt-1 flex items-center gap-1.5 text-xs text-perigo-texto">
          <Icone nome="alerta" className="size-3" />
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="mt-1 text-xs text-texto-apoio">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

const CLASSE_ENTRADA =
  'h-10 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-sm text-texto placeholder:text-texto-desabilitado aria-invalid:border-2 aria-invalid:border-perigo';

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" disabled={pending}>
      {pending ? 'Salvando' : 'Cadastrar cliente'}
    </Botao>
  );
}

export function FormularioDeCliente() {
  const [estado, acao] = useActionState<EstadoDeCadastro, FormData>(cadastrarPessoa, {});
  const campos = estado.campos ?? {};

  /** `aria-invalid` + `aria-describedby` é o que o leitor de tela usa. */
  function props(nome: string) {
    return {
      'aria-invalid': campos[nome] ? (true as const) : undefined,
      'aria-describedby': campos[nome] ? `${nome}-erro` : undefined,
    };
  }

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {/* ------------------------------------------------------------------
          DUPLICIDADE — o critério de aceite 2 na interface.
          Não é só um erro: mostra QUEM já está cadastrado e leva até lá. Sem
          esse caminho, o corretor apagaria o CPF só para conseguir salvar, e a
          duplicidade aconteceria mesmo assim.
      ------------------------------------------------------------------- */}
      {estado.duplicado && (
        <div
          role="alert"
          className="rounded-xl border border-atencao-borda bg-atencao-sutil px-4 py-3.5"
        >
          <div className="mb-1.5 flex items-center gap-2">
            <Icone nome="alerta" className="size-4 text-atencao-texto" />
            <h2 className="text-sm font-bold text-atencao-texto">Essa pessoa já está na sua carteira</h2>
          </div>
          <p className="mb-3 text-sm text-atencao-texto">
            O CPF <strong>{estado.duplicado.cpfMascarado}</strong> já pertence a{' '}
            <strong>{estado.duplicado.nome}</strong>. Cada pessoa tem um único cadastro — abra o
            que já existe e registre o novo interesse como um negócio.
          </p>
          <div className="flex flex-wrap gap-2">
            <Botao tamanho="pequeno" comoFilho>
              <Link href={`/clientes/${estado.duplicado.id}`}>Abrir cadastro existente</Link>
            </Botao>
            <Botao tipo="neutro" tamanho="pequeno" comoFilho>
              <Link href={`/negocios/novo?pessoa=${estado.duplicado.id}`}>
                Criar negócio para essa pessoa
              </Link>
            </Botao>
          </div>
        </div>
      )}

      {estado.erro && !estado.duplicado && (
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
          <CartaoTitulo>Quem é</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoCorpo className="grid gap-4 sm:grid-cols-2">
          <Campo id="nome" rotulo="Nome completo" erro={campos.nome} className="sm:col-span-2">
            <input
              id="nome"
              name="nome"
              required
              autoFocus
              autoComplete="name"
              placeholder="Mariana Duarte"
              className={CLASSE_ENTRADA}
              {...props('nome')}
            />
          </Campo>

          <Campo
            id="cpf"
            rotulo="CPF"
            erro={campos.cpf}
            dica="Os dígitos são conferidos. É o que impede o cadastro duplicado."
          >
            <input
              id="cpf"
              name="cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              className={CLASSE_ENTRADA}
              {...props('cpf')}
            />
          </Campo>

          <Campo
            id="dataNascimento"
            rotulo="Data de nascimento"
            erro={campos.dataNascimento}
            dica="Com CPF e nascimento, o cliente pode acessar o portal."
          >
            <input
              id="dataNascimento"
              name="dataNascimento"
              type="date"
              className={CLASSE_ENTRADA}
              {...props('dataNascimento')}
            />
          </Campo>

          <Campo id="celular" rotulo="Celular" erro={campos.celular}>
            <input
              id="celular"
              name="celular"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 91234-5678"
              className={CLASSE_ENTRADA}
              {...props('celular')}
            />
          </Campo>

          <Campo id="email" rotulo="E-mail" erro={campos.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="mariana@email.com"
              className={CLASSE_ENTRADA}
              {...props('email')}
            />
          </Campo>

          <Campo id="cidade" rotulo="Cidade" erro={campos.cidade}>
            <input id="cidade" name="cidade" placeholder="São Paulo" className={CLASSE_ENTRADA} />
          </Campo>

          <Campo id="uf" rotulo="UF" erro={campos.uf}>
            <input
              id="uf"
              name="uf"
              maxLength={2}
              placeholder="SP"
              className={cn(CLASSE_ENTRADA, 'uppercase')}
              {...props('uf')}
            />
          </Campo>
        </CartaoCorpo>
      </Cartao>

      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>O que procura</CartaoTitulo>
          <span className="text-xs text-texto-secundario">
            Alimenta a simulação e a sugestão de imóveis
          </span>
        </CartaoCabecalho>
        <CartaoCorpo className="grid gap-4 sm:grid-cols-2">
          <Campo id="renda" rotulo="Renda mensal" erro={campos.renda}>
            <input
              id="renda"
              name="renda"
              inputMode="decimal"
              placeholder="11.200,00"
              className={CLASSE_ENTRADA}
              {...props('renda')}
            />
          </Campo>

          <Campo
            id="rendaComposta"
            rotulo="Renda de quem compõe"
            erro={campos.rendaComposta}
            dica="Cônjuge ou participante de renda."
          >
            <input
              id="rendaComposta"
              name="rendaComposta"
              inputMode="decimal"
              placeholder="7.200,00"
              className={CLASSE_ENTRADA}
              {...props('rendaComposta')}
            />
          </Campo>

          <Campo id="faixaValorMin" rotulo="Faixa de valor — de" erro={campos.faixaValorMin}>
            <input
              id="faixaValorMin"
              name="faixaValorMin"
              inputMode="decimal"
              placeholder="600.000,00"
              className={CLASSE_ENTRADA}
            />
          </Campo>

          <Campo id="faixaValorMax" rotulo="Faixa de valor — até" erro={campos.faixaValorMax}>
            <input
              id="faixaValorMax"
              name="faixaValorMax"
              inputMode="decimal"
              placeholder="800.000,00"
              className={CLASSE_ENTRADA}
              {...props('faixaValorMax')}
            />
          </Campo>

          <Campo
            id="objetivo"
            rotulo="Objetivo de compra"
            erro={campos.objetivo}
            className="sm:col-span-2"
          >
            <textarea
              id="objetivo"
              name="objetivo"
              rows={2}
              placeholder="3 dormitórios na Vila Mariana ou Ipiranga, com vaga dupla"
              className="w-full rounded-lg border border-borda-controle bg-superficie px-3 py-2 text-sm text-texto placeholder:text-texto-desabilitado"
            />
          </Campo>
        </CartaoCorpo>
      </Cartao>

      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>De onde veio</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoCorpo className="grid gap-4 sm:grid-cols-3">
          <Campo id="origem" rotulo="Origem">
            <select id="origem" name="origem" className={CLASSE_ENTRADA} defaultValue="">
              <option value="">Não informada</option>
              <option value="indicacao">Indicação</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telefone">Telefone</option>
              <option value="portal_imobiliario">Portal imobiliário</option>
              <option value="portal">Portfólio público</option>
              <option value="presencial">Presencial</option>
              <option value="email">E-mail</option>
              <option value="outro">Outro</option>
            </select>
          </Campo>

          <Campo id="origemDetalhe" rotulo="Detalhe da origem">
            <input
              id="origemDetalhe"
              name="origemDetalhe"
              placeholder="Indicado por Bianca Prado"
              className={CLASSE_ENTRADA}
            />
          </Campo>

          <Campo
            id="temperatura"
            rotulo="Temperatura"
            dica="Quente entra nas prioridades do painel."
          >
            <select
              id="temperatura"
              name="temperatura"
              className={CLASSE_ENTRADA}
              defaultValue="morno"
            >
              <option value="quente">Quente</option>
              <option value="morno">Morno</option>
              <option value="frio">Frio</option>
            </select>
          </Campo>

          <Campo id="observacoes" rotulo="Observações internas" className="sm:col-span-3">
            <textarea
              id="observacoes"
              name="observacoes"
              rows={3}
              placeholder="O que mais importa lembrar sobre essa pessoa"
              className="w-full rounded-lg border border-borda-controle bg-superficie px-3 py-2 text-sm text-texto placeholder:text-texto-desabilitado"
            />
          </Campo>
        </CartaoCorpo>
      </Cartao>

      <div className="flex items-center gap-2">
        <BotaoSalvar />
        <Botao tipo="neutro" comoFilho>
          <Link href="/clientes">Cancelar</Link>
        </Botao>
      </div>
    </form>
  );
}
