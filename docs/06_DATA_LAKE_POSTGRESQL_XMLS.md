# 06 — Data Lake PostgreSQL: Servicio de Transmisiones XML (`XMLS-SERVICE`)

**Sistema:** Repositorio Analítico y Data Lake de Recaudación Bancaria XML  
**Motor de Base de Datos:** PostgreSQL 14.24 (Ubuntu 14.24-0ubuntu0.22.04.1)  
**Host / Instancia:** `10.78.30.63:5432`  
**Base de Datos:** `xmls`  
**Usuario de Servicio:** `ont`  
**Estado de Conectividad:** 🟢 **VERIFICADO Y OPERATIVO (PING OK)**  
**Versión:** 1.0

---

## 1. Ficha Técnica de Conectividad

| Parámetro | Valor de Configuración | Observaciones |
|:---|:---|:---|
| **Nombre del Servicio:** | `XMLS - SERVICE` | Repositorio de ingestión de archivos XML bancarios |
| **Host IP:** | `10.78.30.63` | Servidor interno de analítica y Data Lake |
| **Puerto TCP:** | `5432` | Puerto estándar PostgreSQL |
| **Base de Datos:** | `xmls` | Contenedor principal de esquemas analíticos |
| **Usuario:** | `ont` | Usuario con permisos de lectura y agregación |
| **Modo SSL:** | `prefer` / `require` | Soporte de cifrado en tránsito SSL |
| **Volumetría Global:** | **+100 Millones de Registros** | Consolidado histórico multianual |

---

## 2. Mapa de Esquemas y Volumetría

El Data Lake `xmls` se encuentra particionado por esquemas temáticos y ejercicios fiscales anuales:

```
xmls (PostgreSQL 14)
├── public/                 <-- Consolidado Histórico General (+46M planillas)
├── Reporte2024/            <-- Data Lake Ejercicio Fiscal 2024 (10.05M planillas)
├── Reporte2025/            <-- Data Lake Ejercicio Fiscal 2025 (8.72M planillas)
├── motor_app/              <-- Control de Usuarios, Sesiones y Autenticación
├── app/                    <-- Usuarios, Permisos, Dashboards y Auditoría Web
├── dev1/                   <-- Conciliación Experimental y Mapeo de Semillas
├── datalake/               <-- Tablas maestras (Empresas Petroleras)
└── metabase/               <-- Metadatos y Caché de Consultas BI
```

### Tabla de Inventario de Esquemas:

| Esquema | Tabla Principal | Cantidad de Filas | Propósito Funcional |
|:---|:---|---:|:---|
| **`motor_app`** | `usuarios` / `sesiones_audit`| **Dinámico** | Gestión de usuarios, autenticación y auditoría |
| **`public`** | `planillas_recaudacion` | **46.030.853** | Histórico consolidado de todas las planillas recaudadas |
| **`public`** | `conceptos` | **45.034.068** | Desglose por concepto y partida presupuestaria |
| **`public`** | `semilla_aduaneras` | **2.277.264** | Semillas de prorrateo y recaudación aduanera |
| **`public`** | `archivos_migrados` | **30.935** | Catálogo de archivos XML procesados e ingeridos |
| **`public`** | `formas` | **250** | Catálogo maestro de formas tributarias |
| **`public`** | `bancos` | **29** | Directorio de entidades financieras recaudadoras |
| **`public`** | `codigos_presupuestarios`| **103** | Catálogo de cuentas y partidas presupuestarias |
| **`Reporte2024`** | `planillas_recaudacion` | **10.059.565** | Planillas procesadas durante el año fiscal 2024 |
| **`Reporte2024`** | `conceptos` | **10.518.798** | Conceptos asociados a la recaudación 2024 |
| **`Reporte2024`** | `formas` | **239** | Formas tributarias activas en 2024 |
| **`Reporte2025`** | `planillas_recaudacion` | **8.729.089** | Planillas procesadas durante el año fiscal 2025 |
| **`Reporte2025`** | `conceptos` | **8.548.791** | Conceptos asociados a la recaudación 2025 |
| **`app`** | `users` / `sessions` | **13 / 450** | Gestión de usuarios y sesiones activas |
| **`app`** | `tickets` / `audit_logs` | **42 / 579** | Mesa de control y trazabilidad de operaciones |
| **`datalake`** | `empresas_petroleras` | **73** | Padrón de contribuyentes del sector hidrocarburos |
| **`dev1`** | `control_concordancias...`| **27.114** | Tablas de análisis de concordancia y semillas |

---

## 3. Diccionario de Datos: Tabla `planillas_recaudacion`

Estructura física de la tabla núcleo de recaudación (`Reporte2024.planillas_recaudacion` / `public.planillas_recaudacion`):

