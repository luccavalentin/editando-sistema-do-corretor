import { describe, expect, it } from 'vitest';

import {
  cnpjValido,
  cpfCnpjValido,
  cpfValido,
  documentoParaLog,
  formatarCnpj,
  formatarCpf,
  mascararCelular,
  mascararCnpj,
  mascararCpf,
  mascararDocumento,
  mascararEmail,
  normalizarCelular,
  normalizarCep,
  soNumeros,
} from '@/lib/privacidade/documentos';

/**
 * CPF e mascaramento.
 *
 * O critério de aceite 2 do produto — "o sistema impede duplicidade de pessoa
 * pelo CPF" — depende de duas coisas: o índice único no banco e a validação
 * daqui. Um CPF inválido aceito hoje vira um cadastro que nunca casa com o
 * retorno do banco nem com a consulta de crédito, e só se descobre no pior
 * momento possível.
 *
 * Os CPFs usados nos testes são numericamente válidos e NÃO pertencem a
 * ninguém: são as sequências de exemplo usadas em documentação da Receita.
 */

describe('cpfValido', () => {
  it.each([
    ['11144477735', 'exemplo clássico da Receita'],
    ['12345678909', 'sequência de exemplo'],
    ['52998224725', 'exemplo com dígito 25'],
  ])('aceita %s (%s)', (cpf) => {
    expect(cpfValido(cpf)).toBe(true);
  });

  it('aceita CPF formatado, porque é como o corretor digita', () => {
    expect(cpfValido('111.444.777-35')).toBe(true);
    expect(cpfValido('111 444 777 35')).toBe(true);
  });

  it('recusa CPF com dígito verificador errado', () => {
    // Um dígito trocado no fim: o erro de digitação mais comum.
    expect(cpfValido('11144477734')).toBe(false);
    expect(cpfValido('12345678900')).toBe(false);
  });

  it('recusa sequências repetidas', () => {
    // 111.111.111-11 passa no cálculo do dígito mas não existe. É também o que
    // alguém digita para "pular" o campo.
    for (const d of '0123456789') {
      expect(cpfValido(d.repeat(11)), `${d.repeat(11)} deveria ser recusado`).toBe(false);
    }
  });

  it('recusa comprimento errado', () => {
    expect(cpfValido('123')).toBe(false);
    expect(cpfValido('111444777355')).toBe(false);
    expect(cpfValido('')).toBe(false);
  });

  it('recusa texto sem dígito', () => {
    expect(cpfValido('nao tenho')).toBe(false);
  });
});

describe('cnpjValido', () => {
  it('aceita CNPJ válido', () => {
    expect(cnpjValido('11222333000181')).toBe(true);
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
  });

  it('recusa dígito verificador errado', () => {
    expect(cnpjValido('11222333000182')).toBe(false);
  });

  it('recusa sequência repetida', () => {
    expect(cnpjValido('11111111111111')).toBe(false);
  });
});

describe('cpfCnpjValido', () => {
  it('escolhe a validação pelo comprimento', () => {
    expect(cpfCnpjValido('11144477735')).toBe(true);
    expect(cpfCnpjValido('11222333000181')).toBe(true);
    expect(cpfCnpjValido('1114447773')).toBe(false);
  });
});

