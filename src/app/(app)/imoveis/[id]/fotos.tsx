'use client';

import { useCallback, useRef, useState, useTransition } from 'react';

import { Botao } from '@/components/ui/botao';
import { Icone } from '@/components/shell/icones';
import { cn } from '@/lib/ui';
import {
  legendaAPartirDoNome,
  MAXIMO_DE_FOTOS_POR_IMOVEL,
  recusarArquivo,
  TAMANHO_MAXIMO_FOTO,
} from '@/dominio/midia';
import {
  autorizarEnvioDeFoto,
  confirmarFotoEnviada,
  definirCapa,
  removerFoto,
} from '@/server/acoes/imoveis';

export interface FotoExibida {
  id: string;
  url: string;
  legenda: string | null;
  capa: boolean;
}

interface EnvioEmAndamento {
  id: string;
  nome: string;
  situacao: 'enviando' | 'conferindo' | 'erro';
  progresso: number;
  erro?: string;
}

/**
 * Envio de fotos do imóvel.
 *
 * O arquivo vai do navegador DIRETO para o armazenamento, sem passar pelo
 * servidor do sistema. Quem hospeda num VPS sente a diferença na primeira
 * semana: dez corretores subindo fotos de 8 MB ao mesmo tempo consumiriam toda
 * a memória do processo se cada byte tivesse que atravessar o Node.
 *
 * São três idas ao servidor por foto, e cada uma tem um motivo:
 *
 *   1. `autorizarEnvioDeFoto` — o servidor confere permissão e limite, decide
 *      ONDE o arquivo vai cair e assina. O navegador nunca escolhe o destino.
 *   2. o PUT direto — o arquivo em si, que o servidor não vê.
 *   3. `confirmarFotoEnviada` — o servidor olha o que chegou antes de gravar
 *      no banco. É o que impede um arquivo que não é imagem de virar foto de
 *      anúncio, e o que garante que toda linha do banco aponta para um arquivo
 *      que existe de verdade.
 *
 * As fotos sobem UMA POR VEZ de propósito. Em 4G instável, dez envios
 * simultâneos competem pela mesma banda e todos ficam lentos; em série, cada
 * um termina e o corretor vê progresso de verdade.
 */
