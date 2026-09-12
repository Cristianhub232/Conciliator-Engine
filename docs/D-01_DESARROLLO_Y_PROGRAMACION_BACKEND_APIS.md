# D—01 Desarrollo y programación backend de cada uno de los microservicios/APIs diseñados

## 1. Resumen Ejecutivo y Arquitectura Backend

El sistema de conciliación bancaria y auditoría tributaria **SIRONT / Conciliator-Engine** cuenta con un backend robusto basado en **NestJS v11**, desarrollado con TypeScript y empaquetado bajo arquitectura modular de microservicios e interfaces RESTful.

El servicio principal (`api_obtencion`) corre en el **Puerto 3010** en entorno de producción/desarrollo gestionado por PM2 (`ont-backend-api`) e interactúa directamente con:
1. **Base de Datos Oracle (`sige1`)**: Tablas transaccionales del sistema presupuestario `SIGECOF` (`BCO_BANCO`, `REC_LOTE_PLANILLA`, `REC_PLANILLA`, `REC_DETALLE_PLANILLA`, `REC_MOVIMIENTO_BANCO`, `WFE_WORKFLOW`, `WFE_HISTORIA`).
2. **Base de Datos PostgreSQL (`xmls` / `motor_app`)**: Data Lake de planillas decodificadas, registros de auditoría institucional y depuración manual.

---

## 2. Disponibilidad de Documentación Interactiva Swagger (OpenAPI 3.0)

> [!IMPORTANT]
> **¿Tenemos Swagger disponible? ¡SÍ!**  
> La interfaz interactiva de Swagger OpenAPI 3.0 está completamente implementada y desplegada en la API backend.
> 
> - **URL de Acceso Directo**: `http://localhost:3010/docs-api` (o `http://10.46.0.189:3010/docs-api`)
> - **Título**: SIRONT — API Backend de Conciliación y Auditoría ONT
> - **Formato**: OpenAPI 3.0 con soporte para autenticación `Bearer JWT` e inspección de DTOs de entrada/salida.

---

## 3. Catálogo Detallado de Microservicios y Endpoints

### 3.1. Microservicio de Planillas y Conciliación Masiva (`/api/planillas`)

Gestiona la consulta, conciliación atómica, conciliación por lotes, depuración de registros en TXT bancario, consulta de analistas revisores y cierre formal de expedientes.

#### 1. `GET /api/planillas/pendientes`
- **Descripción**: Obtiene la lista de planillas pendientes de conciliación filtradas por fecha, banco, estado de asignación y expediente.
- **Query Parameters**:
  - `fecha` *(string, requerido)*: Fecha en formato `YYYY-MM-DD`.
  - `banco` *(string, requerido)*: Código de banco (3 o 4 dígitos, ej: `007` o `0007`).
  - `estado_asignacion` *(string, opcional)*: `'ASIGNADAS'` | `'HUERFANAS'`.
  - `expediente` *(string, opcional)*: Número de expediente en Oracle.
  - `lote_id` *(number, opcional)*: ID del lote.
  - `limit` *(number, opcional, default: 1000)*: Límite de registros.
  - `offset` *(number, opcional, default: 0)*: Desplazamiento.
- **Respuesta Ejemplo (200 OK)**:
```json
{
  "data": [
    {
      "planilla_id": 10524,
      "lote_id": 842,
      "lote_seq": 14,
      "expediente": "EXP-2024-0012",
      "forma": "99044",
      "monto": 1500.50,
      "banco": "007",
      "fecha_recaudacion": "2024-05-15"
    }
  ],
  "pagination": { "limit": 1000, "offset": 0, "count": 1 }
}
```

#### 2. `POST /api/planillas/conciliar`
- **Descripción**: Realiza la conciliación atómica de una planilla individual contra sus movimientos bancarios asociados.
- **Request Body (JSON)**:
```json
{
  "usuario_operador": "MAIRA_0018",
  "expediente": "EXP-2024-0012",
  "lote_id": 842,
  "lote_seq": 14,
  "planilla_id": 10524,
  "forma": "99044",
  "monto": 1500.50,
  "banco": "007",
  "agencia": "001",
  "fecha_recaudacion": "2024-05-15",
  "asignaciones": [
    { "movimiento_id": 99421, "monto_asignado": 1500.50 }
  ]
}
```
- **Respuesta Ejemplo (200 OK)**:
```json
{
  "success": true,
  "message": "Planilla 10524 conciliada exitosamente",
  "conciliacion_id": "CONC-9982"
}
```

