import type { Database } from './tipos-banco';

/**
 * Inserção em tabela cujo `codigo` é gerado por gatilho.
 *
 * O PROBLEMA QUE ISTO RESOLVE
 *
 * `negocios.codigo` e `imoveis.codigo` são `not null` sem `default`: quem os
 * preenche é um gatilho, com um contador por tenant, para que dois cadastros
 * simultâneos não recebam o mesmo número. O tipo gerado não tem como saber
 * disso e marca a coluna como obrigatória na inserção.
 *
 * A saída usada até aqui era `.insert({ ... } as never)`. Ela compila, mas
 * desliga a conferência do objeto INTEIRO: um `pesoa_id` escrito errado, uma
 * coluna que não existe mais, um número onde o banco espera texto — nada disso
 * seria apontado, e o erro apareceria em produção como uma falha do PostgREST.
 *
 * Aqui o objeto é conferido contra o tipo real, menos a coluna do gatilho. O
 * cast acontece num lugar só, explicado, e não em cada chamada.
 */

type Tabelas = Database['public']['Tables'];

/** Nomes de tabela cuja inserção é coberta por este helper. */
export type TabelaComCodigo = {
  [T in keyof Tabelas]: 'codigo' extends keyof Tabelas[T]['Insert'] ? T : never;
}[keyof Tabelas];

/** A inserção sem a coluna que o gatilho preenche. */
export type NovaLinha<T extends TabelaComCodigo> = Omit<Tabelas[T]['Insert'], 'codigo'>;

/**
 * Converte a linha conferida para o que o cliente Supabase espera.
 *
 * O `as` mora aqui, uma vez, com o motivo ao lado — em vez de espalhado por
 * cada Server Action, onde vira hábito e deixa de ser lido.
 */
export function comCodigoDoGatilho<T extends TabelaComCodigo>(
  linha: NovaLinha<T>,
): Tabelas[T]['Insert'] {
  return linha as Tabelas[T]['Insert'];
}
