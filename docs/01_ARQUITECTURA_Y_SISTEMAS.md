# 01 — Arquitectura del Sistema y Ficha Técnica de Componentes

**Sistema:** Plataforma Integral de Conciliación y Auditoría Tributaria  
**Organismo:** Oficina Nacional del Tesoro (ONT) / ONCOP  
**Entorno:** Oracle Database 12c+ SIGECOF (Desarrollo y Certificación)  
**Versión:** 2.0 (Consolidada y Optimizada)

---

## 1. Visión General y Objetivos del Proyecto

El sistema automatiza el proceso manual que históricamente realizaban los transcriptores y analistas de la Oficina Nacional del Tesoro (ONT) dentro del ecosistema SIGECOF. 

### Objetivos Clave:
1. **Auto-Conciliación Inteligente:** Identificar planillas recaudadas por las entidades bancarias (almacenadas en `ORG_LIQ.TXT_SENIAT`), resolver su imputación presupuestaria mediante catálogos centralizados y registrarlas de forma atómica en las tablas oficiales `ORG_LIQ.PLANILLA` y `ORG_LIQ.DET_PLANILLA`.
2. **Depuración y Filtro Automático:** Ignorar o reportar formas tributarias excluidas o no registradas en SIGECOF (ej. Forma `99001`) sin detener el flujo masivo del lote.
3. **Alto Rendimiento y Transaccionalidad:** Ejecutar operaciones unitarias en $<20\text{ ms}$ y lotes masivos de cientos de planillas mediante Connection Pooling precalentado y validación de catálogos en RAM.
4. **Trazabilidad y Auditoría Continua:** Registrar cada inserción y reversión en archivos inmutables locales (`auditoria.json`) y tablas de trazabilidad de base de datos.

---

## 2. Topología de Arquitectura

```
                     ┌─────────────────────────────────────────┐
                     │    Navegador Web / Analista ONT         │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │   Orquestador UI (Next.js 16)           │
                     │   Puerto: 3002 | Proxy: /api/orquestador│
                     └──────────┬──────────────────┬───────────┘
                                │                  │
               (Mapeo Catálogos)│                  │(Consultas y Conciliación)
                                ▼                  ▼
┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│ Microservicio Catálogos ONT     │      │ API Conciliación (NestJS 10)    │
│ Host: 10.46.0.189:3000          │      │ Puerto: 3010                    │
│ Endpoint: /api/v1/formas/...    │      │ Driver: node-oracledb (Pool)    │
└─────────────────────────────────┘      └────────────────┬────────────────┘
                                                          │
                                                          ▼
                                         ┌─────────────────────────────────┐
                                         │ Oracle Database (SIGECOF)       │
                                         │ Host: 172.21.65.90:1521         │
                                         │ SID: cert_rep                   │
                                         │ Esquemas: ORG_LIQ, WFE_WORKFLOW │
                                         └─────────────────────────────────┘
```

---

## 3. Ficha Técnica de Componentes Desplegados

