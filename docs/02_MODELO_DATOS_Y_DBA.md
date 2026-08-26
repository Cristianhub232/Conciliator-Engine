# 02 — Modelo de Datos, Ingeniería Inversa y Permisología DBA

**Sistema:** SIGECOF / SIRONT  
**Motor:** Oracle Database 19c Enterprise Edition (19.22.0.0.0)  
**Esquemas Clave:** `ORG_LIQ` (Organismo Liquidador) y `WFE_WORKFLOW` (Motor de Procesos)  
**Versión:** 2.0 (Consolidada)

---

## 1. Topología de Ambientes de Base de Datos

| Parámetro | Ambiente de Desarrollo | Ambiente de Producción |
|:---|:---|:---|
| **Host / IP** | `172.21.65.90` | `10.79.6.247` / Host SCAN: `sige-scan` |
| **Puerto** | `1521` | `1521` |
| **SID / Servicio** | `cert_rep` | `sige1` / TNS: `SIGECOFNEW.WORLD` (`SIGEPROD.oncop.gob.ve`) |
| **Usuario de Servicio** | `ONT_SIR_BOT` | `ONT_SIR_BOT` (o `consulta` para auditoría) |
| **Motor** | Oracle 19c EE | Oracle 19c EE — Release 19.22.0.0.0 |

---

## 2. Esquema `ORG_LIQ`: Núcleo Transaccional

El proceso de recaudación y conciliación tributaria en SIGECOF descansa sobre cuatro tablas interconectadas del esquema `ORG_LIQ`:

```
┌────────────────────────────────────────────────────────┐
│                  ORG_LIQ.TXT_SENIAT                    │
│   (Archivo de texto de recaudación bancaria diaria)    │
│   PK: (FECHA_RECAUDACION, INFN_CODIGO, AGENCIA, PLAN)  │
└───────────────────────────┬────────────────────────────┘
                            │  Actualiza: ESTADO = 1,
                            │  ANHO, LOTE_SEQ, PLAN_SEQ
                            ▼
┌────────────────────────────────────────────────────────┐
│                   ORG_LIQ.PLANILLA                     │
│               (Cabecera de Planilla)                   │
│   PK: (ANHO, LOTE_SEQ, PLAN_SEQ)                       │
│   UK: (ANHO, LOTE_ID, FORMA_CODIGO, PLANILLA_ID)       │
└───────────────────────────┬────────────────────────────┘
                            │  1 : N
                            ▼
┌────────────────────────────────────────────────────────┐
│                 ORG_LIQ.DET_PLANILLA                   │
│        (Detalle de Partidas Presupuestarias)           │
│   PK / UK: (ANHO, LOTE_ID, FORMA, PLAN, DET_PLN_ID)   │
│   FK: (ANHO, LOTE_SEQ, PLAN_SEQ)                      │
└────────────────────────────────────────────────────────┘
```

---

## 3. Matriz de Tablas, Claves y Restricciones

### 3.1 Tabla `ORG_LIQ.PLANILLA` (Cabecera Oficial)
| Columna | Tipo | Nulo | Descripción |
|:---|:---|:---:|:---|
| `ANHO` | `NUMBER(4)` | **NO** | Año fiscal de la recaudación (ej. `2024`). Clave de particionamiento lógico. |
| `LOTE_ID` | `NUMBER(6)` | **NO** | Identificador del lote operativo del día (ej. `53`). |
| `PLANILLA_ID` | `VARCHAR2(20)` | **NO** | Número físico/electrónico de la planilla SENIAT (ej. `2390579740`). |
| `FORMA_CODIGO` | `VARCHAR2(10)` | **NO** | Código de la forma tributaria SIGECOF (ej. `99225`, `99086`). |
| `ORGA_ID` | `VARCHAR2(4)` | **NO** | Código de órgano receptor (`'00'` para Tesorería General). |
| `FECHA_REGISTRO` | `DATE` | **NO** | Timestamp de inserción en el sistema (`SYSDATE`). |
| `IDENT_CNTB` | `VARCHAR2(20)` | **NO** | RIF del contribuyente asociado (`V160887008`, `J000325693`). |
| `MONTO` / `MONTO_EFECTIVO`| `NUMBER(16,2)`| **NO** | Monto liquidado en Bolívares. |
| `PLANILLA_MANUAL` | `NUMBER(1)` | **NO** | Flag de origen: `0` para inserción electrónica/orquestador. |
| `FECHA_RECAUDACION` | `DATE` | **NO** | Fecha contable de cobro en taquilla bancaria. |
| `INFN_CODIGO` | `VARCHAR2(5)` | **NO** | Código de la institución financiera / banco (ej. `'105'` Mercantil). |
| `EXPEDIENTE` | `NUMBER(8)` | **NO** | Número de expediente del Workflow (ej. `7440`). |
| `LOTE_SEQ` | `NUMBER(10)` | **NO** | Identificador secuencial global del lote (ej. `127758`). |
| `PLAN_SEQ` | `NUMBER(6)` | **NO** | Correlativo monotónico estricto dentro del lote (`1..N`). |
| `PERIODO` | `NUMBER(8)` | **NO** | Periodo fiscal numérico en formato `YYYYMMDD` (ej. `20240415`). |

