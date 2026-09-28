import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { quadroDeSeguranca, type EventoDeAuditoria } from '@/server/consultas/seguranca';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoTitulo } from '@/components/ui/cartao';
import { Chip } from '@/components/ui/sinal';
import { Icone } from '@/components/shell/icones';
import { EstadoPrimeiroAcesso, EstadoSemPermissao } from '@/components/ui/estados';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { dataHora, numero, tempoRelativo } from '@/lib/formato';

export const metadata: Metadata = { title: 'Segurança' };

/**
 * Cada ação em palavras que o corretor entende.
 *
 * O nome técnico (`consultar_credito`) é o que o log guarda; ele não é o que
 * uma pessoa lê. Sem esta tradução, a tela vira um despejo de banco de dados —
 * tecnicamente completo e inútil para quem precisa conferir alguma coisa.
 */
const ACAO_EM_PALAVRAS: Record<string, string> = {
  criar: 'Cadastrou',
  editar: 'Alterou',
  excluir: 'Excluiu',
  consultar_credito: 'Consultou crédito',
  revelar_sensivel: 'Revelou dado sensível',
  exportar: 'Exportou dados',
  convidar: 'Convidou alguém para a equipe',
  revogar_convite: 'Revogou um convite',
  aceitar_convite: 'Entrou na equipe',
  alterar_papel: 'Mudou o papel de alguém',
  desativar: 'Suspendeu um acesso',
  reativar: 'Reativou um acesso',
  publicar: 'Publicou no portfólio',
  despublicar: 'Tirou do portfólio',
  recusar_midia: 'Recusou um arquivo enviado',
  entrar: 'Entrou no sistema',
};

const ENTIDADE_EM_PALAVRAS: Record<string, string> = {
  pessoa: 'cliente',
  imovel: 'imóvel',
  imovel_midia: 'foto de imóvel',
  negocio: 'negócio',
  simulacao: 'simulação',
  membro: 'equipe',
  conta: 'conta',
  portfolio: 'portfólio',
};

function descrever(evento: EventoDeAuditoria): string {
  const acao = ACAO_EM_PALAVRAS[evento.acao] ?? evento.acao;
  const entidade = ENTIDADE_EM_PALAVRAS[evento.entidade] ?? evento.entidade;
  return `${acao} · ${entidade}`;
}

