# =============================================================================
# CONSOLE DA PLATAFORMA — imagem de produção
#
# Imagem SEPARADA do sistema do corretor, de propósito. Ela não tem o código do
# corretor, não tem as dependências de mídia, não tem o cliente da Homefin.
# Uma vulnerabilidade numa biblioteca que só o corretor usa não alcança o
# console, porque ela não está aqui.
# =============================================================================

FROM node:22-alpine AS dependencias
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS construtor
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .

# Só o que é público por definição entra como argumento de build. Repare no que
# NÃO está aqui: a chave de serviço. O console lê pela RLS, com a identidade do
# próprio administrador — ele não tem credencial que ignore o banco.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA=$NEXT_PUBLIC_SUPABASE_CHAVE_PUBLICA

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS producao
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs console

COPY --from=construtor --chown=console:nodejs /app/.next/standalone ./
COPY --from=construtor --chown=console:nodejs /app/.next/static ./.next/static

USER console
EXPOSE 3100

# O console não tem rota pública de saúde — ela seria mais uma porta a sondar.
# A verificação usa a tela de entrada, que existe de qualquer forma.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/entrar').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