**Restricciones:**
- **`PLAN_PK` (Clave Primaria):** `(ANHO, LOTE_SEQ, PLAN_SEQ)`
- **`PLA_UK` (Clave Única):** `(ANHO, LOTE_ID, FORMA_CODIGO, PLANILLA_ID)`
- **`PLA_TFA_FK` (Clave Foránea):** `FORMA_CODIGO` $\rightarrow$ `ORG_LIQ.FORMA_IMPUESTO(FORMA_CODIGO)`.

---

### 3.2 Tabla `ORG_LIQ.DET_PLANILLA` (Detalle Presupuestario)
| Columna | Tipo | Nulo | Descripción |
|:---|:---|:---:|:---|
| `ANHO` | `NUMBER(4)` | **NO** | Año fiscal. |
| `LOTE_ID` | `NUMBER(6)` | **NO** | Identificador del lote operativo. |
| `PLANILLA_ID` | `VARCHAR2(20)` | **NO** | Número de planilla vinculado a la cabecera. |
| `FORMA_CODIGO` | `VARCHAR2(10)` | **NO** | Código de forma tributaria. |
| `PLUC_ID` | `VARCHAR2(15)` | **NO** | Código de la Partida Presupuestaria de Ingreso (ej. `301010200`, `301020101`). |
| `DET_PLN_ID` | `NUMBER(4)` | **NO** | Correlativo del renglón dentro de la planilla (`1..N`). |
| `MONTO` / `MONTO_EFECTIVO`| `NUMBER(16,2)`| **NO** | Monto asignado a la partida específica. |
| `EXPEDIENTE` | `NUMBER(8)` | **NO** | Número de expediente. |
| `LOTE_SEQ` | `NUMBER(10)` | **NO** | Secuencial global del lote. |
| `PLAN_SEQ` | `NUMBER(6)` | **NO** | Secuencial de la planilla en el lote. |
| `DETP_SEQ` | `NUMBER(6)` | **NO** | Correlativo de detalle (`1..N`). |

**Restricciones:**
- **`DEPLA_UK` (Clave Única):** `(ANHO, LOTE_ID, FORMA_CODIGO, PLANILLA_ID, DET_PLN_ID)`
- **`DEPLA_PLA_FK` (Clave Foránea):** `(ANHO, LOTE_SEQ, PLAN_SEQ)` $\rightarrow$ `ORG_LIQ.PLANILLA(ANHO, LOTE_SEQ, PLAN_SEQ)`.

---

### 3.3 Tabla `ORG_LIQ.TXT_SENIAT` (Extracto Bancario)
- **Columnas clave:** `FECHA_RECAUDACION`, `INFN_CODIGO`, `AGENCIA_CODIGO`, `PLANILLA`, `FORMA_CODIGO`, `MONTO_EFECTIVO`, `IDENT_CNTB`, `ESTADO`, `ANHO`, `LOTE_SEQ`, `PLAN_SEQ`.
- **Regla de Estado:** `ESTADO IS NULL` (Pendiente de conciliar), `ESTADO = 1` (Conciliada y vinculada a `PLANILLA`).

