/**
 * Substituto de `server-only` durante os testes.
 *
 * O pacote real lança ao ser importado fora do contexto de servidor do Next —
 * é essa exceção que impede um módulo com a chave de serviço de ir parar no
 * pacote do navegador. O vitest roda em Node puro, sem esse contexto, então
 * cairia na exceção e nenhum módulo de servidor poderia ser testado.
 *
 * Trocar por um módulo vazio nos testes é o mesmo que o Next faz no build de
 * servidor. A proteção continua valendo onde importa: no build da aplicação.
 */
export {};
