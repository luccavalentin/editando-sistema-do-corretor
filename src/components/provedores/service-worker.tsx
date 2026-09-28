'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker.
 *
 * SÓ EM PRODUÇÃO, E ISSO NÃO É PREGUIÇA
 *
 * Em desenvolvimento o service worker briga com o refresh rápido do Next: ele
 * serve o pacote antigo do cache enquanto o dev server já compilou outro, e o
 * sintoma é "editei o arquivo e a tela não mudou". Já custou tarde de
 * depuração em projeto que não tomou esse cuidado.
 *
 * SÓ NO APP DO CORRETOR
 *
 * Este componente é montado no shell autenticado, não no layout raiz. A vitrine
 * pública em `/c/...` recebe desconhecidos vindos do Google, e instalar um
 * service worker no navegador de quem só veio olhar um apartamento é registrar
 * um processo em segundo plano que aquela pessoa nunca pediu.
 *
 * O `scope` continua `/` porque o corretor navega para o portfólio dele pelo
 * próprio sistema — quem decide o alcance é o arquivo, não quem registra.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    // Depois do `load`: registrar durante o carregamento faz o download do
    // service worker disputar banda com o que a tela precisa para aparecer —
    // e em 4G ruim, que é o caso de uso, essa disputa é visível.
    const registrar = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Falhar aqui não é motivo para atrapalhar ninguém: sem service worker
        // o sistema funciona igual, só não abre offline. Silêncio proposital.
      });
    };

    if (document.readyState === 'complete') {
      registrar();
      return;
    }

    window.addEventListener('load', registrar);
    return () => window.removeEventListener('load', registrar);
  }, []);

  return null;
}
