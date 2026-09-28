'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Botao } from '@/components/ui/botao';
import { Cartao, CartaoCabecalho, CartaoCorpo, CartaoTitulo } from '@/components/ui/cartao';
import { Icone } from '@/components/shell/icones';
import { salvarVitrine, type EstadoDaVitrine } from '@/server/acoes/portfolio';

const CLASSE_ENTRADA =
  'h-10 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-sm text-texto placeholder:text-texto-desabilitado aria-invalid:border-2 aria-invalid:border-perigo';

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" disabled={pending}>
      {pending ? 'Salvando' : 'Salvar portfólio'}
    </Botao>
  );
}

function Campo({
  id,
  rotulo,
  erro,
  dica,
  children,
}: {
  id: string;
  rotulo: string;
  erro?: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
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
        <p className="mt-1 text-xs text-texto-apoio">{dica}</p>
      ) : null}
    </div>
  );
}

export function FormularioDaVitrine({
  valores,
  urlBase,
  totalPublicados,
}: {
  valores: {
    slug: string;
    titulo: string;
    bio: string;
    whatsapp: string;
    email: string;
    ativo: boolean;
  };
  urlBase: string;
  totalPublicados: number;
}) {
  const [estado, acao] = useActionState<EstadoDaVitrine, FormData>(salvarVitrine, {});
  const campos = estado.campos ?? {};

  const [slug, setSlug] = useState(valores.slug);
  const [ativo, setAtivo] = useState(valores.ativo);

  function props(nome: string) {
    return {
      'aria-invalid': campos[nome] ? (true as const) : undefined,
      'aria-describedby': campos[nome] ? `${nome}-erro` : undefined,
    };
  }

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

      {estado.sucesso && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-sucesso-sutil px-3 py-2.5 text-sm text-sucesso-texto"
        >
          <Icone nome="escudo" className="mt-0.5 size-4 shrink-0" />
          {estado.sucesso}
        </p>
      )}

      {/* ------------------------------------------------------------------
          O interruptor vem primeiro, e não no fim do formulário.
          É a decisão mais consequente da tela — publicar coloca o nome e o
          telefone do corretor numa página que o Google indexa. Enterrá-la
          embaixo de dez campos faria alguém ligá-la sem perceber.
      ------------------------------------------------------------------- */}
      <Cartao className={ativo ? 'border-acao' : undefined}>
        <CartaoCorpo>
          {/* O texto fica DIRETO no <label>, e a explicação é um parágrafo
              irmão ligado por `aria-describedby`. Aninhar o texto em <span>
              dentro do label esconde o rótulo de parte dos leitores de tela —
              e este é o controle mais consequente da tela. */}
          <div className="flex items-start gap-3">
            <input
              id="ativo"
              name="ativo"
              type="checkbox"
              defaultChecked={valores.ativo}
              onChange={(e) => setAtivo(e.currentTarget.checked)}
              aria-describedby="ativo-explicacao"
              className="mt-1 size-5 shrink-0 accent-[var(--cor-acao)]"
            />
            <div>
              <label htmlFor="ativo" className="block cursor-pointer font-semibold text-texto">
                Publicar meu portfólio na internet
              </label>
              <p id="ativo-explicacao" className="mt-1 text-sm text-texto-secundario">
                {ativo
                  ? `Seus ${totalPublicados} ${totalPublicados === 1 ? 'anúncio marcado como publicado fica' : 'anúncios marcados como publicados ficam'} visíveis para qualquer pessoa, e a página pode aparecer no Google.`
                  : 'Enquanto estiver desligado, nem a página nem os anúncios são alcançáveis — mesmo por quem tiver o link.'}
              </p>
            </div>
          </div>
        </CartaoCorpo>
      </Cartao>

      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>Endereço e identificação</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoCorpo className="flex flex-col gap-3">
          <Campo
            id="slug"
            rotulo="Endereço da sua página"
            erro={campos.slug}
            dica="Só letras, números e hífen. É o link que você manda no WhatsApp."
          >
            <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-borda-controle bg-superficie">
              <span className="shrink-0 border-r border-borda bg-superficie-afundada px-3 py-2.5 text-sm text-texto-apoio">
                {urlBase}/c/
              </span>
              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.currentTarget.value.toLowerCase())}
                maxLength={40}
                required
                placeholder="marina-duarte"
                className="h-10 w-full bg-transparent px-3 text-sm text-texto placeholder:text-texto-desabilitado focus:outline-none"
                {...props('slug')}
              />
            </div>
          </Campo>

          <Campo
            id="titulo"
            rotulo="Nome que aparece no topo"
            erro={campos.titulo}
            dica="Costuma ser seu nome ou o nome da sua imobiliária."
          >
            <input
              id="titulo"
              name="titulo"
              defaultValue={valores.titulo}
              maxLength={120}
              required
              placeholder="Marina Duarte Imóveis"
              className={CLASSE_ENTRADA}
              {...props('titulo')}
            />
          </Campo>

          <Campo
            id="bio"
            rotulo="Sua apresentação"
            erro={campos.bio}
            dica="Duas ou três frases. Em que região você atua, há quanto tempo, no que é especialista."
          >
            <textarea
              id="bio"
              name="bio"
              rows={4}
              maxLength={2000}
              defaultValue={valores.bio}
              placeholder="Atendo a zona sul de São Paulo há 12 anos, com foco em apartamentos para famílias."
              className="w-full rounded-lg border border-borda-controle bg-superficie px-3 py-2 text-sm text-texto placeholder:text-texto-desabilitado"
            />
          </Campo>
        </CartaoCorpo>
      </Cartao>

      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>Como o interessado fala com você</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoCorpo className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo
            id="whatsapp"
            rotulo="WhatsApp"
            erro={campos.whatsapp}
            dica="Com DDD. Este número fica público na página."
          >
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              defaultValue={valores.whatsapp}
              placeholder="(11) 98765-4321"
              className={CLASSE_ENTRADA}
              {...props('whatsapp')}
            />
          </Campo>

          <Campo
            id="email"
            rotulo="E-mail de contato"
            erro={campos.email}
            dica="Também fica público. Pode ser diferente do seu e-mail de acesso."
          >
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={valores.email}
              placeholder="contato@marinaduarte.com.br"
              className={CLASSE_ENTRADA}
              {...props('email')}
            />
          </Campo>
        </CartaoCorpo>
      </Cartao>

      {/* Só o que fica público é dito aqui. É a informação que o corretor
          precisa ANTES de clicar, não depois de descobrir. */}
      <div className="rounded-xl border border-borda bg-superficie-afundada p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-texto">
          <Icone nome="escudo" className="size-4" />O que fica visível para qualquer pessoa
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sucesso-texto">
              Aparece
            </p>
            <ul className="flex flex-col gap-0.5 text-sm text-texto-secundario">
              <li>Nome, CRECI e apresentação</li>
              <li>WhatsApp e e-mail informados acima</li>
              <li>Título, fotos, preço e descrição dos anúncios</li>
              <li>Bairro e cidade de cada imóvel</li>
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-perigo-texto">
              Nunca aparece
            </p>
            <ul className="flex flex-col gap-0.5 text-sm text-texto-secundario">
              <li>Suas observações internas sobre o imóvel</li>
              <li>Sua comissão e exclusividade</li>
              <li>Os dados do proprietário</li>
              <li>O endereço exato, salvo se você autorizar em cada imóvel</li>
              <li>Seus clientes, negócios e qualquer dado do CRM</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pb-2">
        <BotaoSalvar />
        {valores.ativo && valores.slug && (
          <Botao tipo="neutro" comoFilho>
            <a href={`/c/${valores.slug}`} target="_blank" rel="noopener noreferrer">
              <Icone nome="globo" className="size-4" />
              Ver minha página
            </a>
          </Botao>
        )}
      </div>
    </form>
  );
}
