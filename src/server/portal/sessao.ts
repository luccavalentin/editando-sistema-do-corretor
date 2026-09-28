import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';

import { servidor } from '@/lib/ambiente';

/**
 * Sessão do portal do cliente.
 *
 * POR QUE NÃO USAR A SESSÃO DO SUPABASE
 *
 * Porque o cliente não tem conta lá — e não vai ter. Ele entra com CPF e data
 * de nascimento, sem senha, porque um comprador de imóvel abre este portal
 * três ou quatro vezes na vida. Exigir cadastro derruba a adesão a quase zero,
 * e aí ele liga para o corretor perguntando como está — que é justamente o
 * telefonema que o portal existe para evitar.
 *
 * COMO A SESSÃO É PROTEGIDA
 *
 * Cookie assinado com HMAC-SHA256, e não criptografado. A distinção importa:
 * o conteúdo é LEGÍVEL por quem tiver o cookie — e tudo bem, porque ele só
 * contém o id da própria pessoa e o nome dela, que ela já sabe. O que a
 * assinatura garante é que o conteúdo não foi ALTERADO: trocar o `pessoaId`
 * para o de outro cliente invalida a assinatura.
 *
 * A comparação da assinatura é em tempo constante. Comparar com `===` vaza,
 * pelo tempo de resposta, quantos bytes iniciais estão certos — e isso permite
 * descobrir uma assinatura válida byte a byte, com paciência.
 *
 * DUAS HORAS, E CURTO DE PROPÓSITO
 *
 * A autenticação é fraca por desenho, então a janela precisa ser curta. Duas
 * horas cobrem com folga uma sessão de acompanhamento; um cookie esquecido num
 * computador compartilhado expira antes de virar problema.
 */

const NOME_DO_COOKIE = 'agilliza_portal';
const DURACAO_SEGUNDOS = 2 * 60 * 60;

export interface SessaoDoPortal {
  pessoaId: string;
  tenantId: string;
  nome: string;
  /** Segundos desde a época, quando a sessão deixa de valer. */
  expiraEm: number;
}

function base64url(dado: Buffer | string): string {
  return Buffer.from(dado)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function deBase64url(texto: string): Buffer {
  return Buffer.from(texto.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function assinar(conteudo: string): string {
  return base64url(
    createHmac('sha256', servidor().segredoPortal).update(conteudo).digest(),
  );
}

/**
 * Compara em tempo constante.
 *
 * `timingSafeEqual` exige buffers do mesmo tamanho e lança quando não são —
 * por isso o tamanho é conferido antes. A diferença de tamanho já é pública
 * (está no cookie), então essa checagem não vaza nada.
 */
function assinaturaConfere(esperada: string, recebida: string): boolean {
  const a = Buffer.from(esperada);
  const b = Buffer.from(recebida);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function montarCookie(dados: Omit<SessaoDoPortal, 'expiraEm'>): {
  valor: string;
  maxAge: number;
} {
  const sessao: SessaoDoPortal = {
    ...dados,
    expiraEm: Math.floor(Date.now() / 1000) + DURACAO_SEGUNDOS,
  };

  const conteudo = base64url(JSON.stringify(sessao));
  return { valor: `${conteudo}.${assinar(conteudo)}`, maxAge: DURACAO_SEGUNDOS };
}

/** Lê e VALIDA o cookie. `null` sempre que houver qualquer dúvida. */
export function lerCookie(bruto: string | undefined): SessaoDoPortal | null {
  if (!bruto) return null;

  const separador = bruto.lastIndexOf('.');
  if (separador <= 0) return null;

  const conteudo = bruto.slice(0, separador);
  const assinatura = bruto.slice(separador + 1);

  if (!assinaturaConfere(assinar(conteudo), assinatura)) return null;

  try {
    const sessao = JSON.parse(deBase64url(conteudo).toString('utf8')) as SessaoDoPortal;

    if (
      typeof sessao.pessoaId !== 'string' ||
      typeof sessao.tenantId !== 'string' ||
      typeof sessao.expiraEm !== 'number'
    ) {
      return null;
    }

    // A expiração está DENTRO do conteúdo assinado. Depender só do `maxAge` do
    // cookie não serviria: o navegador é quem o respeita, e um cliente HTTP
    // qualquer pode reenviar um cookie vencido para sempre.
    if (sessao.expiraEm <= Math.floor(Date.now() / 1000)) return null;

    return sessao;
  } catch {
    // Conteúdo assinado mas ilegível: alguém guardou algo estranho, ou o
    // formato mudou entre versões. Tratar como sem sessão é o caminho seguro.
    return null;
  }
}

export async function gravarSessao(dados: Omit<SessaoDoPortal, 'expiraEm'>): Promise<void> {
  const { valor, maxAge } = montarCookie(dados);

  (await cookies()).set(NOME_DO_COOKIE, valor, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/portal',
    maxAge,
  });
}

export async function encerrarSessao(): Promise<void> {
  (await cookies()).delete({ name: NOME_DO_COOKIE, path: '/portal' });
}

export async function sessaoDoPortal(): Promise<SessaoDoPortal | null> {
  return lerCookie((await cookies()).get(NOME_DO_COOKIE)?.value);
}

/**
 * O endereço de quem está tentando entrar, para o limite por IP.
 *
 * `x-forwarded-for` é uma LISTA quando há mais de um proxy, e o primeiro item é
 * o que o cliente enviou — falsificável. O último é o que o proxy mais próximo
 * observou. Aqui se usa o primeiro mesmo assim, porque a topologia é conhecida
 * (Caddy, com `trusted_proxies`) e é ele que identifica o visitante.
 *
 * Devolve `null` quando não dá para saber. O limite por CPF continua valendo —
 * é o que impede força bruta contra uma pessoa específica, que é o ataque que
 * de fato importa aqui.
 */
export async function ipDaRequisicao(): Promise<string | null> {
  const cabecalhos = await headers();

  const encaminhado = cabecalhos.get('x-forwarded-for');
  if (encaminhado) {
    const primeiro = encaminhado.split(',')[0]?.trim();
    if (primeiro) return primeiro;
  }

  return cabecalhos.get('x-real-ip');
}
