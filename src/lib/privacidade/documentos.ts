/**
 * CPF e CNPJ: normalização, validação e mascaramento.
 *
 * O CPF é o eixo do produto. O critério de aceite 2 exige impedir duplicidade
 * de pessoa por CPF, e a seção 6.1 exige um único cadastro por tenant. Isso só
 * funciona se o CPF for normalizado antes de comparar: "123.456.789-09" e
 * "12345678909" são a mesma pessoa, e um cadastro duplicado nasce exatamente
 * dessa diferença.
 *
 * A API da Homefin também exige "apenas números" em todo CPF, CNPJ, celular e
 * CEP — normalizar aqui evita a rejeição do lado do banco.
 */

/** Remove tudo que não é dígito. */
export function soNumeros(valor: string): string {
  return valor.replace(/\D+/g, '');
}

/**
 * Valida CPF pelos dois dígitos verificadores.
 *
 * Não basta ter 11 dígitos: o cliente digita errado, o corretor digita errado,
 * e um CPF inválido gravado no banco vira um cadastro que nunca casa com o
 * retorno do banco nem com a consulta de crédito.
 */
export function cpfValido(entrada: string): boolean {
  const cpf = soNumeros(entrada);

  if (cpf.length !== 11) return false;

  // Sequências repetidas passam no cálculo do dígito mas não existem.
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (atePosicao: number): number => {
    let soma = 0;
    let peso = atePosicao + 1;
    for (let i = 0; i < atePosicao; i++) {
      soma += Number(cpf[i]) * peso;
      peso--;
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

/** Valida CNPJ pelos dois dígitos verificadores. */
export function cnpjValido(entrada: string): boolean {
  const cnpj = soNumeros(entrada);

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  // Pesos de 2 a 9, aplicados da DIREITA para a esquerda e reiniciando em 2
  // depois do 9. Escrever o laço da direita para a esquerda com o peso
  // DECRESCENDO a partir de `tamanho - 7` parece equivalente e não é: aquilo
  // coloca o peso 5 no último dígito em vez do primeiro, e o validador passa a
  // recusar CNPJ válido. Achado por teste, não por leitura.
  const calcular = (tamanho: number): number => {
    let soma = 0;
    let peso = 2;
    for (let i = tamanho - 1; i >= 0; i--) {
      soma += Number(cnpj[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return calcular(12) === Number(cnpj[12]) && calcular(13) === Number(cnpj[13]);
}

/** Aceita CPF ou CNPJ, conforme o tamanho. */
export function cpfCnpjValido(entrada: string): boolean {
  const limpo = soNumeros(entrada);
  if (limpo.length === 11) return cpfValido(limpo);
  if (limpo.length === 14) return cnpjValido(limpo);
  return false;
}

/** Formata para exibição: 123.456.789-09 */
export function formatarCpf(entrada: string): string {
  const cpf = soNumeros(entrada);
  if (cpf.length !== 11) return entrada;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/** Formata para exibição: 12.345.678/0001-95 */
export function formatarCnpj(entrada: string): string {
  const cnpj = soNumeros(entrada);
  if (cnpj.length !== 14) return entrada;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

/**
 * Máscara de exibição: 123.***.**9-09
 *
 * A seção 6.2 pede "CPF protegido" e a seção 18 exige mascaramento na
 * interface. Mantém o começo e o fim porque o corretor precisa conferir com o
 * documento na mão sem que a tela inteira exponha o número — e sem que uma
 * captura de tela ou alguém olhando por cima do ombro leve o CPF completo.
 *
 * Revelar o número inteiro é ação separada, que passa por permissão e fica
 * registrada na auditoria.
 */
export function mascararCpf(entrada: string): string {
  const cpf = soNumeros(entrada);
  if (cpf.length !== 11) return '***';
  return `${cpf.slice(0, 3)}.***.**${cpf.slice(8, 9)}-${cpf.slice(9)}`;
}

/**
 * Máscara de CNPJ. Preserva os dois primeiros dígitos e o final, ocultando o
 * miolo com asterisco — mesmo critério do CPF.
 */
export function mascararCnpj(entrada: string): string {
  const cnpj = soNumeros(entrada);
  if (cnpj.length !== 14) return '***';
  return `${cnpj.slice(0, 2)}.***.***/**${cnpj.slice(10, 12)}-${cnpj.slice(12)}`;
}

/** Máscara conforme o tipo do documento. */
export function mascararDocumento(entrada: string): string {
  const limpo = soNumeros(entrada);
  if (limpo.length === 11) return mascararCpf(limpo);
  if (limpo.length === 14) return mascararCnpj(limpo);
  return '***';
}

/**
 * Máscara para LOG. Diferente da máscara de interface: aqui não sobra nada
 * reconstruível, só o suficiente para correlacionar dois registros do mesmo
 * documento durante uma investigação.
 *
 * A seção 10 exige "armazenar logs técnicos sem expor dados sensíveis", e log
 * vaza de um jeito que a tela não vaza: vai para arquivo, para o agregador,
 * para o terminal de quem estiver de plantão.
 */
export function documentoParaLog(entrada: string): string {
  const limpo = soNumeros(entrada);
  if (limpo.length !== 11 && limpo.length !== 14) return 'doc:invalido';
  return `doc:${limpo.length}:***${limpo.slice(-2)}`;
}

/** Máscara de celular para exibição: (11) 9****-**78 */
export function mascararCelular(entrada: string): string {
  const tel = soNumeros(entrada);
  if (tel.length < 10) return '***';
  const ddd = tel.slice(0, 2);
  const fim = tel.slice(-2);
  return `(${ddd}) ${tel.length === 11 ? '9' : ''}****-**${fim}`;
}

/** Máscara de e-mail para exibição: ma****@gmail.com */
export function mascararEmail(entrada: string): string {
  const arroba = entrada.indexOf('@');
  if (arroba < 1) return '***';
  const usuario = entrada.slice(0, arroba);
  const dominio = entrada.slice(arroba);
  const visivel = usuario.slice(0, Math.min(2, usuario.length));
  return `${visivel}${'*'.repeat(Math.max(4, usuario.length - 2))}${dominio}`;
}

/**
 * Normaliza celular para o formato que a Homefin aceita: somente números, com
 * DDD, sem o 55 do país.
 *
 * @returns o número normalizado, ou `null` se não for um celular brasileiro
 * plausível — devolver `null` em vez de um número torto evita que a proposta
 * seja recusada pelo banco por causa de um campo de contato.
 */
export function normalizarCelular(entrada: string): string | null {
  let tel = soNumeros(entrada);

  // Remove o código do país quando vier colado.
  if (tel.length === 13 && tel.startsWith('55')) tel = tel.slice(2);
  if (tel.length === 12 && tel.startsWith('55')) tel = tel.slice(2);

  if (tel.length !== 10 && tel.length !== 11) return null;

  // DDD brasileiro válido vai de 11 a 99, e nenhum começa com 0.
  const ddd = Number(tel.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;

  // Celular de 11 dígitos tem 9 na terceira posição.
  if (tel.length === 11 && tel[2] !== '9') return null;

  return tel;
}

/** Normaliza CEP para 8 dígitos, ou `null`. */
export function normalizarCep(entrada: string): string | null {
  const cep = soNumeros(entrada);
  return cep.length === 8 ? cep : null;
}
