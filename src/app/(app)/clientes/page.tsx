import type { Metadata } from 'next';
import Link from 'next/link';

import { exigirSessao } from '@/server/sessao';
import { listarClientes } from '@/server/consultas/pessoas';
import { Botao } from '@/components/ui/botao';
import { Cartao } from '@/components/ui/cartao';
import { Chip, ChipTemperatura } from '@/components/ui/sinal';
import { EstadoPrimeiroAcesso, EstadoSemPermissao, EstadoVazio } from '@/components/ui/estados';
import { Icone } from '@/components/shell/icones';
import { ROTULO_PAPEL } from '@/dominio/permissoes';
import { iniciais, numero, tempoRelativo } from '@/lib/formato';
import { mascararCelular } from '@/lib/privacidade/documentos';
import type { Temperatura } from '@/lib/supabase/tipos-banco';

export const metadata: Metadata = { title: 'Clientes' };

const TEMPERATURAS: Temperatura[] = ['quente', 'morno', 'frio'];

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; temperatura?: string; parados?: string; pagina?: string }>;
}) {
  const sessao = await exigirSessao('/clientes');

  if (!sessao.pode('crm.ver')) {
    return (
      <div className="px-4 py-8 lg:px-6">
        <EstadoSemPermissao papel={ROTULO_PAPEL[sessao.atual.papel]} oQue="Carteira de clientes" />
      </div>
    );
  }

  const params = await searchParams;
  const temperatura = TEMPERATURAS.includes(params.temperatura as Temperatura)
    ? (params.temperatura as Temperatura)
    : undefined;

  const resultado = await listarClientes(sessao.atual.tenant.id, {
    busca: params.q,
    temperatura,
    parados: params.parados === '1',
    pagina: Number(params.pagina) || 1,
  });

  const temFiltro = Boolean(params.q || temperatura || params.parados === '1');
  const totalPaginas = Math.max(1, Math.ceil(resultado.total / resultado.porPagina));

  /** Preserva os filtros ao trocar de página. */
  function urlComPagina(n: number): string {
    const p = new URLSearchParams();
    if (params.q) p.set('q', params.q);
    if (temperatura) p.set('temperatura', temperatura);
    if (params.parados === '1') p.set('parados', '1');
    p.set('pagina', String(n));
    return `/clientes?${p.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="mt-0.5 text-sm text-texto-secundario">
            {resultado.total === 0
              ? 'Nenhum cliente nesta busca'
              : `${numero(resultado.total)} ${resultado.total === 1 ? 'pessoa' : 'pessoas'} na sua carteira`}
          </p>
        </div>

        {sessao.pode('crm.criar') && (
          <Botao comoFilho>
            <Link href="/clientes/novo">
              <Icone nome="mais" className="size-4" />
              Novo cliente
            </Link>
          </Botao>
        )}
      </div>

      {/* Filtros em formulário GET: o estado vive na URL, então o botão voltar
          funciona, o link é compartilhável e a página funciona sem JavaScript. */}
      <Cartao className="p-3">
        <form method="get" action="/clientes" className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-60 flex-grow items-center gap-2 rounded-lg border border-borda bg-fundo px-3">
            <Icone nome="busca" className="size-4 shrink-0 text-texto-apoio" />
            <label htmlFor="q" className="so-leitor">
              Buscar por nome, telefone ou CPF
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={params.q ?? ''}
              placeholder="Nome, telefone ou CPF"
              className="h-9 w-full bg-transparent text-sm text-texto placeholder:text-texto-desabilitado focus:outline-none"
            />
          </div>

          <label htmlFor="temperatura" className="so-leitor">
            Filtrar por temperatura
          </label>
          <select
            id="temperatura"
            name="temperatura"
            defaultValue={temperatura ?? ''}
            className="h-9 rounded-lg border border-borda-controle bg-superficie px-2 text-sm text-texto"
          >
            <option value="">Todas as temperaturas</option>
            <option value="quente">Quente</option>
            <option value="morno">Morno</option>
            <option value="frio">Frio</option>
          </select>

          <label className="flex h-9 items-center gap-2 rounded-lg border border-borda px-3 text-sm text-texto-secundario">
            <input
              type="checkbox"
              name="parados"
              value="1"
              defaultChecked={params.parados === '1'}
              className="size-4 accent-[var(--cor-acao)]"
            />
            Sem contato há 7 dias
          </label>

          <Botao type="submit" tipo="neutro" tamanho="pequeno">
            Filtrar
          </Botao>

          {temFiltro && (
            <Botao tipo="fantasma" tamanho="pequeno" comoFilho>
              <Link href="/clientes">Limpar</Link>
            </Botao>
          )}
        </form>
      </Cartao>

      {resultado.itens.length === 0 ? (
        resultado.contaVazia ? (
          <EstadoPrimeiroAcesso
            titulo="Sua carteira começa aqui"
            descricao="Cadastre a primeira pessoa e o Agilliza passa a guardar todo o histórico dela: conversas, visitas, simulações e follow-ups. O CPF impede que a mesma pessoa vire dois cadastros."
            acao={{ rotulo: 'Cadastrar primeiro cliente', href: '/clientes/novo' }}
          />
        ) : (
          <EstadoVazio
            titulo="Nenhum cliente com esses filtros"
            descricao="Talvez a pessoa esteja cadastrada com outro telefone, ou o CPF ainda não tenha sido preenchido. Limpe os filtros para ver a carteira inteira."
            acao={{ rotulo: 'Limpar filtros', href: '/clientes' }}
            acaoSecundaria={{ rotulo: 'Cadastrar novo', href: '/clientes/novo' }}
          />
        )
      ) : (
        <Cartao className="overflow-hidden">
          {/* Tabela no desktop */}
          <div className="hidden lg:block">
            <table className="w-full border-collapse text-sm">
              <caption className="so-leitor">
                Clientes da carteira, com temperatura, contato, negócios abertos e última interação
              </caption>
              <thead>
                <tr className="border-b border-borda text-left text-xs text-texto-secundario">
                  <th scope="col" className="px-4 py-2.5 font-semibold">Cliente</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Contato</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Local</th>
                  <th scope="col" className="px-4 py-2.5 text-center font-semibold">Negócios</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Responsável</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Última interação</th>
                </tr>
              </thead>
              <tbody>
                {resultado.itens.map((c) => (
                  <tr key={c.id} className="border-b border-borda-sutil last:border-0 hover:bg-superficie-hover">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-acao-sutil text-xs font-bold text-acao-sutil-texto"
                        >
                          {iniciais(c.nome)}
                        </span>
                        <span className="min-w-0">
                          <Link
                            href={`/clientes/${c.id}`}
                            className="block truncate font-semibold text-texto no-underline hover:text-link"
                          >
                            {c.nome}
                          </Link>
                          <span className="flex items-center gap-1.5">
                            <ChipTemperatura temperatura={c.temperatura} />
                            {c.portalLiberado && <Chip tom="sucesso">Portal</Chip>}
                          </span>
                        </span>
                      </div>
                    </th>
                    <td className="px-4 py-3 text-texto-secundario">
                      {c.telefonePrincipal ? (
                        <span className="block">{mascararCelular(c.telefonePrincipal)}</span>
                      ) : (
                        <span className="text-texto-desabilitado">Sem telefone</span>
                      )}
                      {c.cpfMascarado && (
                        <span className="block text-xs text-texto-apoio">{c.cpfMascarado}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-texto-secundario">
                      {c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center" data-numerico>
                      {c.negociosAbertos > 0 ? (
                        <Chip tom="acao">{c.negociosAbertos}</Chip>
                      ) : (
                        <span className="text-texto-desabilitado">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-texto-secundario">{c.responsavelNome ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-texto-secundario">
                      <time dateTime={c.ultimaInteracaoEm ?? undefined}>
                        {c.ultimaInteracaoEm ? tempoRelativo(c.ultimaInteracaoEm) : 'Nunca'}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cartões empilhados no celular (seção 21) */}
          <ul className="divide-y divide-borda-sutil lg:hidden">
            {resultado.itens.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clientes/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 no-underline"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-acao-sutil text-sm font-bold text-acao-sutil-texto"
                  >
                    {iniciais(c.nome)}
                  </span>
                  <span className="min-w-0 flex-grow">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-texto">{c.nome}</span>
                      <ChipTemperatura temperatura={c.temperatura} />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-texto-secundario">
                      {c.telefonePrincipal ? mascararCelular(c.telefonePrincipal) : 'Sem telefone'}
                      {c.cidade ? ` · ${c.cidade}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {c.negociosAbertos > 0 && <Chip tom="acao">{c.negociosAbertos}</Chip>}
                    <span className="mt-0.5 block text-micro text-texto-apoio">
                      {c.ultimaInteracaoEm ? tempoRelativo(c.ultimaInteracaoEm) : 'Nunca'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {totalPaginas > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-between gap-3">
          <p className="text-xs text-texto-secundario">
            Página {resultado.pagina} de {totalPaginas}
          </p>
          <div className="flex gap-2">
            <Botao
              tipo="neutro"
              tamanho="pequeno"
              comoFilho={resultado.pagina > 1}
              disabled={resultado.pagina <= 1}
            >
              {resultado.pagina > 1 ? (
                <Link href={urlComPagina(resultado.pagina - 1)}>Anterior</Link>
              ) : (
                <span>Anterior</span>
              )}
            </Botao>
            <Botao
              tipo="neutro"
              tamanho="pequeno"
              comoFilho={resultado.pagina < totalPaginas}
              disabled={resultado.pagina >= totalPaginas}
            >
              {resultado.pagina < totalPaginas ? (
                <Link href={urlComPagina(resultado.pagina + 1)}>Próxima</Link>
              ) : (
                <span>Próxima</span>
              )}
            </Botao>
          </div>
        </nav>
      )}
    </div>
  );
}
