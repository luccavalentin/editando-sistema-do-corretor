'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Botao } from '@/components/ui/botao';
import { Icone } from '@/components/shell/icones';
import { PAPEIS_ATRIBUIVEIS, RESUMO_DO_PAPEL, ROTULO_PAPEL } from '@/dominio/permissoes';
import { DIAS_DE_VALIDADE } from '@/dominio/convite';
import { convidar, type EstadoDoConvite } from '@/server/acoes/equipe';

function BotaoConvidar() {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" disabled={pending} tamanho="pequeno">
      {pending ? 'Gerando' : 'Gerar convite'}
    </Botao>
  );
}

/**
 * O link do convite, mostrado uma única vez.
 *
 * ELE NÃO VOLTA. O banco guarda só o hash do token, e reconstruí-lo é
 * impossível por desenho — se o banco vazar, os convites pendentes não viram
 * acesso. A contrapartida é que quem fechar esta tela sem copiar precisa
 * revogar e convidar de novo.
 *
 * Por isso o aviso é insistente e o botão de copiar é o elemento principal.
 */
function LinkGerado({ link, email }: { link: string; email: string }) {
  const [copiado, setCopiado] = useState(false);

  const mensagem = `Oi! Te convidei para a nossa equipe no Agilliza. É só abrir este link e entrar: ${link}`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-sucesso-borda bg-sucesso-sutil p-4">
      <div>
        <p className="font-semibold text-sucesso-texto">Convite criado para {email}</p>
        <p className="mt-0.5 text-sm text-sucesso-texto">
          Copie o link agora e mande para essa pessoa. Ele vale {DIAS_DE_VALIDADE} dias e{' '}
          <strong>não aparece de novo</strong> — por segurança, o sistema não guarda o link, só
          uma marca dele.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Link do convite"
          className="h-10 min-w-56 flex-grow rounded-lg border border-borda-controle bg-superficie px-3 font-mono text-xs text-texto"
        />

        <Botao
          type="button"
          tamanho="pequeno"
          onClick={() => {
            void navigator.clipboard.writeText(link).then(() => setCopiado(true));
          }}
        >
          {copiado ? 'Copiado' : 'Copiar link'}
        </Botao>

        {/* WhatsApp porque é como uma imobiliária pequena de fato se comunica —
            e é o motivo de não haver envio de e-mail neste fluxo. */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-borda bg-superficie px-3.5 text-sm font-semibold text-texto"
        >
          <Icone nome="conversa" className="size-4" />
          Enviar no WhatsApp
        </a>
      </div>
    </div>
  );
}

export function ConvidarPessoa({ podeConvidar, temVaga }: { podeConvidar: boolean; temVaga: boolean }) {
  const [estado, acao] = useActionState<EstadoDoConvite, FormData>(convidar, {});
  const [aberto, setAberto] = useState(false);
  const [papel, setPapel] = useState('corretor');

  if (!podeConvidar) return null;

  if (estado.link && estado.emailConvidado) {
    return (
      <div className="flex flex-col gap-3">
        <LinkGerado link={estado.link} email={estado.emailConvidado} />
        <div>
          <Botao type="button" tipo="neutro" tamanho="pequeno" onClick={() => setAberto(true)}>
            Convidar outra pessoa
          </Botao>
        </div>
      </div>
    );
  }

  if (!aberto) {
    return (
      <div>
        <Botao type="button" tamanho="pequeno" disabled={!temVaga} onClick={() => setAberto(true)}>
          <Icone nome="mais" className="size-4" />
          Convidar pessoa
        </Botao>
        {/* Dizer que não há vaga ANTES do clique poupa o corretor de preencher
            um formulário que vai falhar no fim. */}
        {!temVaga && (
          <p className="mt-1.5 text-xs text-texto-apoio">
            O plano não tem vaga livre. Desative alguém ou aumente o plano.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      action={acao}
      className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4"
      noValidate
    >
      {estado.erro && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-perigo-sutil px-3 py-2.5 text-sm text-perigo-texto"
        >
          <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
          {estado.erro}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-texto-secundario">
            E-mail da pessoa
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="corretor@imobiliaria.com.br"
            className="h-10 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-sm text-texto placeholder:text-texto-desabilitado aria-invalid:border-2 aria-invalid:border-perigo"
            aria-invalid={estado.campos?.email ? true : undefined}
            aria-describedby={estado.campos?.email ? 'email-erro' : undefined}
          />
          {estado.campos?.email ? (
            <p id="email-erro" role="alert" className="mt-1 text-xs text-perigo-texto">
              {estado.campos.email}
            </p>
          ) : (
            <p className="mt-1 text-xs text-texto-apoio">
              O convite só funciona para este e-mail.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="papel" className="mb-1.5 block text-xs font-semibold text-texto-secundario">
            O que essa pessoa vai poder fazer
          </label>
          <select
            id="papel"
            name="papel"
            value={papel}
            onChange={(e) => setPapel(e.currentTarget.value)}
            className="h-10 w-full rounded-lg border border-borda-controle bg-superficie px-2.5 text-sm text-texto"
          >
            {PAPEIS_ATRIBUIVEIS.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PAPEL[p]}
              </option>
            ))}
          </select>
          {/* O resumo muda com a escolha. Sem ele, "SDR" e "Assistente" são
              palavras sem consequência visível — e o corretor escolhe errado. */}
          <p className="mt-1 text-xs text-texto-apoio">
            {RESUMO_DO_PAPEL[papel as keyof typeof RESUMO_DO_PAPEL]}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <BotaoConvidar />
        <Botao type="button" tipo="neutro" tamanho="pequeno" onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
