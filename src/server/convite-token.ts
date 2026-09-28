import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

import { DIAS_DE_VALIDADE } from '@/dominio/convite';

/**
 * O token do convite.
 *
 * MORA AQUI, E NÃO NO DOMÍNIO, por um motivo que só apareceu no build: o módulo
 * de domínio é importado por um componente de CLIENTE (para ler
 * `DIAS_DE_VALIDADE` e os papéis atribuíveis), e um `import 'node:crypto'` lá
 * arrastaria criptografia do Node para o pacote do navegador. O webpack
 * reprova com "Unhandled scheme", que não diz nada sobre a causa.
 *
 * A separação é a certa de qualquer forma: gerar e conferir token é operação de
 * servidor, não vocabulário de domínio.
 *
 * COMO FUNCIONA
 *
 * O convite é um link com um segredo. O banco guarda apenas o HASH — se o banco
 * vazar, os convites pendentes não viram acesso, porque do hash não se volta ao
 * token.
 *
 * São 32 bytes de entropia. Adivinhar um convite válido por tentativa é
 * inviável, e isso importa: quem adivinhasse entraria na conta de uma
 * imobiliária com o papel que o convite carrega.
 */

export interface ConviteGerado {
  /** Vai no link. NUNCA é gravado. */
  token: string;
  /** Vai no banco. */
  tokenHash: string;
  expiraEm: Date;
}

export function gerarConvite(): ConviteGerado {
  // `base64url` para o token caber numa URL sem escape, que é onde ele vive.
  const token = randomBytes(32).toString('base64url');

  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + DIAS_DE_VALIDADE);

  return { token, tokenHash: hashDoToken(token), expiraEm };
}

/**
 * O hash que vai ao banco.
 *
 * SHA-256 simples, sem sal e sem alongamento — e isso é correto AQUI, ao
 * contrário de senha. O token tem 256 bits de entropia aleatória: não há
 * dicionário para atacar, e força bruta contra ele é inviável independentemente
 * do custo por tentativa. Alongar o hash só tornaria a verificação lenta sem
 * ganhar segurança.
 */
export function hashDoToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
