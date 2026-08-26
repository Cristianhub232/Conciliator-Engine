# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/
RUN npm run build

# Eliminar dependencias de desarrollo
RUN npm prune --production

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3010

# Crear usuario seguro sin privilegios de root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copiar dependencias de producción y build compilado
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Directorio para persistencia de auditoría JSON
RUN touch auditoria.json && chown nestjs:nodejs auditoria.json

USER nestjs

EXPOSE 3010

CMD ["node", "dist/main.js"]
