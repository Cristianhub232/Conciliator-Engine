# F—03 Configuración del manifiesto de despliegue y de las variables de entorno del servicio

## 1. Resumen Ejecutivo y Estrategia de Despliegue

El sistema de conciliación bancaria y auditoría tributaria **SIRONT / Conciliator-Engine** cuenta con una arquitectura de despliegue híbrida y altamente adaptable a la infraestructura del SENIAT / ONT.

Para garantizar la portabilidad, el aislamiento y la continuidad operativa, la plataforma dispone de dos manifiestos de despliegue estándar:

1. **Despliegue Containerizado (Docker & Docker Compose)**: Recomendado para entornos de microservicios e integración continua (CI/CD), empaquetando backend y frontend en contenedores aislados de Linux Alpine sin dependencias del sistema operativo anfitrión.
2. **Despliegue Nativo PM2 (Procesos en Servidor Linux 189)**: Utilizado para ejecución directa en servidor físico o máquina virtual bare-metal gestionando hilos de Node.js con auto-restart y límites de memoria.

---

## 2. Dockerización de la Aplicación (Dockerfiles Multi-Stage)

Ambos componentes del sistema cuentan con manifiestos de construcción estandarizados bajo el principio de **construcción multietapa (Multi-Stage Builds)** para reducir el tamaño final de la imagen y garantizar la seguridad mediante usuarios no-root.

### 2.1. Backend API NestJS (`api_obtencion/Dockerfile`)

Construido sobre **Node 20 Alpine** en 2 etapas:
- **Etapa Builder**: Instala todas las dependencias (`npm ci`), compila TypeScript a JavaScript (`npm run build`) y elimina las dependencias de desarrollo (`npm prune --production`).
- **Etapa Runner**: Copia únicamente el código compilado (`dist/`) y las dependencias de producción, creando un usuario seguro `nestjs:nodejs` (UID 1001) para impedir la ejecución con permisos de superusuario (`root`).

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/
RUN npm run build
RUN npm prune --production

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3010

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

RUN touch auditoria.json && chown nestjs:nodejs auditoria.json

USER nestjs
EXPOSE 3010
CMD ["node", "dist/main.js"]
```

### 2.2. Frontend Next.js (`orquestador-ui/Dockerfile`)

Construido sobre **Node 20 Alpine** en 3 etapas:
- **Etapa Deps**: Descarga las librerías con soporte `libc6-compat`.
- **Etapa Builder**: Compila el bundle optimizado de Next.js (`.next/`).
- **Etapa Runner**: Ejecuta la interfaz web bajo el usuario seguro `nextjs:nodejs` en el puerto **3002**.

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 3002
CMD ["npm", "run", "start", "--", "-p", "3002", "-H", "0.0.0.0"]
```

---

## 3. Manifiesto de Orquestación (`docker-compose.yml`)

El archivo `docker-compose.yml` ubicado en la raíz del proyecto permite levantar la suite completa con una sola instrucción (`docker compose up -d --build`).

### Características Principales del Manifiesto:
1. **Comunicación entre Contenedores**: Red interna enlazada `ont_net` tipo `bridge`. El frontend consume la API usando el alias DNS de red `http://api_obtencion:3010`.
2. **Acceso a la Red del Servidor Anfitrión**: Configuración de `extra_hosts: ["host.docker.internal:host-gateway"]` para permitir que el backend dentro del contenedor se comunique con la base de datos Oracle DB en la red institucional.
3. **Persistencia de Auditoría**: Mapeo del volumen bind `./api_obtencion/auditoria.json:/app/auditoria.json` para evitar la pérdida de eventos de auditoría al reiniciar contenedores.

```yaml
services:
  # ---------------------------------------------------------
  # BACKEND: API de Conciliación, Auditoría y Conectores DB
  # ---------------------------------------------------------
  api_obtencion:
    build:
      context: ./api_obtencion
      dockerfile: Dockerfile
    container_name: ont_api_obtencion
    restart: unless-stopped
    ports:
      - "3010:3010"
    env_file:
      - ./api_obtencion/.env
    environment:
      - PORT=3010
      - NODE_ENV=production
    volumes:
      - ./api_obtencion/auditoria.json:/app/auditoria.json
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - ont_net

  # ---------------------------------------------------------
  # FRONTEND: Interfaz de Operador y Orquestador Web
  # ---------------------------------------------------------
  orquestador_ui:
    build:
      context: ./orquestador-ui
      dockerfile: Dockerfile
    container_name: ont_orquestador_ui
    restart: unless-stopped
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
      - API_BACKEND_URL=http://api_obtencion:3010
      - CATALOGO_API_URL=http://10.46.0.189:3000
    depends_on:
      - api_obtencion
    networks:
      - ont_net

networks:
  ont_net:
    driver: bridge
```

---

## 4. Manifiesto de Procesos PM2 (`ecosystem.config.js`)

