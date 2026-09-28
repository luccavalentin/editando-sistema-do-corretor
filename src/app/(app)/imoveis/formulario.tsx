'use client';

import Link from 'next/link';
import { useActionState, useId, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoTitulo } from '@/components/ui/cartao';
import { Icone } from '@/components/shell/icones';
import { cn } from '@/lib/ui';
import {
  COMODIDADES,
  CONSERVACOES,
  FINALIDADES,
  MINIMO_DESCRICAO_PUBLICA,
  SITUACOES_DE_IMOVEL,
  TIPOS_DE_IMOVEL,
  USOS,
} from '@/dominio/imovel';
import type { EstadoDeImovel } from '@/server/acoes/imoveis';

const CLASSE_ENTRADA =
  'h-10 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-sm text-texto placeholder:text-texto-desabilitado aria-invalid:border-2 aria-invalid:border-perigo';

const CLASSE_SELECT =
  'h-10 w-full rounded-lg border border-borda-controle bg-superficie px-2.5 text-sm text-texto';

function Campo({
  id,
  rotulo,
  erro,
  dica,
  children,
  className,
}: {
  id: string;
  rotulo: string;
  erro?: string;
  dica?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-texto-secundario">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p
          id={`${id}-erro`}
          role="alert"
          className="mt-1 flex items-center gap-1.5 text-xs text-perigo-texto"
        >
          <Icone nome="alerta" className="size-3" />
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="mt-1 text-xs text-texto-apoio">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

function Interruptor({
  nome,
  rotulo,
  descricao,
  padrao,
  desabilitado,
  aoMudar,
}: {
  nome: string;
  rotulo: string;
  descricao?: string;
  padrao?: boolean;
  desabilitado?: boolean;
  aoMudar?: (valor: boolean) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-lg border border-borda p-3 transition-colors',
        desabilitado ? 'cursor-not-allowed opacity-60' : 'hover:bg-superficie-hover',
      )}
    >
      <input
        id={id}
        name={nome}
        type="checkbox"
        defaultChecked={padrao}
        disabled={desabilitado}
        onChange={(evento) => aoMudar?.(evento.currentTarget.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--cor-acao)]"
      />
      <span>
        <span className="block text-sm font-medium text-texto">{rotulo}</span>
        {descricao && <span className="mt-0.5 block text-xs text-texto-apoio">{descricao}</span>}
      </span>
    </label>
  );
}

function BotaoSalvar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" disabled={pending}>
      {pending ? 'Salvando' : rotulo}
    </Botao>
  );
}

export interface ValoresIniciais {
  [campo: string]: string | number | boolean | string[] | null | undefined;
}

export interface OpcaoDePessoa {
  id: string;
  nome: string;
}

