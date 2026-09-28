/* global self, caches, Request, URL, fetch, Response */

/**
 * Service worker do Agilliza.
 *
 * O QUE ESTE ARQUIVO DELIBERADAMENTE NÃO FAZ
 *
 * Ele não guarda nada do CRM. Nenhuma tela autenticada, nenhuma resposta de
 * API, nenhum dado de cliente. Isso não é limitação — é a decisão central deste
 * arquivo, e ela tem dois motivos:
 *
 * 1. PRIVACIDADE. O cache do service worker fica no disco do aparelho, fora do
 *    controle da sessão. Guardar a lista de clientes ali significa que o nome,
 *    o telefone e o CPF de gente real sobrevivem ao logout e continuam no
 *    celular perdido ou emprestado. A sessão expira; o cache, não.
 *
 * 2. DADO VELHO É PIOR QUE DADO NENHUM. Um corretor que abre a agenda offline e
 *    vê uma visita que foi desmarcada ontem vai até o imóvel. "Não carregou" ele
 *    entende na hora e liga para alguém. "Carregou errado" ele só descobre na
 *    porta fechada.
 *
 * O QUE ELE FAZ
 *
 * Guarda o que é público e imutável — o JavaScript e o CSS com hash no nome, as
 * fontes, os ícones — e serve uma página de aviso decente quando a navegação
 * falha por falta de rede. É o suficiente para o sistema abrir instantaneamente na
 * segunda vez e para a falta de sinal virar uma mensagem em português em vez do
 * dinossauro do navegador.
 *
 * Quando houver leitura offline de verdade, ela precisa de decisão explícita
 * sobre retenção e limpeza no logout — e não é aqui que isso se resolve.
 */

const VERSAO = 'agilliza-v1';
const CACHE_ESTATICO = `${VERSAO}-estatico`;
const CACHE_OFFLINE = `${VERSAO}-offline`;

/** A única página que o service worker guarda inteira. Não tem dado nenhum. */
const PAGINA_OFFLINE = '/offline.html';

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_OFFLINE);
      await cache.add(new Request(PAGINA_OFFLINE, { cache: 'reload' }));
      // Assume o controle sem esperar a aba fechar: numa instalação nova não há
      // versão anterior servindo nada, então não há o que quebrar.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      // Limpa caches de versões antigas. Sem isto, cada publicação deixa um
      // depósito órfão no aparelho do corretor, para sempre.
      const nomes = await caches.keys();
      await Promise.all(
        nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Só isto entra no cache: público, imutável, sem dado de ninguém. */
function eEstaticoSeguro(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icones/') ||
    url.pathname.startsWith('/marca/') ||
    url.pathname === '/manifest.webmanifest'
  );
}

self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request;

  // Nada além de GET. Um POST repetido do cache criaria registro duplicado.
  if (requisicao.method !== 'GET') return;

  const url = new URL(requisicao.url);

  // Outro domínio não é problema nosso: Supabase, mídia, o que for.
  if (url.origin !== self.location.origin) return;

  // ------------------------------------------------------------- navegação
  // Sempre da rede. Se falhar, a página de aviso — nunca uma cópia velha da
  // tela, que mostraria dados de ontem como se fossem de agora.
  if (requisicao.mode === 'navigate') {
    evento.respondWith(
      (async () => {
        try {
          return await fetch(requisicao);
        } catch {
          const cache = await caches.open(CACHE_OFFLINE);
          const resposta = await cache.match(PAGINA_OFFLINE);
          return (
            resposta ??
            new Response('Sem conexão.', {
              status: 503,
              headers: { 'content-type': 'text/plain; charset=utf-8' },
            })
          );
        }
      })(),
    );
    return;
  }

  // -------------------------------------------------------------- estáticos
  // Cache primeiro: os nomes têm hash, então o conteúdo nunca muda sob o mesmo
  // endereço. É o que faz a segunda abertura ser instantânea.
  if (eEstaticoSeguro(url)) {
    evento.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_ESTATICO);
        const guardado = await cache.match(requisicao);
        if (guardado) return guardado;

        const resposta = await fetch(requisicao);
        // `ok` e não `status < 400`: redirecionamento e resposta parcial não
        // devem virar cache permanente.
        if (resposta.ok) cache.put(requisicao, resposta.clone());
        return resposta;
      })(),
    );
    return;
  }

  // Todo o resto — telas, rotas de API, qualquer coisa que possa levar dado de
  // cliente junto — passa direto para a rede, sem tocar no cache.
});
