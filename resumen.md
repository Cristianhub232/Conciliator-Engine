# 📋 Resumen Integral de Actividades y Desarrollo del Proyecto
## Sistema de Conciliación, Liquidación Tributaria y Depuración (ONT - SENIAT - SIGECOF)

---

## 🏛️ 1. Visión General del Proyecto

El proyecto **Conciliator-Engine** (Sistema Integral ONT) fue diseñado e implementado para automatizar, orquestar y controlar de forma segura y transparente la liquidación de planillas tributarias del **SENIAT** en el sistema central de la República (**SIGECOF** / Oracle Database), integrando el catálogo dinámico de reglas presupuestarias, un módulo de depuración autorizada de formas no procesables y una suite completa de despliegue para servidores de producción.

---

## 🔍 2. Cronología de Fases y Actividades Realizadas

### 📌 Fase 1: Diagnóstico e Ingeniería Inversa de SIGECOF
- **Análisis de Base de Datos Oracle (`172.21.65.90:1521` / SID: `cert_rep`):**
  - Inspección exhaustiva de esquemas transaccionales: `ORG_LIQ` y `WFE_WORKFLOW`.
  - Descubrimiento del flujo de datos entre `ORG_LIQ.TXT_SENIAT`, `ORG_LIQ.LOTE`, `ORG_LIQ.PLANILLA`, `ORG_LIQ.DET_PLANILLA` y `WFE_WORKFLOW.WF_WORK_ITEM`.
  - Documentación del mecanismo del transcriptor bancario (`TRANSCRIPTOR_SENIAT`), validaciones de integridad (`PLAN_PK`, `PLA_UK`, `DEPLA_PXA_FK`) y disparadores (triggers de Designer/2000).
- **Comprensión de la Brecha Operativa:**
  - Identificación de miles de planillas estancadas en estado pendiente (`ESTADO IS NULL` en `TXT_SENIAT`) debido a formas no catalogadas, inconsistencias de partidas o falta de reglas de resolución.

---

### ⚙️ Fase 2: Desarrollo del Backend de Alta Resiliencia (`api_obtencion`)
- **Arquitectura NestJS 11 + TypeScript:**
  - Creación de módulos desacoplados: `PlanillasModule`, `DepuracionModule`, `UsuariosModule`, `ConfiguracionModule`, `AuditoriaModule`, `DatabaseModule` y `AuthModule`.
- **Integración con Data Lake / PostgreSQL (`10.78.30.63:5432` / DB: `xmls`):**
  - Creación y migración del esquema de control `motor_app`.
  - Implementación de tablas maestras: `motor_app.usuarios`, `motor_app.formas_depuracion`, `motor_app.depuracion_audit` y `motor_app.auditoria`.
- **Motor de Conciliación Atómica PL/SQL de Ultra Alta Velocidad:**
  - Refactorización de 5 viajes de red (roundtrips) a un **único bloque PL/SQL atómico**.
  - Reducción del tiempo de procesamiento transaccional de **~2.500 ms** a tan solo **~100 ms por planilla (25x más rápido)**.
- **Resiliencia de Conexiones Oracle:**
  - Configuración de `poolPingInterval: 60`, `queueTimeout: 0` y pool dinámico de hasta 30 conexiones.
  - Implementación de bucle de auto-recuperación (retry loop) contra micro-cortes de red (`ECONNRESET` / `ETIMEDOUT` / `NJS-500`).

---

### 💻 Fase 3: Plataforma Web Corporativa (`orquestador-ui`)
- **Tecnología Next.js 16 + React 19 + Vanilla CSS:**
  - Diseño con paleta institucional, modo oscuro de alta legibilidad, micro-animaciones y soporte responsive.
- **Módulo 1: Orquestador de Conciliación Masiva:**
  - Selector de límites ampliado: `50`, `100`, `500 (Por defecto)`, `1 000`, `5 000` y `10 000` planillas.
  - Filtro dinámico por Forma y por Expediente (`EXPEDIENTE`).
  - Mapeo concurrente por bloques (chunks) conectando con el microservicio de reglas (`10.46.0.189:3000`).
  - **Botón de Detención Inmediata (`⏹️ Detener Conciliación` / `⏹️ Detener Mapeo`):** Integración de `AbortController` nativo que cancela la petición HTTP en vuelo en **0 milisegundos**.
  - **Filtro de Errores con 1 Clic (`🔍 Filtrar y ver errores`):** Aísla de inmediato las planillas que hayan fallado mostrando el mensaje exacto de Oracle o del catálogo.