describe('mascaramento para a interface', () => {
  it('mostra o começo e o fim do CPF, escondendo o miolo', () => {
    // O corretor precisa conferir com o documento na mão sem que a tela inteira
    // exponha o número para quem olhar por cima do ombro.
    expect(mascararCpf('11144477735')).toBe('111.***.**7-35');
  });

  it('não vaza o miolo do CPF em nenhuma máscara', () => {
    const cpf = '11144477735';
    const mascarado = mascararCpf(cpf);
    // Os dígitos 4 a 8 são o miolo: nenhum deles pode aparecer em sequência.
    expect(mascarado).not.toContain(cpf.slice(3, 8));
    expect(mascarado.replace(/\D/g, '').length).toBeLessThan(cpf.length);
  });

  it('devolve *** para CPF malformado, nunca o valor cru', () => {
    expect(mascararCpf('123')).toBe('***');
    expect(mascararCpf('')).toBe('***');
  });

  it('mascara CNPJ e escolhe a máscara pelo tipo', () => {
    expect(mascararDocumento('11144477735')).toBe(mascararCpf('11144477735'));
    expect(mascararDocumento('11222333000181')).toBe(mascararCnpj('11222333000181'));
    expect(mascararDocumento('xyz')).toBe('***');
  });

  it('mascara celular preservando DDD e final', () => {
    expect(mascararCelular('11912345678')).toBe('(11) 9****-**78');
    expect(mascararCelular('123')).toBe('***');
  });

  it('mascara e-mail preservando o domínio', () => {
    // O domínio ajuda a reconhecer o cliente; o usuário não.
    const mascarado = mascararEmail('mariana.duarte@gmail.com');
    expect(mascarado).toContain('@gmail.com');
    expect(mascarado).not.toContain('duarte');
    expect(mascarado.startsWith('ma')).toBe(true);
  });
});

describe('documentoParaLog', () => {
  it('não permite reconstruir o documento', () => {
    const cpf = '11144477735';
    const paraLog = documentoParaLog(cpf);

    // Log vaza de formas que a tela não vaza: vai para arquivo, agregador e
    // terminal de plantão. Só os dois últimos dígitos sobrevivem, e servem
    // apenas para correlacionar dois registros do mesmo documento.
    expect(paraLog).toBe('doc:11:***35');
    expect(paraLog).not.toContain(cpf.slice(0, 9));
  });

  it('marca documento inválido sem expor o valor', () => {
    expect(documentoParaLog('lixo')).toBe('doc:invalido');
  });

  it('diferencia CPF de CNPJ pelo comprimento registrado', () => {
    expect(documentoParaLog('11222333000181')).toBe('doc:14:***81');
  });
});

describe('formatação', () => {
  it('formata CPF e CNPJ para exibição', () => {
    expect(formatarCpf('11144477735')).toBe('111.444.777-35');
    expect(formatarCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('devolve a entrada intacta quando o comprimento não bate', () => {
    expect(formatarCpf('123')).toBe('123');
  });
});

describe('normalizarCelular', () => {
  it('aceita os formatos que o corretor realmente digita', () => {
    expect(normalizarCelular('(11) 91234-5678')).toBe('11912345678');
    expect(normalizarCelular('11 91234 5678')).toBe('11912345678');
    expect(normalizarCelular('11912345678')).toBe('11912345678');
  });

  it('remove o código do país quando vem colado', () => {
    expect(normalizarCelular('5511912345678')).toBe('11912345678');
    expect(normalizarCelular('+55 (11) 91234-5678')).toBe('11912345678');
  });

  it('aceita fixo de 10 dígitos', () => {
    expect(normalizarCelular('1132345678')).toBe('1132345678');
  });

  it('recusa DDD inexistente', () => {
    // DDD começa em 11. "09" é erro de digitação, não telefone.
    expect(normalizarCelular('09912345678')).toBeNull();
    expect(normalizarCelular('01912345678')).toBeNull();
  });

  it('recusa celular de 11 dígitos sem o 9', () => {
    expect(normalizarCelular('11812345678')).toBeNull();
  });

  it('recusa comprimento impossível', () => {
    expect(normalizarCelular('12345')).toBeNull();
    expect(normalizarCelular('')).toBeNull();
  });
});

describe('normalizarCep', () => {
  it('aceita com e sem hífen', () => {
    expect(normalizarCep('01310-100')).toBe('01310100');
    expect(normalizarCep('01310100')).toBe('01310100');
  });

  it('recusa comprimento errado', () => {
    expect(normalizarCep('0131010')).toBeNull();
  });
});

describe('soNumeros', () => {
  it('remove tudo que não for dígito', () => {
    expect(soNumeros('111.444.777-35')).toBe('11144477735');
    expect(soNumeros('abc')).toBe('');
  });
});