#### 3. `POST /api/planillas/conciliar-lote`
- **Descripción**: Procesa la conciliación automática masiva de un conjunto de planillas dentro de una misma transacción.
- **Request Body**: `{ "planillas": [ ConciliarPayload, ... ] }`
- **Respuesta (200 OK)**: Objeto con estadísticas de planillas conciliadas con éxito y fallidos.

#### 4. `POST /api/planillas/revertir`
- **Descripción**: Revierte la conciliación realizada sobre una planilla, liberando los movimientos bancarios y devolviendo el registro a estado pendiente.
- **Request Body**:
```json
{
  "usuario_operador": "ADMIN_ONT",
  "planilla_id": 10524,
  "banco": "007",
  "fecha_recaudacion": "2024-05-15",
  "motivo": "Reversión por ajuste presupuestario"
}
```

#### 5. `POST /api/planillas/lotes/:loteSeq/verificar-cierre`
- **Descripción**: Evalúa si todas las planillas del lote `loteSeq` están conciliadas y ejecuta la actualización de estado a cerrado (`'V'`).
- **URL Params**: `loteSeq` *(number)*
- **Query Params**: `anho` *(number, default: año actual)*
- **Request Body**: `{ "usuario_operador": "BOT_ORQUESTADOR" }`

#### 6. `GET /api/planillas/detectar-atributos-null`
- **Descripción**: Identifica planillas con atributos críticos en `NULL` (ej. Forma 99044 sin Nro de Planilla o con incongruencia de seriales).
- **Query Params**: `fecha` *(requerido)*, `banco` *(requerido)*, `expediente` *(opcional)*, `lote_id` *(opcional)*.

#### 7. `GET /api/planillas/duplicados-txt`
- **Descripción**: Analiza el Data Lake de PostgreSQL para ubicar líneas TXT bancarias duplicadas antes de proceder a la conciliación.
- **Query Params**: `fecha` *(requerido)*, `banco` *(opcional)*.

#### 8. `POST /api/planillas/conciliar-especiales`
- **Descripción**: Realiza la conciliación de planillas especiales o con reglas de negocio atípicas.
- **Request Body**: `ConciliarEspecialesDto`

#### 9. `POST /api/planillas/depurar-duplicados-txt`
- **Descripción**: Ejecuta la depuración masiva automatizada de registros duplicados presentes en archivos TXT de recaudación bancaria.
- **Request Body**: `DepurarDuplicadosTxtDto`

#### 10. `GET /api/planillas/analistas-revisores`
- **Descripción**: Devuelve la lista de usuarios autorizados con rol de revisor/validador (`MAIRA_0018`, `TIBISAYRIVAS`, `EXDYMEDINA`, etc.) para asignación de expedientes.
- **Respuesta (200 OK)**:
```json
{
  "success": true,
  "analistas": [
    { "usuario": "MAIRA_0018", "nombre": "Maira", "apellido": "Rodríguez", "rol": "REVISOR" },
    { "usuario": "TIBISAYRIVAS", "nombre": "Tibisay", "apellido": "Rivas", "rol": "REVISOR" }
  ]
}
```

#### 11. `POST /api/planillas/cerrar-expediente`
- **Descripción**: Realiza el cierre formal del expediente en Oracle `WFE_WORKFLOW` y reasigna el expediente al analista revisor seleccionado en la siguiente fase operativa.
- **Request Body**:
```json
{
  "expediente": "EXP-2024-0012",
  "banco": "007",
  "fecha": "2024-05-15",
  "analista_asignado": "TIBISAYRIVAS",
  "usuario_operador": "ADMIN_ONT"
}
```
- **Respuesta (200 OK)**:
```json
{
  "success": true,
  "expediente": "EXP-2024-0012",
  "estado": "CERRADO_Y_REASIGNADO",
  "analista_asignado": "TIBISAYRIVAS",
  "mensaje": "Expediente EXP-2024-0012 cerrado exitosamente y reasignado a TIBISAYRIVAS"
}
```

---

### 3.2. Microservicio de Depuración Manual y Autorizada (`/api/depuracion`)

