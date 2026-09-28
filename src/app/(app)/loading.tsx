/**
 * O que aparece enquanto a próxima tela vem do servidor.
 *
 * POR QUE ISTO FALTAVA E POR QUE DOEU
 *
 * No App Router, clicar num link do menu dispara uma renderização NO SERVIDOR.
 * Sem um `loading.tsx`, o React não tem fronteira para suspender: o navegador
 * continua mostrando a tela ANTIGA, inteira e parada, até a nova ficar pronta.
 *
 * Do lado de quem usa, isso é indistinguível de um menu quebrado. O corretor
 * clica em "Clientes", a tela continua sendo "Início", e ele clica de novo. Foi
 * exatamente essa a reclamação — "o menu não respeita os cliques, está duro".
 * Não estava: estava mudo.
 *
 * POR QUE ESQUELETO, E NÃO UM GIRADOR NO MEIO DA TELA
 *
 * Porque o esqueleto já tem a FORMA da tela que está chegando. Quem olha
 * entende para onde foi antes do conteúdo existir, e a troca não dá aquele
 * solavanco de layout quando os dados chegam. Um girador centralizado diz
 * "espere" e não diz mais nada.
 *
 * `animate-pulse` respeita `prefers-reduced-motion` pelo próprio Tailwind — em
 * quem pediu menos movimento no sistema, o esqueleto aparece parado, e continua
 * cumprindo o papel.
 */
export default function Carregando() {
  return (
    <div className="p-4 sm:p-6" role="status" aria-label="Carregando a página">
      {/* Título e subtítulo */}
      <div className="animate-pulse">
        <div className="h-7 w-56 rounded-lg bg-superficie-hover" />
        <div className="mt-2 h-4 w-72 rounded bg-superficie-hover/70" />
      </div>

      {/* Faixa de números — quase toda tela do sistema começa com uma. */}
      <div className="mt-6 grid animate-pulse grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-borda bg-superficie p-4">
            <div className="h-3 w-24 rounded bg-superficie-hover" />
            <div className="mt-2.5 h-6 w-20 rounded bg-superficie-hover" />
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="mt-4 animate-pulse rounded-xl border border-borda bg-superficie">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-borda px-4 py-3.5 last:border-b-0"
          >
            <div className="size-9 shrink-0 rounded-full bg-superficie-hover" />
            <div className="min-w-0 flex-grow">
              <div className="h-3.5 w-1/3 rounded bg-superficie-hover" />
              <div className="mt-1.5 h-3 w-1/2 rounded bg-superficie-hover/70" />
            </div>
            <div className="hidden h-3 w-16 rounded bg-superficie-hover/70 sm:block" />
          </div>
        ))}
      </div>

      {/* Para leitor de tela: o esqueleto acima é decorativo e não é anunciado. */}
      <span className="so-leitor">Carregando…</span>
    </div>
  );
}
