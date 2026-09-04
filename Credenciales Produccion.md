# Proyecto de Automatización del Proceso de Planillas Pendientes por Conciliar — ONT

**Ambiente:** Producción SIGECOF
**Documento:** Ficha técnica de componentes desplegados y evidencias del pase
**Fecha de las evidencias:** 2026-09-03

> ⚠️ **Advertencia de manejo:** este documento contiene credenciales en texto plano de cuentas de servicio productivas. Si va a circularse fuera del equipo responsable del pase, se recomienda sustituirlas por referencias a la bóveda de credenciales.

---

## Tabla de contenido

1. [Ficha técnica de componentes desplegados](#1-ficha-técnica-de-componentes-desplegados)
2. [Almacenamiento y perfil de seguridad](#2-almacenamiento-y-perfil-de-seguridad)
3. [Creación de cuentas de servicio](#3-creación-de-cuentas-de-servicio)
4. [Privilegios de sistema](#4-privilegios-de-sistema)
5. [Lectura global (SELECT) sobre esquemas origen](#5-lectura-global-select-sobre-esquemas-origen)
6. [Escritura quirúrgica (DML) para ONT_SIR_BOT](#6-escritura-quirúrgica-dml-para-ont_sir_bot)
7. [Artefactos a desplegar](#7-artefactos-a-desplegar)
8. [Solicitud complementaria en ambiente de desarrollo](#8-solicitud-complementaria-en-ambiente-de-desarrollo-acción-en-certificación)
9. [Creación de índices de optimización](#9-creación-de-índices-de-optimización)
10. [Verificación y entregables del pase](#10-verificación-y-entregables-del-pase)
11. [Observaciones y hallazgos de revisión](#11-observaciones-y-hallazgos-de-revisión)

---

## 1. Ficha técnica de componentes desplegados

### 1.1 Cuentas de servicio y credenciales

| Atributo | Cuenta 1 | Cuenta 2 |
|---|---|---|
| **Esquema / Usuario** | `ONT_SIR_BOT_AUDIT` | `ONT_SIR_BOT` |
| **Tipo de cuenta** | Propietario del esquema / Repositorio | Operativo / Cuenta de servicio (Python) |
| **Password** | `K#9xP$7mQ!2vW8z` | `bR4#mK9$L1pX!7v` |
| **Profile security** | `PRF_ONT_BOT` | `PRF_ONT_BOT` |
| **Tablespace por defecto** | `ONT_SIR_BOT_AUDIT` (Quota: `UNLIMITED`) | `ONT_SIR_BOT_AUDIT` (Quota: `100M`) |
| **Propósito** | Dueño de objetos, vistas materializadas y logs de auditoría | Conexión operativa de demonios / bots de automatización |

### 1.2 Almacenamiento y perfil de seguridad

| Componente | Configuración | Propósito |
|---|---|---|
| **Tablespace** `ONT_SIR_BOT_AUDIT` | ASM `+DG_DATA` \| Inicial: `500M` \| `AUTOEXTEND ON` (Next `100M`, `MAXSIZE UNLIMITED`) | Aislamiento dedicado de almacenamiento para el proyecto |
| **Perfil** `PRF_ONT_BOT` | `PASSWORD_LIFE_TIME UNLIMITED` \| `FAILED_LOGIN_ATTEMPTS UNLIMITED` | Política de seguridad sin caducidad para cuentas de servicio / bots |

> **Nota de despliegue:** se corrigió la ruta de ASM respectiva a `+DG_DATA`.

### 1.3 Matriz consolidada de objetos y privilegios

| Objeto / Esquema origen | Tipo de objeto | Privilegio | Usuario privilegiado |
|---|---|---|---|
| `MV_PLANILLAS_SIN_CONCILIAR_2024` | Materialized View | `SELECT` | `ONT_SIR_BOT` |
| `MV_PLANILLAS_SIN_CONCILIAR_2024` | Sinónimo privado | `READ DIRECT` | `ONT_SIR_BOT` |
| `MV_AUDIT_ASIGNACIONES_2024` | Materialized View | `SELECT` | `ONT_SIR_BOT` |
| `MV_AUDIT_ASIGNACIONES_2024` | Sinónimo privado | `READ DIRECT` | `ONT_SIR_BOT` |
| `ORG_LIQ.*` (70 objetos) | Tablas y vistas | `SELECT` (100 %) | `ONT_SIR_BOT` / `ONT_SIR_BOT_AUDIT` |
| `WFE_WORKFLOW.*` (39 objetos) | Tablas y vistas | `SELECT` (100 %) | `ONT_SIR_BOT` / `ONT_SIR_BOT_AUDIT` |
| `ORG_LIQ.PLANILLA` | Tabla | `INSERT`, `DELETE` | `ONT_SIR_BOT` |
| `ORG_LIQ.DET_PLANILLA` | Tabla | `INSERT`, `DELETE` | `ONT_SIR_BOT` |
| `ORG_LIQ.TXT_SENIAT` | Tabla | `UPDATE` | `ONT_SIR_BOT` |
| `WFE_WORKFLOW.WF_WORK_ITEM` | Tabla | `INSERT`, `UPDATE` | `ONT_SIR_BOT` |
| `WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES` | Tabla | `INSERT` | `ONT_SIR_BOT` |

---

## 2. Almacenamiento y perfil de seguridad

### 2.1 Creación del tablespace

```sql
CREATE TABLESPACE ONT_SIR_BOT_AUDIT
DATAFILE '+DG_DATA'
SIZE 500M
AUTOEXTEND ON NEXT 100M MAXSIZE UNLIMITED
EXTENT MANAGEMENT LOCAL AUTOALLOCATE
SEGMENT SPACE MANAGEMENT AUTO;
```

> **Nota:** el datafile `+SIGE_DGC_DATA` no existe. El correcto es `+DG_DATA`.

**Respuesta:** `Tablespace created.`

### 2.2 Creación del perfil de seguridad

```sql
CREATE PROFILE PRF_ONT_BOT LIMIT
SESSIONS_PER_USER          UNLIMITED
CPU_PER_SESSION            UNLIMITED
LOGICAL_READS_PER_SESSION  UNLIMITED
IDLE_TIME                  UNLIMITED
CONNECT_TIME               UNLIMITED
FAILED_LOGIN_ATTEMPTS      UNLIMITED
PASSWORD_LIFE_TIME         UNLIMITED
PASSWORD_REUSE_TIME        UNLIMITED
PASSWORD_REUSE_MAX         UNLIMITED
PASSWORD_LOCK_TIME         UNLIMITED;
```

**Respuesta:** `Profile created.`

---

## 3. Creación de cuentas de servicio

### 3.1 `ONT_SIR_BOT_AUDIT` — propietario del esquema

```sql
CREATE USER ONT_SIR_BOT_AUDIT
IDENTIFIED BY "K#9xP$7mQ!2vW8z"
DEFAULT TABLESPACE ONT_SIR_BOT_AUDIT
TEMPORARY TABLESPACE TEMP
PROFILE PRF_ONT_BOT
ACCOUNT UNLOCK;

ALTER USER ONT_SIR_BOT_AUDIT QUOTA UNLIMITED ON ONT_SIR_BOT_AUDIT;
```

**Respuesta:**
```
User created.
User altered.
```

### 3.2 `ONT_SIR_BOT` — cuenta operativa (Python)

```sql
CREATE USER ONT_SIR_BOT
IDENTIFIED BY "bR4#mK9$L1pX!7v"
DEFAULT TABLESPACE ONT_SIR_BOT_AUDIT
TEMPORARY TABLESPACE TEMP
PROFILE PRF_ONT_BOT
ACCOUNT UNLOCK;

ALTER USER ONT_SIR_BOT QUOTA 100M ON ONT_SIR_BOT_AUDIT;
```

**Respuesta:**
```
User created.
User altered.
```

---

## 4. Privilegios de sistema

### 4.1 `ONT_SIR_BOT_AUDIT`

Privilegios: `CREATE SESSION`, `CREATE TABLE`, `CREATE VIEW`, `CREATE MATERIALIZED VIEW`.

```sql
GRANT CREATE SESSION            TO ONT_SIR_BOT_AUDIT;
GRANT CREATE TABLE              TO ONT_SIR_BOT_AUDIT;
GRANT CREATE VIEW               TO ONT_SIR_BOT_AUDIT;
GRANT CREATE MATERIALIZED VIEW  TO ONT_SIR_BOT_AUDIT;
```

**Respuesta:**
```
Grant succeeded.
Grant succeeded.
Grant succeeded.
Grant succeeded.
```

### 4.2 `ONT_SIR_BOT`

Privilegio: `CREATE SESSION` únicamente.

```sql
GRANT CREATE SESSION TO ONT_SIR_BOT;
```

**Respuesta:** `Grant succeeded.`

---

## 5. Lectura global (SELECT) sobre esquemas origen

### 5.1 Esquema `ORG_LIQ`

```sql
BEGIN
  FOR r IN (SELECT table_name FROM dba_tables WHERE owner = 'ORG_LIQ'
            UNION ALL
            SELECT view_name  FROM dba_views  WHERE owner = 'ORG_LIQ') LOOP
    EXECUTE IMMEDIATE 'GRANT SELECT ON ORG_LIQ.' || r.table_name || ' TO ONT_SIR_BOT';
    EXECUTE IMMEDIATE 'GRANT SELECT ON ORG_LIQ.' || r.table_name || ' TO ONT_SIR_BOT_AUDIT';
  END LOOP;
END;
/
```

**Respuesta:** `PL/SQL procedure successfully completed.`

### 5.2 Esquema `WFE_WORKFLOW`

```sql
BEGIN
  FOR r IN (SELECT table_name FROM dba_tables WHERE owner = 'ORG_LIQ'
            UNION ALL
            SELECT view_name  FROM dba_views  WHERE owner = 'ORG_LIQ') LOOP
    EXECUTE IMMEDIATE 'GRANT SELECT ON ORG_LIQ.' || r.table_name || ' TO ONT_SIR_BOT';
    EXECUTE IMMEDIATE 'GRANT SELECT ON ORG_LIQ.' || r.table_name || ' TO ONT_SIR_BOT_AUDIT';
  END LOOP;
END;
/
```

**Respuesta:** `PL/SQL procedure successfully completed.`

> 🔴 **Hallazgo crítico.** Este bloque, rotulado como `WFE_WORKFLOW`, en realidad vuelve a recorrer y otorgar sobre `ORG_LIQ` (owner, prefijo del objeto y todo el cuerpo del cursor apuntan a `ORG_LIQ`). El bloque se ejecuta sin error, por eso devuelve `PL/SQL procedure successfully completed.`, pero **no concede ningún privilegio sobre `WFE_WORKFLOW`**. Esto explica el 5,13 % de conformidad reportado en la sección 10.1. Ver [sección 11](#11-observaciones-y-hallazgos-de-revisión) para la corrección propuesta.

---

## 6. Escritura quirúrgica (DML) para `ONT_SIR_BOT`

### 6.1 Esquema `ORG_LIQ`

```sql
GRANT DELETE, INSERT ON ORG_LIQ.PLANILLA     TO ONT_SIR_BOT;
GRANT INSERT, DELETE ON ORG_LIQ.DET_PLANILLA TO ONT_SIR_BOT;
GRANT UPDATE         ON ORG_LIQ.TXT_SENIAT   TO ONT_SIR_BOT;
```

**Respuesta:**
```
Grant succeeded.
Grant succeeded.
Grant succeeded.
```

### 6.2 Esquema `WFE_WORKFLOW`

```sql
GRANT INSERT, UPDATE ON WFE_WORKFLOW.WF_WORK_ITEM           TO ONT_SIR_BOT;
GRANT INSERT         ON WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES  TO ONT_SIR_BOT;
```

**Respuesta:**
```
Grant succeeded.
Grant succeeded.
```

---

## 7. Artefactos a desplegar

### 7.1 `MV_PLANILLAS_SIN_CONCILIAR_2024`

Identifica planillas del ejercicio 2024 cuya recaudación declarada (`monto_planilla`) no cuadra contra la recaudación electrónica (`monto_electronico`) para la combinación *fecha de recaudación / banco / agencia*, y que aún permanecen sin estado en `TXT_SENIAT` (`ESTADO IS NULL`, es decir, "huérfanas").

```sql
CREATE MATERIALIZED VIEW ONT_SIR_BOT_AUDIT.MV_PLANILLAS_SIN_CONCILIAR_2024
TABLESPACE ONT_SIR_BOT_AUDIT
BUILD IMMEDIATE
REFRESH FORCE ON DEMAND
AS
SELECT t.infn_codigo        AS BANCO,
       t.fecha_recaudacion  AS FECHA_RECAUDACION,
       t.planilla           AS NUM_PLANILLA,
       t.forma_codigo,
       t.monto_efectivo,
       p.agencia_codigo,
       p.lote_id,
       p.expediente
FROM ORG_LIQ.TXT_SENIAT T,
(
    SELECT fecha_recaudacion, infn_codigo, AGENCIA_CODIGO,
           SUM(lote_id)                                     lote_id,
           SUM(monto_planilla)                              TOTAL_PLANILLA,
           SUM(monto_electronico)                           TOTAL_ELECTRONICO,
           SUM(monto_planilla) - SUM(monto_electronico)     DIFERENCIA,
           SUM(expediente)                                  expediente
    FROM (
        SELECT L.fecha_recaudacion, L.infn_codigo, L.AGENCIA_CODIGO, l.lote_id,
               0 monto_nota, SUM(monto) monto_planilla, 0 monto_electronico, L.expediente
        FROM ORG_LIQ.PLANILLA P, ORG_LIQ.LOTE L
        WHERE L.fecha_recaudacion >= TO_DATE('01/01/2024', 'DD/MM/YYYY')
          AND L.fecha_recaudacion <  TO_DATE('01/01/2025', 'DD/MM/YYYY')
          AND L.ANHO      = P.ANHO
          AND L.LOTE_SEQ  = P.LOTE_SEQ
        GROUP BY L.fecha_recaudacion, L.infn_codigo, AGENCIA_CODIGO, l.lote_id, L.expediente
        UNION ALL
        SELECT fecha_recaudacion, infn_codigo, AGENCIA_CODIGO,
               0 lote_id, 0 monto_nota, 0 monto_planilla,
               SUM(MONTO_EFECTIVO) + SUM(MONTO_OTROS_PAGOS) monto_electronico,
               0 expediente
        FROM ORG_LIQ.TXT_SENIAT
        WHERE fecha_recaudacion >= TO_DATE('01/01/2024', 'DD/MM/YYYY')
          AND fecha_recaudacion <  TO_DATE('01/01/2025', 'DD/MM/YYYY')
        GROUP BY fecha_recaudacion, infn_codigo, AGENCIA_CODIGO
    )
    GROUP BY fecha_recaudacion, infn_codigo, AGENCIA_CODIGO
    HAVING SUM(monto_planilla) - SUM(MONTO_ELECTRONICO) <> 0
) P
WHERE P.FECHA_RECAUDACION = T.FECHA_RECAUDACION
  AND P.INFN_CODIGO       = T.INFN_CODIGO
  AND P.AGENCIA_CODIGO    = T.AGENCIA_CODIGO
  AND T.ESTADO IS NULL;
```

> **Nota:** se agregó la cláusula `TABLESPACE ONT_SIR_BOT_AUDIT`.

**Respuesta:** `Materialized view created.`

#### Privilegio y sinónimo

```sql
GRANT SELECT ON ONT_SIR_BOT_AUDIT.MV_PLANILLAS_SIN_CONCILIAR_2024 TO ONT_SIR_BOT;
```
**Respuesta:** `Grant succeeded.`

```sql
CREATE SYNONYM ONT_SIR_BOT.MV_PLANILLAS_SIN_CONCILIAR_2024
FOR ONT_SIR_BOT_AUDIT.MV_PLANILLAS_SIN_CONCILIAR_2024;
```
**Respuesta:** `Synonym created.`

---

### 7.2 `MV_AUDIT_ASIGNACIONES_2024`

Traza la asignación de expedientes 2024 a transcriptores: quién asignó, quién transcribe, sobre qué expediente/banco/lote y en qué estado y fecha. Se restringe a los usuarios de la organización `093` / `93`.

```sql
CREATE MATERIALIZED VIEW ONT_SIR_BOT_AUDIT.MV_AUDIT_ASIGNACIONES_2024
TABLESPACE ONT_SIR_BOT_AUDIT
BUILD IMMEDIATE
REFRESH FORCE ON DEMAND
AS
SELECT W.WFUS_USERS_ID                                          AS USUARIO_TRANSCRIPTOR,
       UT.USERS_NOMBRE_CORTO || ' ' || UT.USERS_NOMBRE_LARGO     AS TRANSCRIPTOR,
       W.WI_ORIGEN                                               AS USUARIO_ASIGNADOR,
       UA.USERS_NOMBRE_CORTO || ' ' || UA.USERS_NOMBRE_LARGO     AS ASIGNADOR,
       W.WFEX_EXP_ID                                             AS EXPEDIENTE,
       L.INFN_CODIGO                                             AS BANCO,
       L.FECHA_RECAUDACION                                       AS FECHA_LOTE,
       W.WI_ESTADO                                               AS ESTADO_ASIGNACION,
       W.WI_FECHA_CREACION                                       AS FECHA_ASIGNACION
FROM WFE_WORKFLOW.WF_WORK_ITEM W
JOIN WFE_WORKFLOW.WF_USERS UT
  ON W.WFUS_USERS_ID = UT.USERS_ID
LEFT JOIN WFE_WORKFLOW.WF_USERS UA
  ON W.WI_ORIGEN = UA.USERS_ID
JOIN (
    SELECT DISTINCT EXPEDIENTE, INFN_CODIGO, FECHA_RECAUDACION
    FROM ORG_LIQ.LOTE
    WHERE FECHA_RECAUDACION >= TO_DATE('01/01/2024', 'DD/MM/YYYY')
      AND FECHA_RECAUDACION <  TO_DATE('01/01/2025', 'DD/MM/YYYY')
) L
  ON W.WFEX_EXP_ID = L.EXPEDIENTE
WHERE UT.ORGA_ID IN ('093', '93');
```

> **Nota:** se agregó el tablespace a la MV: `TABLESPACE ONT_SIR_BOT_AUDIT`.

#### Privilegios previos requeridos por la MV

```sql
-- Privilegios de lectura sobre esquema WFE_WORKFLOW
GRANT SELECT ON WFE_WORKFLOW.WF_WORK_ITEM TO ONT_SIR_BOT_AUDIT;
GRANT SELECT ON WFE_WORKFLOW.WF_USERS     TO ONT_SIR_BOT_AUDIT;

-- Privilegios de lectura sobre esquema ORG_LIQ
GRANT SELECT ON ORG_LIQ.LOTE       TO ONT_SIR_BOT_AUDIT;
GRANT SELECT ON ORG_LIQ.TXT_SENIAT TO ONT_SIR_BOT_AUDIT;
GRANT SELECT ON ORG_LIQ.PLANILLA   TO ONT_SIR_BOT_AUDIT;
```

**Respuesta:** `Materialized view created.`

#### Privilegio y sinónimo

```sql
GRANT SELECT ON ONT_SIR_BOT_AUDIT.MV_AUDIT_ASIGNACIONES_2024 TO ONT_SIR_BOT;

CREATE SYNONYM ONT_SIR_BOT.MV_AUDIT_ASIGNACIONES_2024
FOR ONT_SIR_BOT_AUDIT.MV_AUDIT_ASIGNACIONES_2024;
```

> ⚠️ En el documento original **no se registró la respuesta** de estas dos sentencias, a diferencia del resto. Ver [sección 11](#11-observaciones-y-hallazgos-de-revisión).

---

### 7.3 Tabla `LOG_CONCILIACION`

**Estatus: STANDBY.**

Permanece a la espera de la entrega del DDL definitivo por parte del equipo de desarrollo de ONT. Su creación se solicitará como adenda a este requerimiento, dentro del esquema `ONT_SIR_BOT_AUDIT`.

---

## 8. Solicitud complementaria en ambiente de desarrollo (Acción en Certificación)

**Instancia destino:**

```
INSTANCE_NAME    HOST_NAME
---------------- ----------------------------------------------------------------
cert_rep         certificacion-rep
```

```sql
GRANT UPDATE         ON ORG_LIQ.TXT_SENIAT   TO ONT_SIR_BOT;
GRANT INSERT         ON ORG_LIQ.PLANILLA     TO ONT_SIR_BOT;
GRANT INSERT, DELETE ON ORG_LIQ.DET_PLANILLA TO ONT_SIR_BOT;
```

**Respuesta:**
```
Grant succeeded.
Grant succeeded.
Grant succeeded.
```

### Credenciales propias del ambiente productivo

| Cuenta | Password |
|---|---|
| `ONT_SIR_BOT_AUDIT` | `K#9xP$7mQ!2vW8z` |
| `ONT_SIR_BOT` | `bR4#mK9$L1pX!7v` |

---

## 9. Creación de índices de optimización

### 9.1 `IDX_TXT_OPT_HUERFANAS`

```sql
CREATE INDEX ORG_LIQ.IDX_TXT_OPT_HUERFANAS
ON ORG_LIQ.TXT_SENIAT (INFN_CODIGO, FECHA_RECAUDACION, ESTADO, AGENCIA_CODIGO)
TABLESPACE ORG_LIQ_IDX01_128M_02
ONLINE
PARALLEL 4;

ALTER INDEX ORG_LIQ.IDX_TXT_OPT_HUERFANAS NOPARALLEL;
```

**Respuesta:**
```
Index created.
Index altered.
```

### 9.2 `IDX_PLANILLA_LOTE_ID`

```sql
CREATE INDEX ORG_LIQ.IDX_PLANILLA_LOTE_ID
ON ORG_LIQ.PLANILLA (PLANILLA_ID, LOTE_SEQ)
TABLESPACE ORG_LIQ_IDX01_128M_02
ONLINE
PARALLEL 4;

ALTER INDEX ORG_LIQ.IDX_PLANILLA_LOTE_ID NOPARALLEL;
```

**Respuesta:**
```
Index created.
Index altered.
```

### 9.3 Generación de estadísticas en los histogramas

```sql
EXEC DBMS_STATS.GATHER_INDEX_STATS(ownname => 'ORG_LIQ',      indname => 'IDX_TXT_OPT_HUERFANAS', degree => 8);
EXEC DBMS_STATS.GATHER_INDEX_STATS(ownname => 'ORG_LIQ',      indname => 'IDX_PLANILLA_LOTE_ID',  degree => 8);
EXEC DBMS_STATS.GATHER_INDEX_STATS(ownname => 'WFE_WORKFLOW', indname => 'IDX_WFE_EXP_ESTADO',    degree => 8);
```

**Respuesta (las tres):** `PL/SQL procedure successfully completed.`

> ℹ️ El índice `WFE_WORKFLOW.IDX_WFE_EXP_ESTADO` aparece en la recolección de estadísticas y en la verificación final, pero **su DDL de creación no está incluido en este documento**.

---

## 10. Verificación y entregables del pase

### 10.1 Conformidad de privilegios `SELECT` por esquema origen

```
ESQUEMA ORIGEN        TOTAL OBJETOS   CON SELECT   SIN SELECT   % CONFORMIDAD
--------------------  -------------   ----------   ----------   -------------
ORG_LIQ                          70           70            0          100.00
WFE_WORKFLOW                     39            2           37            5.13
```

| Esquema origen | Total objetos | Con SELECT | Sin SELECT | % Conformidad |
|---|---:|---:|---:|---:|
| `ORG_LIQ` | 70 | 70 | 0 | **100,00 %** |
| `WFE_WORKFLOW` | 39 | 2 | 37 | **5,13 %** |

### 10.2 Resumen de privilegios DML por usuario, esquema, tabla y privilegio (`DBA_TAB_PRIVS`)

**Total: 145 filas.** Distribución: `ONT_SIR_BOT` = 73 objetos (70 de `ORG_LIQ` + 1 MV + 2 de `WFE_WORKFLOW`); `ONT_SIR_BOT_AUDIT` = 72 objetos (70 de `ORG_LIQ` + 2 de `WFE_WORKFLOW`).

#### 10.2.1 Privilegios de `ONT_SIR_BOT`

```
USUARIO              ESQUEMA             TABLA / OBJETO                       PRIVILEGIOS CONCEDIDOS
-------------------- ------------------- ------------------------------------ ------------------------
ONT_SIR_BOT          ONT_SIR_BOT_AUDIT   MV_PLANILLAS_SIN_CONCILIAR_2024      SELECT
ONT_SIR_BOT          ORG_LIQ             CAUSAS_X_ESTADO                      SELECT
ONT_SIR_BOT          ORG_LIQ             CONF_PLANILLAS_AUT                   SELECT
ONT_SIR_BOT          ORG_LIQ             CONTROL_CIERRE_DIA                   SELECT
ONT_SIR_BOT          ORG_LIQ             CONTROL_CIERRE_DIA_R21               SELECT
ONT_SIR_BOT          ORG_LIQ             CONTROL_CIERRE_DIA_SRM               SELECT
ONT_SIR_BOT          ORG_LIQ             CONTROL_CIERRE_MES                   SELECT
ONT_SIR_BOT          ORG_LIQ             CONTROL_PLN_BCO                      SELECT
ONT_SIR_BOT          ORG_LIQ             CONTROL_TOT_MENSUAL                  SELECT
ONT_SIR_BOT          ORG_LIQ             CONTROL_TOT_MENSUAL_R21              SELECT
ONT_SIR_BOT          ORG_LIQ             CONTROL_TOT_MENSUAL_SRM              SELECT
ONT_SIR_BOT          ORG_LIQ             CONTROL_TOT_MES_BCO                  SELECT
ONT_SIR_BOT          ORG_LIQ             CONTROL_TOT_MES_BCO_R21              SELECT
ONT_SIR_BOT          ORG_LIQ             CONTROL_TOT_MES_ORG                  SELECT
ONT_SIR_BOT          ORG_LIQ             CONTROL_TOT_MES_ORG_R21              SELECT
ONT_SIR_BOT          ORG_LIQ             CONVERSION_PLUC_SENIAT               SELECT
ONT_SIR_BOT          ORG_LIQ             DERECHO_PENDIENTE                    SELECT
ONT_SIR_BOT          ORG_LIQ             DERECHO_PENDIENTE_R21                SELECT
ONT_SIR_BOT          ORG_LIQ             DET_LIQUIDACION                      SELECT
ONT_SIR_BOT          ORG_LIQ             DET_LIQUIDACION_R21                  SELECT
ONT_SIR_BOT          ORG_LIQ             DET_LIQUIDACION_SRM                  SELECT
ONT_SIR_BOT          ORG_LIQ             DET_PAGO_LIQUIDADO                   SELECT
ONT_SIR_BOT          ORG_LIQ             DET_PAGO_LIQUIDADO_1                 SELECT
ONT_SIR_BOT          ORG_LIQ             DET_PAGO_LIQUIDADO_R21               SELECT
ONT_SIR_BOT          ORG_LIQ             DET_PAGO_LIQUIDADO_SRM               SELECT
ONT_SIR_BOT          ORG_LIQ             DET_PLANILLA                         DELETE, INSERT, SELECT
ONT_SIR_BOT          ORG_LIQ             DET_PLANILLA_08072024                SELECT
ONT_SIR_BOT          ORG_LIQ             DET_PLANILLA_20                      SELECT
ONT_SIR_BOT          ORG_LIQ             DET_PLANILLA_29082024                SELECT
ONT_SIR_BOT          ORG_LIQ             DET_PLANILLA_R21                     SELECT
ONT_SIR_BOT          ORG_LIQ             DET_PLANILLA_SRM                     SELECT
ONT_SIR_BOT          ORG_LIQ             ESTADO_LIQUIDACION                   SELECT
ONT_SIR_BOT          ORG_LIQ             ESTADO_TRANSICION                    SELECT
ONT_SIR_BOT          ORG_LIQ             FORMA_IMPUESTO                       SELECT
ONT_SIR_BOT          ORG_LIQ             IMAGEN                               SELECT
ONT_SIR_BOT          ORG_LIQ             LIQUIDACION                          SELECT
ONT_SIR_BOT          ORG_LIQ             LIQUIDACION_R21                      SELECT
ONT_SIR_BOT          ORG_LIQ             LIQUIDACION_SRM                      SELECT
ONT_SIR_BOT          ORG_LIQ             LIQUIDACION_X_FONDO                  SELECT
ONT_SIR_BOT          ORG_LIQ             LIQUIDACION_X_PAGO                   SELECT
ONT_SIR_BOT          ORG_LIQ             LIQUIDACION_X_PAGO_1                 SELECT
ONT_SIR_BOT          ORG_LIQ             LLENADO                              SELECT
ONT_SIR_BOT          ORG_LIQ             LOTE                                 SELECT
ONT_SIR_BOT          ORG_LIQ             LOTE_08072024                        SELECT
ONT_SIR_BOT          ORG_LIQ             NOTA_CREDITO_PLN                     SELECT
ONT_SIR_BOT          ORG_LIQ             NOTA_CREDITO_PLN_08042024            SELECT
ONT_SIR_BOT          ORG_LIQ             NOTA_CREDITO_PLN_08072024            SELECT
ONT_SIR_BOT          ORG_LIQ             NOTA_CREDITO_PLN_R21                 SELECT
ONT_SIR_BOT          ORG_LIQ             NOTA_CREDITO_PLN_SRM                 SELECT
ONT_SIR_BOT          ORG_LIQ             ORGANISMO_LIQUIDADOR                 SELECT
ONT_SIR_BOT          ORG_LIQ             PLANILLA                             DELETE, INSERT, SELECT
ONT_SIR_BOT          ORG_LIQ             PLANILLA_08072024                    SELECT
ONT_SIR_BOT          ORG_LIQ             PLANILLA_20                          SELECT
ONT_SIR_BOT          ORG_LIQ             PLANILLA_29082024                    SELECT
ONT_SIR_BOT          ORG_LIQ             PLANILLA_JACK                        SELECT
ONT_SIR_BOT          ORG_LIQ             PLANILLA_R21                         SELECT
ONT_SIR_BOT          ORG_LIQ             PLANILLA_SRM                         SELECT
ONT_SIR_BOT          ORG_LIQ             PLUC_X_FORMA_IMPUESTO                SELECT
ONT_SIR_BOT          ORG_LIQ             PLUC_X_LIQUIDACION                   SELECT
ONT_SIR_BOT          ORG_LIQ             PLUC_X_ORGANISMO                     SELECT
ONT_SIR_BOT          ORG_LIQ             PRUEBA_LIQ                           SELECT
ONT_SIR_BOT          ORG_LIQ             PRUEBA_LIQ_R21                       SELECT
ONT_SIR_BOT          ORG_LIQ             REVERSO_PLN                          SELECT
ONT_SIR_BOT          ORG_LIQ             SEGUIMIENTO_LIQUIDACION              SELECT
ONT_SIR_BOT          ORG_LIQ             TIPO_REINTEGRO_DEVOLUCION            SELECT
ONT_SIR_BOT          ORG_LIQ             TIPO_REVERSO                         SELECT
ONT_SIR_BOT          ORG_LIQ             TXT_SENIAT                           SELECT, UPDATE
ONT_SIR_BOT          ORG_LIQ             TXT_SENIAT_R21                       SELECT
ONT_SIR_BOT          ORG_LIQ             TXT_SENIAT_SRM                       SELECT
ONT_SIR_BOT          ORG_LIQ             XML_SENIAT                           SELECT
ONT_SIR_BOT          ORG_LIQ             XML_SENIAT_R21                       SELECT
ONT_SIR_BOT          WFE_WORKFLOW        WF_AUDITA_EXPEDIENTES                INSERT
ONT_SIR_BOT          WFE_WORKFLOW        WF_WORK_ITEM                         INSERT, UPDATE
```

#### 10.2.2 Privilegios de `ONT_SIR_BOT_AUDIT`

```
USUARIO              ESQUEMA             TABLA / OBJETO                       PRIVILEGIOS CONCEDIDOS
-------------------- ------------------- ------------------------------------ ------------------------
ONT_SIR_BOT_AUDIT    ORG_LIQ             CAUSAS_X_ESTADO                      SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONF_PLANILLAS_AUT                   SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONTROL_CIERRE_DIA                   SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONTROL_CIERRE_DIA_R21               SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONTROL_CIERRE_DIA_SRM               SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONTROL_CIERRE_MES                   SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONTROL_PLN_BCO                      SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONTROL_TOT_MENSUAL                  SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONTROL_TOT_MENSUAL_R21              SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONTROL_TOT_MENSUAL_SRM              SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONTROL_TOT_MES_BCO                  SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONTROL_TOT_MES_BCO_R21              SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONTROL_TOT_MES_ORG                  SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONTROL_TOT_MES_ORG_R21              SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             CONVERSION_PLUC_SENIAT               SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DERECHO_PENDIENTE                    SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DERECHO_PENDIENTE_R21                SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_LIQUIDACION                      SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_LIQUIDACION_R21                  SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_LIQUIDACION_SRM                  SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_PAGO_LIQUIDADO                   SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_PAGO_LIQUIDADO_1                 SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_PAGO_LIQUIDADO_R21               SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_PAGO_LIQUIDADO_SRM               SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_PLANILLA                         SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_PLANILLA_08072024                SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_PLANILLA_20                      SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_PLANILLA_29082024                SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_PLANILLA_R21                     SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             DET_PLANILLA_SRM                     SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             ESTADO_LIQUIDACION                   SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             ESTADO_TRANSICION                    SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             FORMA_IMPUESTO                       SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             IMAGEN                               SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             LIQUIDACION                          SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             LIQUIDACION_R21                      SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             LIQUIDACION_SRM                      SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             LIQUIDACION_X_FONDO                  SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             LIQUIDACION_X_PAGO                   SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             LIQUIDACION_X_PAGO_1                 SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             LLENADO                              SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             LOTE                                 SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             LOTE_08072024                        SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             NOTA_CREDITO_PLN                     SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             NOTA_CREDITO_PLN_08042024            SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             NOTA_CREDITO_PLN_08072024            SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             NOTA_CREDITO_PLN_R21                 SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             NOTA_CREDITO_PLN_SRM                 SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             ORGANISMO_LIQUIDADOR                 SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             PLANILLA                             SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             PLANILLA_08072024                    SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             PLANILLA_20                          SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             PLANILLA_29082024                    SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             PLANILLA_JACK                        SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             PLANILLA_R21                         SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             PLANILLA_SRM                         SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             PLUC_X_FORMA_IMPUESTO                SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             PLUC_X_LIQUIDACION                   SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             PLUC_X_ORGANISMO                     SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             PRUEBA_LIQ                           SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             PRUEBA_LIQ_R21                       SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             REVERSO_PLN                          SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             SEGUIMIENTO_LIQUIDACION              SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             TIPO_REINTEGRO_DEVOLUCION            SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             TIPO_REVERSO                         SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             TXT_SENIAT                           SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             TXT_SENIAT_R21                       SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             TXT_SENIAT_SRM                       SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             XML_SENIAT                           SELECT
ONT_SIR_BOT_AUDIT    ORG_LIQ             XML_SENIAT_R21                       SELECT
ONT_SIR_BOT_AUDIT    WFE_WORKFLOW        WF_USERS                             SELECT
ONT_SIR_BOT_AUDIT    WFE_WORKFLOW        WF_WORK_ITEM                         SELECT

145 rows selected.
```

### 10.3 Estatus de objetos del esquema `ONT_SIR_BOT_AUDIT`

```
ESQUEMA             NOMBRE OBJETO                     TIPO OBJETO          ESTATUS   FECHA CREACION        ULTIMA MODIF. (DDL)
------------------- --------------------------------- -------------------- --------- --------------------- ---------------------
ONT_SIR_BOT_AUDIT   MV_AUDIT_ASIGNACIONES_2024        MATERIALIZED VIEW    VALID     2026-09-03 07:59:19   2026-09-03 08:28:21
ONT_SIR_BOT_AUDIT   MV_PLANILLAS_SIN_CONCILIAR_2024   MATERIALIZED VIEW    VALID     2026-09-03 07:48:02   2026-09-03 07:48:02
ONT_SIR_BOT_AUDIT   MV_AUDIT_ASIGNACIONES_2024        TABLE                VALID     2026-09-03 07:58:31   2026-09-03 07:59:19
ONT_SIR_BOT_AUDIT   MV_PLANILLAS_SIN_CONCILIAR_2024   TABLE                VALID     2026-09-03 07:44:04   2026-09-03 07:55:15
```

Los cuatro objetos en estatus **VALID** (cada MV con su tabla de contenedor asociada).

### 10.4 Prueba de refresco manual vía `DBMS_MVIEW.REFRESH`

```
ESQUEMA             VISTA MATERIALIZADA               ESTADO    ULTIMO REFRESCO
------------------- --------------------------------- --------- ---------------------
ONT_SIR_BOT_AUDIT   MV_AUDIT_ASIGNACIONES_2024        VALID     2026-09-03 07:59:19
ONT_SIR_BOT_AUDIT   MV_PLANILLAS_SIN_CONCILIAR_2024   VALID     2026-09-03 07:48:02

2 rows selected.
```

**Volumetría resultante:**

```
OBJETO                            TOTAL_FILAS
--------------------------------- -----------
MV_PLANILLAS_SIN_CONCILIAR_2024      2.567.350
MV_AUDIT_ASIGNACIONES_2024             280.939
```

| Vista materializada | Total de filas |
|---|---:|
| `MV_PLANILLAS_SIN_CONCILIAR_2024` | 2.567.350 |
| `MV_AUDIT_ASIGNACIONES_2024` | 280.939 |

### 10.5 Estatus de índices creados (`DBA_INDEXES`)

```
ESQUEMA         NOMBRE INDICE             TABLA ORIGEN    TABLESPACE               ESTATUS   PARALELISM
--------------- ------------------------- --------------- ------------------------ --------- ----------
ORG_LIQ         IDX_PLANILLA_LOTE_ID      PLANILLA        ORG_LIQ_IDX01_128M_02    VALID     1
ORG_LIQ         IDX_TXT_OPT_HUERFANAS     TXT_SENIAT      ORG_LIQ_IDX01_128M_02    VALID     1
WFE_WORKFLOW    IDX_WFE_EXP_ESTADO        WF_WORK_ITEM    WORKFLOW_IDX02_128M      VALID     1

3 rows selected.
```

Los tres índices quedaron en estatus **VALID** y con grado de paralelismo final `1`, según lo previsto por las sentencias `ALTER INDEX ... NOPARALLEL`.

---

## 11. Observaciones y hallazgos de revisión

Estos puntos surgen de cruzar los scripts ejecutados (secciones 2–9) contra las evidencias de verificación (sección 10). No formaban parte del PDF original; se agregan como valor de revisión.

### 🔴 Bloqueantes / a corregir antes del cierre del pase

1. **El bloque PL/SQL de `WFE_WORKFLOW` está mal parametrizado.**
   El bloque rotulado como `WFE_WORKFLOW` en la sección 5.2 es una copia literal del de `ORG_LIQ`: el cursor lee `owner = 'ORG_LIQ'` y el `EXECUTE IMMEDIATE` construye `'GRANT SELECT ON ORG_LIQ.' || ...`. Al ser sintácticamente válido, Oracle responde `PL/SQL procedure successfully completed.` sin conceder nada sobre `WFE_WORKFLOW`. Consecuencia directa: la conformidad de ese esquema quedó en **2 de 39 objetos (5,13 %)** — los únicos dos otorgados explícitamente (`WF_USERS` y `WF_WORK_ITEM`) fueron los de la sección 7.2, requeridos por la MV.

   **Corrección propuesta:**

   ```sql
   BEGIN
     FOR r IN (SELECT table_name AS obj FROM dba_tables WHERE owner = 'WFE_WORKFLOW'
               UNION ALL
               SELECT view_name  AS obj FROM dba_views  WHERE owner = 'WFE_WORKFLOW') LOOP
       EXECUTE IMMEDIATE 'GRANT SELECT ON WFE_WORKFLOW."' || r.obj || '" TO ONT_SIR_BOT';
       EXECUTE IMMEDIATE 'GRANT SELECT ON WFE_WORKFLOW."' || r.obj || '" TO ONT_SIR_BOT_AUDIT';
     END LOOP;
   END;
   /
   ```

   > Alternativamente, si el alcance real del bot no requiere los 39 objetos, corresponde **ajustar la matriz de la sección 1.3** (que declara `WFE_WORKFLOW.* (39 objetos) SELECT 100 %`) para que refleje el alcance mínimo necesario. Hoy la matriz y la evidencia se contradicen.

2. **Falta el `GRANT SELECT` de `MV_AUDIT_ASIGNACIONES_2024` a `ONT_SIR_BOT` en `DBA_TAB_PRIVS`.**
   El listado de 145 filas incluye para `ONT_SIR_BOT` únicamente `ONT_SIR_BOT_AUDIT.MV_PLANILLAS_SIN_CONCILIAR_2024`. La segunda MV no aparece, aunque la matriz de la sección 1.3 la declara con `SELECT` + sinónimo privado. Coincide con que en la sección 7.2 el `GRANT` y el `CREATE SYNONYM` son las **únicas sentencias del documento sin respuesta registrada**. Verificar y, de ser necesario, reejecutar:

   ```sql
   GRANT SELECT ON ONT_SIR_BOT_AUDIT.MV_AUDIT_ASIGNACIONES_2024 TO ONT_SIR_BOT;

   CREATE SYNONYM ONT_SIR_BOT.MV_AUDIT_ASIGNACIONES_2024
   FOR ONT_SIR_BOT_AUDIT.MV_AUDIT_ASIGNACIONES_2024;
   ```

   Validación sugerida:

   ```sql
   SELECT * FROM dba_tab_privs
   WHERE grantee = 'ONT_SIR_BOT' AND table_name = 'MV_AUDIT_ASIGNACIONES_2024';

   SELECT * FROM dba_synonyms WHERE owner = 'ONT_SIR_BOT';
   ```

3. **`WF_AUDITA_EXPEDIENTES` tiene `INSERT` pero no `SELECT`.**
   El bot puede insertar en la tabla de auditoría pero no leerla. Si el proceso necesita verificar idempotencia (no reinsertar un expediente ya auditado), fallará con `ORA-00942`. Evaluar si corresponde agregar `SELECT`.

### 🟡 Puntos a documentar / cerrar

4. **DDL faltante de `WFE_WORKFLOW.IDX_WFE_EXP_ESTADO`.** El índice aparece en la recolección de estadísticas (sección 9.3) y en la verificación final (sección 10.5), sobre `WF_WORK_ITEM` y en el tablespace `WORKFLOW_IDX02_128M`, pero su sentencia `CREATE INDEX` no está incluida. Debe incorporarse para que el documento sirva como guion de reconstrucción completo.

5. **Divergencia producción vs. certificación en `ORG_LIQ.PLANILLA`.** En producción se otorgó `DELETE, INSERT` (sección 6.1); en el ambiente de certificación solo `INSERT` (sección 8). Si el proceso ejecuta borrados, certificación no reproduce el comportamiento productivo y las pruebas no serán representativas.

6. **`LOG_CONCILIACION` sigue en standby.** Sin el DDL definitivo de ONT, el proyecto no tiene bitácora persistente de conciliación. Conviene fijar fecha de entrega, ya que la adenda es prerrequisito para la trazabilidad del bot.

7. **`PRF_ONT_BOT` con `FAILED_LOGIN_ATTEMPTS UNLIMITED`.** Justificado operativamente (evita bloqueo del bot), pero elimina la protección contra ataques de fuerza bruta sobre cuentas con `DELETE`/`UPDATE` en tablas de recaudación. Se sugiere compensarlo con restricción por origen (ACL de red, `sqlnet.ora` / perfil de listener) y rotación manual de credenciales documentada.

8. **Credenciales en texto plano en un entregable del pase.** Ambas passwords productivas aparecen dos veces en el documento (secciones 1.1 y 8). Recomendable emitir una versión redactada para circulación y mantener las credenciales en la bóveda institucional.

### 🔵 Notas técnicas sobre los artefactos

9. **`SUM(lote_id)` y `SUM(expediente)` en `MV_PLANILLAS_SIN_CONCILIAR_2024`.** Ambas columnas se agregan con `SUM` sobre lo que parecen ser identificadores, no magnitudes. Si el `GROUP BY` puede devolver más de un lote o expediente por combinación *fecha / banco / agencia*, el resultado será un número sin significado de negocio. Vale la pena confirmar con el área funcional si la intención era `MAX`, `MIN` o `LISTAGG`.

10. **Volumen de `MV_PLANILLAS_SIN_CONCILIAR_2024`: 2.567.350 filas.** El join final es cartesiano parcial contra `TXT_SENIAT` por la tripleta *fecha / banco / agencia*, lo que multiplica cada grupo con diferencia por todas las planillas huérfanas de esa combinación. Es consistente con el diseño, pero conviene dimensionar el impacto en el tablespace: la cuota de `ONT_SIR_BOT_AUDIT` es `UNLIMITED`, pero el datafile inicial de `500M` crecerá por autoextend.

11. **`REFRESH FORCE ON DEMAND` en ambas MVs.** No hay `MATERIALIZED VIEW LOG` sobre las tablas origen, por lo que `FORCE` degradará siempre a `COMPLETE`. Dado el volumen, definir explícitamente la ventana de refresco (job programado, horario de baja carga) y, si el tiempo de reconstrucción resulta alto, evaluar `ATOMIC_REFRESH => FALSE` para permitir refresco en modo `TRUNCATE + INSERT /*+ APPEND */`.

12. **Filtro `UT.ORGA_ID IN ('093', '93')` en `MV_AUDIT_ASIGNACIONES_2024`.** El doble valor sugiere inconsistencia de datos en el origen (mismo código almacenado con y sin cero a la izquierda). El filtro funciona, pero conviene registrarlo como deuda de calidad de datos en `WF_USERS`.

13. **Alcance temporal fijo en 2024.** Ambas MVs tienen el rango `01/01/2024 – 01/01/2025` embebido en el SQL y en el nombre del objeto. Para el ejercicio siguiente habrá que crear artefactos nuevos o parametrizar el rango; conviene decidirlo antes de que el bot entre en régimen.

---

*Documento convertido a Markdown desde el PDF original "Proyecto de Automatización del Proceso de Planillas Pendientes por Conciliar ONT - Producción SIGECOF". Las secciones 1 a 10 reproducen fielmente el contenido original; la sección 11 es un anexo de revisión.*
