# C—05 Diseño y Arquitectura de APIs REST de interoperabilidad (planilla, planillas no conciliadas, consulta de conciliaciones y conciliación automática)

## 1. Resumen Ejecutivo y Visión General de Interoperabilidad

El presente documento establece el **Diseño y la Arquitectura de las APIs REST de Interoperabilidad** del sistema **SIRONT / Conciliator-Engine**, desarrollado para la Oficina Nacional del Tesoro (ONT) y el SENIAT.

El objetivo central de estas APIs es proporcionar una capa de abstracción uniforme, desacoplada, segura y de alto rendimiento que permita interoperar a los diferentes componentes del ecosistema institucional:
- **Interfaz de Operador (`orquestador-ui`)**: Panel web en Next.js.
- **Base de Datos Presupuestaria Oracle (`sige1`)**: Tablas de `SIGECOF` (`BCO_BANCO`, `REC_LOTE_PLANILLA`, `REC_PLANILLA`, `REC_MOVIMIENTO_BANCO`, `WFE_WORKFLOW`).
- **Data Lake PostgreSQL (`xmls` / `motor_app`)**: Repositorio de planillas decodificadas y eventos de auditoría.
- **Servicios Institucionales Externos**: Catálogo centralizado de Formas e Impuestos (`http://10.46.0.189:3000`) y Notificaciones en tiempo real vía Telegram Bot API.

---

## 2. Principios de Arquitectura y Patrón de Interoperabilidad

La arquitectura REST del backend (`api_obtencion`) está construida sobre **NestJS v11** en TypeScript, aplicando los siguientes principios fundamentales de diseño:

```
+-----------------------------------------------------------------------------------+
|                            CAPA DE PRESENTACIÓN / CLIENTES                         |
|   [ Orquestador UI Next.js ]   [ Dashboards Metabase ]   [ Telegram Bot API ]     |
+-----------------------------------------------------------------------------------+
                                         │  (HTTP / REST OpenAPI 3.0)
                                         ▼
+-----------------------------------------------------------------------------------+
|                        CAPA DE INTEROPERABILIDAD REST (NestJS)                    |
|  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────────┐   |
|  │ API Planillas REST  │  │ API Auditoría REST  │  │ API Pipeline Orquestador │   |
|  └──────────┬──────────┘  └──────────┬──────────┘  └────────────┬─────────────┘   |
+─────────────┼────────────────────────┼──────────────────────────┼─────────────────+
              │                        │                          │
              ▼                        ▼                          ▼
+-----------------------------------------------------------------------------------+
|                         MOTOR DE CONCILIACIÓN Y PERSISTENCIA                      |
|  ┌─────────────────────────────────────┐  ┌────────────────────────────────────┐  |
|  │  Pool Transaccional Oracle (SIGE1)  │  │ PostgreSQL Data Lake (motor_app)   │  |
|  └─────────────────────────────────────┘  └────────────────────────────────────┘  |
+-----------------------------------------------------------------------------------+
```

1. **Protocolo RESTful Estándar**: Uso estricto de métodos HTTP (`GET` para consultas idempotentes, `POST` para operaciones transaccionales y acciones complejas, `PATCH` para actualizaciones parciales y `DELETE` para remoción autorizada).
2. **Formato Cero-Dependencia (JSON)**: Todos los cuerpos de solicitud (*Request Body*) y respuesta (*Response Body*) se intercambian en formato JSON UTF-8.
3. **Manejo de Transaccionalidad Atómica**: Operaciones de conciliación masiva que garantizan consistencia en Oracle DB mediante bloques transaccionales (`BEGIN...COMMIT / ROLLBACK`).
4. **Idempotencia y Normalización Integrada**: Limpieza y normalización automática de datos sensibles a formato (ej. Códigos de banco de 3 y 4 dígitos mediante la función utilitaria `sanitizeBanco()`).
5. **Autenticación Basada en Tokens Stateless (JWT)**: Acceso protegido mediante cabeceras HTTP `Authorization: Bearer <token_jwt>`.

