/**
 * O termo de consentimento do portal do cliente.
 *
 * O TEXTO E A VERSÃO MORAM JUNTOS, e isso é a parte que importa.
 *
 * Se a versão ficasse noutro arquivo, ou fosse escrita à mão na chamada,
 * alguém alteraria o texto sem alterar a versão — e o aceite registrado
 * passaria a valer para um termo que a pessoa nunca leu. Do ponto de vista
 * legal, esse aceite não vale nada; do ponto de vista prático, ninguém
 * descobriria, porque o banco continuaria mostrando "aceitou".
 *
 * Alterou o texto? Suba a versão. A pessoa aceita de novo na próxima entrada.
 */

export const VERSAO_DO_TERMO = '2026-09-25';

export interface SecaoDoTermo {
  titulo: string;
  corpo: string;
}

/**
 * Escrito para ser LIDO, não para cumprir formalidade.
 *
 * A LGPD exige informar o titular sobre o tratamento dos dados dele. Um texto
 * que ninguém lê cumpre a letra e falha o propósito — e o propósito aqui é que
 * o comprador entenda que quem tem os dados dele é o corretor, não a Agilliza.
 */
export const SECOES_DO_TERMO: SecaoDoTermo[] = [
  {
    titulo: 'Quem é responsável pelos seus dados',
    corpo:
      'O corretor ou a imobiliária que atende você. A Agilliza é a empresa que fornece o ' +
      'sistema, e trata os dados apenas para fazê-lo funcionar — não os usa para fins ' +
      'próprios, não os vende e não os compartilha com outros corretores.',
  },
  {
    titulo: 'Quais dados aparecem aqui',
    corpo:
      'Seu nome, CPF e data de nascimento, usados para você entrar; os imóveis que você ' +
      'marcou; e as simulações de financiamento feitas em seu nome, com os valores e a ' +
      'resposta de cada banco.',
  },
  {
    titulo: 'Para que eles são usados',
    corpo:
      'Para você acompanhar seu processo sem depender de ligar para o corretor, e para o ' +
      'corretor conduzir o atendimento. Nada aqui alimenta publicidade.',
  },
  {
    titulo: 'Com quem são compartilhados',
    corpo:
      'Com os bancos que você autorizou a consultar, quando houve simulação de ' +
      'financiamento — sem isso não há como pedir crédito. Com mais ninguém.',
  },
  {
    titulo: 'Como você entra',
    corpo:
      'Com CPF e data de nascimento, sem senha. É simples de propósito, e por isso o ' +
      'acesso trava por 30 minutos depois de cinco tentativas erradas. Se alguém souber ' +
      'seus dois dados, conseguirá ver esta página — avise seu corretor se isso preocupar ' +
      'você, e ele pode desativar o acesso na hora.',
  },
  {
    titulo: 'Seus direitos',
    corpo:
      'Você pode pedir a correção de qualquer dado, pedir uma cópia, ou pedir a exclusão. ' +
      'A exclusão apaga seu acesso e seu histórico NESTE portal. O cadastro na ' +
      'imobiliária permanece: o corretor tem obrigação legal de manter registro de uma ' +
      'negociação, e isso a lei reconhece. Para apagar também o cadastro, fale com ele.',
  },
];
