import { describe, expect, it } from 'vitest';

import {
  assinar,
  assinarUrl,
  cabecalhosAssinados,
  carimbos,
  chaveDeAssinatura,
  codificarRfc3986,
  sha256Hex,
} from '@/lib/armazenamento/assinatura';

/**
 * SigV4 contra os vetores oficiais da AWS.
 *
 * Escrever assinatura à mão só se justifica se houver como provar que está
 * certa. Estes são os valores publicados pela própria AWS na documentação do
 * Signature Version 4: mesma entrada, mesma saída esperada. Um erro de um byte
 * em qualquer etapa muda o hash por completo, então não existe "quase passa".
 *
 * A credencial abaixo é a de exemplo da documentação, conhecida publicamente e
 * sem valor nenhum. Não é segredo de ninguém.
 */

const CHAVE_ACESSO_EXEMPLO = 'AKIAIOSFODNN7EXAMPLE';
const CHAVE_SECRETA_EXEMPLO = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

describe('assinar — suite oficial aws-sig-v4-test-suite', () => {
  it('reproduz o caso get-vanilla', () => {
    // Segundo vetor oficial, independente do primeiro: outra credencial, outra
    // regiao, outro servico, assinatura por cabecalho em vez de pre-assinada.
    // Dois vetores independentes batendo é o que dá confianca de que a
    // implementacao segue o protocolo, e nao de que ela foi ajustada para
    // passar num caso.
    const resultado = assinar({
      metodo: 'GET',
      caminho: '/',
      consulta: {},
      cabecalhos: { host: 'example.amazonaws.com', 'x-amz-date': '20150830T123600Z' },
      hashCorpo: sha256Hex(''),
      credencial: {
        chaveAcesso: 'AKIDEXAMPLE',
        chaveSecreta: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
      },
      escopo: { regiao: 'us-east-1', servico: 'service' },
      momento: new Date('2015-08-30T12:36:00Z'),
    });

    expect(resultado.assinatura).toBe(
      '5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31',
    );
    expect(resultado.cabecalhosAssinados).toBe('host;x-amz-date');
  });
});

describe('chaveDeAssinatura', () => {
  it('produz 32 bytes, que é o tamanho do HMAC-SHA256', () => {
    const derivada = chaveDeAssinatura(CHAVE_SECRETA_EXEMPLO, '20120215', 'us-east-1', 'iam');
    expect(derivada.length).toBe(32);
  });

  it('muda por completo se o dia mudar', () => {
    const a = chaveDeAssinatura(CHAVE_SECRETA_EXEMPLO, '20120215', 'us-east-1', 'iam');
    const b = chaveDeAssinatura(CHAVE_SECRETA_EXEMPLO, '20120216', 'us-east-1', 'iam');
    expect(a.toString('hex')).not.toBe(b.toString('hex'));
  });

  it('muda por completo se a região mudar', () => {
    const a = chaveDeAssinatura(CHAVE_SECRETA_EXEMPLO, '20120215', 'us-east-1', 'iam');
    const b = chaveDeAssinatura(CHAVE_SECRETA_EXEMPLO, '20120215', 'sa-east-1', 'iam');
    expect(a.toString('hex')).not.toBe(b.toString('hex'));
  });
});