Permite gestionar la depuración autorizada de planillas en PostgreSQL (`motor_app`) con doble factor de clave de autorización e historial de auditoría.

- `GET /api/depuracion/formas`: Consulta la lista de formas tributarias configuradas para depuración.
- `POST /api/depuracion/formas`: Registra una nueva forma en el catálogo de depuración. Body: `{ cod_forma, descripcion, motivo }`.
- `PATCH /api/depuracion/formas/:id/estado`: Activa o inhabilita una regla de depuración por forma. Body: `{ estado }`.
- `DELETE /api/depuracion/formas/:id`: Elimina una forma configurada del módulo de depuración.
- `GET /api/depuracion/scan`: Escanea lotes e identifica planillas candidatas a depuración. Query: `fecha`, `banco`, `expediente`.
- `POST /api/depuracion/ejecutar`: Ejecuta la depuración segura requiriendo clave de autorización. Body: `EjecutarDepuracionDto`.
- `GET /api/depuracion/historial`: Retorna el registro de auditoría de todas las depuraciones ejecutadas en el sistema.

---

### 3.3. Microservicio de Auditoría y Notas de Crédito (`/api/notas-credito`)

Proporciona la auditoría de Notas de Crédito Bancarias vs planillas transcritas vs montos reportados en archivos TXT por las entidades financieras.

- `GET /api/notas-credito/bancos`: Devuelve el catálogo de bancos que registran movimiento de Notas de Crédito.
- `GET /api/notas-credito`: Consulta el listado comparativo de Notas de Crédito por fecha, banco y expediente. Query: `fecha`, `banco`, `expediente`.
- `GET /api/notas-credito/:codigo`: Muestra el detalle específico y desglose de planillas asociadas a la Nota de Crédito `:codigo`.

---

### 3.4. Microservicio de Auditoría Institucional (`/api/auditoria`)

- `GET /api/auditoria/transcriptor`: Trae las métricas de planillas transcritas y conciliadas por un operador en un año determinado. Query: `usuario` *(requerido)*, `anho` *(opcional, default 2024)*.
- `GET /api/auditoria/expediente/:id`: Consulta la trazabilidad histórica completa de un expediente en `WFE_HISTORIA` y `motor_app`.
- `GET /api/auditoria/lote/:id`: Muestra la auditoría detallada de un lote presupuestario `:id`.
- `GET /api/auditoria/eventos`: Retorna el registro de logs JSON de eventos del sistema. Query: `limit`.

---

### 3.5. Microservicio de Autenticación y JWT (`/api/auth`)

- `POST /api/auth/login`: Autentica al usuario contra la base de datos PostgreSQL, genera token JWT cifrado y registra la sesión con IP y User-Agent. Body: `{ email, password }`.
- `GET /api/auth/me`: Verifica el token Bearer JWT enviado en la cabecera `Authorization` y retorna los datos del perfil activo.
- `POST /api/auth/logout`: Invalida la sesión actual del usuario.

---

### 3.6. Microservicio de Gestión de Usuarios (`/api/usuarios`)

- `GET /api/usuarios`: Consulta el listado de usuarios con filtros por búsqueda, rol y estado.
- `GET /api/usuarios/:id`: Obtiene los datos detallados del usuario por su ID primario.
- `POST /api/usuarios`: Crea un nuevo usuario operador/analista en el sistema.
- `PUT /api/usuarios/:id`: Modifica roles, nombres, o clave de un usuario existente.
- `DELETE /api/usuarios/:id`: Desactiva o elimina un usuario de la plataforma.

---

### 3.7. Microservicio de Bot Telegram e Inteligencia Artificial (`/api/bot-config`)

- `GET /api/bot-config`: Lee la configuración actual del Bot Telegram y credenciales de IA.
- `POST /api/bot-config`: Guarda la configuración operativa y token de Telegram.
- `POST /api/bot-config/test-telegram`: Realiza un envío de prueba para verificar conectividad con Telegram Bot API.
- `POST /api/bot-config/test-ia`: Prueba la conexión con proveedores de IA (DeepSeek, Anthropic, Google Gemini).

---

### 3.8. Microservicio de Estado y Configuración de DB (`/api/configuracion`)

