import 'server-only';

import { clienteServidor } from '@/lib/supabase/servidor';
import { servidor } from '@/lib/ambiente';
import { armazenamentoDisponivel } from '@/lib/armazenamento/s3';
import { homefinEstaConfigurada } from '@/server/integracoes/homefin/cliente';

/**
 * Estado das integrações.
 *
 * O QUE ESTA TELA RESOLVE
 *
 * Hoje o corretor descobre que algo não está conectado batendo numa parede: ele
 * monta uma simulação inteira, clica em enviar, e aí lê que a integração não
 * está configurada. Aqui ele vê antes.
 *
 * E vê também o que é mais difícil de descobrir sozinho: se a integração está
 * ligada mas FALHANDO. Um banco fora do ar e um sistema quebrado parecem a
 * mesma coisa de dentro da tela de simulação — a diferença está no log de
 * chamadas, e é ela que evita o corretor ligar para o suporte errado.
 */

export interface EstadoDaIntegracao {
  chave: string;
  nome: string;
  /** O que para de funcionar sem ela. Escrito para o corretor, não para o dev. */
  oQueFaz: string;
  configurada: boolean;
  /** Variáveis de ambiente que faltam. Vazio quando está configurada. */
  faltando: string[];
  /** `null` quando a integração não registra chamadas. */
  saude: SaudeDaIntegracao | null;
}

export interface SaudeDaIntegracao {
  chamadas24h: number;
  falhas24h: number;
  ultimaFalha: { quando: string; operacao: string; mensagem: string | null } | null;
  ultimoSucesso: string | null;
}

/**
 * As integrações que o sistema conhece.
 *
 * A lista é explícita, e não derivada das variáveis de ambiente: assim uma
 * integração planejada aparece como "não configurada" em vez de sumir. O
 * corretor precisa saber que ela existe.
 */
export async function estadoDasIntegracoes(tenantId: string): Promise<EstadoDaIntegracao[]> {
  const config = servidor();
  const supabase = await clienteServidor();

  const ontem = new Date(Date.now() - 86400000).toISOString();

  // O log só tem Homefin por enquanto, mas a consulta já vem agrupada por
  // provedor para as próximas integrações entrarem sem mexer aqui.
  const { data: chamadas } = await supabase
    .from('integracao_chamadas')
    .select('provedor, operacao, sucesso, erro, criado_em')
    .eq('tenant_id', tenantId)
    .gte('criado_em', ontem)
    .order('criado_em', { ascending: false })
    .limit(500);

  const porProvedor = new Map<string, SaudeDaIntegracao>();

  for (const chamada of chamadas ?? []) {
    const atual = porProvedor.get(chamada.provedor) ?? {
      chamadas24h: 0,
      falhas24h: 0,
      ultimaFalha: null,
      ultimoSucesso: null,
    };

    atual.chamadas24h += 1;

    if (chamada.sucesso) {
      // A lista vem do mais recente para o mais antigo: o primeiro sucesso que
      // se encontra JÁ é o último que aconteceu.
      atual.ultimoSucesso ??= chamada.criado_em;
    } else {
      atual.falhas24h += 1;
      atual.ultimaFalha ??= {
        quando: chamada.criado_em,
        operacao: chamada.operacao,
        mensagem: chamada.erro,
      };
    }

    porProvedor.set(chamada.provedor, atual);
  }

  return [
    {
      chave: 'homefin',
      nome: 'Homefin — simulação de financiamento',
      oQueFaz:
        'Envia a simulação aos bancos e traz a resposta de cada um. Sem ela, a simulação é ' +
        'criada e a estimativa é calculada aqui, mas nada chega ao banco.',
      configurada: homefinEstaConfigurada(),
      faltando: homefinEstaConfigurada()
        ? []
        : ['HOMEFIN_CLIENTE_ID', 'HOMEFIN_CLIENTE_SEGREDO'],
      saude: porProvedor.get('homefin') ?? null,
    },
    {
      chave: 'midia',
      nome: 'Armazenamento de fotos',
      oQueFaz:
        'Guarda as fotos dos imóveis. Sem ele, o cadastro funciona mas não aceita foto — e ' +
        'anúncio sem foto não converte.',
      configurada: armazenamentoDisponivel(),
      faltando: armazenamentoDisponivel()
        ? []
        : ['MIDIA_CHAVE_ACESSO', 'MIDIA_CHAVE_SECRETA'],
      // O envio de foto não passa pelo log de integração: o arquivo vai do
      // navegador direto ao armazenamento, sem o servidor no caminho.
      saude: null,
    },
    {
      chave: 'fila',
      nome: 'Fila de tarefas em segundo plano',
      oQueFaz:
        'Roda o que não pode travar a tela: reconciliar simulações com os bancos, aplicar ' +
        'prazo de retenção, mandar lembrete. Sem ela, nada disso acontece sozinho.',
      configurada: config.redisUrl !== null,
      faltando: config.redisUrl !== null ? [] : ['REDIS_URL'],
      saude: null,
    },
  ];
}
