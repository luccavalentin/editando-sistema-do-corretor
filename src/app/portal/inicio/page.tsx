import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Marca } from '@/components/shell/marca';
import { ImagemRemota } from '@/components/ui/imagem-remota';
import { Chip } from '@/components/ui/sinal';
import { Icone } from '@/components/shell/icones';
import { sessaoDoPortal } from '@/server/portal/sessao';
import { listarImoveis, listarSimulacoes, obterResumo } from '@/server/portal/dados';
import { sairDoPortal } from '@/server/acoes/portal-entrada';
import { armazenamentoDisponivel, urlPublicaDaFoto } from '@/lib/armazenamento/s3';
import { ROTULO_SITUACAO_SIMULACAO } from '@/dominio/simulacao';
import { moeda, primeiroNome, tempoRelativo } from '@/lib/formato';

export const metadata: Metadata = {
  title: 'Meu acompanhamento',
  robots: { index: false, follow: false },
};

export default async function InicioDoPortal() {
  const sessao = await sessaoDoPortal();
  if (!sessao) redirect('/portal');

  const [resumo, imoveis, simulacoes] = await Promise.all([
    obterResumo(sessao.pessoaId),
    listarImoveis(sessao.pessoaId),
    listarSimulacoes(sessao.pessoaId),
  ]);

  // A pessoa existe no cookie mas não no banco, ou o portal foi revogado: o
  // corretor tirou o acesso enquanto a sessão ainda valia.
  if (!resumo) redirect('/portal');

  // O portão do consentimento. Fica aqui, e não no middleware, porque exige
  // uma consulta ao banco — no middleware ela custaria em toda requisição,
  // inclusive nas de arquivo estático.
  if (!resumo.lgpdAceito) redirect('/portal/consentimento');

  const podeVerFotos = armazenamentoDisponivel();
  const aprovadas = simulacoes.filter((s) => s.situacao === 'aprovado');
  const melhor = aprovadas
    .map((s) => s.melhorParcela)
    .filter((p): p is number => p != null)
    .sort((a, b) => a - b)[0];

  const whatsapp = resumo.corretorWhatsapp
    ? `https://wa.me/55${resumo.corretorWhatsapp}?text=${encodeURIComponent(
        `Olá! Sou ${resumo.nome} e estou acompanhando pelo portal.`,
      )}`
    : null;

  return (
    <>
      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3.5 lg:px-6">
          <Marca altura={26} prioritaria />
          <form action={sairDoPortal}>
            <button
              type="submit"
              className="text-sm font-semibold text-link hover:underline"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <main id="conteudo" className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Olá, {primeiroNome(resumo.nome)}
          </h1>
          <p className="mt-0.5 text-sm text-texto-secundario">
            Acompanhado por {resumo.corretorNome}
            {resumo.corretorCreci ? ` · ${resumo.corretorCreci}` : ''}
          </p>
        </div>

        {/* ------------------------------------------------ o que importa */}
        {melhor != null ? (
          <div className="rounded-xl border border-sucesso-borda bg-sucesso-sutil p-5">
            <div className="mb-1 flex items-center gap-2">
              <Icone nome="escudo" className="size-5 text-sucesso-texto" />
              <h2 className="font-bold text-sucesso-texto">Seu crédito foi aprovado</h2>
            </div>
            <p className="text-sm text-sucesso-texto">
              A melhor parcela que conseguimos foi de <strong>{moeda(melhor)}</strong>. Fale com{' '}
              {primeiroNome(resumo.corretorNome)} para dar o próximo passo.
            </p>
          </div>
        ) : simulacoes.some((s) => s.situacao === 'em_analise') ? (
          <div className="rounded-xl border border-atencao-borda bg-atencao-sutil p-5">
            <div className="mb-1 flex items-center gap-2">
              <Icone nome="relogio" className="size-5 text-atencao-texto" />
              <h2 className="font-bold text-atencao-texto">Seu financiamento está em análise</h2>
            </div>
            <p className="text-sm text-atencao-texto">
              Os bancos estão avaliando. Assim que responderem, você vê aqui — e seu corretor
              também é avisado.
            </p>
          </div>
        ) : null}

        {/* ------------------------------------------------ simulações */}
        {simulacoes.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">Seu financiamento</h2>
            <ul className="flex flex-col gap-3">
              {simulacoes.map((simulacao) => {
                const rotulo = ROTULO_SITUACAO_SIMULACAO[
                  simulacao.situacao as keyof typeof ROTULO_SITUACAO_SIMULACAO
                ] ?? { texto: simulacao.situacao, tom: 'neutro' as const };

                return (
                  <li
                    key={simulacao.id}
                    className="rounded-xl border border-borda bg-superficie p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Chip tom={rotulo.tom}>{rotulo.texto}</Chip>
                        {simulacao.imovelTitulo && (
                          <p className="mt-1 font-medium text-texto">{simulacao.imovelTitulo}</p>
                        )}
                      </div>
                      <p className="text-xs text-texto-apoio">
                        {tempoRelativo(simulacao.criadoEm)}
                      </p>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                      <Miudo rotulo="Imóvel" valor={moeda(simulacao.valorImovel)} />
                      <Miudo rotulo="Entrada" valor={moeda(simulacao.valorEntrada)} />
                      <Miudo rotulo="Financiado" valor={moeda(simulacao.valorFinanciamento)} />
                      <Miudo rotulo="Prazo" valor={`${simulacao.prazoMeses} meses`} />
                    </dl>

                    {simulacao.bancos.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-1.5 border-t border-borda pt-3">
                        {simulacao.bancos.map((banco) => {
                          const situacaoBanco = ROTULO_SITUACAO_SIMULACAO[
                            banco.situacao as keyof typeof ROTULO_SITUACAO_SIMULACAO
                          ] ?? { texto: banco.situacao, tom: 'neutro' as const };

                          return (
                            <li
                              key={banco.banco}
                              className="flex flex-wrap items-center justify-between gap-2 text-sm"
                            >
                              <span className="flex items-center gap-2">
                                <span className="font-medium text-texto">{banco.banco}</span>
                                <Chip tom={situacaoBanco.tom}>{situacaoBanco.texto}</Chip>
                                {banco.escolhido && <Chip tom="acao">Escolhido</Chip>}
                              </span>
                              {banco.parcela != null && (
                                <span className="font-semibold text-texto">
                                  {moeda(banco.parcela)}
                                  <span className="text-xs font-normal text-texto-apoio">/mês</span>
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ------------------------------------------------ imóveis */}
        <section>
          <h2 className="mb-2 text-lg font-semibold">
            {imoveis.length > 0 ? 'Imóveis que você marcou' : 'Seus imóveis'}
          </h2>

          {imoveis.length === 0 ? (
            <div className="rounded-xl border border-borda bg-superficie px-5 py-8 text-center">
              <p className="font-medium text-texto">Nenhum imóvel marcado ainda</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-texto-secundario">
                Quando você favoritar um imóvel ou pedir uma visita, ele aparece aqui para você
                comparar com calma.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {imoveis.map((imovel) => (
                <li
                  key={imovel.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-borda bg-superficie"
                >
                  {imovel.fotoChave && podeVerFotos ? (
                    <ImagemRemota
                      src={urlPublicaDaFoto(imovel.fotoChave)}
                      alt={imovel.titulo}
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-superficie-afundada text-sm text-texto-desabilitado">
                      Sem foto
                    </div>
                  )}

                  <div className="flex flex-grow flex-col gap-1.5 p-4">
                    <div className="flex flex-wrap gap-1">
                      {imovel.interesse === 'pedido_visita' && (
                        <Chip tom="acao">Visita pedida</Chip>
                      )}
                      {imovel.interesse === 'favorito' && <Chip>Favoritado</Chip>}
                      {imovel.situacao !== 'disponivel' && (
                        <Chip tom="atencao">
                          {imovel.situacao === 'reservado' ? 'Reservado' : 'Indisponível'}
                        </Chip>
                      )}
                    </div>

                    <h3 className="linhas-2 font-semibold leading-snug text-texto">
                      {imovel.titulo}
                    </h3>
                    <p className="text-sm text-texto-secundario">
                      {[imovel.bairro, imovel.cidade].filter(Boolean).join(', ')}
                    </p>

                    <div className="mt-auto pt-2">
                      {imovel.valor != null && (
                        <p className="text-lg font-bold text-texto">{moeda(imovel.valor)}</p>
                      )}
                      {imovel.valorAluguel != null && (
                        <p className="font-semibold text-texto-secundario">
                          {moeda(imovel.valorAluguel)}
                          <span className="text-xs font-normal">/mês</span>
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ------------------------------------------------ o corretor */}
        <section className="rounded-xl border border-borda bg-superficie p-5">
          <h2 className="mb-1 font-semibold">Fale com {primeiroNome(resumo.corretorNome)}</h2>
          <p className="mb-3 text-sm text-texto-secundario">
            Qualquer dúvida sobre o processo, é só chamar.
          </p>
          <div className="flex flex-wrap gap-2">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center rounded-lg bg-acao px-5 text-sm font-semibold text-acao-texto transition-colors hover:bg-acao-hover"
              >
                WhatsApp
              </a>
            )}
            {resumo.corretorEmail && (
              <a
                href={`mailto:${resumo.corretorEmail}`}
                className="inline-flex h-11 items-center rounded-lg border border-borda px-5 text-sm font-semibold text-texto"
              >
                E-mail
              </a>
            )}
          </div>
        </section>

        {/* O cliente precisa saber quem tem os dados dele, e que pode pedir
            para sair. É a seção 16 do produto, e é a LGPD. */}
        <p className="border-t border-borda pt-4 text-xs text-texto-apoio">
          Seus dados estão sob responsabilidade de {resumo.corretorNome}. Você pode pedir a
          correção ou a exclusão deles a qualquer momento, falando diretamente com{' '}
          {primeiroNome(resumo.corretorNome)}.{' '}
          <Link href="/portal" className="text-link hover:underline">
            Sair do portal
          </Link>
        </p>
      </main>
    </>
  );
}

function Miudo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-texto-apoio">{rotulo}</dt>
      <dd className="font-medium text-texto">{valor}</dd>
    </div>
  );
}