export default async function PaginaDeSeguranca() {
  const sessao = await exigirSessao('/seguranca');

  if (!sessao.pode('auditoria.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao
          papel={ROTULO_PAPEL[sessao.atual.papel]}
          oQue="Segurança e auditoria"
        />
      </div>
    );
  }

  const quadro = await quadroDeSeguranca(sessao.atual.tenant.id);

  const vazio =
    quadro.acessoAdministrativo.length === 0 &&
    quadro.sensiveis.length === 0 &&
    quadro.recentes.length === 0 &&
    quadro.portal.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Segurança</h1>
        <p className="mt-0.5 text-sm text-texto-secundario">
          Quem acessou o quê nesta conta. Nenhum usuário do sistema consegue alterar ou apagar
          este registro — nem você, nem quem administra a Agilliza.
        </p>
      </div>

      {vazio ? (
        <EstadoPrimeiroAcesso
          titulo="Nada registrado ainda"
          descricao="Toda ação sobre dado de cliente fica registrada aqui: quem fez, quando, de qual endereço e — em consulta de crédito — com qual justificativa."
        />
      ) : (
        <>
          {/* ------------------------------------------------------------
              ACESSO DE FORA DA EQUIPE.
              Vem primeiro e separado porque é o que o corretor não tem como
              descobrir de outro jeito. Um administrador da Agilliza enxerga
              todas as contas; a promessa de que isso é auditado só vale se ele
              puder conferir sozinho.
          ------------------------------------------------------------- */}
          <section>
            <h2 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-wide text-texto-apoio">
              Acesso de fora da sua equipe
              {quadro.acessoAdministrativo.length > 0 && (
                <Chip tom="atencao">{quadro.acessoAdministrativo.length}</Chip>
              )}
            </h2>

            {quadro.acessoAdministrativo.length === 0 ? (
              <div className="flex items-start gap-2 rounded-xl border border-sucesso-borda bg-sucesso-sutil px-4 py-3">
                <Icone nome="escudo" className="mt-0.5 size-4 shrink-0 text-sucesso-texto" />
                <p className="text-sm text-sucesso-texto">
                  <strong>Ninguém de fora da sua equipe acessou esta conta.</strong> Se alguém do
                  suporte da Agilliza precisar entrar, aparece aqui — com nome, data e
                  justificativa.
                </p>
              </div>
            ) : (
              <Cartao className="overflow-hidden border-atencao-borda p-0">
                <ul className="divide-y divide-borda">
                  {quadro.acessoAdministrativo.map((evento) => (
                    <Evento key={evento.id} evento={evento} destaque />
                  ))}
                </ul>
              </Cartao>
            )}
          </section>

          {quadro.sensiveis.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-texto-apoio">
                Ações sensíveis
                <span className="ml-2 font-normal">{quadro.sensiveis.length}</span>
              </h2>
              <Cartao className="overflow-hidden p-0">
                <ul className="divide-y divide-borda">
                  {quadro.sensiveis.map((evento) => (
                    <Evento key={evento.id} evento={evento} />
                  ))}
                </ul>
              </Cartao>
            </section>
          )}

          {/* ---------------------------------------------- portal do cliente */}
          {(quadro.portal.length > 0 || quadro.tentativasFalhas > 0) && (
            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>Entradas dos seus clientes no portal</CartaoTitulo>
              </CartaoCabecalho>
              <CartaoCorpo className="p-0">
                {quadro.tentativasFalhas > 0 && (
                  <p className="flex items-start gap-2 border-b border-borda bg-atencao-sutil px-4 py-2.5 text-sm text-atencao-texto">
                    <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {numero(quadro.tentativasFalhas)}{' '}
                      {quadro.tentativasFalhas === 1 ? 'tentativa falhou' : 'tentativas falharam'}{' '}
                      nas últimas 24 horas. Errar o próprio nascimento acontece; muitas
                      tentativas seguidas no mesmo CPF travam o acesso por 30 minutos.
                    </span>
                  </p>
                )}

                <ul className="divide-y divide-borda">
                  {quadro.portal.slice(0, 15).map((acesso) => (
                    <li
                      key={acesso.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
                    >
                      <span className="flex-grow font-medium text-texto">
                        {acesso.pessoa_nome ?? (
                          // Sem pessoa vinculada = CPF que não é cliente desta
                          // conta. Vale mostrar: pode ser erro de digitação, ou
                          // alguém sondando.
                          <span className="text-texto-apoio">CPF não reconhecido</span>
                        )}
                      </span>
                      <Chip tom={acesso.sucesso ? 'sucesso' : 'neutro'}>
                        {acesso.sucesso ? 'Entrou' : 'Não entrou'}
                      </Chip>
                      <span className="text-xs text-texto-apoio">
                        {tempoRelativo(acesso.criado_em)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CartaoCorpo>
            </Cartao>
          )}

          {quadro.recentes.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-texto-apoio">
                Atividade da equipe
                <span className="ml-2 font-normal">{quadro.recentes.length}</span>
              </h2>
              <Cartao className="overflow-hidden p-0">
                <ul className="divide-y divide-borda">
                  {quadro.recentes.map((evento) => (
                    <Evento key={evento.id} evento={evento} />
                  ))}
                </ul>
              </Cartao>
            </section>
          )}
        </>
      )}

      <p className="border-t border-borda pt-4 text-xs text-texto-apoio">
        O próprio banco recusa qualquer tentativa de alterar, apagar ou forjar uma linha daqui —
        isso foi medido, não presumido. A exceção é quem opera o servidor onde o sistema está
        instalado: quem tem a chave do banco em mãos alcança tudo, e é por isso que ela fica
        fora do alcance da aplicação. Se precisar de uma cópia para auditoria ou para responder
        a um titular de dados, fale com quem administra a conta em{' '}
        <Link href="/equipe" className="text-link hover:underline">
          Equipe
        </Link>
        .
      </p>
    </div>
  );
}

function Evento({ evento, destaque }: { evento: EventoDeAuditoria; destaque?: boolean }) {
  return (
    <li className={destaque ? 'bg-atencao-sutil/30 px-4 py-3' : 'px-4 py-3'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-grow">
          <p className="text-sm font-medium text-texto">{descrever(evento)}</p>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-texto-apoio">
            <span>{evento.autor_email ?? 'sistema'}</span>
            {evento.autor_papel && <span>{ROTULO_PAPEL[evento.autor_papel]}</span>}
            {/* O IP é contexto, não identidade. Aparece porque um acesso do
                endereço errado é o primeiro sinal de conta comprometida. */}
            {evento.ip && <span className="font-mono">{evento.ip}</span>}
          </div>

          {/* A JUSTIFICATIVA é o que torna o registro útil. Sem ela, o log diz
              que alguém consultou crédito; com ela, diz por quê. */}
          {evento.justificativa && (
            <p className="mt-1 rounded bg-superficie-afundada px-2 py-1 text-xs text-texto-secundario">
              {evento.justificativa}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs text-texto-apoio">{dataHora(evento.criado_em)}</p>
          {evento.resultado !== 'permitido' && (
            <Chip tom={evento.resultado === 'negado' ? 'perigo' : 'neutro'}>
              {evento.resultado}
            </Chip>
          )}
        </div>
      </div>
    </li>
  );
}
