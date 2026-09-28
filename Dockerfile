# =============================================================================
# AGILLIZA — imagem de produção
#
# Três estágios, e cada um existe para deixar a imagem final menor:
#
#   dependencias — instala tudo, inclusive o de desenvolvimento
#   construtor   — compila o Next
#   producao     — recebe SÓ o resultado da compilação
#
# A imagem final não tem `node_modules` completo, não tem código-fonte e não
# tem TypeScript. Sai perto de 200 MB em vez de 1,5 GB. Num VPS, isso é a
# diferença entre um deploy de trinta segundos e um de cinco minutos.
#
# `output: 'standalone'` no next.config.ts é o que torna isso possível: o Next
# monta uma pasta com o servidor e apenas as dependências que ele de fato usa.
# =============================================================================

# -----------------------------------------------------------------------------
FROM node:22-alpine AS dependencias
WORKDIR /app

# `libc6-compat` porque alguns binários nativos esperam glibc e o Alpine usa
# musl. Sem isso, o build quebra com "Error loading shared library".
RUN apk add --no-cache libc6-compat

# Só os manifestos primeiro: enquanto eles não mudam, o Docker reaproveita esta
# camada e pula a instalação inteira. Copiar o código antes jogaria fora o
# cache a cada linha alterada.
COPY package.json package-lock.json ./
RUN npm ci

# -----------------------------------------------------------------------------
FROM node:22-alpine AS construtor
WORKDIR /app

COPY --from=dependencias /app/node_modules ./node_modules
COPY . .

# As variáveis `NEXT_PUBLIC_` são embutidas no JavaScript do navegador em tempo
# de COMPILAÇÃO — não adianta defini-las só no `docker run`. Por isso elas
# entram como argumento de build.
#
# Aqui só entra o que é público por definição: a URL do projeto e a chave
# publicável, que é protegida por RLS. Segredo NUNCA vira ARG: ele fica no
# histórico de camadas da imagem, legível por quem tiver o arquivo.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA
ARG NEXT_PUBLIC_URL_APP

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA=$NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA
ENV NEXT_PUBLIC_URL_APP=$NEXT_PUBLIC_URL_APP

# Valores de fachada só para a compilação passar. `ambiente.ts` exige que estas
# existam, e elas são lidas de verdade em tempo de execução, do ambiente do
# contêiner. A chave de criptografia precisa ter 32 bytes em base64 porque a
# validação confere o tamanho.
ENV SUPABASE_CHAVE_SERVICO=apenas-para-compilar
ENV CHAVE_CRIPTOGRAFIA_SEGREDOS=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
ENV SEGREDO_SESSAO_PORTAL=apenas-para-compilar

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# -----------------------------------------------------------------------------
FROM node:22-alpine AS producao
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuário sem privilégio. Um processo web rodando como root transforma qualquer
# execução remota de código em controle total da máquina.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs agilliza

COPY --from=construtor /app/public ./public

# O `standalone` já traz o servidor e as dependências necessárias. O `static`
# vai à parte porque o Next não o inclui — e sem ele a aplicação sobe sem CSS
# nem JavaScript, o que parece um erro de rede e não de empacotamento.
COPY --from=construtor --chown=agilliza:nodejs /app/.next/standalone ./
COPY --from=construtor --chown=agilliza:nodejs /app/.next/static ./.next/static

USER agilliza
EXPOSE 3000

# O orquestrador precisa saber se o processo está VIVO, e não só se a porta
# está aberta: um Node travado continua aceitando conexão e nunca responde.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/saude').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
