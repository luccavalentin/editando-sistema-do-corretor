import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { exigirSessao } from '@/server/sessao';
import { clienteServidor } from '@/lib/supabase/servidor';
import { obterImovel } from '@/server/consultas/imoveis';
import { atualizarImovel } from '@/server/acoes/imoveis';
import { armazenamentoDisponivel, urlPublicaDaFoto } from '@/lib/armazenamento/s3';
import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoTitulo } from '@/components/ui/cartao';
import { Chip } from '@/components/ui/sinal';
import { EstadoSemPermissao } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import {
  CONSERVACOES,
  FINALIDADES,
  SITUACOES_DE_IMOVEL,
  TIPOS_DE_IMOVEL,
  USOS,
} from '@/dominio/imovel';
import { data, moeda, numero, tempoRelativo } from '@/lib/formato';
import { mascararCelular } from '@/lib/privacidade/documentos';
import { FormularioDeImovel } from '../formulario';
import { GerenciadorDeFotos, type FotoExibida } from './fotos';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const sessao = await exigirSessao();
  const { id } = await params;
  const ficha = await obterImovel(sessao.atual.tenant.id, id);
  return { title: ficha ? `${ficha.imovel.codigo} · ${ficha.imovel.titulo}` : 'Imóvel' };
}

const TOM_DA_SITUACAO: Record<string, 'neutro' | 'sucesso' | 'atencao' | 'perigo' | 'acao'> = {
  rascunho: 'neutro',
  disponivel: 'sucesso',
  reservado: 'atencao',
  em_negociacao: 'acao',
  vendido: 'neutro',
  alugado: 'neutro',
  suspenso: 'perigo',
};