---

## 4. Triggers Activos y Validación Designer/2000

La tabla `ORG_LIQ.PLANILLA` posee un paquete de 9 triggers generados por Oracle Designer/2000:
- `CG$BIR_PLANILLA` (Before Insert Row)
- `CG$BIS_PLANILLA` (Before Insert Statement)
- `CG$AIS_PLANILLA` (After Insert Statement)
- `CG$BUR_PLANILLA` / `CG$BUS_PLANILLA` / `CG$AUS_PLANILLA` (Update)
- `CG$BDR_PLANILLA` / `CG$BDS_PLANILLA` / `CG$ADS_PLANILLA` (Delete)

> **HALLAZGO CRÍTICO:** Los triggers `CG$` validan en tiempo real la existencia foránea del código de forma en `ORG_LIQ.FORMA_IMPUESTO`. Si una forma no existe en SIGECOF (ej. `99001`), el trigger dispara un error de validación e interrumpe la transacción. Por esta razón, el orquestador implementa una **caché en RAM** que pre-filtra formas inexistentes en 0 ms sin generar bloqueos en Oracle.

---

## 5. Regla de Oro: Aislamiento Multianual de Expedientes

> **REGLA MULTIANUAL:** Un mismo número de expediente (ej. `7440` o `7638`) **puede existir válidamente en diferentes años fiscales** (`2021`, `2023`, `2024`), pero **NUNCA debe duplicarse en un mismo año**. 

Por ello:
- Todas las consultas, índices y restricciones compuestas están encabezadas por la columna `ANHO`.
- En el cálculo de correlativos: `SELECT NVL(MAX(PLAN_SEQ), 0) + 1 FROM ORG_LIQ.PLANILLA WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`.

---

## 6. Requerimiento Técnico y Permisología DBA

Para operar sin privilegios excesivos de `DBA`, se configuró el usuario dedicado **`ONT_SIR_BOT`**:

```sql
-- Creación de usuario y cuota
CREATE USER ONT_SIR_BOT IDENTIFIED BY "ONT_SIR_BOT123456"
  DEFAULT TABLESPACE USERS
  TEMPORARY TABLESPACE TEMP
  QUOTA UNLIMITED ON USERS;

-- Privilegios de Conexión
GRANT CREATE SESSION TO ONT_SIR_BOT;

-- Privilegios en Esquema ORG_LIQ
GRANT SELECT, INSERT, UPDATE, DELETE ON ORG_LIQ.PLANILLA TO ONT_SIR_BOT;
GRANT SELECT, INSERT, UPDATE, DELETE ON ORG_LIQ.DET_PLANILLA TO ONT_SIR_BOT;
GRANT SELECT, UPDATE ON ORG_LIQ.TXT_SENIAT TO ONT_SIR_BOT;
GRANT SELECT ON ORG_LIQ.LOTE TO ONT_SIR_BOT;
GRANT SELECT ON ORG_LIQ.FORMA_IMPUESTO TO ONT_SIR_BOT;

-- Privilegios en Esquema WFE_WORKFLOW
GRANT SELECT ON WFE_WORKFLOW.WF_WORK_ITEM TO ONT_SIR_BOT;
GRANT SELECT ON WFE_WORKFLOW.WF_USERS TO ONT_SIR_BOT;

-- Sinónimos Privados para agilidad de desarrollo
CREATE OR REPLACE SYNONYM ONT_SIR_BOT.PLANILLA FOR ORG_LIQ.PLANILLA;
CREATE OR REPLACE SYNONYM ONT_SIR_BOT.DET_PLANILLA FOR ORG_LIQ.DET_PLANILLA;
CREATE OR REPLACE SYNONYM ONT_SIR_BOT.TXT_SENIAT FOR ORG_LIQ.TXT_SENIAT;
CREATE OR REPLACE SYNONYM ONT_SIR_BOT.LOTE FOR ORG_LIQ.LOTE;
```

---

## 7. Vistas Materializadas de Auditoría y Diagnóstico

Para acelerar tableros gerenciales y reportes de discrepancia sin impactar las tablas OLTP transaccionales:

