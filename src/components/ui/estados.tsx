import Link from 'next/link';

import { cn } from '@/lib/ui';
import { Botao } from './botao';
import { EsqueletoTexto } from './sinal';

/**
 * Os estados obrigatórios da seção 22.
 *
 * A regra do documento é clara: "todo estado deve explicar o que aconteceu e
 * qual ação o usuário pode tomar". Nenhum componente aqui aceita ser usado sem
 * uma explicação — é por isso que `descricao` é obrigatória em todos.
 *
 * Existirem como componente, e não como markup solto em cada página, é o que
 * garante que a décima tela não invente um estado vazio sem saída.
 */

interface Acao {
  rotulo: string;
  href?: string;
  onClick?: () => void;
}

interface PropsEstado {
  titulo: string;
  descricao: string;
  acao?: Acao;
  acaoSecundaria?: Acao;
  className?: string;
}

function BotaoDeEstado({
  acao,
  tipo,
}: {
  acao: Acao;
  tipo: 'principal' | 'neutro' | 'secundario';
}) {
  if (acao.href) {
    return (
      <Botao tipo={tipo} comoFilho>
        <Link href={acao.href}>{acao.rotulo}</Link>
      </Botao>
    );
  }
  return (
    <Botao tipo={tipo} onClick={acao.onClick}>
      {acao.rotulo}
    </Botao>
  );
}

function Moldura({
  children,
  className,
  tom = 'neutro',
}: {
  children: React.ReactNode;
  className?: string;
  tom?: 'neutro' | 'perigo' | 'atencao' | 'acao';
}) {
  const tons = {
    neutro: 'border-borda bg-superficie',
    perigo: 'border-perigo-borda bg-perigo-sutil',
    atencao: 'border-atencao-borda bg-atencao-sutil',
    acao: 'border-acao-borda bg-acao-sutil',
  } as const;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border px-6 py-10 text-center',
        tons[tom],
        className,
      )}
    >
      {children}
    </div>
  );
}