- `GET /api/configuracion/env`: Consulta las variables de entorno activas y estado del pool Oracle DB.
- `POST /api/configuracion/test`: Valida credenciales y conectividad con Oracle `sige1` sin aplicar cambios.
- `POST /api/configuracion/save`: Guarda los parámetros de conexión y reinicia dinámicamente el Pool de conexiones de Oracle.

---

### 3.9. Microservicio de Pipeline de Orquestación (`/api/pipeline`)

- `GET /api/pipeline/estado`: Indica si existe una tarea de conciliación masiva en ejecución en background.
- `POST /api/pipeline/detener`: Envía señal de parada segura al motor de conciliación.
- `POST /api/pipeline/conciliar`: Inicia la ejecución secuencial del pipeline de conciliación por banco y rango de fechas.

---

## 4. Endpoints de Catálogos y Servicios Externos

### 4.1. Catálogo Centralizado de Bancos (`/api/bancos`)

Este microservicio se encarga de la **normalización de códigos bancarios de 3 y 4 dígitos** (ej. transformar `'0007'` en `'007'`) para mantener la integridad referencial con las tablas de Oracle `SIGECOF` (`BCO_BANCO`).

- `GET /api/bancos`: Devuelve el catálogo completo de bancos e instituciones financieras homologadas.
  - **Query Params**: `nombre` *(opcional)*, `codigo` *(opcional)*.
  - **Respuesta Ejemplo (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "codigo": "007", "codigo_largo": "0007", "nombre": "BANCO DE VENEZUELA", "estado": "ACTIVO" },
      { "id": 2, "codigo": "001", "codigo_largo": "0001", "nombre": "BANCO CENTRAL DE VENEZUELA", "estado": "ACTIVO" }
    ]
  }
  ```
- `GET /api/bancos/:id`: Obtiene la información detallada de una entidad bancaria específica por su ID.

### 4.2. Catálogo Externo de Formas / Impuestos Tributarios

El sistema interactúa con la API REST externa centralizada del SENIAT / ONT disponible en la red institucional:

- **Base URL Externa**: `http://10.46.0.189:3000/api/v1/formas`
- **Endpoints Externos**:
  - `GET http://10.46.0.189:3000/api/v1/formas`: Retorna la lista global de formas tributarias (ej: `99044`, `99011`, `99028`, `00010`) con sus descripciones e impuestos asociados.
  - `GET http://10.46.0.189:3000/api/v1/formas/:cod_forma`: Devuelve la estructura interna de la forma tributaria (campos, tipos de dato, reglas de validación de seriales).
- **Integración Backend NestJS (`/api/formas-auditoria`)**:
  El backend de SIRONT cuenta con un controlador proxy/local `/api/formas-auditoria` que enriquece los datos del catálogo externo con las reglas de auditoría y excepciones configuradas en la tabla `motor_app.formas_auditoria` de PostgreSQL:
  - `GET /api/formas-auditoria`: Retorna la matriz de formas y su estado de auditoría.
  - `GET /api/formas-auditoria/:cod_forma`: Consulta la configuración para la forma especificada.
  - `POST /api/formas-auditoria/:cod_forma`: Actualiza si una forma requiere revisión manual o exclusión de conciliación automática.

---

## 5. Resumen de Códigos de Respuesta HTTP

| Código | Significado | Escenario de Aplicación |
| :--- | :--- | :--- |
| **200 OK** | Exitoso | Operación completada o consulta devuelta satisfactoriamente. |
| **400 Bad Request** | Solicitud Inválida | Parámetros obligatorios faltantes (ej: `fecha` o `banco` omitidos). |
| **401 Unauthorized** | No Autorizado | Token JWT ausente, caducado o credenciales inválidas. |
| **404 Not Found** | No Encontrado | Expediente, lote o Nota de Crédito no existe en la base de datos. |
| **422 Unprocessable Entity** | Regla de Negocio Violada | Forma excluida de conciliación o lote con diferencias no resueltas. |
| **500 Internal Server Error** | Error Interno | Fallo de conexión con el pool de Oracle DB o consulta SQL fallida. |

---

## 6. Verificación de Despliegue en Producción

El backend `api_obtencion` y su Swagger UI se encuentran ejecutándose bajo PM2:
```bash
npx pm2 status
# App ID 0: ont-backend-api  | STATUS: online | PORT: 3010
```
- **Documentación Swagger activa**: [http://localhost:3010/docs-api](http://localhost:3010/docs-api)