Para servidores de producción que ejecutan directamente los procesos sobre Node.js en el sistema operativo host (ej. Servidor `10.46.0.189`), se incluye el manifiesto `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'ont-backend-api',
      cwd: './api_obtencion',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      }
    },
    {
      name: 'ont-frontend-ui',
      cwd: './orquestador-ui',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002 -H 0.0.0.0',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        API_BACKEND_URL: 'http://localhost:3010',
        CATALOGO_API_URL: 'http://10.46.0.189:3000'
      }
    }
  ]
};
```

---

## 5. Matriz e Inventario de Variables de Entorno (`.env`)

El sistema utiliza archivos `.env` independientes para el backend y el frontend, además de plantillas `.env.example` en la raíz del proyecto para auditoría de configuración.

### 5.1. Variables del Backend (`api_obtencion/.env`)

| Variable | Tipo | Requerido | Descripción | Ejemplo de Producción |
| :--- | :---: | :---: | :--- | :--- |
| `PORT` | Number | **Sí** | Puerto donde escucha la API HTTP NestJS | `3010` |
| `ORACLE_HOST` | String | **Sí** | IP del servidor de Base de Datos Oracle | `10.79.6.247` |
| `ORACLE_PORT` | Number | **Sí** | Puerto Listener de Oracle DB | `1521` |
| `ORACLE_SERVICE_NAME`| String | **Sí** | Nombre del Servicio u Oracle SID | `sige1` |
| `ORACLE_SID` | String | **Sí** | SID de la instancia Oracle | `sige1` |
| `ORACLE_USER` | String | **Sí** | Usuario con permisos en esquema `SIGE1` | `ONT_SIR_BOT` |
| `ORACLE_PASSWORD` | String | **Sí** | Contraseña cifrada en comillas dobles | `"bR4#mK9!7v"` |
| `PG_HOST` | String | **Sí** | IP del servidor PostgreSQL Data Lake | `10.78.30.63` |
| `PG_PORT` | Number | **Sí** | Puerto de conexión a PostgreSQL | `5432` |
| `PG_DATABASE` | String | **Sí** | Base de datos para depuración y audit | `xmls` |
| `PG_USER` | String | **Sí** | Usuario PostgreSQL | `ont` |
| `PG_PASSWORD` | String | **Sí** | Contraseña PostgreSQL | `"123456"` |
| `JWT_SECRET` | String | **Sí** | Clave secreta para firmar Tokens JWT | `"SIRONT_SECRET_KEY_2026_VENEZUELA"` |
| `JWT_EXPIRES_IN` | String | **Sí** | Tiempo de expiración del Token | `4h` |
| `TELEGRAM_BOT_TOKEN` | String | *No* | Token API para alertas Telegram Bot | `8981791125:AAEoDUv...` |
| `TELEGRAM_ALLOWED_USERS`| String | *No* | IDs de chat permitidos (separados por coma)| `5827228110` |
| `LLM_API_KEY` | String | *No* | API Key para asistente de Inteligencia Artificial | `sk-a7233b31a1b8...` |
| `LLM_BASE_URL` | String | *No* | Endpoint API del modelo LLM | `https://api.deepseek.com/v1` |
| `LLM_MODEL` | String | *No* | Identificador del modelo IA | `deepseek-chat` |

> [!CAUTION]
> **REGLA CRÍTICA DE SEGURIDAD PARA CONTRASEÑAS EN `.ENV`**:
> Toda contraseña que contenga caracteres especiales como `#`, `$`, `!`, `@`, `%` o espacios **DEBE ESTAR ENCERRADA OBLIGATORIAMENTE EN COMILLAS DOBLES** (`"..."`).
> De lo contrario, los parsers de variables de entorno (`dotenv`) cortarán el valor interpretando el carácter `#` como el inicio de un comentario en el archivo `.env`.

---

### 5.2. Variables del Frontend (`orquestador-ui/.env`)

| Variable | Tipo | Requerido | Descripción | Ejemplo de Producción |
| :--- | :---: | :---: | :--- | :--- |
| `NODE_ENV` | String | **Sí** | Entorno de ejecución (`production` / `development`) | `production` |
| `PORT` | Number | **Sí** | Puerto del servidor web Next.js | `3002` |
| `API_BACKEND_URL` | String | **Sí** | URL base para peticiones HTTP al backend NestJS | `http://localhost:3010` (o `http://api_obtencion:3010` en Docker) |
| `CATALOGO_API_URL` | String | **Sí** | URL del microservicio de Catálogos de Formas | `http://10.46.0.189:3000` |

---

## 6. Instrucciones de Ejecución y Despliegue

### 6.1. Despliegue con Docker Compose
```bash
# 1. Posicionarse en la raíz del proyecto
cd "/home/estacion/Escritorio/contexto y procesos ONT"

# 2. Levantar la pila de contenedores en segundo plano con recompilación
docker compose up -d --build

# 3. Verificar el estado de los contenedores
docker compose ps

# 4. Inspeccionar logs en tiempo real
docker compose logs -f api_obtencion
```

### 6.2. Despliegue Nativo con PM2
```bash
# 1. Compilar backend y frontend
./build_all.sh

# 2. Iniciar el gestor de procesos PM2 con el manifiesto
npx pm2 start ecosystem.config.js

# 3. Verificar el estado de los procesos
npx pm2 status
```
