# Console da plataforma

Aplicação **separada** do sistema do corretor. Roda em domínio próprio, com
`node_modules` próprio e implantação própria.

## Por que separada

Quem entra aqui enxerga todas as contas — é o que `app.pode_ler_tenant()`
concede a um `admin_plataforma`. Mantê-lo no mesmo sistema que o corretor usa
todo dia significaria que qualquer falha lá fica a um passo dessa permissão.

Separado, o ganho é concreto:

- **Cookie de outro domínio.** Sessão de corretor roubada não alcança nada aqui.
  Não é configuração, é a política de origem do navegador.
- **Superfície menor.** Sem envio de arquivo, sem página pública, sem integração
  externa. O que não existe não é atacável.
- **Pode sair da internet.** Um domínio à parte pode ficar atrás de VPN ou
  restrito por IP sem afetar nenhum corretor.
- **Implantação separada.** Atualizar o console não arrisca o sistema que está
  sendo usado para atender cliente.

Isso **diverge** do CRM Agilliza, onde o admin vive dentro do mesmo sistema.
A divergência é deliberada.

## O que ele NÃO faz

Não mostra nome de cliente, CPF, telefone, valor de negócio nem observação do
corretor. Suporte se faz com números — quantos imóveis, quantos usuários, qual
limite estourou — e não lendo a carteira de quem pediu ajuda.

Também não usa a chave de serviço. Toda leitura passa pela RLS com a identidade
do próprio administrador, e fica auditável.

## Rodar

```bash
cd admin
npm install
cp .env.example .env.local   # e preencha
npm run dev                  # porta 3100
```

A porta é **3100** de propósito: o sistema do corretor usa a 3000, e rodar os
dois ao mesmo tempo é o normal em desenvolvimento.

## Tipos do banco

`src/lib/tipos-banco.ts` é uma **cópia gerada**, nunca editada à mão. Ela é
atualizada por `npm run db:types` na raiz do repositório, que grava nos dois
lugares — com duas fontes, um schema mudado deixaria o console compilando e
mentindo.

## Primeiro administrador

Não há cadastro. Um administrador é um usuário do mesmo projeto Supabase com
`perfis.admin_plataforma = true`:

```sql
update public.perfis set admin_plataforma = true
where email = 'voce@agilliza.com.br';
```

O privilégio é conferido a **cada requisição**, não guardado na sessão: revogar
no banco tira o acesso na próxima página.