| Componente | Directorio en Workspace | Tecnología / Stack | Puerto Local | Función Principal |
|:---|:---|:---|:---|:---|
| **Orquestador UI (Unificado)** | [`orquestador-ui/`](file:///home/estacion/Escritorio/contexto%20y%20procesos%20ONT/orquestador-ui) | Next.js 16, React 19, TailwindCSS, Lucide Icons, Axios | `3002` | Plataforma unificada con Sidebar de 4 módulos: Conciliación Masiva, Auditoría de Transcriptores, Explorador de Expedientes y Visor de Logs. |
| **API Backend de Conciliación** | [`api_obtencion/`](file:///home/estacion/Escritorio/contexto%20y%20procesos%20ONT/api_obtencion) | NestJS 10, TypeScript, `node-oracledb` Thin Mode | `3010` | Motor transaccional ACID, Pool Oracle (max 20), asignación monotónica (`PLAN_SEQ`), endpoints de planillas y auditoría de `WFE_WORKFLOW`. |
| **Servicio de Catálogos Externo** | Remoto (`10.46.0.189`) | Node.js REST API | `3000` (Remoto) | Mapeo de códigos de forma tributaria hacia partidas presupuestarias únicas o vectores de prorrateo multipartida. |
| **Base de Datos Oracle** | Servidor `172.21.65.90:1521` | Oracle 12c/19c Enterprise (cert_rep) | `1521` | Repositorio central de esquemas `ORG_LIQ` (liquidación) y `WFE_WORKFLOW` (flujo de trabajo). |

---

## 4. Endpoints y Contratos de la API Backend (`api_obtencion`)

### 4.1 `GET /api/planillas/pendientes`
Consulta las planillas en `ORG_LIQ.TXT_SENIAT` que no han sido insertadas en `ORG_LIQ.PLANILLA` para una fecha y banco determinados.
- **Query Params:** `fecha` (YYYY-MM-DD), `banco` (código de 3 dígitos, ej. `105`), `limit` (opcional), `offset` (opcional).
- **Respuesta:**
  ```json
  {
    "status": 200,
    "total": 192,
    "data": [
      {
        "NRO_PLANILLA_FALTANTE": "2390579740",
        "FORMA": "99225",
        "MONTO_EFECTIVO": 16.00,
        "RIF": "V160887008",
        "BANCO": "105",
        "AGENCIA": "0800",
        "FECHA_RECAUDACION": "2024-04-15T00:00:00.000Z",
        "LOTE_ID": 53,
        "EXPEDIENTE": 7440,
        "LOTE_SEQ": 127758
      }
    ]
  }
  ```

### 4.2 `POST /api/planillas/conciliar`
Inserta una planilla individual de forma atómica y actualiza `TXT_SENIAT`.
- **Payload:**
  ```json
  {
    "usuario_operador": "BOT_ORQUESTADOR",
    "expediente": 7440,
    "lote_id": 53,
    "lote_seq": 127758,
    "planilla_id": "2390579740",
    "forma": "99225",
    "monto": 16.00,
    "banco": "105",
    "agencia": "0800",
    "fecha_recaudacion": "2024-04-15",
    "asignaciones": [
      { "partida": "301010200", "monto": 16.00 }
    ]
  }
  ```

### 4.3 `POST /api/planillas/conciliar-lote`
Procesa un arreglo de planillas reutilizando una **única conexión del Connection Pool**, garantizando orden correlativo secuencial y máximo rendimiento.
- **Payload:** `{ "planillas": [ ... ] }`
- **Respuesta:** `{ "total": 2, "exitosas": 2, "fallidas": 0, "tiempo_total_ms": 2230, "resultados": [ ... ] }`

### 4.4 `POST /api/planillas/revertir`
Elimina los registros en `DET_PLANILLA` y `PLANILLA`, restaurando `TXT_SENIAT` a su estado original (`ESTADO = NULL`, `PLAN_SEQ = NULL`).
- **Payload:**
  ```json
  {
    "usuario_operador": "BOT_ORQUESTADOR",
    "planilla_id": "2390651288",
    "banco": "105",
    "fecha_recaudacion": "2024-04-15"
  }
  ```

### 4.5 Endpoints de Auditoría y Flujo (`WFE_WORKFLOW`)
- `GET /api/auditoria/transcriptor?usuario=:user&anho=:year`: Consulta perfil y expedientes en bandeja del analista.
- `GET /api/auditoria/expediente/:id?anho=:year`: Inspección profunda de lotes y planillas de un expediente.
- `GET /api/auditoria/lote/:id?anho=:year`: Detalle individual de planillas del lote.
- `GET /api/auditoria/eventos?limit=:num`: Lectura en tiempo real de `auditoria.json`.

### 4.6 Endpoints de Gestión de Entorno y Reconexión Dinámica (`.env`)
- `GET /api/configuracion/env`: Retorna los parámetros activos y perfiles preconfigurados (Desarrollo vs Producción).
- `POST /api/configuracion/test`: Ejecuta un test de ping de conectividad con cálculo de latencia y versión de Oracle sin alterar el pool.
- `POST /api/configuracion/save`: Persiste las nuevas credenciales en `api_obtencion/.env` y reconecta en caliente el pool de conexiones de Oracle (`DatabaseService.reconnectPool`).

### 4.7 Endpoints de Autenticación y Control de Usuarios (PostgreSQL `motor_app`)
- `POST /api/auth/login`: Autenticación con email y contraseña hasheada (bcrypt). Retorna JWT token y objeto usuario.
- `GET /api/auth/me`: Verificación de token activo y obtención del perfil de usuario autenticado.
- `POST /api/auth/logout`: Registro de salida de sesión en auditoría.
- `GET /api/usuarios`: Listado de usuarios con filtros de búsqueda (`search`, `rol`, `estado`).
- `GET /api/usuarios/:id`: Detalle específico de un usuario.
- `POST /api/usuarios`: Registro de nuevo usuario con hashing de contraseña.
- `PUT /api/usuarios/:id`: Actualización de datos, cambio de rol, activación/desactivación o reseteo de clave.
- `DELETE /api/usuarios/:id`: Eliminación controlada de cuentas de usuario.

### 4.8 Endpoints de Depuración Controlada de Formas (`motor_app` & `ORG_LIQ.TXT_SENIAT`)
- `GET /api/depuracion/formas`: Consulta catálogo de formas configuradas para depuración (`79984`, `99008`, `00084`, `79084`, `84`, `99001`).
- `POST /api/depuracion/formas`: Registra un nuevo código de forma en el catálogo de depuración.
- `PATCH /api/depuracion/formas/:id/estado`: Activa o pausa una forma en el control de depuración.
- `DELETE /api/depuracion/formas/:id`: Elimina un código de forma del catálogo de depuración.
- `GET /api/depuracion/scan?fecha=...&banco=...`: Escanea Oracle `TXT_SENIAT` para detectar planillas pendientes con formas a depurar.
- `POST /api/depuracion/ejecutar`: Ejecuta la eliminación física atómica de los registros en `TXT_SENIAT` bajo validación de contraseña de usuario autorizador y registra la auditoría legal en `motor_app.depuracion_audit`.
- `GET /api/depuracion/historial`: Consulta la bitácora histórica de procesos de depuración ejecutados con desglose de registros.

---

## 5. Integración con el Motor de Flujo (`WFE_WORKFLOW`)

En el ecosistema SIGECOF, los expedientes asignados a los transcriptores interactúan con el esquema de workflow:
- **`WFE_WORKFLOW.WF_USERS`:** Catálogo de usuarios y analistas autorizados.
- **`WFE_WORKFLOW.WF_WORK_ITEM`:** Tareas asociadas a los expedientes. Estados: `PENDIENTE`, `ABIERTA`, `CERRADA`.
- **`WFE_WORKFLOW.WF_AUDITORIA` / `WF_AUDITA_EXPEDIENTES`:** Tablas inmutables de auditoría que registran fecha, hora y usuario que operó cada expediente.

---

## 6. Comandos Operativos de Gestión

```bash
# Iniciar API Backend en segundo plano (Puerto 3010)
cd "api_obtencion"
npm run start

# Iniciar Frontend Orquestador UI (Puerto 3002)
cd "orquestador-ui"
npm run dev -- -p 3002
```
