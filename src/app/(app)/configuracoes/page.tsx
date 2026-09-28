import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { clienteServidor } from '@/lib/supabase/servidor';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoTitulo } from '@/components/ui/cartao';
import { Chip } from '@/components/ui/sinal';
import { Icone } from '@/components/shell/icones';
import { EstadoSemPermissao } from '@/components/ui/estados';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { numero } from '@/lib/formato';
import { FormularioDaConta } from './formulario';

export const metadata: Metadata = { title: 'Configurações' };

const ROTULO_DA_SITUACAO: Record<string, { texto: string; tom: 'sucesso' | 'atencao' | 'perigo' | 'neutro' }> = {
  teste: { texto: 'Período de teste', tom: 'atencao' },
  ativo: { texto: 'Ativa', tom: 'sucesso' },
  inadimplente: { texto: 'Pagamento pendente', tom: 'atencao' },
  suspenso: { texto: 'Suspensa', tom: 'perigo' },
  cancelado: { texto: 'Cancelada', tom: 'perigo' },
};

export default async function PaginaDeConfiguracoes() {
  const sessao = await exigirSessao('/configuracoes');

  if (!sessao.pode('configuracoes.editar')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao
          papel={ROTULO_PAPEL[sessao.atual.papel]}
          oQue="Configurações da conta"
        />
      </div>
    );
  }

  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const { data: conta } = await supabase
    .from('tenants')
    .select(
      'nome, cpf_cnpj, creci, fuso_horario, situacao, limite_usuarios, limite_imoveis, limite_armazenamento_mb, criado_em',
    )
    .eq('id', tenantId)
    .maybeSingle();

  const [{ count: usuarios }, { count: imoveis }] = await Promise.all([
    supabase
      .from('membros')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('situacao', 'ativo'),
    supabase
      .from('imoveis')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('excluido_em', null),
  ]);

  const situacao = ROTULO_DA_SITUACAO[conta?.situacao ?? 'ativo'] ?? {
    texto: conta?.situacao ?? '—',
    tom: 'neutro' as const,
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          Dados da sua conta e o que o plano permite.
        </p>
      </div>

      <FormularioDaConta
        valores={{
          nome: conta?.nome ?? '',
          cpfCnpj: conta?.cpf_cnpj ?? '',
          creci: conta?.creci ?? '',
          fusoHorario: conta?.fuso_horario ?? 'America/Sao_Paulo',
        }}
      />

      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>
            <span className="flex flex-wrap items-center gap-2">
              Seu plano
              <Chip tom={situacao.tom}>{situacao.texto}</Chip>
            </span>
          </CartaoTitulo>
        </CartaoCabecalho>
        <CartaoCorpo>
          {/* Estes números NÃO são editáveis, e a tela não finge que são: eles
              vêm do contrato, não de uma preferência. */}
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Uso
              rotulo="Usuários"
              usado={usuarios ?? 0}
              limite={conta?.limite_usuarios ?? 0}
              href="/equipe"
            />
            <Uso
              rotulo="Imóveis"
              usado={imoveis ?? 0}
              limite={conta?.limite_imoveis ?? 0}
              href="/imoveis"
            />
            <div>
              <dt className="text-xs text-texto-apoio">Armazenamento do plano</dt>
              <dd className="mt-0.5 font-semibold text-texto">
                {numero(conta?.limite_armazenamento_mb ?? 0)} MB
              </dd>
            </div>
          </dl>

          <p className="mt-3 border-t border-borda pt-3 text-xs text-texto-apoio">
            Para mudar o plano, fale com quem cuida da sua conta na Agilliza. Estes limites não
            são preferência: eles vêm do contrato.
          </p>
        </CartaoCorpo>
      </Cartao>

      {/* ------------------------------------------------------------------
          A SEÇÃO HONESTA.

          `mfa_obrigatorio` e `retencao_dias` existem no banco desde a primeira
          migração e NADA os aplica. Um interruptor de "exigir segundo fator"
          que não exige nada é pior do que a ausência dele: o corretor acha que
          protegeu a conta e não protegeu.

          Dizer o que falta, e por quê, é o mesmo princípio dos itens "em breve"
          no menu.
      ------------------------------------------------------------------- */}
      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>Segurança e retenção</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoCorpo className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-lg border border-borda bg-superficie-afundada p-3">
            <Icone nome="escudo" className="mt-0.5 size-4 shrink-0 text-texto-apoio" />
            <div>
              <p className="text-sm font-medium text-texto">
                Exigir segundo fator para toda a equipe
                <span className="ml-2 rounded-full bg-superficie px-1.5 py-0.5 text-micro font-semibold text-texto-apoio">
                  ainda não disponível
                </span>
              </p>
              <p className="mt-0.5 text-xs text-texto-secundario">
                O campo existe no banco, mas nada o aplica ainda — e um interruptor que não
                protege é pior do que nenhum. Ele só vai aparecer aqui quando houver a tela de
                cadastro do segundo fator: ligar a exigência antes disso trancaria sua equipe
                inteira para fora amanhã de manhã.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-borda bg-superficie-afundada p-3">
            <Icone nome="relogio" className="mt-0.5 size-4 shrink-0 text-texto-apoio" />
            <div>
              <p className="text-sm font-medium text-texto">
                Prazo de retenção dos dados
                <span className="ml-2 rounded-full bg-superficie px-1.5 py-0.5 text-micro font-semibold text-texto-apoio">
                  ainda não disponível
                </span>
              </p>
              <p className="mt-0.5 text-xs text-texto-secundario">
                Depende de uma rotina que apague o que passou do prazo, e ela ainda não existe.
                Enquanto isso, <strong>nada é apagado automaticamente</strong> — é melhor você
                saber disso do que confiar num prazo que ninguém cumpre.
              </p>
            </div>
          </div>
        </CartaoCorpo>
      </Cartao>

      <p className="text-xs text-texto-apoio">
        O endereço público da sua vitrine e os dados de contato ficam em{' '}
        <Link href="/portfolio" className="text-link hover:underline">
          Meu portfólio
        </Link>
        .
      </p>
    </div>
  );
}

function Uso({
  rotulo,
  usado,
  limite,
  href,
}: {
  rotulo: string;
  usado: number;
  limite: number;
  href: string;
}) {
  const cheio = limite > 0 && usado >= limite;

  return (
    <div>
      <dt className="text-xs text-texto-apoio">{rotulo}</dt>
      <dd className="mt-0.5">
        <Link href={href} className="font-semibold text-link hover:underline">
          <span className={cheio ? 'text-atencao-texto' : undefined}>
            {numero(usado)} de {numero(limite)}
          </span>
        </Link>
        {cheio && <span className="ml-2 text-xs text-atencao-texto">limite atingido</span>}
      </dd>
    </div>
  );
}
