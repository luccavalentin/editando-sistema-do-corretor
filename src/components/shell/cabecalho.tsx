'use client';

import Link from 'next/link';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Icone } from './icones';
import { iniciais } from '@/lib/formato';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import type { Papel } from '@/lib/supabase/tipos-banco';

function AlternarTema() {
  const { resolvedTheme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  // O tema só é conhecido depois da hidratação: o servidor não sabe a
  // preferência do sistema operacional. Renderizar o ícone antes disso produz
  // um sol que vira lua na frente do usuário — por isso o espaço é reservado e
  // o ícone entra depois.
  useEffect(() => setMontado(true), []);

  const escuro = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(escuro ? 'light' : 'dark')}
      data-haptico="selecao"
      aria-label={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className="toque-premium flex size-9 items-center justify-center rounded-lg border border-borda bg-superficie text-texto-secundario hover:bg-superficie-hover"
    >
      {montado && <Icone nome={escuro ? 'sol' : 'lua'} className="size-4" />}
    </button>
  );
}

export function Cabecalho({
  nome,
  papel,
  naoLidas,
  aoSair,
}: {
  nome: string;
  papel: Papel;
  naoLidas: number;
  aoSair: () => void;
}) {
  return (
    <header
      data-nao-imprime
      className="vidro-sticky sticky top-0 z-cabecalho flex h-14 shrink-0 items-center gap-3 border-b border-borda px-4 lg:px-6"
    >
      <form action="/busca" role="search" className="flex flex-grow items-center gap-2">
        <Icone nome="busca" className="size-4 shrink-0 text-texto-apoio" />
        <label htmlFor="busca-global" className="so-leitor">
          Buscar cliente, imóvel, CPF ou código do imóvel
        </label>
        <input
          id="busca-global"
          name="q"
          type="search"
          placeholder="Buscar cliente, imóvel, CPF ou código"
          className="h-9 w-full max-w-md rounded-lg border border-borda bg-fundo px-3 text-sm text-texto placeholder:text-texto-desabilitado"
        />
      </form>

      {/*
        Vai para `/followups`, e não para `/notificacoes`.

        O sininho apontava para uma rota que NÃO EXISTE — clicar nele dava 404.
        E o número que ele mostra sempre foi a contagem de follow-ups vencidos,
        nunca "notificações": o destino agora é o mesmo lugar de onde o número
        vem. Uma central de notificações de verdade é outra tela, que ainda não
        existe; apontar para ela antes da hora é o mesmo erro de novo.
      */}
      <Link
        href="/followups"
        aria-label={
          naoLidas > 0
            ? `${naoLidas} retornos pendentes`
            : 'Retornos pendentes, nenhum vencido'
        }
        className="toque-premium relative flex size-9 items-center justify-center rounded-lg border border-borda bg-superficie text-texto-secundario no-underline hover:bg-superficie-hover"
        data-haptico="selecao"
      >
        <Icone nome="sino" className="size-4" />
        {naoLidas > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-superficie bg-perigo"
          />
        )}
      </Link>

      <AlternarTema />

      <div className="flex items-center gap-2.5 border-l border-borda pl-3">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-acao-sutil text-xs font-bold text-acao-sutil-texto"
        >
          {iniciais(nome)}
        </span>
        <span className="hidden sm:block">
          <span className="block text-xs font-semibold leading-tight">{nome}</span>
          <span className="block text-xs leading-tight text-texto-secundario">
            {ROTULO_PAPEL[papel]}
          </span>
        </span>
        <button
          type="button"
          onClick={aoSair}
          data-haptico="confirmacao"
          aria-label="Sair da conta"
          className="toque-premium flex size-9 items-center justify-center rounded-lg text-texto-secundario hover:bg-superficie-hover"
        >
          <Icone nome="sair" className="size-4" />
        </button>
      </div>
    </header>
  );
}
