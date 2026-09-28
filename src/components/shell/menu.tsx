'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/ui';
import { Icone } from './icones';
import { Marca, SimboloDaMarca } from './marca';
import type { GrupoDeMenu, ItemDeMenu } from './navegacao';

export interface Contadores {
  mensagens?: number;
  tarefas?: number;
  followups?: number;
  agenda?: number;
}

/**
 * Item ativo.
 *
 * Comparação por prefixo, para que `/clientes/abc-123` mantenha "Clientes"
 * marcado. `/inicio` é exato, senão a raiz casaria com tudo.
 */
function estaAtivo(href: string, caminho: string): boolean {
  if (href === '/inicio') return caminho === '/inicio';
  return caminho === href || caminho.startsWith(`${href}/`);
}

function Contador({ valor, urgente }: { valor: number; urgente: boolean }) {
  return (
    <span
      className={cn(
        'ml-auto min-w-5 rounded-full px-1.5 py-px text-center text-micro font-bold',
        urgente ? 'bg-perigo text-white' : 'bg-white/16 text-white',
      )}
    >
      {valor > 99 ? '99+' : valor}
    </span>
  );
}

function ItemLateral({
  item,
  ativo,
  pendente,
  aoClicar,
  recolhido,
  contador,
}: {
  item: ItemDeMenu;
  ativo: boolean;
  /** Foi clicado e a próxima tela ainda está vindo do servidor. */
  pendente: boolean;
  aoClicar: (href: string) => void;
  recolhido: boolean;
  contador?: number;
}) {
  /**
   * Item ainda sem tela.
   *
   * NÃO é link, e isso é o ponto: um `<a>` que leva a 404 faz o corretor achar
   * que o sistema quebrou. Aqui ele vê que o recurso está a caminho.
   *
   * `aria-disabled` em vez de `disabled`: o item continua sendo lido por leitor
   * de tela — quem não enxerga precisa saber que a funcionalidade existe e
   * ainda não está pronta, igual a quem enxerga.
   */
  if (item.emBreve) {
    return (
      <span
        aria-disabled="true"
        title={recolhido ? `${item.rotulo} — em breve` : undefined}
        className={cn(
          'flex cursor-default items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-[#dfe3f7]/45',
          recolhido && 'justify-center px-0',
        )}
      >
        <Icone nome={item.icone} className="size-4 shrink-0" />
        {!recolhido && (
          <>
            <span className="truncate">{item.rotulo}</span>
            <span className="ml-auto shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-micro font-semibold tracking-wide text-[#dfe3f7]/70">
              em breve
            </span>
          </>
        )}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={() => aoClicar(item.href)}
      aria-current={ativo ? 'page' : undefined}
      // `title` dá o nome do item quando o menu está recolhido e só o ícone
      // aparece — sem ele, o menu recolhido é um enigma de pictogramas.
      title={recolhido ? item.rotulo : undefined}
      data-haptico="selecao"
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm no-underline',
        // `transition-colors` sozinho cobria só a cor. O `active:` é o que
        // responde ao DEDO: sem ele, o toque no celular não devolve nada até a
        // tela trocar, e o corretor acha que o menu ignorou o clique.
        'transition-[background-color,color,transform] duration-150 active:scale-[0.98]',
        recolhido && 'justify-center px-0',
        ativo || pendente
          ? 'bg-white/[0.13] font-semibold text-white'
          : 'text-[#dfe3f7] hover:bg-white/[0.07] hover:text-white',
      )}
    >
      {/* Enquanto a próxima tela não chega, o ícone vira indicador de espera.
          É o sinal mais barato possível de "ouvi seu clique" — e a ausência
          dele era a razão de o menu parecer travado. */}
      {pendente ? (
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      ) : (
        <Icone nome={item.icone} className="size-4 shrink-0" />
      )}

      {!recolhido && (
        <>
          <span className="truncate">{item.rotulo}</span>
          {contador !== undefined && contador > 0 && !pendente && (
            <Contador
              valor={contador}
              // Tarefa e follow-up vencidos são atraso: vermelho. Mensagem nova
              // é volume, não atraso — o vermelho perderia o significado se
              // aparecesse em tudo.
              urgente={item.contador === 'tarefas' || item.contador === 'followups'}
            />
          )}
        </>
      )}
    </Link>
  );
}

