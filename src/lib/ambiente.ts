/**
 * Validação das variáveis de ambiente.
 *
 * Por que isto existe: `process.env.X!` espalhado pelo código transforma
 * configuração faltando em erro obscuro no meio de um atendimento — um
 * `TypeError: Cannot read properties of undefined` três camadas abaixo, quando o
 * corretor clica em salvar. Aqui a aplicação se recusa a subir, com o nome exato
 * da variável que falta.
 *
 * A separação entre `publico` e `servidor` não é organização: é segurança.
 * `servidor` contém a chave que ignora RLS. Importar este módulo num componente
 * de cliente faria o Next tentar embutir a chave no JavaScript do navegador — a
 * guarda de `apenasNoServidor` impede isso em tempo de execução, e o prefixo
 * `NEXT_PUBLIC_` ausente impede em tempo de build.
 */

import { z } from 'zod';

/** Falha com uma mensagem que diz o que fazer, não só o que quebrou. */
function exigir(nome: string, valor: string | undefined, comoObter: string): string {
  if (!valor || valor.trim() === '') {
    throw new Error(
      `Variável de ambiente ausente: ${nome}\n` +
        `Como obter: ${comoObter}\n` +
        `Defina em .env.local (desenvolvimento) ou no ambiente do VPS (produção).`,
    );
  }
  return valor;
}

// ---------------------------------------------------------------------------
// PÚBLICO — vai para o navegador. Nunca colocar segredo aqui.
// ---------------------------------------------------------------------------

const esquemaPublico = z.object({
  urlApp: z.string().url(),
  supabaseUrl: z.string().url(),
  // Protegida por RLS. Publicável por definição.
  supabaseChavePublica: z.string().min(20),
});

export const publico = esquemaPublico.parse({
  urlApp: process.env.NEXT_PUBLIC_URL_APP ?? 'http://localhost:3000',
  supabaseUrl: exigir(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    'Supabase > Project Settings > API > Project URL',
  ),
  supabaseChavePublica: exigir(
    'NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA',
    process.env.NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA,
    'Supabase > Project Settings > API > publishable key',
  ),
});

// ---------------------------------------------------------------------------
// SERVIDOR — jamais alcança o navegador.
// ---------------------------------------------------------------------------

/**
 * Barra a importação acidental num componente de cliente.
 *
 * O `NEXT_PUBLIC_` ausente já impediria o valor de ser embutido, mas o erro
 * apareceria como `undefined` em tempo de execução. Falhar aqui, alto e claro,
 * é melhor do que descobrir em produção que uma rotina administrativa nunca
 * funcionou.
 */
function apenasNoServidor(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'src/lib/ambiente.ts (parte de servidor) foi importado no navegador. ' +
        'Este módulo contém a chave de serviço, que ignora RLS. ' +
        'Use `publico` em componente de cliente, ou mova o código para o servidor.',
    );
  }
}

let cacheServidor: ConfiguracaoServidor | null = null;