describe('assinarUrl', () => {
  it('reproduz a assinatura do GET pré-assinado do exemplo oficial', () => {
    const url = assinarUrl({
      metodo: 'GET',
      url: new URL('https://examplebucket.s3.amazonaws.com/test.txt'),
      credencial: { chaveAcesso: CHAVE_ACESSO_EXEMPLO, chaveSecreta: CHAVE_SECRETA_EXEMPLO },
      escopo: { regiao: 'us-east-1', servico: 's3' },
      validadeSegundos: 86400,
      momento: new Date('2013-05-24T00:00:00Z'),
    });

    expect(url).toContain(
      'X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404',
    );
  });

  it('põe os parâmetros exigidos pelo protocolo', () => {
    const url = assinarUrl({
      metodo: 'PUT',
      url: new URL('https://armazenamento.exemplo.com/balde/tenants/a/foto.jpg'),
      credencial: { chaveAcesso: CHAVE_ACESSO_EXEMPLO, chaveSecreta: CHAVE_SECRETA_EXEMPLO },
      escopo: { regiao: 'us-east-1', servico: 's3' },
      validadeSegundos: 600,
      momento: new Date('2013-05-24T00:00:00Z'),
    });

    expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    expect(url).toContain('X-Amz-Date=20130524T000000Z');
    expect(url).toContain('X-Amz-Expires=600');
    expect(url).toContain('X-Amz-SignedHeaders=host');
    // A barra do escopo vai codificada dentro do valor do parâmetro.
    expect(url).toContain('X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3');
  });

  it('assina o content-type quando ele é obrigatório', () => {
    const comTipo = assinarUrl({
      metodo: 'PUT',
      url: new URL('https://armazenamento.exemplo.com/balde/foto.jpg'),
      credencial: { chaveAcesso: CHAVE_ACESSO_EXEMPLO, chaveSecreta: CHAVE_SECRETA_EXEMPLO },
      escopo: { regiao: 'us-east-1', servico: 's3' },
      validadeSegundos: 600,
      cabecalhosObrigatorios: { 'content-type': 'image/jpeg' },
      momento: new Date('2013-05-24T00:00:00Z'),
    });

    expect(comTipo).toContain('X-Amz-SignedHeaders=content-type%3Bhost');

    // Trocar o tipo tem que mudar a assinatura, senão o cliente poderia enviar
    // um HTML se passando por foto e o navegador o executaria ao abrir a URL.
    const comOutroTipo = assinarUrl({
      metodo: 'PUT',
      url: new URL('https://armazenamento.exemplo.com/balde/foto.jpg'),
      credencial: { chaveAcesso: CHAVE_ACESSO_EXEMPLO, chaveSecreta: CHAVE_SECRETA_EXEMPLO },
      escopo: { regiao: 'us-east-1', servico: 's3' },
      validadeSegundos: 600,
      cabecalhosObrigatorios: { 'content-type': 'text/html' },
      momento: new Date('2013-05-24T00:00:00Z'),
    });

    const assinaturaDe = (u: string) => u.split('X-Amz-Signature=')[1];
    expect(assinaturaDe(comTipo)).not.toBe(assinaturaDe(comOutroTipo));
  });

  it('assina o caminho de verdade, não um caminho parecido', () => {
    const base = {
      metodo: 'GET',
      credencial: { chaveAcesso: CHAVE_ACESSO_EXEMPLO, chaveSecreta: CHAVE_SECRETA_EXEMPLO },
      escopo: { regiao: 'us-east-1', servico: 's3' },
      validadeSegundos: 600,
      momento: new Date('2013-05-24T00:00:00Z'),
    };

    const a = assinarUrl({ ...base, url: new URL('https://x.exemplo.com/balde/tenant-a/foto.jpg') });
    const b = assinarUrl({ ...base, url: new URL('https://x.exemplo.com/balde/tenant-b/foto.jpg') });

    // Se a assinatura ignorasse o caminho, quem tivesse uma URL assinada leria
    // o arquivo de qualquer outro corretor trocando um caractere.
    expect(a.split('X-Amz-Signature=')[1]).not.toBe(b.split('X-Amz-Signature=')[1]);
  });
});

describe('codificarRfc3986', () => {
  it('codifica os cinco caracteres que encodeURIComponent deixa passar', () => {
    // Estes cinco são a diferença entre o RFC 3986 e o que o JavaScript faz.
    // Um nome como "foto (1).jpg" cai exatamente aqui.
    expect(codificarRfc3986("!'()*")).toBe('%21%27%28%29%2A');
  });

  it('preserva os não reservados', () => {
    expect(codificarRfc3986('AZaz09-_.~')).toBe('AZaz09-_.~');
  });

  it('mantém a barra apenas quando pedido', () => {
    expect(codificarRfc3986('a/b', true)).toBe('a/b');
    expect(codificarRfc3986('a/b')).toBe('a%2Fb');
  });

  it('codifica acento em UTF-8, byte a byte', () => {
    // Nome de arquivo com acento é regra, não exceção, num sistema brasileiro.
    expect(codificarRfc3986('ç')).toBe('%C3%A7');
    expect(codificarRfc3986('Sertãozinho')).toBe('Sert%C3%A3ozinho');
  });

  it('codifica o espaço como %20 e nunca como +', () => {
    expect(codificarRfc3986('foto 1.jpg')).toBe('foto%201.jpg');
  });
});