| Columna | Tipo de Dato | Nullable | Descripción |
|:---|:---|:---:|:---|
| **`id`** | `integer` | NO | Identificador único autoincremental de fila |
| **`num_planilla`** | `varchar` | SÍ | **Número de Planilla SENIAT** (ej. `2401236587`) |
| **`cod_forma`** | `integer` | SÍ | Código numérico de forma tributaria (ej. `9`, `99225`, `99086`) |
| **`rif_contribuyente`** | `varchar` | SÍ | RIF del contribuyente (ej. `J401045375`, `V160887008`) |
| **`cod_banco`** | `integer` | SÍ | Código institucional del banco recaudador (ej. `5` $\leftrightarrow$ `105`) |
| **`cod_agencia`** | `integer` | SÍ | Código de la agencia bancaria (ej. `800` $\leftrightarrow$ `0800`) |
| **`fecha_rec`** | `date` | SÍ | **Fecha de Recaudación Efectiva** (YYYY-MM-DD) |
| **`fecha_trans`** | `date` | SÍ | Fecha de transmisión del archivo XML |
| **`cod_safe`** | `varchar` | SÍ | Código de autorización bancaria SAFE |
| **`cod_seg_planilla`** | `varchar` | SÍ | Código de seguridad de la planilla |
| **`periodo`** | `varchar` | SÍ | Período fiscal declarado (ej. `20240401`) |
| **`cod_aduana`** | `varchar` | SÍ | Código de aduana de liquidación (si aplica) |
| **`cancelado_elec`** | `varchar` | SÍ | Indicador de pago electrónico (`S` / `N`) |
| **`monto_total_efectivo`**| `double precision`| SÍ | **Monto recaudado en Efectivo / Transferencia (Bs)** |
| **`monto_total_cheque`** | `double precision`| SÍ | Monto cancelado en cheque |
| **`monto_total_trans`** | `double precision`| SÍ | Monto total general de la transacción |
| **`archivo_id`** | `integer` | SÍ | Referencia al archivo XML fuente en `archivos_migrados` |
| **`validacion`** | `boolean` | SÍ | `true` si la planilla superó las reglas de validación XML |
| **`createdAt` / `updatedAt`**| `timestamptz` | SÍ | Marcas de tiempo de ingestión en el Data Lake |

---

## 4. Correlación Cruzada con SIGECOF (Oracle `ORG_LIQ`)

Este Data Lake PostgreSQL es la fuente originaria que nutre los archivos de recaudación bancaria. Las claves de cruce entre PostgreSQL y Oracle son:

```
PostgreSQL (xmls)                          Oracle (SIGECOF cert_rep)
┌────────────────────────────────┐         ┌────────────────────────────────┐
│ Reporte2024.planillas_recaud...│         │ ORG_LIQ.TXT_SENIAT             │
├────────────────────────────────┤         ├────────────────────────────────┤
│ num_planilla                   │◄───────►│ PLANILLA                       │
│ fecha_rec                      │◄───────►│ FECHA_RECAUDACION              │
│ cod_banco (ej. 5 -> 105)       │◄───────►│ INFN_CODIGO (ej. '105')        │
│ cod_agencia (ej. 800 -> 0800)  │◄───────►│ AGENCIA_CODIGO (ej. '0800')    │
│ monto_total_efectivo           │◄───────►│ MONTO_EFECTIVO                 │
│ rif_contribuyente              │◄───────►│ IDENT_CNTB                     │
│ cod_forma                      │◄───────►│ FORMA_CODIGO                   │
└────────────────────────────────┘         └────────────────────────────────┘
                                                           │
                                                           ▼
                                           ┌────────────────────────────────┐
                                           │ ORG_LIQ.PLANILLA               │
                                           ├────────────────────────────────┤
                                           │ PLANILLA_ID                    │
                                           │ PLAN_SEQ (Monotónico 1..N)     │
                                           │ LOTE_SEQ (Agrupación Lote)     │
                                           └────────────────────────────────┘
```

---

## 5. Consultas SQL de Diagnóstico y Análisis Rápido

### 5.1 Buscar una planilla específica en el Data Lake 2024:
```sql
SELECT 
    num_planilla,
    rif_contribuyente,
    cod_forma,
    fecha_rec,
    cod_banco,
    cod_agencia,
    monto_total_efectivo,
    validacion
FROM "Reporte2024".planillas_recaudacion
WHERE num_planilla = '2401236587';
```

### 5.2 Totales recaudados por Banco en una fecha determinada:
```sql
SELECT 
    b.nombre_banco,
    p.cod_banco,
    COUNT(p.id) AS total_planillas,
    SUM(p.monto_total_efectivo) AS monto_total_bs
FROM "Reporte2024".planillas_recaudacion p
LEFT JOIN "Reporte2024".bancos b ON p.cod_banco = b.cod_banco
WHERE p.fecha_rec = '2024-04-15'
GROUP BY b.nombre_banco, p.cod_banco
ORDER BY monto_total_bs DESC;
```

### 5.3 Conciliación de formas aduaneras (99086) y desglose de conceptos:
```sql
SELECT 
    p.num_planilla,
    p.rif_contribuyente,
    p.monto_total_efectivo AS monto_cabecera,
    c.codigo_presupuestario,
    c.monto AS monto_concepto
FROM "Reporte2024".planillas_recaudacion p
JOIN "Reporte2024".conceptos c ON p.id = c.planilla_id
WHERE p.cod_forma = 99086 
  AND p.fecha_rec = '2024-04-15'
LIMIT 100;
```