---

## 3. Arquitectura del Servicio 1: Consulta de Planilla Individual

Este servicio expone la información detallada de una planilla tributaria transcrita o decodificada desde el Data Lake y la base de datos Oracle.

### 3.1. Especificación del Contrato API
- **Endpoint**: `GET /api/planillas/pendientes`
- **Patrón de Operación**: Consulta filtrada con paginación optimizada.
- **Parámetros de Entrada (Query Params)**:
  - `fecha` *(string, obligatorio)*: Fecha de recaudación en formato `YYYY-MM-DD`.
  - `banco` *(string, obligatorio)*: Código bancario normalizado (`007`, `001`, `0102`, etc.).
  - `expediente` *(string, opcional)*: Identificador de expediente presupuestario en Oracle.
  - `lote_id` *(number, opcional)*: ID del lote al cual pertenece la planilla.
  - `estado_asignacion` *(enum, opcional)*: `'ASIGNADAS'` | `'HUERFANAS'`.
  - `limit` *(number, opcional, default: 1000)*: Tamaño de página.
  - `offset` *(number, opcional, default: 0)*: Posición inicial.

### 3.2. Modelo de Respuesta JSON (Contrato REST)
```json
{
  "data": [
    {
      "planilla_id": "10524",
      "lote_id": 842,
      "lote_seq": 14,
      "expediente": 7638,
      "forma": "99044",
      "monto": 1500.50,
      "banco": "007",
      "agencia": "001",
      "fecha_recaudacion": "2024-05-15",
      "rif": "J-30012345-0",
      "razon_social": "CONTRIBUYENTE EJEMPLO C.A.",
      "estado_conciliacion": "PENDIENTE",
      "partidas_sugeridas": [
        { "partida": "3.01.01.01.00", "monto": 1500.50 }
      ]
    }
  ],
  "pagination": {
    "limit": 1000,
    "offset": 0,
    "count": 1
  }
}
```

---

## 4. Arquitectura del Servicio 2: Planillas No Conciliadas y Detección de Brechas

Diseñado para identificar cuellos de botella operativos, planillas huérfanas, incongruencias de seriales y planillas con atributos nulos que impiden la conciliación automática.

### 4.1. Detección de Atributos NULL (`GET /api/planillas/detectar-atributos-null`)
Identifica planillas cuya Forma Tributaria (ej. Forma `99044`) fue procesada con ausencia de datos críticos en el archivo TXT bancario o en la transcripción.

- **Query Params**: `fecha` *(YYYY-MM-DD)*, `banco` *(3 u 4 dígitos)*, `expediente` *(opcional)*.
- **Respuesta del Servicio**:
```json
{
  "success": true,
  "total": 5,
  "monto_total": 8450.00,
  "formas_detectadas": ["99044"],
  "planillas": [
    {
      "planilla_id": "10599",
      "forma": "99044",
      "monto": 2100.00,
      "banco": "007",
      "agencia": "001",
      "fecha_recaudacion": "2024-05-15",
      "rif": "J-99999999-0",
      "motivo_alerta": "Nro de Planilla NULL / Incongruencia de Serial en TXT bancario"
    }
  ]
}
```

### 4.2. Detección de Duplicados en TXT (`GET /api/planillas/duplicados-txt`)
Analiza el Data Lake en PostgreSQL para aislar planillas que fueron enviadas múltiples veces en la transmisión del archivo bancario, evitando la sobreestimación de la recaudación.

- **Query Params**: `fecha` *(YYYY-MM-DD)*, `banco` *(opcional)*.
- **Respuesta del Servicio**:
```json
{
  "success": true,
  "total_duplicadas": 12,
  "monto_total_duplicadas": 45000.00,
  "planillas_unicas_afectadas": 6,
  "duplicados": [
    {
      "planilla": "10524",
      "forma_codigo": "99044",
      "monto": 1500.50,
      "agencia": "001",
      "repeticiones": 2,
      "monto_excedente": 1500.50
    }
  ]
}
```

---