export function GerenciadorDeFotos({
  imovelId,
  fotosIniciais,
  armazenamentoConfigurado,
  podeEditar,
}: {
  imovelId: string;
  fotosIniciais: FotoExibida[];
  armazenamentoConfigurado: boolean;
  podeEditar: boolean;
}) {
  const [fotos, setFotos] = useState(fotosIniciais);
  const [envios, setEnvios] = useState<EnvioEmAndamento[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [avisoGeral, setAvisoGeral] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const entradaRef = useRef<HTMLInputElement>(null);

  const atualizarEnvio = useCallback((id: string, mudanca: Partial<EnvioEmAndamento>) => {
    setEnvios((atuais) => atuais.map((e) => (e.id === id ? { ...e, ...mudanca } : e)));
  }, []);

  /**
   * Envia um arquivo com progresso.
   *
   * `XMLHttpRequest` em vez de `fetch` porque só ele informa quanto já subiu. O
   * `fetch` com `ReadableStream` existe, mas exige HTTP/2 e não funciona em
   * todo navegador — e barra de progresso que não anda faz o corretor achar que
   * travou e recarregar a página no meio do envio.
   */
  function enviarComProgresso(
    url: string,
    arquivo: File,
    aoProgredir: (porcentagem: number) => void,
  ): Promise<void> {
    return new Promise((resolver, rejeitar) => {
      const requisicao = new XMLHttpRequest();
      requisicao.open('PUT', url, true);
      requisicao.setRequestHeader('Content-Type', arquivo.type);

      requisicao.upload.onprogress = (evento) => {
        if (evento.lengthComputable) {
          aoProgredir(Math.round((evento.loaded / evento.total) * 100));
        }
      };

      requisicao.onload = () => {
        if (requisicao.status >= 200 && requisicao.status < 300) resolver();
        else rejeitar(new Error(`O armazenamento recusou o envio (${requisicao.status}).`));
      };
      requisicao.onerror = () => rejeitar(new Error('A conexão caiu durante o envio.'));
      requisicao.onabort = () => rejeitar(new Error('Envio cancelado.'));
      requisicao.ontimeout = () => rejeitar(new Error('O envio demorou demais.'));

      // Cinco minutos: tempo de subir 12 MB numa conexão ruim em frente ao
      // imóvel, que é onde o corretor de fato fotografa.
      requisicao.timeout = 5 * 60 * 1000;
      requisicao.send(arquivo);
    });
  }

  async function enviarArquivo(arquivo: File): Promise<void> {
    const idLocal = `${arquivo.name}-${Date.now()}-${Math.random()}`;

    // Primeira barreira, no navegador: recusar aqui poupa a franquia de dados
    // do corretor. A decisão real é do servidor, que não confia nisto.
    const recusa = recusarArquivo({
      tipoDeclarado: arquivo.type,
      tamanho: arquivo.size,
      limite: TAMANHO_MAXIMO_FOTO,
    });

    if (recusa) {
      setEnvios((atuais) => [
        ...atuais,
        { id: idLocal, nome: arquivo.name, situacao: 'erro', progresso: 0, erro: recusa },
      ]);
      return;
    }

    setEnvios((atuais) => [
      ...atuais,
      { id: idLocal, nome: arquivo.name, situacao: 'enviando', progresso: 0 },
    ]);

    try {
      const autorizacao = await autorizarEnvioDeFoto({
        imovelId,
        tipoConteudo: arquivo.type,
        tamanho: arquivo.size,
      });

      if (autorizacao.erro || !autorizacao.autorizacao) {
        atualizarEnvio(idLocal, { situacao: 'erro', erro: autorizacao.erro ?? 'Envio recusado.' });
        return;
      }

      await enviarComProgresso(autorizacao.autorizacao.url, arquivo, (porcentagem) =>
        atualizarEnvio(idLocal, { progresso: porcentagem }),
      );

      atualizarEnvio(idLocal, { situacao: 'conferindo', progresso: 100 });

      const confirmacao = await confirmarFotoEnviada({
        imovelId,
        chave: autorizacao.autorizacao.chave,
        legenda: legendaAPartirDoNome(arquivo.name),
      });

      if (confirmacao.erro || !confirmacao.midiaId) {
        atualizarEnvio(idLocal, {
          situacao: 'erro',
          erro: confirmacao.erro ?? 'A foto não pôde ser registrada.',
        });
        return;
      }

      // Mostra a foto na hora, sem esperar o servidor redesenhar a página. A
      // URL local (`createObjectURL`) evita o piscar de uma imagem que ainda
      // está propagando no CDN.
      setFotos((atuais) => [
        ...atuais,
        {
          id: confirmacao.midiaId!,
          url: URL.createObjectURL(arquivo),
          legenda: legendaAPartirDoNome(arquivo.name),
          capa: atuais.length === 0,
        },
      ]);
      setEnvios((atuais) => atuais.filter((e) => e.id !== idLocal));
    } catch (erro) {
      atualizarEnvio(idLocal, {
        situacao: 'erro',
        erro: erro instanceof Error ? erro.message : 'Não foi possível enviar a foto.',
      });
    }
  }

  async function enviarVarios(lista: FileList | File[]): Promise<void> {
    const arquivos = Array.from(lista);
    const espaco = MAXIMO_DE_FOTOS_POR_IMOVEL - fotos.length;

    if (espaco <= 0) {
      setAvisoGeral(
        `Este imóvel já tem ${MAXIMO_DE_FOTOS_POR_IMOVEL} fotos. Remova alguma antes de enviar outra.`,
      );
      return;
    }

    if (arquivos.length > espaco) {
      setAvisoGeral(
        `Cabem mais ${espaco} ${espaco === 1 ? 'foto' : 'fotos'} neste imóvel. As primeiras serão enviadas.`,
      );
    } else {
      setAvisoGeral(null);
    }

    // Em série, não em paralelo: veja o comentário no topo.
    for (const arquivo of arquivos.slice(0, espaco)) {
      await enviarArquivo(arquivo);
    }
  }

  function aoSoltar(evento: React.DragEvent<HTMLLabelElement>) {
    evento.preventDefault();
    setArrastando(false);
    if (evento.dataTransfer.files.length > 0) void enviarVarios(evento.dataTransfer.files);
  }

  function remover(midiaId: string) {
    iniciarTransicao(async () => {
      const resultado = await removerFoto({ imovelId, midiaId });
      if (resultado.erro) {
        setAvisoGeral(resultado.erro);
        return;
      }
      setFotos((atuais) => {
        const restantes = atuais.filter((f) => f.id !== midiaId);
        const perdeuCapa = atuais.find((f) => f.id === midiaId)?.capa;
        if (perdeuCapa && restantes[0]) restantes[0] = { ...restantes[0], capa: true };
        return restantes;
      });
    });
  }

  function marcarCapa(midiaId: string) {
    iniciarTransicao(async () => {
      const resultado = await definirCapa({ imovelId, midiaId });
      if (resultado.erro) {
        setAvisoGeral(resultado.erro);
        return;
      }
      setFotos((atuais) => atuais.map((f) => ({ ...f, capa: f.id === midiaId })));
    });
  }

  if (!armazenamentoConfigurado) {
    return (
      <div className="rounded-xl border border-atencao-borda bg-atencao-sutil px-4 py-3.5">
        <div className="mb-1 flex items-center gap-2">
          <Icone nome="alerta" className="size-4 text-atencao-texto" />
          <h3 className="text-sm font-bold text-atencao-texto">
            Envio de fotos não configurado
          </h3>
        </div>
        <p className="text-sm text-atencao-texto">
          Esta instalação ainda não tem armazenamento de imagens ligado. O cadastro do imóvel
          funciona normalmente; as fotos ficam disponíveis assim que quem administra o servidor
          configurar o armazenamento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {avisoGeral && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-atencao-sutil px-3 py-2.5 text-sm text-atencao-texto"
        >
          <Icone nome="alerta" className="mt-0.5 size-4 shrink-0" />
          {avisoGeral}
        </p>
      )}

      {podeEditar && (
        // <label>, e não <div>: a zona de soltar precisa ser CLICÁVEL e
        // alcançável pelo teclado. Um <div> com onDrop atende só quem usa mouse
        // — arrastar arquivo não existe para quem navega por teclado nem no
        // celular. O <label> associado ao <input type="file"> resolve os dois:
        // clique e Enter abrem o seletor nativo pelo caminho do próprio
        // navegador, e o arrastar continua funcionando como acréscimo.
        /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions --
           A regra existe para impedir que uma funcionalidade só exista no
           ponteiro. Aqui não é o caso: o caminho principal é o <input
           type="file"> nativo, que este <label> ativa por clique E por teclado,
           e que funciona igual no celular. Os manipuladores de arrastar são um
           ACRÉSCIMO para quem usa mouse — remover o arrastar não tiraria
           nenhuma capacidade de ninguém. Registrar os mesmos eventos por
           addEventListener num efeito silenciaria a regra sem mudar nada, que
           seria enganar o linter em vez de responder a ele. */
        <label
          htmlFor="entrada-de-fotos"
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={aoSoltar}
          className={cn(
            'block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors',
            arrastando ? 'border-acao bg-acao-sutil' : 'border-borda bg-superficie-afundada',
            'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2',
          )}
        >
          <Icone nome="vitrine" className="mx-auto size-7 text-texto-apoio" />
          <p className="mt-2 text-sm font-medium text-texto">
            Arraste as fotos aqui ou escolha do dispositivo
          </p>
          <p className="mt-0.5 text-xs text-texto-apoio">
            JPEG, PNG, WebP ou AVIF, até 12 MB cada. Máximo de {MAXIMO_DE_FOTOS_POR_IMOVEL} fotos.
          </p>

          <input
            ref={entradaRef}
            id="entrada-de-fotos"
            type="file"
            aria-label="Escolher fotos do imóvel"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="so-leitor"
            onChange={(evento) => {
              if (evento.currentTarget.files) void enviarVarios(evento.currentTarget.files);
              // Limpa para que escolher o MESMO arquivo de novo dispare o
              // evento — sem isto, reenviar depois de um erro não faz nada.
              evento.currentTarget.value = '';
            }}
          />

          {/* Aparenta botão sem ser um: um <button> aqui dentro seria elemento
              interativo aninhado em <label>, e o clique dispararia duas vezes. */}
          <span className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg border border-borda bg-superficie px-3 text-xs font-semibold text-texto">
            <Icone nome="mais" className="size-3.5" />
            Escolher fotos
          </span>
        </label>
      )}

      {envios.length > 0 && (
        <ul className="flex flex-col gap-2">
          {envios.map((envio) => (
            <li
              key={envio.id}
              className="rounded-lg border border-borda bg-superficie px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="linhas-1 text-sm text-texto">{envio.nome}</span>
                <span
                  className={cn(
                    'shrink-0 text-xs font-semibold',
                    envio.situacao === 'erro' ? 'text-perigo-texto' : 'text-texto-secundario',
                  )}
                >
                  {envio.situacao === 'enviando' && `${envio.progresso}%`}
                  {envio.situacao === 'conferindo' && 'Conferindo'}
                  {envio.situacao === 'erro' && 'Não enviou'}
                </span>
              </div>

              {envio.situacao !== 'erro' && (
                <div
                  role="progressbar"
                  aria-valuenow={envio.progresso}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Enviando ${envio.nome}`}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-superficie-afundada"
                >
                  <div
                    className="h-full rounded-full bg-acao transition-[width] duration-200"
                    style={{ width: `${envio.progresso}%` }}
                  />
                </div>
              )}

              {envio.erro && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-perigo-texto">
                  <Icone nome="alerta" className="mt-0.5 size-3 shrink-0" />
                  {envio.erro}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {fotos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {fotos.map((foto) => (
            <li
              key={foto.id}
              className="group relative overflow-hidden rounded-lg border border-borda bg-superficie-afundada"
            >
              <div className="aspect-[4/3] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element -- host de
                    mídia é configurável por instalação; o otimizador do Next
                    exige lista fixa de domínios em tempo de build. */}
                <img
                  src={foto.url}
                  alt={foto.legenda ?? 'Foto do imóvel'}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </div>

              {foto.capa && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-acao px-2 py-0.5 text-micro font-semibold text-acao-texto">
                  Capa
                </span>
              )}

              {podeEditar && (
                // Sempre visível no toque; no ponteiro aparece ao passar o
                // mouse. Controle que só existe no hover é controle que não
                // existe no celular, que é onde o corretor trabalha.
                <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1.5 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                  {!foto.capa && (
                    <Botao
                      type="button"
                      tipo="neutro"
                      tamanho="pequeno"
                      className="flex-grow"
                      disabled={pendente}
                      onClick={() => marcarCapa(foto.id)}
                    >
                      Usar como capa
                    </Botao>
                  )}
                  <Botao
                    type="button"
                    tipo="perigo"
                    tamanho="icone"
                    aria-label={`Remover ${foto.legenda ?? 'foto'}`}
                    disabled={pendente}
                    onClick={() => remover(foto.id)}
                  >
                    <Icone nome="alerta" className="size-4" />
                  </Botao>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {fotos.length === 0 && envios.length === 0 && (
        <p className="text-sm text-texto-apoio">
          Anúncio sem foto recebe muito menos contato. Vale subir pelo menos a fachada, a sala e a
          cozinha.
        </p>
      )}
    </div>
  );
}
