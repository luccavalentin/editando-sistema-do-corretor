import { NextResponse } from 'next/server';

/**
 * Verificação de saúde, para o orquestrador e o balanceador.
 *
 * O QUE ELA RESPONDE, E O QUE NÃO
 *
 * Responde: "o processo Node está vivo e consegue executar código". Isso já
 * distingue o caso que a checagem de porta não pega — um Node travado continua
 * aceitando conexão e nunca responde.
 *
 * NÃO responde: "o banco está no ar". É deliberado. Se esta rota consultasse o
 * Supabase, uma instabilidade de dez segundos no banco faria o orquestrador
 * derrubar TODOS os contêineres e reiniciá-los ao mesmo tempo — trocando uma
 * falha parcial, em que as páginas em cache continuam servindo, por uma queda
 * total. Saúde de dependência externa é assunto de monitoramento, não de
 * reinício automático.
 *
 * Também não diz NADA sobre a configuração: nem versão de biblioteca, nem
 * quais integrações existem, nem nome de ambiente. Este endpoint é público
 * (está na lista do middleware) e é a primeira porta que alguém sonda.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { estado: 'ok' },
    {
      status: 200,
      headers: {
        // Resposta cacheada aqui faria o orquestrador ler a saúde de cinco
        // minutos atrás e manter no ar um processo que já morreu.
        'cache-control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