describe('carimbos', () => {
  it('formata como o protocolo espera', () => {
    const { completo, data } = carimbos(new Date('2013-05-24T00:00:00Z'));
    expect(completo).toBe('20130524T000000Z');
    expect(data).toBe('20130524');
  });

  it('não deixa milissegundo vazar para o carimbo', () => {
    const { completo } = carimbos(new Date('2026-09-25T14:43:44.294Z'));
    expect(completo).toBe('20260925T144344Z');
  });
});

describe('cabecalhosAssinados', () => {
  it('monta o Authorization no formato do protocolo', () => {
    const cabecalhos = cabecalhosAssinados({
      metodo: 'HEAD',
      url: new URL('https://armazenamento.exemplo.com/balde/tenants/a/foto.jpg'),
      credencial: { chaveAcesso: CHAVE_ACESSO_EXEMPLO, chaveSecreta: CHAVE_SECRETA_EXEMPLO },
      escopo: { regiao: 'us-east-1', servico: 's3' },
      momento: new Date('2013-05-24T00:00:00Z'),
    });

    expect(cabecalhos.Authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE\/20130524\/us-east-1\/s3\/aws4_request, SignedHeaders=[a-z0-9;-]+, Signature=[0-9a-f]{64}$/,
    );
  });

  it('declara o hash do corpo vazio em requisição sem corpo', () => {
    const cabecalhos = cabecalhosAssinados({
      metodo: 'DELETE',
      url: new URL('https://armazenamento.exemplo.com/balde/foto.jpg'),
      credencial: { chaveAcesso: CHAVE_ACESSO_EXEMPLO, chaveSecreta: CHAVE_SECRETA_EXEMPLO },
      escopo: { regiao: 'us-east-1', servico: 's3' },
      momento: new Date('2013-05-24T00:00:00Z'),
    });

    expect(cabecalhos['x-amz-content-sha256']).toBe(sha256Hex(''));
  });

  it('inclui o token quando a credencial é temporária', () => {
    const cabecalhos = cabecalhosAssinados({
      metodo: 'HEAD',
      url: new URL('https://armazenamento.exemplo.com/balde/foto.jpg'),
      credencial: {
        chaveAcesso: CHAVE_ACESSO_EXEMPLO,
        chaveSecreta: CHAVE_SECRETA_EXEMPLO,
        token: 'token-temporario',
      },
      escopo: { regiao: 'us-east-1', servico: 's3' },
      momento: new Date('2013-05-24T00:00:00Z'),
    });

    expect(cabecalhos['x-amz-security-token']).toBe('token-temporario');
    expect(cabecalhos.Authorization).toContain('x-amz-security-token');
  });
});

describe('assinar', () => {
  it('ordena os cabeçalhos assinados, venham na ordem que vierem', () => {
    const comum = {
      metodo: 'PUT',
      caminho: '/balde/foto.jpg',
      consulta: {},
      hashCorpo: sha256Hex(''),
      credencial: { chaveAcesso: CHAVE_ACESSO_EXEMPLO, chaveSecreta: CHAVE_SECRETA_EXEMPLO },
      escopo: { regiao: 'us-east-1', servico: 's3' },
      momento: new Date('2013-05-24T00:00:00Z'),
    };

    const a = assinar({ ...comum, cabecalhos: { host: 'x.com', 'content-type': 'image/jpeg' } });
    const b = assinar({ ...comum, cabecalhos: { 'content-type': 'image/jpeg', host: 'x.com' } });

    expect(a.assinatura).toBe(b.assinatura);
    expect(a.cabecalhosAssinados).toBe('content-type;host');
  });

  it('ordena a consulta por nome do parâmetro', () => {
    const { consultaCanonica } = assinar({
      metodo: 'GET',
      caminho: '/balde',
      consulta: { zebra: '1', alfa: '2', meio: '3' },
      cabecalhos: { host: 'x.com' },
      hashCorpo: sha256Hex(''),
      credencial: { chaveAcesso: CHAVE_ACESSO_EXEMPLO, chaveSecreta: CHAVE_SECRETA_EXEMPLO },
      escopo: { regiao: 'us-east-1', servico: 's3' },
      momento: new Date('2013-05-24T00:00:00Z'),
    });

    expect(consultaCanonica).toBe('alfa=2&meio=3&zebra=1');
  });
});