```sql
-- Vista Materializada para Detección de Planillas Sin Conciliar
CREATE MATERIALIZED VIEW ORG_LIQ.MV_PLANILLAS_SIN_CONCILIAR
BUILD IMMEDIATE
REFRESH FORCE ON DEMAND
AS
SELECT 
    T.FECHA_RECAUDACION,
    T.INFN_CODIGO AS BANCO,
    T.AGENCIA_CODIGO,
    T.PLANILLA,
    T.FORMA_CODIGO,
    T.MONTO_EFECTIVO,
    T.IDENT_CNTB,
    L.EXPEDIENTE,
    L.LOTE_ID,
    L.LOTE_SEQ
FROM ORG_LIQ.TXT_SENIAT T
INNER JOIN ORG_LIQ.LOTE L 
    ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
   AND T.INFN_CODIGO = L.INFN_CODIGO 
   AND T.AGENCIA_CODIGO = L.AGENCIA_CODIGO
   AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
WHERE T.ESTADO IS NULL
  AND L.ESTADO = 'P';
```

---

## 8. Inventario de Índices Físicos y Volumetría de `WFE_WORKFLOW`

### 8.1 Catálogo de Índices Compuestos Activos
Auditados mediante consultas a `ALL_INDEXES` y `ALL_IND_COLUMNS`:

| Tabla | Nombre del Índice | Columnas Indexadas (en orden posicional) | Propósito |
|:---|:---|:---|:---|
| **`ORG_LIQ.PLANILLA`** | `PLAN_PK` | `(ANHO, LOTE_SEQ, PLAN_SEQ)` | Clave Primaria y orden correlativo |
| **`ORG_LIQ.PLANILLA`** | `PLA_UK` | `(ANHO, LOTE_ID, FORMA_CODIGO, PLANILLA_ID)` | Clave Única contra duplicados |
| **`ORG_LIQ.DET_PLANILLA`**| `DEPLA_UK` | `(ANHO, LOTE_ID, FORMA_CODIGO, PLANILLA_ID, DET_PLN_ID)` | Clave Única de Renglón |
| **`ORG_LIQ.TXT_SENIAT`** | `TXT_SENIAT_I_PLANILLA_F_1`| `(FECHA_RECAUDACION, INFN_CODIGO, AGENCIA_CODIGO, PLANILLA)` | Búsqueda y Cruce Bancario |
| **`ORG_LIQ.LOTE`** | `LOE_PK` | `(ANHO, LOTE_SEQ)` | Clave Primaria de Lote |
| **`WFE_WORKFLOW.WF_WORK_ITEM`** | `WFWI_PK` | `(WFEX_EXP_ID, WI_ID)` | Control de Tarea por Expediente |

### 8.2 Hallazgo sobre Generación de Correlativos (`check_seq.py`)
- Se auditó `ALL_SEQUENCES` buscando objetos tipo `SEQUENCE` vinculados a `PLAN_SEQ` o `PLANILLA` en `ORG_LIQ`.
- **Resultado:** No existen secuencias automáticas (`CREATE SEQUENCE`) en Oracle para este fin. La columna `PLAN_SEQ` se calcula en la aplicación mediante agregación por lote: `NVL(MAX(PLAN_SEQ), 0) + 1`.

### 8.3 Volumetría del Esquema `WFE_WORKFLOW` (`wfe_data.json`)
Inventario de tablas y conteo de filas en el motor de procesos:

| Tabla de Flujo | Cantidad de Filas | Descripción Funcional |
|:---|---:|:---|
| **`WF_AUDITA_EXPEDIENTES`** | **6.180.224** | Registro histórico inmutable de auditoría por expediente |
| **`WF_WORK_ITEM`** | **148.520** | Bandeja de tareas activas e históricas de transcriptores |
| **`WF_AUDIT_EXPEDIENTE`** | **28.231** | Registro de cambios de estado y reasignaciones |
| **`PROCESO_ETAPA`** | **14.342** | Definición de etapas del flujo de conciliación |
| **`WF_USERS`** | **420** | Directorio de usuarios y transcriptores autorizados |
| **`WF_CARPETA`** | **1** | Estructura jerárquica de carpetas de trabajo |

