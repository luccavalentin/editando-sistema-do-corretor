import type { MetadataRoute } from 'next';

/**
 * O manifest do sistema.
 *
 * Em TypeScript, e não num `.webmanifest` solto em `public/`, porque assim o
 * build reclama de campo inválido e de tipo errado. Um manifest quebrado não dá
 * erro em lugar nenhum: o navegador simplesmente não oferece a instalação, e
 * descobrir isso depende de alguém reparar na ausência de um botão.
 *
 * PARA QUEM ISTO É
 *
 * Corretor trabalha na rua. Entre uma visita e outra ele abre o sistema no
 * celular, em pé, com uma mão, muitas vezes com sinal ruim. Instalado na tela
 * inicial o app abre direto, sem barra de endereço comendo altura de tela e sem
 * a aba se perder no meio de outras vinte.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agilliza — Centro de comando do corretor',

    // Cabe embaixo do ícone na tela inicial sem virar reticências. O limite
    // prático no Android é perto de 12 caracteres.
    short_name: 'Agilliza',

    description:
      'Clientes, imóveis, agenda e financiamento num sistema só. Organize o dia, ' +
      'antecipe a capacidade de compra e não perca mais nenhum retorno.',

    // `/inicio`, não `/`: quem instalou já tem conta. Abrir na porta de entrada
    // seria mandar o corretor clicar mais uma vez, toda vez.
    start_url: '/inicio',

    // Fora do escopo — a vitrine pública em `/c/...` — o navegador volta a
    // mostrar a barra de endereço. É o certo: aquilo é uma página para o
    // cliente do corretor, e ele precisa ver e poder copiar a URL.
    scope: '/',

    display: 'standalone',
    orientation: 'portrait-primary',
    lang: 'pt-BR',
    dir: 'ltr',
    categories: ['business', 'productivity'],

    // A tela de abertura usa estas duas. O fundo é o azul da marca, o mesmo do
    // ícone: sem isso o Android abre num branco que pisca antes do app.
    background_color: '#0b109f',
    theme_color: '#0b109f',

    icons: [
      // `any` e `maskable` são DESENHOS diferentes, não tamanhos. O maskable
      // tem o símbolo menor porque o Android recorta na forma que o fabricante
      // escolher e só garante o círculo central de 80% do lado.
      { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icones/icone-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icones/icone-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],

    // Atalhos do toque longo no ícone. São os três destinos que o corretor abre
    // no meio da rua — e nenhum deles é uma tela de cadastro: no celular, em
    // pé, ele CONSULTA. Cadastro sério acontece sentado.
    shortcuts: [
      {
        name: 'Agenda de hoje',
        short_name: 'Agenda',
        description: 'Os compromissos do dia, com os avisos de choque de horário',
        url: '/agenda',
      },
      {
        name: 'Meus clientes',
        short_name: 'Clientes',
        description: 'Buscar uma pessoa e ver o histórico dela',
        url: '/clientes',
      },
      {
        name: 'Retornos pendentes',
        short_name: 'Retornos',
        description: 'Quem está esperando resposta, do mais atrasado para o menos',
        url: '/followups',
      },
    ],
  };
}