function Icone({ children, tom }: { children: React.ReactNode; tom: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex size-11 items-center justify-center rounded-xl', tom)}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CARREGANDO
// ---------------------------------------------------------------------------

/**
 * Espera.
 *
 * `role="status"` com `aria-live` faz o leitor de tela anunciar que está
 * carregando. Sem isso, quem usa leitor fica em silêncio total e acha que a
 * página travou.
 */
export function EstadoCarregando({ linhas = 4 }: { linhas?: number }) {
  return <EsqueletoTexto linhas={linhas} className="p-1" />;
}

// ---------------------------------------------------------------------------
// VAZIO E PRIMEIRO ACESSO
// ---------------------------------------------------------------------------

/** Nada aqui ainda, mas existe um próximo passo. */
export function EstadoVazio({ titulo, descricao, acao, acaoSecundaria, className }: PropsEstado) {
  return (
    <Moldura className={className}>
      <Icone tom="bg-superficie-afundada text-texto-apoio">
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="7" width="18" height="14" rx="2" />
          <path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2M9 12h6" />
        </svg>
      </Icone>
      <div>
        <h3 className="text-md font-semibold">{titulo}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-texto-secundario">{descricao}</p>
      </div>
      {(acao || acaoSecundaria) && (
        <div className="flex gap-2">
          {acao && <BotaoDeEstado acao={acao} tipo="principal" />}
          {acaoSecundaria && <BotaoDeEstado acao={acaoSecundaria} tipo="neutro" />}
        </div>
      )}
    </Moldura>
  );
}

/**
 * Primeiro acesso: diferente de vazio.
 *
 * Vazio é "a lista filtrou e não achou". Primeiro acesso é "você acabou de
 * entrar e ainda não existe nada". Tratar os dois igual faz a conta nova parecer
 * quebrada.
 */
export function EstadoPrimeiroAcesso({ titulo, descricao, acao, className }: PropsEstado) {
  return (
    <Moldura tom="acao" className={className}>
      <Icone tom="bg-superficie text-link">
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
        </svg>
      </Icone>
      <div>
        <h3 className="text-md font-semibold text-acao-sutil-texto">{titulo}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-acao-sutil-texto/90">{descricao}</p>
      </div>
      {acao && <BotaoDeEstado acao={acao} tipo="principal" />}
    </Moldura>
  );
}

// ---------------------------------------------------------------------------
// ERRO
// ---------------------------------------------------------------------------

/**
 * Algo falhou.
 *
 * `descricao` nunca deve conter mensagem técnica de banco. O corretor precisa
 * saber se o trabalho dele foi perdido — essa é a única pergunta que ele tem
 * nesse momento. O detalhe técnico vai para o log, com id de correlação.
 */
export function EstadoErro({
  titulo = 'Não deu para carregar',
  descricao,
  acao,
  referencia,
  className,
}: Partial<PropsEstado> & { descricao: string; referencia?: string }) {
  return (
    <Moldura tom="perigo" className={className}>
      <Icone tom="bg-superficie text-perigo-texto">
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </Icone>
      <div>
        <h3 className="text-md font-semibold text-perigo-texto">{titulo}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-perigo-texto">{descricao}</p>
        {referencia && (
          <p className="mt-2 font-mono text-xs text-perigo-texto/80">
            Referência para o suporte: {referencia}
          </p>
        )}
      </div>
      {acao && <BotaoDeEstado acao={acao} tipo="principal" />}
    </Moldura>
  );
}

// ---------------------------------------------------------------------------
// SEM PERMISSÃO
// ---------------------------------------------------------------------------

/**
 * Bloqueado por papel.
 *
 * Diz QUAL papel o usuário tem e QUEM libera. "Acesso negado" sozinho gera um
 * chamado de suporte; isto resolve sem chamado.
 */
export function EstadoSemPermissao({
  papel,
  oQue,
  className,
}: {
  papel: string;
  oQue: string;
  className?: string;
}) {
  return (
    <Moldura className={className}>
      <Icone tom="bg-superficie-afundada text-texto-apoio">
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </Icone>
      <div>
        <h3 className="text-md font-semibold">{oQue}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-texto-secundario">
          Seu papel é <strong className="text-texto">{papel}</strong>. Quem libera este acesso é o
          proprietário da conta.
        </p>
      </div>
    </Moldura>
  );
}

// ---------------------------------------------------------------------------
// CONEXÃO E SINCRONIZAÇÃO
// ---------------------------------------------------------------------------

/**
 * Offline. O corretor está na rua, no elevador, no subsolo.
 *
 * A mensagem central é "nada foi perdido": é a única coisa que ele precisa
 * saber para continuar trabalhando em vez de repetir o cadastro.
 */
export function AvisoOffline({ pendentes }: { pendentes: number }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-atencao-borda bg-atencao-sutil px-4 py-2.5"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4 shrink-0 text-atencao-texto"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M1 1l22 22M16.7 16.7A10 10 0 0 1 12 18M5 12.5a10 10 0 0 1 3-2.2M2 8.8a16 16 0 0 1 5-3M12 22h.01" />
      </svg>
      <p className="text-sm text-atencao-texto">
        <strong>Você está trabalhando offline.</strong>{' '}
        {pendentes > 0
          ? `${pendentes} ${pendentes === 1 ? 'alteração guardada' : 'alterações guardadas'}. ${
              pendentes === 1 ? 'Ela sobe' : 'Elas sobem'
            } sozinha${pendentes === 1 ? '' : 's'} quando o sinal voltar.`
          : 'Nada foi perdido. O que você fizer agora sobe quando o sinal voltar.'}
      </p>
    </div>
  );
}

/** Enviando o que ficou guardado. */
export function AvisoSincronizando({ feitos, total }: { feitos: number; total: number }) {
  const pct = total > 0 ? Math.round((feitos / total) * 100) : 0;
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-acao-borda bg-acao-sutil px-4 py-3"
    >
      <p className="mb-2 text-sm font-semibold text-acao-sutil-texto">
        Enviando {total} {total === 1 ? 'alteração' : 'alterações'}
      </p>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-acao-borda"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-acao transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-acao-sutil-texto">
        {feitos} de {total} concluídas
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// INTEGRAÇÃO E LIMITE DE PLANO
// ---------------------------------------------------------------------------

/**
 * Integração não configurada.
 *
 * Aqui vive o princípio 7 do produto: "se uma integração não estiver
 * configurada, deixar claro o que funciona e o que é estimativa". A frase
 * "nada aqui é estimativa" é literal — o campo fica vazio em vez de receber um
 * número inventado.
 */
export function EstadoIntegracaoDesconectada({
  nome,
  oQueFicaIndisponivel,
  href,
  className,
}: {
  nome: string;
  oQueFicaIndisponivel: string;
  href: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-borda bg-superficie p-4', className)}>
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden="true" className="size-2 rounded-full bg-texto-apoio" />
        <h3 className="text-base font-semibold">{nome} não configurada</h3>
      </div>
      <p className="mb-3 text-sm text-texto-secundario">
        {oQueFicaIndisponivel} Nada aqui é estimativa: o campo não é preenchido.
      </p>
      <Botao tipo="secundario" tamanho="pequeno" comoFilho>
        <Link href={href}>Configurar</Link>
      </Botao>
    </div>
  );
}

/** Limite do plano atingido, com as duas saídas possíveis. */
export function EstadoLimiteDoPlano({
  oQue,
  usado,
  limite,
  className,
}: {
  oQue: string;
  usado: number;
  limite: number;
  className?: string;
}) {
  return (
    <div
      className={cn('rounded-xl border border-atencao-borda bg-atencao-sutil p-4', className)}
      role="status"
    >
      <h3 className="mb-1 text-base font-semibold text-atencao-texto">
        {usado} de {limite} {oQue}
      </h3>
      <p className="mb-3 text-sm text-atencao-texto">
        Você pode liberar espaço removendo um item ou aumentar o plano.
      </p>
      <Botao tamanho="pequeno" comoFilho>
        <Link href="/configuracoes/plano">Ver planos</Link>
      </Botao>
    </div>
  );
}

/** Processamento que terminou pela metade, com o motivo de cada falha. */
export function EstadoProcessamentoParcial({
  feitos,
  total,
  motivo,
  acao,
  className,
}: {
  feitos: number;
  total: number;
  motivo: string;
  acao?: Acao;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-borda bg-superficie p-4', className)}>
      <h3 className="mb-1 text-base font-semibold">
        {feitos} de {total} concluídos
      </h3>
      <p className="mb-3 text-sm text-texto-secundario">{motivo}</p>
      {acao && <BotaoDeEstado acao={acao} tipo="secundario" />}
    </div>
  );
}

/** Sessão expirada, preservando para onde voltar. */
export function EstadoSessaoExpirada({ destino }: { destino: string }) {
  return (
    <Moldura tom="atencao">
      <Icone tom="bg-superficie text-atencao-texto">
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4l3 2" />
        </svg>
      </Icone>
      <div>
        <h3 className="text-md font-semibold text-atencao-texto">Sua sessão expirou</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-atencao-texto">
          Por segurança, a sessão fecha depois de um tempo sem uso. Entre de novo e você volta
          exatamente para onde estava.
        </p>
      </div>
      <Botao comoFilho>
        <Link href={`/entrar?destino=${encodeURIComponent(destino)}`}>Entrar de novo</Link>
      </Botao>
    </Moldura>
  );
}