## 5. Arquitectura del Servicio 3: Consulta de Conciliaciones e Historial de Auditoría

Proporciona la trazabilidad completa e inalterable de cada evento de conciliación, reversión y depuración ejecutado sobre el sistema.

### 5.1. Consulta de Auditoría por Expediente (`GET /api/auditoria/expediente/:id`)
- **Parámetro URL**: `:id` (Número de expediente presupuestario en Oracle `WFE_WORKFLOW`).
- **Query Param**: `anho` (Año fiscal, default 2024).
- **Flujo de Interoperabilidad**:
  1. Consulta el estado del flujo de trabajo en la tabla `WFE_WORKFLOW` de Oracle.
  2. Obtiene el historial de transiciones de estados en `WFE_HISTORIA`.
  3. Cruza la información con la bitácora de auditoría en PostgreSQL (`motor_app.auditoria_eventos`).

```json
{
  "expediente": 7638,
  "anho": 2024,
  "estado_workflow": "EN_VALIDACION",
  "usuario_asignado": "TIBISAYRIVAS",
  "lotes": [
    {
      "lote_seq": 14,
      "lote_id": 842,
      "estado_lote": "V",
      "total_planillas": 45,
      "planillas_conciliadas": 45,
      "diferencia": 0.00
    }
  ],
  "trazabilidad_historia": [
    {
      "secuencia": 1,
      "estado_anterior": "P",
      "estado_nuevo": "V",
      "usuario": "MAIRA_0018",
      "fecha": "2024-05-15 14:30:00"
    }
  ]
}
```

### 5.2. Auditoría Comparativa de Notas de Crédito (`GET /api/notas-credito`)
Ofrece la interoperabilidad entre los depósitos por Notas de Crédito reportados por la banca nacional y el desglose de planillas tributarias individuales.

- **Query Params**: `fecha`, `banco`, `expediente`.
- **Respuesta**: Matriz comparativa indicando:
  - Monto Total reportado en Nota de Crédito Bancaria.
  - Monto Total de Planillas Transcritas en el sistema.
  - Brecha de diferencia (Monto NC - Monto Transcrito).

---

## 6. Arquitectura del Servicio 4: Motor de Conciliación Automática y Masiva

Capa transaccional del backend que ejecuta las reglas de negocio, validación de formas excluidas y actualización atómica en Oracle y PostgreSQL.

```
                           SOLICITUD DE CONCILIACIÓN (POST /api/planillas/conciliar)
                                                       │
                                                       ▼
                                     ┌───────────────────────────────────┐
                                     │  Validación DTO & Formas Excluidas│
                                     └─────────────────┬─────────────────┘
                                                       │ (Forma != 00000)
                                                       ▼
                                     ┌───────────────────────────────────┐
                                     │   Inicio de Transacción Oracle    │
                                     └─────────────────┬─────────────────┘
                                                       │
                                ┌──────────────────────┴──────────────────────┐
                                ▼                                             ▼
                 ┌─────────────────────────────┐               ┌─────────────────────────────┐
                 │ Insert REC_MOVIMIENTO_BANCO │               │ Update REC_PLANILLA (Estado)│
                 └──────────────┬──────────────┘               └──────────────┬──────────────┘
                                │                                             │
                                └──────────────────────┬──────────────────────┘
                                                       │
                                                       ▼
                                     ┌───────────────────────────────────┐
                                     │ Commit Transacción / Log Auditoría│
                                     └───────────────────────────────────┘
```

### 6.1. Conciliación Atómica Individual (`POST /api/planillas/conciliar`)
- **Payload de Entrada (DTO JSON)**:
```json
{
  "usuario_operador": "MAIRA_0018",
  "expediente": 7638,
  "lote_id": 842,
  "lote_seq": 14,
  "planilla_id": "10524",
  "forma": "99044",
  "monto": 1500.50,
  "banco": "007",
  "agencia": "001",
  "fecha_recaudacion": "2024-05-15",
  "asignaciones": [
    { "partida": "3.01.01.01.00", "monto": 1500.50 }
  ]
}
```
- **Reglas de Negocio en API**:
  1. **Validación de Formas Excluidas**: Deniega la conciliación de formas de prueba o reservadas (`00000`, `99999`) retornando código `422 Unprocessable Entity`.
  2. **Sanitización de Bancos**: Convierte automáticamente formatos de 4 dígitos (ej: `'0007'`) a 3 dígitos (`'007'`).
  3. **Inserción en Oracle**: Registra las relaciones de recaudación presupuestaria en `REC_MOVIMIENTO_BANCO` y actualiza la planilla a estado `'C'` (Conciliada).

