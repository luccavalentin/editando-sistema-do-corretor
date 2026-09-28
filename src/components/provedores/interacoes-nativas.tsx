'use client';

import { useEffect } from 'react';

type Intensidade = 'leve' | 'confirmacao' | 'erro' | 'selecao';

const PADROES: Record<Intensidade, number | number[]> = {
  leve: 8,
  selecao: 10,
  confirmacao: [10, 24, 10],
  erro: [18, 32, 18],
};

function vibrar(intensidade: Intensidade) {
  if (!('vibrate' in navigator)) return;
  navigator.vibrate(PADROES[intensidade]);
}

/**
 * Feedback nativo sutil.
 *
 * Web não tem a API tátil fina do iOS/Android nativo. Em PWA, `vibrate` é o
 * caminho disponível no Android e simplesmente não faz nada onde não existe.
 * Por isso a interação visual continua sendo a fonte primária de feedback.
 */
export function InteracoesNativas() {
  useEffect(() => {
    function aoClicar(evento: PointerEvent) {
      const alvo = evento.target;
      if (!(alvo instanceof Element)) return;

      const elemento = alvo.closest<HTMLElement>('[data-haptico]');
      if (!elemento) return;

      const intensidade = elemento.dataset.haptico as Intensidade | undefined;
      vibrar(intensidade && intensidade in PADROES ? intensidade : 'leve');
    }

    document.addEventListener('pointerup', aoClicar, { passive: true });
    return () => document.removeEventListener('pointerup', aoClicar);
  }, []);

  return null;
}
