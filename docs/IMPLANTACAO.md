# Implantação no VPS

Como subir a Agilliza num servidor próprio, do zero.

**Aviso honesto:** o `Dockerfile` e o `docker-compose.yml` foram escritos com
cuidado mas **não foram executados** — não há Docker na máquina onde o sistema
foi desenvolvido. A primeira execução real vai encontrar atrito. A seção
[Quando der errado](#quando-der-errado) lista o que provavelmente falha
primeiro e como reconhecer cada caso.

---

## O que vai rodar onde

| Onde | O quê | Por quê |
|---|---|---|
| Supabase gerenciado | Banco de dados, autenticação | Replicação, backup e ponto-no-tempo de um Postgres são trabalho de equipe dedicada, não de um contêiner |
| VPS | Sistema, MinIO, Caddy | Foto de imóvel é o dado que mais cresce e o que menos precisa de banco |

Um corretor com 300 anúncios e 25 fotos cada passa de 50 GB. Isso num plano de
banco custa caro por um trabalho que o disco do VPS faz.

---

## Antes de começar

**1. Dois domínios apontando para o IP do VPS.**

```
app.agilliza.com.br    A    <IP do VPS>
midia.agilliza.com.br  A    <IP do VPS>
```

São separados de propósito. Foto enviada por corretor é conteúdo de terceiro;
servi-la do mesmo domínio do sistema faria um arquivo malicioso rodar com
acesso aos cookies de sessão do corretor.

O DNS precisa estar propagado **antes** de subir a pilha: o Let's Encrypt valida
por DNS, e tentativa falhada conta no limite de emissão. Estourar o limite deixa
o site sem HTTPS por uma semana.

**2. Docker e Docker Compose no servidor.**

```bash
curl -fsSL https://get.docker.com | sh
```

**3. As migrações aplicadas no Supabase.** Em ordem, de `0001` a `0014`:

```bash
supabase link --project-ref cdwcvbrcwyvvpjaqydmq
supabase db push
```

---

## Configuração

```bash
git clone <o repositório> agilliza && cd agilliza
cp .env.example .env
```

Preencha o `.env`. Os que **não têm padrão** e sem os quais o sistema se recusa
a iniciar — de propósito, para não subir pela metade:

| Variável | Onde obter |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA` | mesma tela → publishable key |
| `SUPABASE_CHAVE_SERVICO` | mesma tela → **service_role**. Ignora a RLS por completo |
| `CHAVE_CRIPTOGRAFIA_SEGREDOS` | `openssl rand -base64 32` — exatos 32 bytes |
| `SEGREDO_SESSAO_PORTAL` | `openssl rand -base64 32` |
| `MIDIA_CHAVE_ACESSO` | invente: `openssl rand -hex 16` |
| `MIDIA_CHAVE_SECRETA` | invente: `openssl rand -base64 32` |
| `DOMINIO` / `DOMINIO_MIDIA` | os dois domínios acima |

As `MIDIA_CHAVE_*` viram usuário e senha do MinIO **e** a credencial que o
sistema usa para assinar. São a mesma coisa nos dois lugares.

A Homefin é opcional. Sem ela o sistema funciona: as simulações são criadas e a
estimativa é calculada localmente — a tela diz que é estimativa, e o botão de
envio aos bancos explica que a integração não está ligada.

```bash
chmod 600 .env
```

---

## Subir

```bash
docker compose up -d --build
```

O primeiro build leva alguns minutos. Depois:

```bash
docker compose ps           # todos devem estar "healthy"
docker compose logs -f caddy   # o certificado aparece aqui
curl https://app.agilliza.com.br/api/saude   # {"estado":"ok"}
```

---

## Criar o primeiro corretor

O sistema não tem cadastro aberto: conta se cria por convite, e o primeiro não
tem quem convide. Pelo painel do Supabase:

1. **Authentication → Users → Add user**, com e-mail e senha.
2. No **SQL Editor**, ligue esse usuário a uma conta:

```sql
-- Troque o e-mail e o nome da imobiliária.
with novo_tenant as (
  insert into public.tenants (nome, situacao)
  values ('Imobiliária do Fulano', 'ativo')
  returning id
)
insert into public.membros (tenant_id, usuario_id, papel)
select novo_tenant.id, u.id, 'proprietario'
from novo_tenant, auth.users u
where u.email = 'corretor@exemplo.com.br';
```

O perfil é criado por gatilho quando o usuário nasce; as etapas do funil também.

**Só o PRIMEIRO acesso precisa de SQL.** A partir daí, a equipe entra por convite:
em **Equipe → Convidar pessoa**, o sistema gera um link que o proprietário manda
por WhatsApp. Não há envio de e-mail, e é deliberado — ver o cabeçalho de
`src/dominio/convite.ts`.

Duas coisas a saber sobre o convite:

- **O link aparece uma vez só.** O banco guarda apenas o hash do token, para que
  um vazamento do banco não vire acesso. Quem fechar a tela sem copiar precisa
  revogar e convidar de novo.
- **Ele só funciona para o e-mail a quem foi feito.** Um link encaminhado por
  engano não dá acesso a mais ninguém.

---

## Quando der errado

### O envio de foto falha com erro de rede, e o console não explica

Quase certamente `MIDIA_ENDPOINT`. A assinatura SigV4 inclui o `host`, então a
URL de envio precisa ser assinada com o endereço que **o navegador** alcança —
não com `minio:9000`, que só existe dentro do Docker.

```bash
docker compose exec agilliza printenv | grep MIDIA_ENDPOINT
# MIDIA_ENDPOINT=https://midia.agilliza.com.br      <- o navegador usa este
# MIDIA_ENDPOINT_INTERNO=http://minio:9000          <- o servidor usa este
```

### O envio falha com 403 e "SignatureDoesNotMatch"

O `Host` foi reescrito no caminho. O Caddy preserva por padrão, e o `Caddyfile`
declara isso explicitamente. Se houver outro proxy na frente (Cloudflare em modo
proxy, por exemplo), ele pode estar reescrevendo.

### O envio falha com erro de CORS

`MINIO_API_CORS_ALLOW_ORIGIN` precisa ser exatamente a origem do sistema,
com esquema e sem barra final: `https://app.agilliza.com.br`.

### O Caddy não obtém certificado

```bash
docker compose logs caddy | grep -i "certificate\|acme\|error"
```

Ordem das causas: DNS não propagado; porta 80 bloqueada no firewall (o desafio
HTTP-01 precisa dela); limite de emissão estourado por tentativas anteriores.

### A aplicação sobe sem CSS nem JavaScript

O `.next/static` não foi copiado. É a linha mais fácil de perder ao mexer no
`Dockerfile` — o `standalone` do Next **não** inclui os estáticos.

### O contêiner reinicia sozinho em ciclo

```bash
docker compose logs agilliza --tail 50
```

Se a mensagem for `Variável de ambiente ausente: X`, é `ambiente.ts` se
recusando a subir pela metade. O nome da variável está na mensagem.

---

## Atualizar

```bash
git pull
docker compose up -d --build
```

Se houve migração nova, aplique **antes**:

```bash
supabase db push
npm run db:types    # e confira: npm run typecheck
```

O `db:types` preserva a seção escrita à mão do arquivo de tipos. Se ele avisar
que não encontrou a seção "APELIDOS DE DOMÍNIO", **não salve** o resultado.

---

## Cópia de segurança

O banco tem o backup do Supabase. A mídia, não — ela mora no volume do VPS:

```bash
docker run --rm \
  -v agilliza_midia:/dados:ro \
  -v /backup:/destino \
  alpine tar czf /destino/midia-$(date +%F).tar.gz -C /dados .
```

Vale agendar isso. Foto de imóvel perdida não se recupera: o corretor teria que
voltar ao imóvel e fotografar tudo de novo.
