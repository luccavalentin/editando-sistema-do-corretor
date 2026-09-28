'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoTitulo } from '@/components/ui/cartao';
import { Icone } from '@/components/shell/icones';
import { FUSOS_DO_BRASIL } from '@/dominio/conta';
import { formatarCnpj, formatarCpf, soNumeros } from '@/lib/privacidade/documentos';
import { salvarConta, type EstadoDaConta } from '@/server/acoes/conta';

const CLASSE_ENTRADA =
  'h-10 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-sm text-texto placeholder:text-texto-desabilitado aria-invalid:border-2 aria-invalid:border-perigo';

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" disabled={pending}>
      {pending ? 'Salvando' : 'Salvar'}
    </Botao>
  );
}

/** Formata como CPF até 11 dígitos, como CNPJ a partir daí. */
function formatarDocumento(bruto: string): string {
  const numeros = soNumeros(bruto).slice(0, 14);
  return numeros.length <= 11 ? formatarCpf(numeros) : formatarCnpj(numeros);
}

function Campo({
  id,
  rotulo,
  erro,
  dica,
  children,
}: {
  id: string;
  rotulo: string;
  erro?: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-texto-secundario">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="mt-1 flex items-start gap-1.5 text-xs text-perigo-texto">
          <Icone nome="alerta" className="mt-0.5 size-3 shrink-0" />
          {erro}
        </p>
      ) : dica ? (
        <p className="mt-1 text-xs text-texto-apoio">{dica}</p>
      ) : null}
    </div>
  );
}

export function FormularioDaConta({
  valores,
}: {
  valores: { nome: string; cpfCnpj: string; creci: string; fusoHorario: string };
}) {
  const [estado, acao] = useActionState<EstadoDaConta, FormData>(salvarConta, {});
  const [documento, setDocumento] = useState(formatarDocumento(valores.cpfCnpj));

  const campos = estado.campos ?? {};

  function props(nome: string) {
    return {
      'aria-invalid': campos[nome] ? (true as const) : undefined,
      'aria-describedby': campos[nome] ? `${nome}-erro` : undefined,
    };
  }

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

      {estado.sucesso && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-sucesso-sutil px-3 py-2.5 text-sm text-sucesso-texto"
        >
          <Icone nome="escudo" className="mt-0.5 size-4 shrink-0" />
          {estado.sucesso}
        </p>
      )}

      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>Dados da imobiliária</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoCorpo className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo
            id="nome"
            rotulo="Nome"
            erro={campos.nome}
            dica="Aparece no topo do sistema e nos documentos que você gera."
          >
            <input
              id="nome"
              name="nome"
              defaultValue={valores.nome}
              required
              maxLength={160}
              className={CLASSE_ENTRADA}
              {...props('nome')}
            />
          </Campo>

          <Campo
            id="creci"
            rotulo="CRECI"
            erro={campos.creci}
            dica="Aparece no seu portfólio público."
          >
            <input
              id="creci"
              name="creci"
              defaultValue={valores.creci}
              maxLength={40}
              placeholder="CRECI-SP 123456"
              className={CLASSE_ENTRADA}
              {...props('creci')}
            />
          </Campo>

          <Campo
            id="cpfCnpj"
            rotulo="CPF ou CNPJ"
            erro={campos.cpfCnpj}
            dica="Opcional, mas entra nos contratos. Os dígitos são conferidos."
          >
            <input
              id="cpfCnpj"
              name="cpfCnpj"
              inputMode="numeric"
              value={documento}
              onChange={(e) => setDocumento(formatarDocumento(e.currentTarget.value))}
              placeholder="000.000.000-00"
              className={CLASSE_ENTRADA}
              {...props('cpfCnpj')}
            />
          </Campo>

          <Campo
            id="fusoHorario"
            rotulo="Fuso horário"
            dica="Define a hora dos prazos, da agenda e dos relatórios."
          >
            <select
              id="fusoHorario"
              name="fusoHorario"
              defaultValue={valores.fusoHorario}
              className="h-10 w-full rounded-lg border border-borda-controle bg-superficie px-2.5 text-sm text-texto"
            >
              {Object.entries(FUSOS_DO_BRASIL).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>
        </CartaoCorpo>
      </Cartao>

      <div className="pb-2">
        <BotaoSalvar />
      </div>
    </form>
  );
}