export interface ConfiguracaoServidor {
  /** Ignora RLS por completo. Só em job e rotina administrativa auditada. */
  supabaseChaveServico: string;
  /** Conexão direta, para migração e job pesado. */
  databaseUrl: string | null;
  /** 32 bytes em base64. Cifra credencial de integração do tenant. */
  chaveCriptografia: string;
  /** Assina o token de sessão do portal do cliente. */
  segredoPortal: string;
  redisUrl: string | null;
  midia: {
    /**
     * Endereço que o NAVEGADOR alcança. É com ele que as URLs de envio são
     * assinadas — a assinatura SigV4 inclui o `host`, então assinar com o
     * endereço interno geraria uma URL que o navegador não resolve.
     */
    endpoint: string;
    /**
     * Endereço que o SERVIDOR usa, dentro da rede do Docker.
     *
     * As operações do servidor — conferir o arquivo enviado, apagar — não
     * precisam sair para a internet e voltar. Cada uma assinada com este host.
     */
    endpointInterno: string;
    regiao: string;
    bucket: string;
    chaveAcesso: string;
    chaveSecreta: string;
    urlPublica: string;
    forcarPathStyle: boolean;
  } | null;
  /**
   * Homefin.
   *
   * Credencial DA PLATAFORMA, não de cada corretor: quem é parceiro cadastrado
   * na Homefin é a Agilliza, e os corretores operam sob essa conta. O corretor
   * nunca cadastra credencial de banco — não existe BYOK aqui.
   */
  homefin: {
    urlBase: string;
    clienteId: string;
    clienteSegredo: string;
    /** Agilliza como parceiro. */
    idParceiro: string;
    /**
     * AGILLIZA CRED.
     *
     * NÃO usar o `idRegional` que vem do `/auth/token`: ele devolve 1, que é a
     * regional da própria HomeFin, e a oportunidade nasce no lugar errado.
     */
    idRegional: string;
    idUsuarioParceiro: string;
  } | null;
  nivelLog: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Configuração de servidor, validada na primeira chamada.
 *
 * Integração ausente NÃO é erro: o princípio 7 do produto manda deixar claro o
 * que funciona e o que não está configurado, em vez de inventar estimativa. Uma
 * integração sem credencial devolve `null` aqui, e a interface mostra
 * "não configurada" — nunca um número falso.
 */
export function servidor(): ConfiguracaoServidor {
  apenasNoServidor();
  if (cacheServidor) return cacheServidor;

  const chaveCriptografia = exigir(
    'CHAVE_CRIPTOGRAFIA_SEGREDOS',
    process.env.CHAVE_CRIPTOGRAFIA_SEGREDOS,
    'gere com: openssl rand -base64 32',
  );

  // 32 bytes em base64 dão 44 caracteres. Chave curta é chave fraca, e cifrar
  // credencial de banco com chave fraca é pior que não cifrar, porque dá falsa
  // sensação de proteção.
  if (Buffer.from(chaveCriptografia, 'base64').length !== 32) {
    throw new Error(
      'CHAVE_CRIPTOGRAFIA_SEGREDOS precisa ter exatamente 32 bytes em base64. ' +
        'Gere com: openssl rand -base64 32',
    );
  }

  const midiaChaveAcesso = process.env.MIDIA_CHAVE_ACESSO;
  const midiaChaveSecreta = process.env.MIDIA_CHAVE_SECRETA;

  const homefinId = process.env.HOMEFIN_CLIENTE_ID;
  const homefinSegredo = process.env.HOMEFIN_CLIENTE_SEGREDO;

  cacheServidor = {
    supabaseChaveServico: exigir(
      'SUPABASE_CHAVE_SERVICO',
      process.env.SUPABASE_CHAVE_SERVICO,
      'Supabase > Project Settings > API > service_role (SECRETA)',
    ),
    databaseUrl: process.env.DATABASE_URL ?? null,
    chaveCriptografia,
    segredoPortal: exigir(
      'SEGREDO_SESSAO_PORTAL',
      process.env.SEGREDO_SESSAO_PORTAL,
      'gere com: openssl rand -base64 32',
    ),
    redisUrl: process.env.REDIS_URL ?? null,
    midia:
      midiaChaveAcesso && midiaChaveSecreta
        ? {
            endpoint: process.env.MIDIA_ENDPOINT ?? 'http://localhost:9000',
            // Sem rede interna (desenvolvimento), os dois são o mesmo.
            endpointInterno:
              process.env.MIDIA_ENDPOINT_INTERNO ??
              process.env.MIDIA_ENDPOINT ??
              'http://localhost:9000',
            regiao: process.env.MIDIA_REGIAO ?? 'us-east-1',
            bucket: process.env.MIDIA_BUCKET ?? 'agilliza-midia',
            chaveAcesso: midiaChaveAcesso,
            chaveSecreta: midiaChaveSecreta,
            urlPublica: process.env.MIDIA_URL_PUBLICA ?? 'http://localhost:9000/agilliza-midia',
            forcarPathStyle: process.env.MIDIA_FORCAR_PATH_STYLE !== 'false',
          }
        : null,
    homefin:
      homefinId && homefinSegredo
        ? {
            urlBase: process.env.HOMEFIN_URL_BASE ?? 'https://api.homefin.com.br/external',
            clienteId: homefinId,
            clienteSegredo: homefinSegredo,
            idParceiro: process.env.HOMEFIN_ID_PARCEIRO ?? '167',
            idRegional: process.env.HOMEFIN_ID_REGIONAL ?? '26',
            idUsuarioParceiro: process.env.HOMEFIN_ID_USUARIO_PARCEIRO ?? '159',
          }
        : null,
    nivelLog: (process.env.NIVEL_LOG as ConfiguracaoServidor['nivelLog']) ?? 'info',
  };

  return cacheServidor;
}

/** `true` em produção. Usado para decidir cookie seguro e nível de log. */
export const emProducao = process.env.NODE_ENV === 'production';
