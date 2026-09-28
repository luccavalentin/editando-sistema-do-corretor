/**
 * Ícones do menu, em traço.
 *
 * São inline e não de uma biblioteca por dois motivos concretos. Um: `currentColor`
 * faz o ícone herdar a cor do item de menu, então o estado ativo funciona sem
 * nenhuma prop de cor. Dois: SVG carregado de fora seria bloqueado pela CSP, e
 * SVG remoto é vetor de XSS — por isso `dangerouslyAllowSVG` está desligado no
 * next.config.
 *
 * Emoji está fora de questão: renderiza diferente em cada sistema e é lido em voz
 * alta pelo leitor de tela de um jeito que atrapalha.
 */

const CAMINHOS: Record<string, string> = {
  casa: 'M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  calendario: 'M3 4h18v17H3zM8 2v4M16 2v4M3 10h18',
  checklist: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  funil: 'M3 17l5-5 4 3 5-6 4 4M3 21h18',
  pessoas: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM22 21v-2a4 4 0 0 0-3-3.87',
  conversa: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  relogio: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 8v4l3 2',
  predio: 'M3 21V8l9-5 9 5v13M9 21v-7h6v7',
  calculadora: 'M4 2h16v20H4zM8 6h8M8 11h3M13 11h3M8 16h3M13 16h3',
  medidor: 'M12 3a9 9 0 1 0 9 9h-9zM12 3v9h9a9 9 0 0 0-9-9z',
  grafico: 'M3 21h18M7 16v-5M12 16V7M17 16v-8',
  vitrine: 'M3 9l2-5h14l2 5M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 21v-7h6v7',
  globo: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18',
  maleta: 'M20 7h-9L9 4H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z',
  engrenagem:
    'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  brilho: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
  equipe:
    'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM21 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11',
  ajustes: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M8 15v6',
  plugue: 'M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4',
  escudo: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  busca: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-4.3-4.3',
  sino: 'M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0',
  lua: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  sol: 'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  mais: 'M12 5v14M5 12h14',
  seta: 'M5 12h14M13 6l6 6-6 6',
  voltar: 'M19 12H5M11 18l-6-6 6-6',
  sair: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  alerta: 'M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  telefone:
    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
};

export function Icone({
  nome,
  className = 'size-4',
}: {
  nome: string;
  className?: string;
}) {
  const caminho = CAMINHOS[nome];

  // Nome errado devolve nada em vez de quebrar a página: um ícone faltando não
  // justifica derrubar o menu inteiro.
  if (!caminho) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={caminho} />
    </svg>
  );
}