### 6.2. Cierre y Reasignación de Expediente (`POST /api/planillas/cerrar-expediente`)
Sincroniza el cierre del expediente en Oracle `WFE_WORKFLOW` tras validar que no existan planillas pendientes ni diferencias de monto, reasignando la carpeta al grupo de analistas validadores.

- **Payload DTO**:
```json
{
  "expediente": 7638,
  "anho": 2024,
  "analista_asignado": "TIBISAYRIVAS",
  "usuario_operador": "MAIRA_0018",
  "banco": "007",
  "observacion": "Expediente conciliado al 100% sin brechas"
}
```

---

## 7. Interoperabilidad con Servicios Externos y Middleware

### 7.1. Catálogo Centralizado de Formas Tributarias (`http://10.46.0.189:3000/api/v1/formas`)
El backend NestJS integra un controlador intermediario (`/api/formas-auditoria`) que consume la API de catálogo centralizada del SENIAT y la combina con la tabla local `motor_app.formas_auditoria`:
- **Consumo HTTP Interno**: Axios / Fetch nativo de Node.js.
- **Caché y Resiliencia**: Si el servicio externo no responde, la API utiliza la copia local almacenada en PostgreSQL.

### 7.2. Integración con Notificaciones Telegram Bot API
Para la orquestación masiva por bloques (`POST /api/pipeline/conciliar`), el backend envía callbacks de progreso en tiempo real al chat ID autorizado vía HTTP POST hacia Telegram:
- **Endpoint**: `https://api.telegram.org/bot<TOKEN>/sendMessage`
- **Payload**: Mensajes formateados en Markdown con el número de planillas procesadas y alertas de diferencias.

---

## 8. Matriz de Manejo de Errores y Códigos de Estado HTTP

| Código HTTP | Tipo de Error | Estructura de Respuesta JSON | Causa Operacional |
| :---: | :--- | :--- | :--- |
| **200 OK** | Éxito | `{ "success": true, ... }` | Petición procesada correctamente. |
| **400 Bad Request** | Datos Inválidos | `{ "status": 400, "error": "Bad Request", "message": "El parámetro fecha es obligatorio" }` | Faltan campos obligatorios en el DTO o la URL. |
| **401 Unauthorized** | Autenticación | `{ "statusCode": 401, "message": "Token de autorización no proporcionado." }` | Token Bearer JWT faltante o caducado. |
| **404 Not Found** | No Encontrado | `{ "statusCode": 404, "message": "Nota de Crédito NC-99 no encontrada" }` | El recurso o expediente solicitado no existe. |
| **422 Unprocessable Entity** | Regla de Negocio | `{ "status": 422, "error": "Forma Excluida", "message": "La forma 00000 está excluida" }` | Violación de regla de negocio institucional. |
| **500 Internal Error** | Error de Servidor | `{ "status": 500, "error": "Error al consultar Oracle", "message": "ORA-00054: resource busy" }` | Fallo de conexión o bloqueo en base de datos. |

---

## 9. Verificación e Inspección Interactiva

Toda la especificación técnica de las APIs REST descritas en este documento está disponible para pruebas interactivas en entorno de desarrollo y producción:

- **Swagger UI Interactive Documentation**: [http://localhost:3010/docs-api](http://localhost:3010/docs-api) (Servidor `10.46.0.189:3010/docs-api`)
- **Especificación OpenAPI 3.0 JSON**: `http://localhost:3010/docs-api-json`
