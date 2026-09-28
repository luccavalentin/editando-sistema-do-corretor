'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Botao } from '@/components/ui/botao';
import { Icone } from '@/components/shell/icones';
import { PRIORIDADES } from '@/dominio/tarefa';
import { criarTarefa, type EstadoDeTarefa } from '@/server/acoes/tarefas';

const CLASSE_ENTRADA =
  'h-10 w-full rounded-lg border border-borda-controle bg-superficie px-3 text-sm text-texto placeholder:text-texto-desabilitado aria-invalid:border-2 aria-invalid:border-perigo';

function BotaoCriar() {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" disabled={pending} tamanho="pequeno">
      {pending ? 'Criando' : 'Criar tarefa'}
    </Botao>
  );
}

/**
 * Criar tarefa sem sair da lista.
 *
 * Uma página separada para isto seria um passo a mais numa ação que o corretor
 * faz o dia inteiro — e que muitas vezes nasce de algo que ele acabou de ver na
 * própria lista ("preciso ligar para esse também"). Mandá-lo para outra tela e
 * trazê-lo de volta perde o contexto.
 */
export function FormularioDeTarefa({
  pessoas,
  negocios,
}: {
  pessoas: { id: string; nome: string }[];
  negocios: { id: string; codigo: string; titulo: string | null }[];
}) {
  const [estado, acao] = useActionState<EstadoDeTarefa, FormData>(criarTarefa, {});
  const [aberto, setAberto] = useState(false);
  const campoTitulo = useRef<HTMLInputElement>(null);

  // Criou: fecha o painel e devolve o foco ao botão, para quem usa teclado não
  // ficar perdido no fim do documento.
  useEffect(() => {
    if (estado.criada) setAberto(false);
  }, [estado.criada]);

  // Abriu: o cursor já vai para o título. Sem isto, todo cadastro começa com um
  // clique que a interface podia ter poupado.
  useEffect(() => {
    if (aberto) campoTitulo.current?.focus();
  }, [aberto]);

  if (!aberto) {
    return (
      <div className="flex items-center gap-3">
        <Botao type="button" tamanho="pequeno" onClick={() => setAberto(true)}>
          <Icone nome="mais" className="size-4" />
          Nova tarefa
        </Botao>
        {estado.criada && (
          <p role="status" className="text-sm text-sucesso-texto">
            Tarefa criada.
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

      <div>
        <label htmlFor="titulo" className="mb-1.5 block text-xs font-semibold text-texto-secundario">
          O que precisa ser feito
        </label>
        <input
          ref={campoTitulo}
          id="titulo"
          name="titulo"
          required
          maxLength={200}
          placeholder="Ligar para a Mariana sobre a contraproposta"
          className={CLASSE_ENTRADA}
          aria-invalid={estado.campos?.titulo ? true : undefined}
          aria-describedby={estado.campos?.titulo ? 'titulo-erro' : undefined}
        />
        {estado.campos?.titulo && (
          <p id="titulo-erro" role="alert" className="mt-1 text-xs text-perigo-texto">
            {estado.campos.titulo}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="prazo"
            className="mb-1.5 block text-xs font-semibold text-texto-secundario"
          >
            Prazo
          </label>
          <input
            id="prazo"
            name="prazo"
            type="datetime-local"
            className={CLASSE_ENTRADA}
          />
          {/* Dizer que é opcional evita o corretor inventar uma data — e data
              inventada enche a lista de vencidas com coisa que nunca teve prazo. */}
          <p className="mt-1 text-xs text-texto-apoio">Opcional</p>
        </div>

        <div>
          <label
            htmlFor="prioridade"
            className="mb-1.5 block text-xs font-semibold text-texto-secundario"
          >
            Prioridade
          </label>
          <select
            id="prioridade"
            name="prioridade"
            defaultValue="media"
            className="h-10 w-full rounded-lg border border-borda-controle bg-superficie px-2.5 text-sm text-texto"
          >
            {Object.entries(PRIORIDADES).map(([chave, rotulo]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="pessoaId"
            className="mb-1.5 block text-xs font-semibold text-texto-secundario"
          >
            Cliente
          </label>
          <select
            id="pessoaId"
            name="pessoaId"
            className="h-10 w-full rounded-lg border border-borda-controle bg-superficie px-2.5 text-sm text-texto"
          >
            <option value="">Nenhum</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {negocios.length > 0 && (
        <div>
          <label
            htmlFor="negocioId"
            className="mb-1.5 block text-xs font-semibold text-texto-secundario"
          >
            Negócio
          </label>
          <select
            id="negocioId"
            name="negocioId"
            className="h-10 w-full rounded-lg border border-borda-controle bg-superficie px-2.5 text-sm text-texto"
          >
            <option value="">Nenhum</option>
            {negocios.map((n) => (
              <option key={n.id} value={n.id}>
                {n.codigo} — {n.titulo ?? 'sem título'}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor="descricao"
          className="mb-1.5 block text-xs font-semibold text-texto-secundario"
        >
          Detalhes
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={2}
          maxLength={4000}
          className="w-full rounded-lg border border-borda-controle bg-superficie px-3 py-2 text-sm text-texto"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <BotaoCriar />
        <Botao type="button" tipo="neutro" tamanho="pequeno" onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
