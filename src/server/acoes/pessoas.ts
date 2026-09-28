'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { clienteServidor } from '@/lib/supabase/servidor';
import { exigirPermissao, SemPermissao } from '@/server/sessao';
import { registrarAuditoria } from '@/server/auditoria';
import { lerFormularioDePessoa } from '@/dominio/pessoa';
import { documentoParaLog, mascararCpf } from '@/lib/privacidade/documentos';

/** Código do Postgres para violação de índice único. */
const VIOLACAO_DE_UNICIDADE = '23505';

export interface EstadoDeCadastro {
  erro?: string;
  /** Erros por campo, para marcar o input certo. */
  campos?: Record<string, string>;
  /**
   * Preenchido quando o CPF já existe no tenant.
   *
   * Não é só uma mensagem de erro: a interface usa isto para oferecer "abrir o
   * cadastro existente". O princípio 2 do produto é "uma pessoa, um cadastro" —
   * recusar sem mostrar o caminho faria o corretor cadastrar com o CPF em
   * branco só para conseguir seguir, que é exatamente o que se quer evitar.
   */
  duplicado?: {
    id: string;
    nome: string;
    cpfMascarado: string;
  };
}

export async function cadastrarPessoa(
  _anterior: EstadoDeCadastro,
  formulario: FormData,
): Promise<EstadoDeCadastro> {
  let sessao;
  try {
    sessao = await exigirPermissao('crm.criar');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: `Seu papel não permite cadastrar clientes. Peça acesso ao proprietário.` };
    }
    throw erro;
  }

  const analise = lerFormularioDePessoa(formulario);

  if (!analise.success) {
    const campos: Record<string, string> = {};
    for (const problema of analise.error.issues) {
      const campo = String(problema.path[0] ?? 'nome');
      campos[campo] ??= problema.message;
    }
    return { erro: 'Confira os campos destacados.', campos };
  }

  const dados = analise.data;
  const tenantId = sessao.atual.tenant.id;
  const supabase = await clienteServidor();

  const { data: criada, error } = await supabase
    .from('pessoas')
    .insert({
      tenant_id: tenantId,
      nome: dados.nome,
      cpf: dados.cpf ?? null,
      data_nascimento: dados.dataNascimento ?? null,
      email: dados.email ?? null,
      cidade: dados.cidade ?? null,
      uf: dados.uf ?? null,
      renda: dados.renda ?? null,
      renda_composta: dados.rendaComposta ?? null,
      origem: dados.origem ?? null,
      origem_detalhe: dados.origemDetalhe ?? null,
      temperatura: dados.temperatura,
      faixa_valor_min: dados.faixaValorMin ?? null,
      faixa_valor_max: dados.faixaValorMax ?? null,
      objetivo: dados.objetivo ?? null,
      observacoes: dados.observacoes ?? null,
      responsavel_id: dados.responsavelId ?? sessao.usuarioId,
      criado_por: sessao.usuarioId,
      ultima_interacao_em: new Date().toISOString(),
    })
    .select('id, nome')
    .single();

  if (error) {
    // -------------------------------------------------------------------
    // DUPLICIDADE POR CPF — o critério de aceite 2.
    //
    // A regra é garantida pelo ÍNDICE ÚNICO do banco, não por uma consulta
    // prévia. Consultar antes e inserir depois tem janela de corrida: dois
    // cadastros simultâneos passariam os dois pela verificação. Deixar o banco
    // recusar e tratar o erro é a única forma correta.
    // -------------------------------------------------------------------
    if (error.code === VIOLACAO_DE_UNICIDADE && dados.cpf) {
      const { data: existente } = await supabase
        .from('pessoas')
        .select('id, nome')
        .eq('tenant_id', tenantId)
        .eq('cpf', dados.cpf)
        .is('excluido_em', null)
        .maybeSingle();

      await registrarAuditoria({
        acao: 'criar',
        entidade: 'pessoa',
        resultado: 'negado',
        tenantId,
        autorId: sessao.usuarioId,
        autorEmail: sessao.perfil.email,
        autorPapel: sessao.atual.papel,
        metadados: { motivo: 'cpf_duplicado', documento: documentoParaLog(dados.cpf) },
      });

      if (existente) {
        return {
          duplicado: {
            id: existente.id,
            nome: existente.nome,
            cpfMascarado: mascararCpf(dados.cpf),
          },
        };
      }

      // Índice único disparou mas a pessoa não aparece na leitura: ela existe
      // em outro responsável dentro do mesmo tenant e a RLS a esconde, ou foi
      // excluída logicamente. Dizer a verdade é melhor que inventar.
      return {
        erro:
          'Esse CPF já está cadastrado nesta conta, mas você não tem acesso ao cadastro. ' +
          'Peça ao proprietário para liberar ou transferir o cliente.',
        campos: { cpf: 'CPF já cadastrado' },
      };
    }

    console.error('[pessoas] falha ao cadastrar', { tenantId, erro: error.message });
    return {
      erro: 'Não deu para salvar agora. Seus dados continuam no formulário — tente de novo.',
    };
  }

  // Telefone é tabela própria; entra depois da pessoa existir.
  if (dados.celular) {
    const { error: erroTelefone } = await supabase.from('pessoa_telefones').insert({
      tenant_id: tenantId,
      pessoa_id: criada.id,
      numero: dados.celular,
      principal: true,
      whatsapp: true,
      rotulo: 'Celular',
    });

    // Telefone que falha não desfaz o cadastro: perder o cliente inteiro por
    // causa de um número mal formatado seria pior. Fica registrado para
    // correção.
    if (erroTelefone) {
      console.error('[pessoas] cadastrada sem telefone', {
        pessoaId: criada.id,
        erro: erroTelefone.message,
      });
    }
  }

  await registrarAuditoria({
    acao: 'criar',
    entidade: 'pessoa',
    entidadeId: criada.id,
    tenantId,
    autorId: sessao.usuarioId,
    autorEmail: sessao.perfil.email,
    autorPapel: sessao.atual.papel,
    // O CPF entra mascarado: a auditoria registra QUE houve cadastro com
    // documento, não qual é o documento.
    depois: {
      nome: dados.nome,
      cpf: dados.cpf,
      temperatura: dados.temperatura,
      origem: dados.origem,
    },
  });

  revalidatePath('/clientes');
  revalidatePath('/inicio');
  redirect(`/clientes/${criada.id}`);
}

