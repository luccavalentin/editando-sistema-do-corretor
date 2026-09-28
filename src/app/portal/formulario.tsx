'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Icone } from '@/components/shell/icones';
import { formatarDataDigitada } from '@/dominio/data-digitada';
import { entrarNoPortal, type EstadoDaEntrada } from '@/server/acoes/portal-entrada';

/** Formata o CPF enquanto o cliente digita. */
function formatarCpf(bruto: string): string {
  const numeros = bruto.replace(/\D/g, '').slice(0, 11);
  return numeros
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

function BotaoEntrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-lg bg-acao text-md font-semibold text-acao-texto transition-colors hover:bg-acao-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Entrando' : 'Entrar'}
    </button>
  );
}

export function FormularioDoPortal() {
  const [estado, acao] = useActionState<EstadoDaEntrada, FormData>(entrarNoPortal, {});

  // OS DOIS CAMPOS SÃO CONTROLADOS, e o da data não é por capricho.
  //
  // Um `<input type="date">` sem `value` volta vazio quando a Server Action
  // redesenha a tela depois de um erro. O CPF sobrevivia (é controlado) e a
  // data sumia — o cliente não entende por que só um campo apagou, e redigita
  // a data a cada tentativa.
  //
  // Com limite de CINCO tentativas antes do bloqueio de 30 minutos, dificultar
  // a retentativa é ativamente prejudicial: quem errou a data uma vez precisa
  // conseguir corrigir sem recomeçar.
  const [cpf, setCpf] = useState('');
  const [nascimento, setNascimento] = useState('');

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {estado.erro && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-perigo-sutil px-3 py-3 text-sm text-perigo-texto"
        >
          <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
          <div>
            <p>{estado.erro}</p>
            {/* Bloqueio não é erro de digitação: insistir piora. Dizer quanto
                tempo falta evita a pessoa tentar mais dez vezes. */}
            {estado.espera != null && estado.espera > 0 && (
              <p className="mt-1 font-semibold">
                Tente de novo em {Math.ceil(estado.espera / 60)} minutos.
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="cpf" className="mb-1.5 block text-sm font-semibold text-texto-secundario">
          Seu CPF
        </label>
        <input
          id="cpf"
          name="cpf"
          inputMode="numeric"
          autoComplete="off"
          required
          value={cpf}
          onChange={(e) => setCpf(formatarCpf(e.currentTarget.value))}
          placeholder="000.000.000-00"
          // `text-lg` de propósito: o portal é aberto no celular, muitas vezes
          // por quem tem mais de 50 anos, digitando o próprio CPF de cabeça.
          className="h-12 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-lg text-texto placeholder:text-texto-desabilitado"
        />
      </div>

      <div>
        <label
          htmlFor="nascimento"
          className="mb-1.5 block text-sm font-semibold text-texto-secundario"
        >
          Sua data de nascimento
        </label>
        {/*
          Campo de TEXTO com máscara, não `type="date"`.

          O nativo abre no mês atual e obriga a navegar trinta anos para trás —
          e, pior, mostra `dd/mm/aaaa` ou `mm/dd/aaaa` conforme o idioma do
          SISTEMA, não do site. Quem tem o Windows em inglês digitava
          11/03/1994 pensando em 11 de março e entrava 3 de novembro, sem
          nenhum aviso: o login apenas falhava.

          `inputMode="numeric"` abre o teclado de números no celular, que é
          onde o cliente abre este portal.
        */}
        <input
          id="nascimento"
          name="nascimento"
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          required
          value={nascimento}
          onChange={(e) => setNascimento(formatarDataDigitada(e.target.value))}
          className="h-12 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-lg text-texto placeholder:text-texto-desabilitado"
        />
        <p className="mt-1 text-xs text-texto-apoio">Só os números: 11031994</p>
      </div>

      <BotaoEntrar />

      <p className="text-center text-xs text-texto-apoio">
        Não é preciso criar senha. Se não conseguir entrar, fale com seu corretor.
      </p>
    </form>
  );
}