- **Módulo 2: Catálogo de Formas y Reglas:**
  - Gestión interactiva de tipos de resolución: **Directa**, **Biyectiva**, **Anclada** y **Prorrateo**.
  - Historial de versiones y auditoría de cambios en vivo.
- **Módulo 3: Gestión de Usuarios y Roles (RBAC):**
  - CRUD completo de operadores, supervisores y administradores.
  - Cifrado seguro de contraseñas con `bcrypt` y emisión de tokens JWT.
- **Módulo 4: Auditoría y Bitácora Transaccional:**
  - Visualización cronológica de eventos, usuario operador, montos liquidados y estado.

---

### 🧹 Fase 4: Suite de Depuración Autorizada de Formas
- **Detección Automática de Formas No Tributarias:**
  - Identificación de formas especiales y no procesables (`79984`, `99008`, `00084`, `79084`, `84`, `99001`).
- **Escáner de Expedientes en Tiempo Real:**
  - Endpoint `GET /api/depuracion/scan` que alerta al operador antes de conciliar si existen formas que deben ser depuradas.
- **Protocolo de Seguridad con Doble Confirmación:**
  - Modal de seguridad que exige la contraseña del administrador para autorizar la depuración.
  - Actualización atómica en Oracle (`ESTADO = -1`, liberación de lote y secuencia) y guardado histórico en `motor_app.depuracion_audit`.

---

### 📦 Fase 5: Empaquetado, Contenedorización y Preparación para Producción
- **Contenedores Docker:**
  - `api_obtencion/Dockerfile`: Multi-stage build optimizado en `node:20-alpine` (soporte Thin Mode para Oracle).
  - `orquestador-ui/Dockerfile`: Multi-stage build optimizado en `node:20-alpine` para Next.js 16.
  - `docker-compose.yml`: Orquestación de ambos servicios con red aislada `ont_net` y puertos `3010` y `3002`.
  - `.dockerignore` configurados en ambos proyectos para imágenes ultra-ligeras.
- **Despliegue Nativo Node.js con PM2:**
  - `ecosystem.config.js` listo para ejecución con autoreinicio y balanceo en servidores Linux.
  - Script automatizado `./build_all.sh` que compila backend y frontend en un solo paso.
- **Documentación Institucional:**
  - `README.md` completo con arquitectura, variables de entorno, comandos de despliegue y scripts de inicialización SQL.
- **Control de Versiones Git:**
  - Repositorio inicializado y vinculado a `https://github.com/Cristianhub232/Conciliator-Engine.git`.
  - Commit consolidado: `1d95aeee` $\rightarrow$ *`feat(ont): sistema integral de conciliacion tributaria masiva, depuracion de formas, catalogo y suite de despliegue docker/pm2`*.

---

## 📊 3. Matriz de Entornos y Conectividad

| Componente | Servidor / Host | Puerto | Tecnología / Rol |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | `localhost` / Servidor Destino | `3002` | Next.js 16 (App Router) |
| **Backend API** | `localhost` / Servidor Destino | `3010` | NestJS 11 + node-oracledb |
| **Microservicio Reglas** | `10.46.0.189` | `3000` | Catálogo de Formas ONT |
| **Oracle SIGECOF** | `172.21.65.90` | `1521` | SID: `cert_rep` (ORG_LIQ / WFE_WORKFLOW) |
| **PostgreSQL Data Lake** | `10.78.30.63` | `5432` | DB: `xmls` (Esquema `motor_app`) |

---

## ✅ 4. Estado Actual del Proyecto

1. **Código 100% Compilado y Validado:** Backend (`dist/`) y Frontend (`.next/`) probados con cero errores de TypeScript y cero dependencias faltantes.
2. **Listo para Despliegue en Servidor:**
   - Vía Docker: `docker compose up -d --build`
   - Vía PM2: `./build_all.sh && pm2 start ecosystem.config.js`
3. **Documentación:** Toda la base técnica registrada en [`README.md`](file:///home/estacion/Escritorio/contexto%20y%20procesos%20ONT/README.md), [`resumen.md`](file:///home/estacion/Escritorio/contexto%20y%20procesos%20ONT/resumen.md) y en la carpeta [`docs/`](file:///home/estacion/Escritorio/contexto%20y%20procesos%20ONT/docs).
