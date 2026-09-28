/**
 * Data que alguém DIGITA, em dd/mm/aaaa.
 *
 * POR QUE NÃO USAR `<input type="date">` PARA NASCIMENTO
 *
 * Porque ele é feito para escolher uma data PRÓXIMA. O seletor nativo abre no
 * mês corrente, e chegar a 1994 custa dezenas de toques na seta. No celular a
 * roleta é pior ainda: o ano começa em 2026 e rola para trás.
 *
 * Digitar também não salva: o campo nativo mostra `dd/mm/aaaa` ou `mm/dd/aaaa`
 * conforme o idioma do SISTEMA OPERACIONAL, não do site. Um corretor com o
 * Windows em inglês vê `mm/dd/aaaa`, digita 11/03/1994 pensando em 11 de março,
 * e entra 3 de novembro. O login falha e ele não tem como perceber por quê.
 *
 * Um campo de texto com máscara resolve os dois: ordem sempre brasileira, e
 * digitar 11031994 basta.
 *
 * ESTE ARQUIVO É PURO
 *
 * Sem `node:crypto`, sem `server-only` — ele é importado tanto pelo formulário
 * (cliente) quanto pela ação (servidor), e já houve um caso neste projeto em
 * que um módulo de domínio com dependência de servidor quebrou o pacote do
 * navegador.
 */

/** Só os dígitos, no máximo 8 (ddmmaaaa). */
function digitos(bruto: string): string {
  return bruto.replace(/\D/g, '').slice(0, 8);
}

/**
 * Formata enquanto a pessoa digita: 11031994 -> 11/03/1994.
 *
 * Não valida nada — quem está no meio de digitar "1" não escreveu uma data
 * inválida, escreveu uma data incompleta. Brigar com quem ainda está digitando
 * é o defeito mais comum de campo com máscara.
 */
export function formatarDataDigitada(bruto: string): string {
  const d = digitos(bruto);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/**
 * Converte para o formato do banco (aaaa-mm-dd), ou `null` se não for data.
 *
 * Aceita também uma data já em ISO: o campo pode um dia voltar a ser nativo, ou
 * chegar de outro lugar, e a ação não deveria se importar com isso.
 *
 * A conferência é com `Date` e volta: `new Date('2024-02-31')` não estoura, ele
 * DESLIZA para 2 de março. Comparar o resultado com o que foi pedido é o que
 * pega 31 de fevereiro — e essa é a data que uma pessoa digita por engano.
 */
export function dataDigitadaParaIso(bruto: string): string | null {
  const texto = bruto.trim();
  if (!texto) return null;

  let ano: number;
  let mes: number;
  let dia: number;

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    ano = Number(iso[1]);
    mes = Number(iso[2]);
    dia = Number(iso[3]);
  } else {
    const d = digitos(texto);
    if (d.length !== 8) return null;
    dia = Number(d.slice(0, 2));
    mes = Number(d.slice(2, 4));
    ano = Number(d.slice(4));
  }

  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  // Ninguém nascido antes de 1900 está abrindo um portal de imóvel, e ano
  // adiante de hoje é erro de digitação. Os dois limites existem para o erro
  // aparecer AQUI, e não como "CPF e data não conferem" lá na frente.
  const anoAtual = new Date().getUTCFullYear();
  if (ano < 1900 || ano > anoAtual) return null;

  const dataUtc = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    dataUtc.getUTCFullYear() !== ano ||
    dataUtc.getUTCMonth() !== mes - 1 ||
    dataUtc.getUTCDate() !== dia
  ) {
    return null; // 31/02 e parentes
  }

  const mm = String(mes).padStart(2, '0');
  const dd = String(dia).padStart(2, '0');
  return `${ano}-${mm}-${dd}`;
}
