'use server';

import { redirect } from 'next/navigation';

import { clienteServico } from '@/lib/supabase/servidor';
import { soNumeros } from '@/lib/privacidade/documentos';
import { dataDigitadaParaIso } from '@/dominio/data-digitada';
import { encerrarSessao, gravarSessao, ipDaRequisicao } from '@/server/portal/sessao';

export interface EstadoDaEntrada {
  erro?: string;
  /** Quando há bloqueio por tentativa, em segundos. */
  espera?: number;

}

/**
 * Mensagens para o cliente.
 *
 * O caso `nao_confere` cobre DUAS situações diferentes de propósito: o CPF não
 * existe naquele corretor, ou a data está errada. Separar as duas
 * transformaria o portal num verificador de CPF — quem quisesse saber se
 * fulano é cliente daquele corretor descobriria com uma tentativa.
 *
 * Já `nao_liberado` PODE ser específico: quem chegou até ali já provou
 * conhecer o CPF e a data, então não há o que proteger, e dizer "peça ao seu
 * corretor" é o único caminho útil.
 */
const MENSAGENS: Record<string, string> = {
  dados_incompletos: 'Preencha o CPF e a data de nascimento.',
  nao_confere:
    'Não encontramos esse CPF com essa data de nascimento. Confira os dois e tente de novo.',
  nao_liberado:
    'Seu acesso ainda não foi liberado pelo corretor. Fale com ele e peça a liberação do portal.',
  conta_encerrada: 'Esta conta foi encerrada. Fale diretamente com seu corretor.',
  bloqueado:
    'Muitas tentativas seguidas. Por segurança, o acesso a este CPF ficou bloqueado por 30 minutos.',
};

export async function entrarNoPortal(
  _anterior: EstadoDaEntrada,
  formulario: FormData,
): Promise<EstadoDaEntrada> {
  const cpf = soNumeros(String(formulario.get('cpf') ?? ''));

  // O campo chega em dd/mm/aaaa (máscara) ou em ISO, se um dia voltar a ser um
  // `<input type="date">`. A conversão aceita os dois e recusa o impossível —
  // 31/02 vira `null` aqui, e não "CPF e data não conferem" lá na frente.
  const nascimento = dataDigitadaParaIso(String(formulario.get('nascimento') ?? ''));

  if (cpf.length !== 11 || !nascimento) {
    return { erro: MENSAGENS.dados_incompletos };
  }

  const ip = await ipDaRequisicao();

  // A conferência acontece no BANCO, numa função que também aplica o limite de
  // tentativa. Fazer isso aqui exigiria ler `pessoas` com a chave de serviço e
  // comparar em JavaScript — e aí o limite dependeria de outra tabela, com
  // outra corrida possível entre duas requisições simultâneas.
  const supabase = clienteServico('portal do cliente: conferir CPF e data de nascimento');

  const { data, error } = await supabase.rpc('autenticar_no_portal', {
    p_cpf: cpf,
    p_nascimento: nascimento,
    p_ip: ip,
  });

  if (error) {
    return { erro: 'Não foi possível entrar agora. Tente de novo em instantes.' };
  }

  const resultado = Array.isArray(data) ? data[0] : null;

  if (!resultado?.autorizado) {
    const motivo = resultado?.motivo ?? 'nao_confere';
    return {
      erro: MENSAGENS[motivo] ?? MENSAGENS.nao_confere,
      ...(resultado?.segundos_de_espera ? { espera: resultado.segundos_de_espera } : {}),
    };
  }

  await gravarSessao({
    pessoaId: resultado.pessoa_id!,
    tenantId: resultado.tenant_id!,
    nome: resultado.nome ?? '',
  });

  redirect('/portal/inicio');
}

export async function sairDoPortal(): Promise<void> {
  await encerrarSessao();
  redirect('/portal');
}