export function MenuLateral({
  grupos,
  contadores,
  recolhido = false,
  limiteImoveis,
  imoveisUsados,
  nome,
  papel,
  aoSair,
}: {
  grupos: GrupoDeMenu[];
  contadores: Contadores;
  recolhido?: boolean;
  limiteImoveis?: number;
  imoveisUsados?: number;
  /** Quem está logado — mostrado no rodapé do menu, junto do "Sair". */
  nome?: string;
  papel?: string;
  aoSair?: () => void;
}) {
  const caminho = usePathname();

  /**
   * Qual item foi clicado e ainda não chegou.
   *
   * POR QUE ISTO EXISTE
   *
   * No App Router, clicar num link dispara uma renderização NO SERVIDOR. Até
   * ela voltar, o navegador continua exibindo a tela antiga — parada, sem
   * nenhum sinal de que alguma coisa está acontecendo. O corretor clica, não
   * vê nada mudar, e clica de novo.
   *
   * O menu não estava ignorando o clique. Ele estava calado.
   */
  const [pendente, setPendente] = useState<string | null>(null);

  // Chegou: apaga o indicador. Comparar com o caminho novo é mais confiável
  // que um temporizador — a espera real varia com a rede e com a tela.
  useEffect(() => {
    setPendente(null);
  }, [caminho]);

  const pctPlano =
    limiteImoveis && limiteImoveis > 0 && imoveisUsados !== undefined
      ? Math.min(100, Math.round((imoveisUsados / limiteImoveis) * 100))
      : null;

  return (
    <nav
      aria-label="Menu principal"
      data-nao-imprime
      className={cn(
        'gradiente-menu hidden shrink-0 flex-col gap-5 overflow-y-auto px-3 py-4 lg:flex',
        recolhido ? 'w-[4.25rem]' : 'w-[15.5rem]',
      )}
    >
      <Link
        href="/inicio"
        className={cn(
          'flex items-center gap-2.5 px-1 no-underline',
          recolhido && 'justify-center px-0',
        )}
      >
        {recolhido ? (
          // Recolhido não cabe a marca inteira, mas cabe o símbolo — que é o
          // telhado E o "g". Negativa porque o menu é azul: a colorida tem o
          // "g" azul e ele sumiria no fundo.
          <SimboloDaMarca variante="negativa" altura={30} />
        ) : (
          <span className="flex flex-col gap-1">
            <Marca variante="negativa" altura={30} prioritaria />
            <span className="block text-micro tracking-widest text-[#b9c0e8]">COMMAND CENTER</span>
          </span>
        )}
      </Link>

      {grupos.map((grupo) => (
        <div key={grupo.titulo} className="flex flex-col gap-0.5">
          {!recolhido && (
            <p className="px-2 pb-1 text-micro font-semibold tracking-wider text-[#93a6ff]">
              {grupo.titulo.toUpperCase()}
            </p>
          )}
          {grupo.itens.map((item) => (
            <ItemLateral
              key={item.href}
              item={item}
              ativo={estaAtivo(item.href, caminho)}
              pendente={pendente === item.href}
              aoClicar={setPendente}
              recolhido={recolhido}
              contador={item.contador ? contadores[item.contador] : undefined}
            />
          ))}
        </div>
      ))}

      {/* Rodapé: o que fica colado embaixo, sempre visível. */}
      <div className="mt-auto flex flex-col gap-2.5 pt-2">
      {pctPlano !== null && !recolhido && (
        <div className="rounded-xl border border-white/15 bg-white/[0.07] p-2.5">
          <div className="mb-1.5 flex justify-between text-xs text-[#dfe3f7]">
            <span>Imóveis do plano</span>
            <span className="font-semibold">
              {imoveisUsados}/{limiteImoveis}
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/20"
            role="progressbar"
            aria-valuenow={pctPlano}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Uso do plano"
          >
            <div
              className="progresso-vivo h-full rounded-full transition-all"
              style={{
                width: `${pctPlano}%`,
                // Acima de 90% o indicador avisa antes de o corretor bater no
                // limite no meio de um cadastro.
                background: pctPlano >= 90 ? '#ff8a91' : '#93a6ff',
              }}
            />
          </div>
        </div>
      )}

        {/*
          SAIR, NO MENU E COM NOME.
          Antes isto só existia como um ícone sem rótulo no canto do cabeçalho.
          Sair da conta é uma das poucas ações que TODO usuário procura, e
          procura no menu — não num pictograma ao lado do avatar.
        */}
        {aoSair && (
          <div className="border-t border-white/12 pt-2.5">
            {!recolhido && nome && (
              <div className="px-2 pb-1.5">
                <p className="truncate text-xs font-semibold text-white">{nome}</p>
                {papel && <p className="truncate text-micro text-[#93a6ff]">{papel}</p>}
              </div>
            )}

            <button
              type="button"
              onClick={aoSair}
              data-haptico="confirmacao"
              title={recolhido ? 'Sair da conta' : undefined}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-[#dfe3f7]',
                'transition-[background-color,color,transform] duration-150',
                'hover:bg-white/[0.07] hover:text-white active:scale-[0.98]',
                recolhido && 'justify-center px-0',
              )}
            >
              <Icone nome="sair" className="size-4 shrink-0" />
              {!recolhido && <span>Sair da conta</span>}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

/**
 * Navegação inferior do celular.
 *
 * Alvos de 44px e o botão de criar no centro, ao alcance do polegar — é a
 * exigência da seção 21 para quem usa o sistema em pé, na rua.
 */
export function NavegacaoInferior({
  itens,
  contadores,
}: {
  itens: ItemDeMenu[];
  contadores: Contadores;
}) {
  const caminho = usePathname();
  const metade = Math.ceil(itens.length / 2);

  const renderizar = (item: ItemDeMenu) => {
    const ativo = estaAtivo(item.href, caminho);
    const contador = item.contador ? contadores[item.contador] : undefined;

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={ativo ? 'page' : undefined}
        data-haptico="selecao"
        className={cn(
          'toque-premium relative flex flex-grow flex-col items-center justify-center gap-0.5 rounded-lg py-2 no-underline',
          ativo ? 'text-link' : 'text-texto-apoio',
        )}
      >
        <Icone nome={item.icone} className="size-5" />
        <span className={cn('text-micro', ativo && 'font-semibold')}>{item.rotulo}</span>
        {contador !== undefined && contador > 0 && (
          <span className="absolute right-1/4 top-1.5 min-w-4 rounded-full bg-perigo px-1 text-center text-[9px] font-bold text-white">
            {contador > 9 ? '9+' : contador}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navegação principal"
      data-nao-imprime
      className="vidro-sticky flex h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 items-stretch border-t border-borda px-1.5 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {itens.slice(0, metade).map(renderizar)}

      <div className="flex w-16 shrink-0 items-center justify-center">
        <Link
          href="/clientes/novo"
          aria-label="Cadastrar cliente"
          className="toque-premium -mt-5 flex size-12 items-center justify-center rounded-full border-[3px] border-superficie bg-acao text-white no-underline shadow-alta"
          data-haptico="confirmacao"
        >
          <Icone nome="mais" className="size-5" />
        </Link>
      </div>

      {itens.slice(metade).map(renderizar)}
    </nav>
  );
}