export default async function PaginaDoImovel({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { id } = await params;
  const { aba } = await searchParams;
  const sessao = await exigirSessao(`/imoveis/${id}`);

  if (!sessao.pode('imoveis.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Ficha do imóvel" />
      </div>
    );
  }

  const ficha = await obterImovel(sessao.atual.tenant.id, id);
  if (!ficha) notFound();

  const imovel = ficha.imovel;
  const armazenamento = armazenamentoDisponivel();
  const podeEditar = sessao.pode('imoveis.editar');

  const fotos: FotoExibida[] = armazenamento
    ? ficha.fotos.map((foto) => ({
        id: foto.id,
        url: urlPublicaDaFoto(foto.chave),
        legenda: foto.legenda,
        capa: foto.capa,
      }))
    : [];

  const abaAtiva = aba === 'editar' && podeEditar ? 'editar' : 'ficha';

  // Só busca a lista de proprietários quando a aba de edição está aberta:
  // 500 nomes a cada abertura da ficha é ida ao banco sem motivo.
  let proprietarios: { id: string; nome: string }[] = [];
  if (abaAtiva === 'editar') {
    const supabase = await clienteServidor();
    const { data: pessoas } = await supabase
      .from('pessoas')
      .select('id, nome')
      .eq('tenant_id', sessao.atual.tenant.id)
      .is('excluido_em', null)
      .order('nome', { ascending: true })
      .limit(500);
    proprietarios = pessoas ?? [];
  }

  const valorDe = (campo: string): string => {
    const bruto = imovel[campo as keyof typeof imovel];
    return bruto == null ? '' : String(bruto);
  };

  const endereco = [
    imovel.logradouro,
    imovel.numero,
    imovel.complemento,
    imovel.bairro,
    imovel.cidade,
    imovel.uf,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 lg:px-6">
      <div>
        <Link
          href="/imoveis"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-link hover:underline"
        >
          <Icone nome="voltar" className="size-4" />
          Imóveis
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className="text-micro font-semibold tracking-wide text-texto-apoio">
                {imovel.codigo}
              </span>
              <Chip tom={TOM_DA_SITUACAO[imovel.situacao as string] ?? 'neutro'}>
                {SITUACOES_DE_IMOVEL[imovel.situacao as keyof typeof SITUACOES_DE_IMOVEL] ??
                  String(imovel.situacao)}
              </Chip>
              {imovel.visivel_no_portfolio ? (
                <Chip tom="acao">
                  <Icone nome="globo" className="size-3" />
                  No ar
                </Chip>
              ) : imovel.publicado_no_portfolio ? (
                // Marcado como publicado mas fora do ar: o corretor precisa
                // saber por quê, senão ele acha que o portfólio quebrou.
                <Chip tom="atencao">Publicado, mas fora do ar</Chip>
              ) : null}
              {Boolean(imovel.exclusividade) && <Chip tom="atencao">Exclusivo</Chip>}
            </div>

            <h1 className="text-2xl font-bold leading-tight tracking-tight">{imovel.titulo}</h1>
            <p className="mt-0.5 text-sm text-texto-secundario">
              {endereco || 'Endereço não informado'}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {podeEditar && (
              <Botao tipo={abaAtiva === 'editar' ? 'principal' : 'neutro'} comoFilho>
                <Link href={`/imoveis/${id}?aba=${abaAtiva === 'editar' ? 'ficha' : 'editar'}`}>
                  <Icone nome="ajustes" className="size-4" />
                  {abaAtiva === 'editar' ? 'Ver ficha' : 'Editar'}
                </Link>
              </Botao>
            )}
            {sessao.pode('simulacao.criar') && imovel.valor != null && (
              <Botao tipo="neutro" comoFilho>
                <Link href={`/simulacoes/nova?imovel=${id}`}>
                  <Icone nome="calculadora" className="size-4" />
                  Simular
                </Link>
              </Botao>
            )}
            {sessao.pode('crm.criar') && (
              <Botao tipo="neutro" comoFilho>
                <Link href={`/negocios/novo?imovel=${id}`}>
                  <Icone nome="funil" className="size-4" />
                  Novo negócio
                </Link>
              </Botao>
            )}
          </div>
        </div>
      </div>

      {abaAtiva === 'editar' ? (
        <FormularioDeImovel
          acaoDoServidor={atualizarImovel.bind(null, id)}
          proprietarios={proprietarios}
          podePublicar={sessao.pode('imoveis.publicar')}
          rotuloDoBotao="Salvar alterações"
          urlDeCancelar={`/imoveis/${id}`}
          valores={{
            titulo: valorDe('titulo'),
            tipo: valorDe('tipo'),
            finalidade: valorDe('finalidade'),
            situacao: valorDe('situacao'),
            uso: valorDe('uso'),
            conservacao: valorDe('conservacao'),
            proprietarioId: valorDe('proprietario_id'),
            cep: valorDe('cep'),
            logradouro: valorDe('logradouro'),
            numero: valorDe('numero'),
            complemento: valorDe('complemento'),
            bairro: valorDe('bairro'),
            cidade: valorDe('cidade'),
            uf: valorDe('uf'),
            mostrarEnderecoNoPortfolio: Boolean(imovel.mostrar_endereco_no_portfolio),
            valor: valorDe('valor'),
            valorAluguel: valorDe('valor_aluguel'),
            valorCondominio: valorDe('valor_condominio'),
            valorIptu: valorDe('valor_iptu'),
            aceitaFinanciamento: Boolean(imovel.aceita_financiamento),
            aceitaFgts: Boolean(imovel.aceita_fgts),
            aceitaPermuta: Boolean(imovel.aceita_permuta),
            areaUtil: valorDe('area_util'),
            areaTotal: valorDe('area_total'),
            quartos: valorDe('quartos'),
            suites: valorDe('suites'),
            banheiros: valorDe('banheiros'),
            vagas: valorDe('vagas'),
            andar: valorDe('andar'),
            anoConstrucao: valorDe('ano_construcao'),
            mobiliado: Boolean(imovel.mobiliado),
            aceitaPet: Boolean(imovel.aceita_pet),
            comodidades: (imovel.comodidades as string[] | null) ?? [],
            comissaoPercentual: valorDe('comissao_percentual'),
            exclusividade: Boolean(imovel.exclusividade),
            exclusividadeAte: valorDe('exclusividade_ate'),
            descricaoPublica: valorDe('descricao_publica'),
            observacoesInternas: valorDe('observacoes_internas'),
            publicadoNoPortfolio: Boolean(imovel.publicado_no_portfolio),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>
                  Fotos
                  {fotos.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-texto-apoio">
                      {fotos.length}
                    </span>
                  )}
                </CartaoTitulo>
              </CartaoCabecalho>
              <CartaoCorpo>
                <GerenciadorDeFotos
                  imovelId={id}
                  fotosIniciais={fotos}
                  armazenamentoConfigurado={armazenamento}
                  podeEditar={podeEditar}
                />
              </CartaoCorpo>
            </Cartao>

            {Boolean(imovel.descricao_publica) && (
              <Cartao>
                <CartaoCabecalho>
                  <CartaoTitulo>Descrição do anúncio</CartaoTitulo>
                </CartaoCabecalho>
                <CartaoCorpo>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-texto-secundario">
                    {String(imovel.descricao_publica)}
                  </p>
                </CartaoCorpo>
              </Cartao>
            )}

            {/* Observação interna é o dado mais sensível da ficha. O aviso
                existe porque o corretor abre essa tela na frente do cliente. */}
            {Boolean(imovel.observacoes_internas) && (
              <Cartao className="border-atencao-borda">
                <CartaoCabecalho>
                  <CartaoTitulo>
                    <span className="flex items-center gap-2">
                      <Icone nome="escudo" className="size-4 text-atencao-texto" />
                      Observações internas
                    </span>
                  </CartaoTitulo>
                </CartaoCabecalho>
                <CartaoCorpo>
                  <p className="mb-2 text-xs font-semibold text-atencao-texto">
                    Só a sua equipe vê. Nunca sai no portfólio nem em link compartilhado.
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-texto-secundario">
                    {String(imovel.observacoes_internas)}
                  </p>
                </CartaoCorpo>
              </Cartao>
            )}

            {ficha.negocios.length > 0 && (
              <Cartao>
                <CartaoCabecalho>
                  <CartaoTitulo>Negócios neste imóvel</CartaoTitulo>
                </CartaoCabecalho>
                <CartaoCorpo className="p-0">
                  <ul className="divide-y divide-borda">
                    {ficha.negocios.map((negocio) => (
                      <li key={negocio.id}>
                        <Link
                          href={`/negocios/${negocio.id}`}
                          className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-superficie-hover"
                        >
                          <div className="min-w-0">
                            <p className="linhas-1 text-sm font-medium text-texto">
                              {negocio.pessoa?.nome ?? negocio.titulo ?? 'Negócio'}
                            </p>
                            <p className="text-xs text-texto-apoio">{negocio.codigo}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            {negocio.valor_proposta != null && (
                              <p className="text-sm font-semibold text-texto">
                                {moeda(negocio.valor_proposta)}
                              </p>
                            )}
                            <Chip>{negocio.situacao}</Chip>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CartaoCorpo>
              </Cartao>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>Valores</CartaoTitulo>
              </CartaoCabecalho>
              <CartaoCorpo className="flex flex-col gap-2.5">
                {imovel.valor != null && (
                  <div>
                    <p className="text-xs text-texto-apoio">Venda</p>
                    <p className="text-2xl font-bold leading-tight text-texto">
                      {moeda(imovel.valor)}
                    </p>
                  </div>
                )}
                {imovel.valor_aluguel != null && (
                  <div>
                    <p className="text-xs text-texto-apoio">Aluguel</p>
                    <p className="text-xl font-bold leading-tight text-texto">
                      {moeda(imovel.valor_aluguel)}
                      <span className="text-sm font-normal text-texto-secundario">/mês</span>
                    </p>
                  </div>
                )}
                <dl className="flex flex-col gap-1.5 border-t border-borda pt-2.5 text-sm">
                  {imovel.valor_condominio != null && (
                    <Linha rotulo="Condomínio" valor={moeda(imovel.valor_condominio)} />
                  )}
                  {imovel.valor_iptu != null && (
                    <Linha rotulo="IPTU (ano)" valor={moeda(imovel.valor_iptu)} />
                  )}
                  {imovel.comissao_percentual != null && (
                    <Linha
                      rotulo="Comissão"
                      valor={`${String(imovel.comissao_percentual)}%`}
                      sensivel
                    />
                  )}
                  <Linha
                    rotulo="Financiamento"
                    valor={imovel.aceita_financiamento ? 'Aceita' : 'Não aceita'}
                  />
                  <Linha rotulo="FGTS" valor={imovel.aceita_fgts ? 'Aceita' : 'Não aceita'} />
                  {Boolean(imovel.aceita_permuta) && <Linha rotulo="Permuta" valor="Aceita" />}
                </dl>
              </CartaoCorpo>
            </Cartao>

            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>Características</CartaoTitulo>
              </CartaoCabecalho>
              <CartaoCorpo>
                <dl className="flex flex-col gap-1.5 text-sm">
                  <Linha
                    rotulo="Tipo"
                    valor={
                      TIPOS_DE_IMOVEL[imovel.tipo as keyof typeof TIPOS_DE_IMOVEL] ??
                      String(imovel.tipo)
                    }
                  />
                  <Linha
                    rotulo="Finalidade"
                    valor={
                      FINALIDADES[imovel.finalidade as keyof typeof FINALIDADES] ??
                      String(imovel.finalidade)
                    }
                  />
                  <Linha
                    rotulo="Uso"
                    valor={USOS[imovel.uso as keyof typeof USOS] ?? String(imovel.uso)}
                  />
                  <Linha
                    rotulo="Conservação"
                    valor={
                      CONSERVACOES[imovel.conservacao as keyof typeof CONSERVACOES] ??
                      String(imovel.conservacao)
                    }
                  />
                  {imovel.area_util != null && (
                    <Linha rotulo="Área útil" valor={`${String(imovel.area_util)} m²`} />
                  )}
                  {imovel.area_total != null && (
                    <Linha rotulo="Área total" valor={`${String(imovel.area_total)} m²`} />
                  )}
                  {imovel.quartos != null && (
                    <Linha rotulo="Quartos" valor={String(imovel.quartos)} />
                  )}
                  {imovel.suites != null && <Linha rotulo="Suítes" valor={String(imovel.suites)} />}
                  {imovel.banheiros != null && (
                    <Linha rotulo="Banheiros" valor={String(imovel.banheiros)} />
                  )}
                  {imovel.vagas != null && <Linha rotulo="Vagas" valor={String(imovel.vagas)} />}
                  {imovel.andar != null && <Linha rotulo="Andar" valor={String(imovel.andar)} />}
                  {imovel.ano_construcao != null && (
                    <Linha rotulo="Construção" valor={String(imovel.ano_construcao)} />
                  )}
                  {Boolean(imovel.mobiliado) && <Linha rotulo="Mobiliado" valor="Sim" />}
                  {Boolean(imovel.aceita_pet) && <Linha rotulo="Aceita pet" valor="Sim" />}
                </dl>

                {Array.isArray(imovel.comodidades) && imovel.comodidades.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-borda pt-3">
                    {(imovel.comodidades as string[]).map((comodidade) => (
                      <Chip key={comodidade}>{comodidade}</Chip>
                    ))}
                  </div>
                )}
              </CartaoCorpo>
            </Cartao>

            {ficha.proprietario && (
              <Cartao>
                <CartaoCabecalho>
                  <CartaoTitulo>Proprietário</CartaoTitulo>
                </CartaoCabecalho>
                <CartaoCorpo>
                  <Link
                    href={`/clientes/${ficha.proprietario.id}`}
                    className="text-sm font-medium text-link hover:underline"
                  >
                    {ficha.proprietario.nome}
                  </Link>
                  {ficha.proprietario.telefone && (
                    <p className="mt-0.5 text-sm text-texto-secundario">
                      {mascararCelular(ficha.proprietario.telefone)}
                    </p>
                  )}
                </CartaoCorpo>
              </Cartao>
            )}

            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>Desempenho do anúncio</CartaoTitulo>
              </CartaoCabecalho>
              <CartaoCorpo>
                <dl className="flex flex-col gap-1.5 text-sm">
                  <Linha rotulo="Visualizações" valor={numero(imovel.visualizacoes as number)} />
                  <Linha rotulo="Contatos" valor={numero(imovel.contatos_gerados as number)} />
                  <Linha rotulo="Favoritos" valor={numero(imovel.favoritos as number)} />
                  <Linha rotulo="Pedidos de visita" valor={numero(imovel.pedidos_visita as number)} />
                </dl>
                <p className="mt-3 border-t border-borda pt-2.5 text-xs text-texto-apoio">
                  Cadastrado {tempoRelativo(imovel.criado_em as string)}
                  {imovel.publicado_em != null &&
                    ` · publicado em ${data(imovel.publicado_em as string)}`}
                </p>
              </CartaoCorpo>
            </Cartao>
          </div>
        </div>
      )}
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  sensivel,
}: {
  rotulo: string;
  valor: string;
  sensivel?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-texto-apoio">{rotulo}</dt>
      <dd
        className={
          sensivel ? 'font-semibold text-atencao-texto' : 'font-medium text-texto'
        }
      >
        {valor}
      </dd>
    </div>
  );
}
