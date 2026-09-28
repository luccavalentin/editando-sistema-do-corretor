import { describe, expect, it } from 'vitest';

import {
  BYTES_PARA_RECONHECER,
  ehTipoDeImagem,
  legendaAPartirDoNome,
  recusarArquivo,
  reconhecerImagem,
  TAMANHO_MAXIMO_FOTO,
} from '@/dominio/midia';
import { chaveDeFotoDeImovel, chaveEhDoTenant } from '@/lib/armazenamento/s3';

/** Monta bytes a partir de uma assinatura conhecida, completando com lixo. */
function arquivoComecandoEm(...primeiros: number[]): Uint8Array {
  const bytes = new Uint8Array(64);
  primeiros.forEach((valor, indice) => {
    bytes[indice] = valor;
  });
  return bytes;
}

function arquivoDeTexto(texto: string): Uint8Array {
  const bytes = new Uint8Array(64);
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
  return bytes;
}

describe('reconhecerImagem', () => {
  it('reconhece JPEG', () => {
    expect(reconhecerImagem(arquivoComecandoEm(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
  });

  it('reconhece PNG pela assinatura de 8 bytes', () => {
    expect(
      reconhecerImagem(arquivoComecandoEm(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe('image/png');
  });

  it('reconhece WebP dentro do contêiner RIFF', () => {
    const bytes = arquivoDeTexto('RIFF????WEBPVP8 ');
    expect(reconhecerImagem(bytes)).toBe('image/webp');
  });

  it('reconhece AVIF pela marca da caixa ftyp', () => {
    const bytes = arquivoDeTexto('....ftypavif....');
    expect(reconhecerImagem(bytes)).toBe('image/avif');
  });

  it('reconhece a variante avis do AVIF', () => {
    expect(reconhecerImagem(arquivoDeTexto('....ftypavis....'))).toBe('image/avif');
  });

  it('recusa um HTML disfarçado de foto', () => {
    // O ataque de verdade: subir isto declarando image/jpeg para hospedar uma
    // página de phishing num domínio ligado à marca.
    expect(reconhecerImagem(arquivoDeTexto('<!DOCTYPE html><html>'))).toBeNull();
    expect(reconhecerImagem(arquivoDeTexto('<svg onload=alert(1)>'))).toBeNull();
  });

  it('recusa PDF, ZIP e executável', () => {
    expect(reconhecerImagem(arquivoDeTexto('%PDF-1.7'))).toBeNull();
    expect(reconhecerImagem(arquivoComecandoEm(0x50, 0x4b, 0x03, 0x04))).toBeNull();
    expect(reconhecerImagem(arquivoComecandoEm(0x4d, 0x5a))).toBeNull();
  });

  it('recusa RIFF que não é WebP (um WAV, por exemplo)', () => {
    expect(reconhecerImagem(arquivoDeTexto('RIFF????WAVEfmt '))).toBeNull();
  });

  it('recusa ftyp que não é AVIF (um MP4)', () => {
    expect(reconhecerImagem(arquivoDeTexto('....ftypisom....'))).toBeNull();
  });

  it('não quebra com arquivo curto demais para ter assinatura', () => {
    expect(reconhecerImagem(new Uint8Array([]))).toBeNull();
    expect(reconhecerImagem(new Uint8Array([0xff]))).toBeNull();
    expect(reconhecerImagem(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });

  it('decide com a quantidade de bytes que o servidor busca', () => {
    // Se a constante encolher abaixo do necessário, o AVIF passa a ser
    // irreconhecível e este teste avisa.
    const bytes = arquivoDeTexto('....ftypavif....').slice(0, BYTES_PARA_RECONHECER);
    expect(reconhecerImagem(bytes)).toBe('image/avif');
  });
});

describe('ehTipoDeImagem', () => {
  it('aceita os quatro formatos do produto', () => {
    expect(ehTipoDeImagem('image/jpeg')).toBe(true);
    expect(ehTipoDeImagem('image/png')).toBe(true);
    expect(ehTipoDeImagem('image/webp')).toBe(true);
    expect(ehTipoDeImagem('image/avif')).toBe(true);
  });

  it('recusa o resto, inclusive SVG', () => {
    // SVG é XML e executa script. Não entra como foto de imóvel.
    expect(ehTipoDeImagem('image/svg+xml')).toBe(false);
    expect(ehTipoDeImagem('text/html')).toBe(false);
    expect(ehTipoDeImagem('application/pdf')).toBe(false);
    expect(ehTipoDeImagem('')).toBe(false);
  });
});

describe('recusarArquivo', () => {
  it('aprova uma foto comum de celular', () => {
    expect(recusarArquivo({ tipoDeclarado: 'image/jpeg', tamanho: 4 * 1024 * 1024 })).toBeNull();
  });

  it('explica o limite com o tamanho real, não com jargão', () => {
    const motivo = recusarArquivo({ tipoDeclarado: 'image/jpeg', tamanho: 20 * 1024 * 1024 });
    expect(motivo).toContain('20.0 MB');
    expect(motivo).toContain('12 MB');
  });

  it('recusa arquivo vazio', () => {
    expect(recusarArquivo({ tipoDeclarado: 'image/png', tamanho: 0 })).toContain('vazio');
  });

  it('lista os formatos aceitos ao recusar o formato', () => {
    const motivo = recusarArquivo({ tipoDeclarado: 'application/pdf', tamanho: 1000 });
    expect(motivo).toContain('JPEG');
    expect(motivo).toContain('PNG');
  });

  it('aceita exatamente no limite', () => {
    expect(
      recusarArquivo({ tipoDeclarado: 'image/jpeg', tamanho: TAMANHO_MAXIMO_FOTO }),
    ).toBeNull();
    expect(
      recusarArquivo({ tipoDeclarado: 'image/jpeg', tamanho: TAMANHO_MAXIMO_FOTO + 1 }),
    ).not.toBeNull();
  });
});

describe('legendaAPartirDoNome', () => {
  it('tira extensão e separadores', () => {
    expect(legendaAPartirDoNome('sala-de-estar.jpg')).toBe('sala de estar');
    expect(legendaAPartirDoNome('fachada_frontal.png')).toBe('fachada frontal');
  });

  it('corta legenda longa demais', () => {
    expect(legendaAPartirDoNome('a'.repeat(300) + '.jpg').length).toBe(120);
  });

  it('aguenta nome sem extensão', () => {
    expect(legendaAPartirDoNome('varanda')).toBe('varanda');
  });
});

describe('chaveDeFotoDeImovel', () => {
  const tenant = '11111111-1111-1111-1111-111111111111';
  const imovel = '22222222-2222-2222-2222-222222222222';

  it('põe o tenant e o imóvel no caminho', () => {
    const chave = chaveDeFotoDeImovel({ tenantId: tenant, imovelId: imovel, extensao: 'jpg' });
    expect(chave.startsWith(`tenants/${tenant}/imoveis/${imovel}/`)).toBe(true);
    expect(chave.endsWith('.jpg')).toBe(true);
  });

  it('sorteia, para que ninguém enumere as fotos do concorrente', () => {
    const a = chaveDeFotoDeImovel({ tenantId: tenant, imovelId: imovel, extensao: 'jpg' });
    const b = chaveDeFotoDeImovel({ tenantId: tenant, imovelId: imovel, extensao: 'jpg' });
    expect(a).not.toBe(b);
  });
});

describe('chaveEhDoTenant', () => {
  const tenant = '11111111-1111-1111-1111-111111111111';
  const outro = '99999999-9999-9999-9999-999999999999';

  it('aceita a chave do próprio tenant', () => {
    expect(chaveEhDoTenant(`tenants/${tenant}/imoveis/x/foto.jpg`, tenant)).toBe(true);
    expect(chaveEhDoTenant(`privado/tenants/${tenant}/docs/a.pdf`, tenant)).toBe(true);
  });

  it('recusa a chave de outro tenant', () => {
    expect(chaveEhDoTenant(`tenants/${outro}/imoveis/x/foto.jpg`, tenant)).toBe(false);
  });

  it('recusa travessia de diretório', () => {
    expect(chaveEhDoTenant(`tenants/${tenant}/../${outro}/foto.jpg`, tenant)).toBe(false);
    expect(chaveEhDoTenant(`/tenants/${tenant}/foto.jpg`, tenant)).toBe(false);
  });

  it('recusa prefixo que só parece do tenant', () => {
    // `tenants/<id>-outro/` começa com o id mas não é a pasta dele. A barra no
    // fim do prefixo é o que impede esse engano.
    expect(chaveEhDoTenant(`tenants/${tenant}-malicioso/foto.jpg`, tenant)).toBe(false);
  });
});
