# ==============================================================================
# LuwiFinance — Dockerfile Multiplataforma & Ultra-Leve (Alpine Linux)
# ==============================================================================
FROM node:20-alpine AS base

# Define o diretório de trabalho seguro dentro do container
WORKDIR /app

# Define ambiente de produção
ENV NODE_ENV=production
ENV PORT=3000

# Copia as definições do projeto
COPY package.json ./

# Copia os arquivos da aplicação
COPY server.js ./
COPY index.html ./
COPY manifest.json ./
COPY sw.js ./
COPY icons/ ./icons/
COPY src/ ./src/

# Ajusta permissões para usuário seguro não-root (node)
RUN chown -R node:node /app

# Utiliza usuário não-root para máxima segurança
USER node

# Expõe a porta padrão da aplicação
EXPOSE 3000

# Healthcheck para monitorar integridade do container
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Comando de inicialização
CMD ["node", "server.js"]