export function FormularioDeImovel({
  acaoDoServidor,
  valores = {},
  proprietarios,
  podePublicar,
  rotuloDoBotao,
  urlDeCancelar,
}: {
  acaoDoServidor: (estado: EstadoDeImovel, formulario: FormData) => Promise<EstadoDeImovel>;
  valores?: ValoresIniciais;
  proprietarios: OpcaoDePessoa[];
  podePublicar: boolean;
  rotuloDoBotao: string;
  urlDeCancelar: string;
}) {
  const [estado, acao] = useActionState<EstadoDeImovel, FormData>(acaoDoServidor, {});
  const campos = estado.campos ?? {};

  const [finalidade, setFinalidade] = useState(String(valores.finalidade ?? 'venda'));
  const [publicar, setPublicar] = useState(Boolean(valores.publicadoNoPortfolio));
  const [exclusivo, setExclusivo] = useState(Boolean(valores.exclusividade));
  const [descricao, setDescricao] = useState(String(valores.descricaoPublica ?? ''));

  const mostraVenda = finalidade === 'venda' || finalidade === 'venda_aluguel';
  const mostraAluguel = finalidade === 'aluguel' || finalidade === 'venda_aluguel';

  const comodidadesMarcadas = new Set(
    Array.isArray(valores.comodidades) ? valores.comodidades : [],
  );

  function props(nome: string) {
    return {
      'aria-invalid': campos[nome] ? (true as const) : undefined,
      'aria-describedby': campos[nome] ? `${nome}-erro` : undefined,
    };
  }

  const texto = (nome: string) => (valores[nome] == null ? '' : String(valores[nome]));

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {estado.erro && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-perigo-sutil px-3 py-2.5 text-sm text-perigo-texto"
        >
          <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
          {estado.erro}
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>O imóvel</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoCorpo className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            id="titulo"
            rotulo="Título do anúncio"
            erro={campos.titulo}
            dica="É o que o comprador lê primeiro. Ex.: Apartamento 3 dormitórios na Vila Mariana"
            className="sm:col-span-2 lg:col-span-4"
          >
            <input
              id="titulo"
              name="titulo"
              defaultValue={texto('titulo')}
              maxLength={200}
              required
              className={CLASSE_ENTRADA}
              {...props('titulo')}
            />
          </Campo>

          <Campo id="tipo" rotulo="Tipo" erro={campos.tipo}>
            <select
              id="tipo"
              name="tipo"
              defaultValue={texto('tipo') || 'apartamento'}
              className={CLASSE_SELECT}
            >
              {Object.entries(TIPOS_DE_IMOVEL).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo id="finalidade" rotulo="Finalidade" erro={campos.finalidade}>
            <select
              id="finalidade"
              name="finalidade"
              value={finalidade}
              onChange={(e) => setFinalidade(e.currentTarget.value)}
              className={CLASSE_SELECT}
            >
              {Object.entries(FINALIDADES).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            id="situacao"
            rotulo="Situação"
            erro={campos.situacao}
            dica="Rascunho não aparece em lugar nenhum"
          >
            <select
              id="situacao"
              name="situacao"
              defaultValue={texto('situacao') || 'rascunho'}
              className={CLASSE_SELECT}
              {...props('situacao')}
            >
              {Object.entries(SITUACOES_DE_IMOVEL).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo id="uso" rotulo="Uso" erro={campos.uso}>
            <select
              id="uso"
              name="uso"
              defaultValue={texto('uso') || 'residencial'}
              className={CLASSE_SELECT}
            >
              {Object.entries(USOS).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            id="conservacao"
            rotulo="Conservação"
            erro={campos.conservacao}
            dica="Novo ou usado muda a simulação de financiamento"
            className="sm:col-span-2"
          >
            <select
              id="conservacao"
              name="conservacao"
              defaultValue={texto('conservacao') || 'usado'}
              className={CLASSE_SELECT}
            >
              {Object.entries(CONSERVACOES).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            id="proprietarioId"
            rotulo="Proprietário"
            erro={campos.proprietarioId}
            dica="Uma pessoa do seu CRM, não texto solto"
            className="sm:col-span-2"
          >
            <select
              id="proprietarioId"
              name="proprietarioId"
              defaultValue={texto('proprietarioId')}
              className={CLASSE_SELECT}
            >
              <option value="">Não informado</option>
              {proprietarios.map((pessoa) => (
                <option key={pessoa.id} value={pessoa.id}>
                  {pessoa.nome}
                </option>
              ))}
            </select>
          </Campo>
        </CartaoCorpo>
      </Cartao>

      {/* ------------------------------------------------------------------ */}
      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>Onde fica</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoCorpo className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Campo id="cep" rotulo="CEP" erro={campos.cep}>
            <input
              id="cep"
              name="cep"
              inputMode="numeric"
              defaultValue={texto('cep')}
              placeholder="00000000"
              className={CLASSE_ENTRADA}
              {...props('cep')}
            />
          </Campo>

          <Campo id="logradouro" rotulo="Rua" erro={campos.logradouro} className="col-span-2 lg:col-span-3">
            <input
              id="logradouro"
              name="logradouro"
              defaultValue={texto('logradouro')}
              className={CLASSE_ENTRADA}
            />
          </Campo>

          <Campo id="numero" rotulo="Número" erro={campos.numero}>
            <input id="numero" name="numero" defaultValue={texto('numero')} className={CLASSE_ENTRADA} />
          </Campo>

          <Campo id="complemento" rotulo="Complemento" erro={campos.complemento}>
            <input
              id="complemento"
              name="complemento"
              defaultValue={texto('complemento')}
              placeholder="Apto 72"
              className={CLASSE_ENTRADA}
            />
          </Campo>

          <Campo id="bairro" rotulo="Bairro" erro={campos.bairro} className="col-span-2">
            <input id="bairro" name="bairro" defaultValue={texto('bairro')} className={CLASSE_ENTRADA} />
          </Campo>

          <Campo
            id="cidade"
            rotulo="Cidade"
            erro={campos.cidade}
            className="col-span-2 lg:col-span-3"
          >
            <input
              id="cidade"
              name="cidade"
              defaultValue={texto('cidade')}
              className={CLASSE_ENTRADA}
              {...props('cidade')}
            />
          </Campo>

          <Campo id="uf" rotulo="UF" erro={campos.uf}>
            <input
              id="uf"
              name="uf"
              maxLength={2}
              defaultValue={texto('uf')}
              placeholder="SP"
              className={cn(CLASSE_ENTRADA, 'uppercase')}
              {...props('uf')}
            />
          </Campo>

          <div className="col-span-2 lg:col-span-6">
            {/* O endereço exato é do proprietário, não do sistema. Fica
                escondido por padrão e só aparece no portfólio se alguém
                decidir que sim — decisão consciente, não esquecimento. */}
            <Interruptor
              nome="mostrarEnderecoNoPortfolio"
              rotulo="Mostrar o endereço exato no portfólio público"
              descricao="Desligado, o anúncio mostra apenas bairro e cidade. Confirme com o proprietário antes de ligar."
              padrao={Boolean(valores.mostrarEnderecoNoPortfolio)}
            />
          </div>
        </CartaoCorpo>
      </Cartao>

      {/* ------------------------------------------------------------------ */}
      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>Valores</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoCorpo className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {mostraVenda && (
            <Campo id="valor" rotulo="Valor de venda" erro={campos.valor}>
              <input
                id="valor"
                name="valor"
                inputMode="decimal"
                defaultValue={texto('valor')}
                placeholder="780.000,00"
                className={CLASSE_ENTRADA}
                {...props('valor')}
              />
            </Campo>
          )}

          {mostraAluguel && (
            <Campo id="valorAluguel" rotulo="Valor do aluguel" erro={campos.valorAluguel}>
              <input
                id="valorAluguel"
                name="valorAluguel"
                inputMode="decimal"
                defaultValue={texto('valorAluguel')}
                placeholder="3.200,00"
                className={CLASSE_ENTRADA}
                {...props('valorAluguel')}
              />
            </Campo>
          )}

          <Campo id="valorCondominio" rotulo="Condomínio" erro={campos.valorCondominio}>
            <input
              id="valorCondominio"
              name="valorCondominio"
              inputMode="decimal"
              defaultValue={texto('valorCondominio')}
              className={CLASSE_ENTRADA}
            />
          </Campo>

          <Campo id="valorIptu" rotulo="IPTU (ano)" erro={campos.valorIptu}>
            <input
              id="valorIptu"
              name="valorIptu"
              inputMode="decimal"
              defaultValue={texto('valorIptu')}
              className={CLASSE_ENTRADA}
            />
          </Campo>

          <Campo
            id="comissaoPercentual"
            rotulo="Comissão (%)"
            erro={campos.comissaoPercentual}
            dica="Só você vê. Nunca aparece no portfólio."
          >
            <input
              id="comissaoPercentual"
              name="comissaoPercentual"
              inputMode="decimal"
              defaultValue={texto('comissaoPercentual')}
              placeholder="5"
              className={CLASSE_ENTRADA}
              {...props('comissaoPercentual')}
            />
          </Campo>

          <div className="col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:col-span-4">
            <Interruptor
              nome="aceitaFinanciamento"
              rotulo="Aceita financiamento"
              padrao={valores.aceitaFinanciamento !== false}
            />
            <Interruptor
              nome="aceitaFgts"
              rotulo="Aceita FGTS"
              padrao={valores.aceitaFgts !== false}
            />
            <Interruptor
              nome="aceitaPermuta"
              rotulo="Aceita permuta"
              padrao={Boolean(valores.aceitaPermuta)}
            />
          </div>

          <div className="col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:col-span-4">
            <Interruptor
              nome="exclusividade"
              rotulo="Tenho exclusividade"
              padrao={Boolean(valores.exclusividade)}
              aoMudar={setExclusivo}
            />
            {exclusivo && (
              <Campo
                id="exclusividadeAte"
                rotulo="Exclusividade até"
                erro={campos.exclusividadeAte}
                dica="Contrato de exclusividade sempre tem prazo"
              >
                <input
                  id="exclusividadeAte"
                  name="exclusividadeAte"
                  type="date"
                  defaultValue={texto('exclusividadeAte')}
                  className={CLASSE_ENTRADA}
                  {...props('exclusividadeAte')}
                />
              </Campo>
            )}
          </div>
        </CartaoCorpo>
      </Cartao>

      {/* ------------------------------------------------------------------ */}
      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>Características</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoCorpo className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Campo id="areaUtil" rotulo="Área útil (m²)" erro={campos.areaUtil}>
            <input
              id="areaUtil"
              name="areaUtil"
              inputMode="decimal"
              defaultValue={texto('areaUtil')}
              className={CLASSE_ENTRADA}
              {...props('areaUtil')}
            />
          </Campo>
          <Campo id="areaTotal" rotulo="Área total (m²)" erro={campos.areaTotal}>
            <input
              id="areaTotal"
              name="areaTotal"
              inputMode="decimal"
              defaultValue={texto('areaTotal')}
              className={CLASSE_ENTRADA}
            />
          </Campo>
          <Campo id="quartos" rotulo="Quartos" erro={campos.quartos}>
            <input
              id="quartos"
              name="quartos"
              inputMode="numeric"
              defaultValue={texto('quartos')}
              className={CLASSE_ENTRADA}
            />
          </Campo>
          <Campo id="suites" rotulo="Suítes" erro={campos.suites}>
            <input
              id="suites"
              name="suites"
              inputMode="numeric"
              defaultValue={texto('suites')}
              className={CLASSE_ENTRADA}
              {...props('suites')}
            />
          </Campo>
          <Campo id="banheiros" rotulo="Banheiros" erro={campos.banheiros}>
            <input
              id="banheiros"
              name="banheiros"
              inputMode="numeric"
              defaultValue={texto('banheiros')}
              className={CLASSE_ENTRADA}
            />
          </Campo>
          <Campo id="vagas" rotulo="Vagas" erro={campos.vagas}>
            <input
              id="vagas"
              name="vagas"
              inputMode="numeric"
              defaultValue={texto('vagas')}
              className={CLASSE_ENTRADA}
            />
          </Campo>
          <Campo id="andar" rotulo="Andar" erro={campos.andar}>
            <input
              id="andar"
              name="andar"
              inputMode="numeric"
              defaultValue={texto('andar')}
              className={CLASSE_ENTRADA}
            />
          </Campo>
          <Campo id="anoConstrucao" rotulo="Ano de construção" erro={campos.anoConstrucao}>
            <input
              id="anoConstrucao"
              name="anoConstrucao"
              inputMode="numeric"
              defaultValue={texto('anoConstrucao')}
              placeholder="2018"
              className={CLASSE_ENTRADA}
              {...props('anoConstrucao')}
            />
          </Campo>

          <div className="col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:col-span-4">
            <Interruptor nome="mobiliado" rotulo="Mobiliado" padrao={Boolean(valores.mobiliado)} />
            <Interruptor nome="aceitaPet" rotulo="Aceita pet" padrao={Boolean(valores.aceitaPet)} />
          </div>

          <fieldset className="col-span-2 lg:col-span-4">
            <legend className="mb-2 text-xs font-semibold text-texto-secundario">
              Comodidades
            </legend>
            <div className="flex flex-wrap gap-2">
              {COMODIDADES.map((comodidade) => (
                <label
                  key={comodidade}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-borda px-3 py-1.5 text-xs text-texto-secundario transition-colors hover:bg-superficie-hover has-[:checked]:border-acao has-[:checked]:bg-acao-sutil has-[:checked]:text-acao-sutil-texto"
                >
                  <input
                    type="checkbox"
                    name="comodidades"
                    value={comodidade}
                    defaultChecked={comodidadesMarcadas.has(comodidade)}
                    className="size-3.5 accent-[var(--cor-acao)]"
                  />
                  {comodidade}
                </label>
              ))}
            </div>
          </fieldset>
        </CartaoCorpo>
      </Cartao>

      {/* ------------------------------------------------------------------ */}
      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>Anúncio</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoCorpo className="flex flex-col gap-3">
          <Campo
            id="descricaoPublica"
            rotulo="Descrição pública"
            erro={campos.descricaoPublica}
            dica={
              publicar
                ? `${descricao.trim().length} de ${MINIMO_DESCRICAO_PUBLICA} caracteres mínimos para publicar`
                : 'Aparece no portfólio e nos portais. Descreva o que a foto não mostra.'
            }
          >
            <textarea
              id="descricaoPublica"
              name="descricaoPublica"
              rows={5}
              maxLength={6000}
              value={descricao}
              onChange={(e) => setDescricao(e.currentTarget.value)}
              className="w-full rounded-lg border border-borda-controle bg-superficie px-3 py-2 text-sm text-texto placeholder:text-texto-desabilitado aria-invalid:border-2 aria-invalid:border-perigo"
              {...props('descricaoPublica')}
            />
          </Campo>

          <Campo
            id="observacoesInternas"
            rotulo="Observações internas"
            erro={campos.observacoesInternas}
            dica="Só a sua equipe vê. Nunca sai no portfólio, nem em portal, nem em link compartilhado."
          >
            <textarea
              id="observacoesInternas"
              name="observacoesInternas"
              rows={3}
              maxLength={6000}
              defaultValue={texto('observacoesInternas')}
              placeholder="Proprietária aceita proposta à vista; prefere visita de manhã"
              className="w-full rounded-lg border border-borda-controle bg-superficie px-3 py-2 text-sm text-texto placeholder:text-texto-desabilitado"
            />
          </Campo>

          {podePublicar ? (
            <Interruptor
              nome="publicadoNoPortfolio"
              rotulo="Publicar no portfólio público"
              descricao="O anúncio passa a aparecer no seu site e a ser indexado por buscadores."
              padrao={Boolean(valores.publicadoNoPortfolio)}
              aoMudar={setPublicar}
            />
          ) : (
            <p className="rounded-lg border border-borda bg-superficie-afundada px-3 py-2.5 text-xs text-texto-secundario">
              Seu papel permite cadastrar o imóvel, mas não publicá-lo no portfólio. Salve e peça
              a publicação a quem administra a conta.
            </p>
          )}
        </CartaoCorpo>
      </Cartao>

      <div className="flex flex-wrap items-center gap-2 pb-2">
        <BotaoSalvar rotulo={rotuloDoBotao} />
        <Botao tipo="neutro" comoFilho>
          <Link href={urlDeCancelar}>Cancelar</Link>
        </Botao>
        <p className="text-xs text-texto-apoio">
          As fotos são enviadas depois de salvar, na ficha do imóvel.
        </p>
      </div>
    </form>
  );
}
