# 📚 Guía de Instalación y Despliegue de Swagger UI (OpenAPI 3.0)

Documentación operacional para habilitar y redesplegar la interfaz interactiva de **Swagger API (OpenAPI 3.0)** en el servidor de producción **189** (`10.46.0.189`) y en cualquier entorno local o de desarrollo del sistema **SIRONT / Conciliator-Engine**.

---

## 📌 1. URL de Acceso a Swagger UI

Una vez iniciada la aplicación NestJS (`api_obtencion`), la documentación técnica e interactiva de endpoints estará lista en:

- **Localhost**: [http://localhost:3010/docs-api](http://localhost:3010/docs-api)
- **Servidor 189 (Red Institucional)**: [http://10.46.0.189:3010/docs-api](http://10.46.0.189:3010/docs-api)

---

## 🚀 2. Pasos para Redesplegar en Servidor Producción (189)

Cuando se suban cambios al repositorio de GitHub (`git push origin main`), para que la terminal del servidor 189 actualice el código, compile las anotaciones DTO y reinicie el servicio PM2, ejecuta la siguiente secuencia de comandos en la terminal de la 189:

```bash
# 1️⃣ Navegar al directorio raíz del proyecto
cd "/home/estacion/Escritorio/contexto y procesos ONT"

# 2️⃣ Descargar los últimos cambios del repositorio GitHub
git pull origin main

# 3️⃣ Entrar al directorio del microservicio Backend NestJS
cd api_obtencion

# 4️⃣ Asegurar las dependencias de Swagger compatibles con NestJS 11
npm install --legacy-peer-deps @nestjs/swagger@^11.0.0 swagger-ui-express

# 5️⃣ Compilar el backend NestJS (genera la carpeta dist/)
npm run build

# 6️⃣ Reiniciar el proceso backend en PM2
npx pm2 restart ont-backend-api

# 7️⃣ Verificar que el servicio esté online
npx pm2 status
```

---

## 🛠️ 3. Dependencias Requeridas

En `api_obtencion/package.json`, las versiones compatibles requeridas son:

```json
"dependencies": {
  "@nestjs/common": "^11.0.1",
  "@nestjs/core": "^11.0.1",
  "@nestjs/swagger": "^11.0.0",
  "swagger-ui-express": "^5.0.1"
}
```

> [!CAUTION]
> **Nota de Compatibilidad**:
> NestJS v11 requiere `@nestjs/swagger@^11.0.0`. **NO** instalar la versión 12 (`@nestjs/swagger@12`) ya que genera una incompatibilidad ESM/CJS (`SyntaxError: loadPackageSync`).

---

## ⚙️ 4. Configuración en el Código (`main.ts`)

En `api_obtencion/src/main.ts`, la inicialización de Swagger está configurada así:

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('SIRONT — API Backend de Conciliación y Auditoría ONT')
    .setDescription('Documentación técnica interactiva de los microservicios, endpoints y servicios de conciliación masiva, depuración, notas de crédito, usuarios y workflow de SIGECOF.')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('planillas', 'Gestión de planillas, conciliación masiva, depuración TXT y cierre de expedientes')
    .addTag('notas-credito', 'Auditoría y conciliación de Notas de Crédito Bancarias')
    .addTag('depuracion', 'Depuración manual y autorizada de planillas')
    .addTag('auditoria', 'Trazabilidad y consulta de registros de auditoría')
    .addTag('bancos', 'Catálogo centralizado de bancos e instituciones financieras')
    .addTag('formas-auditoria', 'Catálogo de formas tributarias e impuestos')
    .addTag('usuarios', 'Gestión de usuarios y analistas')
    .addTag('auth', 'Autenticación y tokens JWT')
    .addTag('bot-config', 'Configuración de Telegram Bot e IA')
    .addTag('configuracion', 'Conexión a Oracle DB y estado del sistema')
    .addTag('pipeline', 'Motor y pipeline de orquestación masiva')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs-api', app, document, {
    customSiteTitle: 'SIRONT API — Documentación Swagger',
  });

  await app.listen(3010, '0.0.0.0');
}
bootstrap();
```

---

## 🔍 5. Diagnóstico y Verificación Rápidos

Si el servidor 189 no responde en `/docs-api`:

1. **Verificar que la API responde**:
   ```bash
   curl -I http://localhost:3010/docs-api/
   # Respuesta esperada: HTTP/1.1 200 OK
   ```
2. **Revisar Logs de PM2**:
   ```bash
   npx pm2 logs ont-backend-api --lines 50
   ```
3. **Verificar Puerto Escuchando**:
   ```bash
   netstat -tuln | grep 3010
   # Debe mostrar 0.0.0.0:3010 LISTEN
   ```