/**
 * Revela o CPF completo.
 *
 * Ação separada e AUDITADA de propósito. A seção 18 exige mascaramento na
 * interface e registro de acesso a dado sensível; sem um evento próprio, não há
 * como responder "quem viu o CPF deste cliente e quando".
 */
export async function revelarCpf(pessoaId: string): Promise<{ cpf?: string; erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('sensivel.ver');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: 'Seu papel não permite ver o CPF completo.' };
    }
    throw erro;
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from('pessoas')
    .select('cpf, nome')
    .eq('id', pessoaId)
    .eq('tenant_id', sessao.atual.tenant.id)
    .is('excluido_em', null)
    .maybeSingle();

  if (error || !data?.cpf) {
    return { erro: 'Cliente sem CPF cadastrado.' };
  }

  await registrarAuditoria({
    acao: 'revelar_cpf',
    entidade: 'pessoa',
    entidadeId: pessoaId,
    tenantId: sessao.atual.tenant.id,
    autorId: sessao.usuarioId,
    autorEmail: sessao.perfil.email,
    autorPapel: sessao.atual.papel,
    justificativa: 'Consulta do documento na ficha do cliente',
    metadados: { documento: documentoParaLog(data.cpf) },
  });

  return { cpf: data.cpf };
}

/** Libera, pausa ou revoga o portal do cliente (seção 6.5). */
export async function alternarPortal(
  pessoaId: string,
  liberar: boolean,
): Promise<{ erro?: string }> {
  let sessao;
  try {
    sessao = await exigirPermissao('crm.editar');
  } catch (erro) {
    if (erro instanceof SemPermissao) {
      return { erro: 'Seu papel não permite alterar o portal do cliente.' };
    }
    throw erro;
  }

  const supabase = await clienteServidor();

  const { data: antes } = await supabase
    .from('pessoas')
    .select('portal_liberado, cpf, data_nascimento')
    .eq('id', pessoaId)
    .eq('tenant_id', sessao.atual.tenant.id)
    .maybeSingle();

  if (!antes) return { erro: 'Cliente não encontrado.' };

  // A restrição do banco já impede, mas a mensagem daqui explica o porquê. O
  // portal autentica por CPF e data de nascimento: sem os dois não há como
  // autenticar ninguém.
  if (liberar && (!antes.cpf || !antes.data_nascimento)) {
    return {
      erro:
        'Para liberar o portal, o cliente precisa ter CPF e data de nascimento cadastrados — ' +
        'é com esses dois dados que ele entra.',
    };
  }

  const { error } = await supabase
    .from('pessoas')
    .update({
      portal_liberado: liberar,
      portal_liberado_em: liberar ? new Date().toISOString() : null,
    })
    .eq('id', pessoaId)
    .eq('tenant_id', sessao.atual.tenant.id);

  if (error) {
    console.error('[pessoas] falha ao alternar portal', { pessoaId, erro: error.message });
    return { erro: 'Não deu para alterar o portal agora.' };
  }

  await registrarAuditoria({
    acao: liberar ? 'liberar_portal' : 'pausar_portal',
    entidade: 'pessoa',
    entidadeId: pessoaId,
    tenantId: sessao.atual.tenant.id,
    autorId: sessao.usuarioId,
    autorEmail: sessao.perfil.email,
    autorPapel: sessao.atual.papel,
    antes: { portal_liberado: antes.portal_liberado },
    depois: { portal_liberado: liberar },
  });

  revalidatePath(`/clientes/${pessoaId}`);
  return {};
}
