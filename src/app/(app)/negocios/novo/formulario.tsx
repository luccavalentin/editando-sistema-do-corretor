'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCorpo } from '@/components/ui/cartao';
import { Icone } from '@/components/shell/icones';
import { criarNegocio, type EstadoDeNegocio } from '@/server/acoes/negocios';

const ENTRADA =
  'h-10 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-sm text-texto placeholder:text-texto-desabilitado aria-invalid:border-2 aria-invalid:border-perigo';

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" disabled={pending}>
      {pending ? 'Criando' : 'Criar negócio'}
    </Botao>
  );
}

export function FormularioDeNegocio({
  clientes,
  etapas,
  pessoaPreSelecionada,
}: {
  clientes: { id: string; nome: string }[];
  etapas: { id: string; nome: string; ordem: number }[];
  pessoaPreSelecionada?: string;
}) {
  const [estado, acao] = useActionState<EstadoDeNegocio, FormData>(criarNegocio, {});
  const campos = estado.campos ?? {};

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
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
        <CartaoCorpo className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="pessoaId" className="mb-1.5 block text-xs font-semibold text-texto-secundario">
              Cliente
            </label>
            {clientes.length === 0 ? (
              <p className="rounded-lg border border-atencao-borda bg-atencao-sutil px-3 py-2.5 text-sm text-atencao-texto">
                Você ainda não tem clientes cadastrados. Um negócio precisa de uma pessoa.{' '}
                <Link href="/clientes/novo" className="font-semibold underline">
                  Cadastrar cliente
                </Link>
              </p>
            ) : (
              <select
                id="pessoaId"
                name="pessoaId"
                required
                defaultValue={pessoaPreSelecionada ?? ''}
                aria-invalid={campos.pessoaId ? true : undefined}
                className={ENTRADA}
              >
                <option value="">Escolha o cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            )}
            {campos.pessoaId && (
              <p role="alert" className="mt-1 text-xs text-perigo-texto">
                {campos.pessoaId}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="titulo" className="mb-1.5 block text-xs font-semibold text-texto-secundario">
              Título do negócio
            </label>
            <input
              id="titulo"
              name="titulo"
              placeholder="Apto 3 dorm · Vila Mariana"
              className={ENTRADA}
            />
            <p className="mt-1 text-xs text-texto-apoio">
              Opcional. Em branco, o negócio aparece pelo código gerado automaticamente.
            </p>
          </div>

          <div>
            <label htmlFor="etapaId" className="mb-1.5 block text-xs font-semibold text-texto-secundario">
              Etapa inicial
            </label>
            <select
              id="etapaId"
              name="etapaId"
              required
              defaultValue={etapas[0]?.id ?? ''}
              aria-invalid={campos.etapaId ? true : undefined}
              className={ENTRADA}
            >
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="valor" className="mb-1.5 block text-xs font-semibold text-texto-secundario">
              Valor estimado
            </label>
            <input
              id="valor"
              name="valor"
              inputMode="decimal"
              placeholder="780.000,00"
              aria-invalid={campos.valor ? true : undefined}
              className={ENTRADA}
            />
            {campos.valor && (
              <p role="alert" className="mt-1 text-xs text-perigo-texto">
                {campos.valor}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="previsaoFechamento"
              className="mb-1.5 block text-xs font-semibold text-texto-secundario"
            >
              Previsão de fechamento
            </label>
            <input id="previsaoFechamento" name="previsaoFechamento" type="date" className={ENTRADA} />
          </div>
        </CartaoCorpo>
      </Cartao>

      <div className="flex items-center gap-2">
        <BotaoSalvar />
        <Botao tipo="neutro" comoFilho>
          <Link href="/negocios">Cancelar</Link>
        </Botao>
      </div>
    </form>
  );
}
