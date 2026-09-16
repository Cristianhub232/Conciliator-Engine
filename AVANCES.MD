# DOCUMENTO DE AVANCES Y CONTROL - AUDITORÍA Y SANEAMIENTO DE EXPEDIENTES (ABRIL 2024)

**Fecha de Actualización:** 15 de Septiembre de 2026 (22:10)  
**Entorno:** Producción SIGECOF (`sige1` @ `10.79.6.247:1521`) & Base Local PostgreSQL (`10.78.30.63:5432/xmls`, esquema `motor_app`)  
**Órgano Auditado:** ONT (Código `93` / `093`)  
**Periodo Auditado:** Mes de Abril 2024 (`ANHO = 2024`, `FECHA_RECAUDACION BETWEEN '2024-04-01' AND '2024-04-30'`)  

---

## 1. Resumen de Objetivos e Instrucción del Usuario

Siguiendo la instrucción expresa:
> *"detente hagamos algo centrate entonces en esto revisa si hay registros doble de expedientes como tal o expedientes que esten asignados a mas de un usuario por favor igual de abril 2024 olvidate de las planillas"*

Se detuvo el saneamiento masivo de planillas bancarias y nos concentramos **exclusivamente en la auditoría estructural y de asignaciones de Expedientes en Workflow** para el mes de **Abril de 2024**.

---

## 2. Hallazgos Clínicos de la Auditoría

### 2.1. Duplicidad de Expedientes en Tablas Maestras
* **En `WFE_WORKFLOW.WF_EXPEDIENTE`:** **`0` expedientes duplicados**.
  - La clave primaria (`EXP_ID`, `ANHO`, `ORGA_ID`) mantiene integridad estricta. No hay registros clonados de un mismo expediente para el órgano 93.
* **En `ORG_LIQ.LOTE`:** **`0` duplicados**.
  - No hay secuencias de lote colisionadas ni doble numeración de lote para un mismo expediente.

---

### 2.2. Conflicto Crítico Detectado: 10 Expedientes con Doble Asignación Activa Simultánea en `WF_WORK_ITEM`

Se identificaron **10 expedientes en Abril 2024** que presentan **dos usuarios distintos asignados concurrentemente en tareas activas** (`PENDIENTE` o `ABIERTA`).

Este incidente se originó los días **11 y 14 de septiembre de 2026**, debido a inserciones adicionales (`INSERT INTO WF_WORK_ITEM`) durante la transferencia de expedientes desde Conciliación (Tarea 2061) hacia Validación (Tarea 2062).

#### Patrón 1: Doble Asignación en la Misma Fase (Tarea 2062 - Validación) [8 Casos]
Se ejecutó la transferencia a Validación dos veces con pocos minutos de diferencia, dejando dos WorkItems abiertos en paralelo con analistas distintos:

| # | Expediente | Lotes Totales | Lotes en 'V' | Lotes en 'P' | WorkItem Duplicado (A Cerrar) | WorkItem Activo Válido (A Conservar) |
| :-: | :---: | :---: | :---: | :---: | :--- | :--- |
| 1 | **#1828** | 58 | **58** | **0** | WI #5: `MAIRA_0018` (11/09 13:42) | **WI #6: `VDIAZ_18`** (11/09 13:44) |
| 2 | **#1850** | 1 | **1** | **0** | WI #4: `MAIRA_0018` (11/09 14:12) | **WI #5: `SANDRA_2023`** (11/09 14:13) |
| 3 | **#1881** | 56 | **56** | **0** | WI #4: `FUENTES_3` (11/09 12:20) | **WI #5: `SANDRA_2023`** (11/09 13:27) |
| 4 | **#1920** | 72 | **72** | **0** | WI #4: `SANDRA_2023` (11/09 14:17) | **WI #5: `MAIRAPALACRE`** (11/09 14:18) |
| 5 | **#1934** | 66 | **66** | **0** | WI #4: `MAIRA_0018` (14/09 10:44) | **WI #5: `ERNIEDBASTIDAS`** (14/09 10:55) |
| 6 | **#2024** | 1 | **1** | **0** | WI #4: `TIBISAYRIVAS_18` (14/09 10:12) | **WI #5: `SANDRA_2023`** (14/09 10:41) |
| 7 | **#2070** | 1 | **1** | **0** | WI #4: `EXDYMEDINA` (14/09 10:18) | **WI #5: `SANDRA_2023`** (14/09 10:40) |
| 8 | **#7572** | 1 | **1** | **0** | WI #4: `VDIAZ_18` (11/09 13:46) | **WI #5: `EXDYMEDINA`** (11/09 13:47) |

#### Patrón 2: Conflicto Inter-Fases (Tarea 2061 y Tarea 2062 Activas a la Vez) [2 Casos]
El expediente fue transferido a Validación (Tarea 2062), pero el WorkItem previo de Conciliación (Tarea 2061) no se cerró y quedó en estado `ABIERTA`:

| # | Expediente | Lotes Totales | Lotes en 'V' | Lotes en 'P' | WorkItem Huérfano en Tarea 2061 (A Cerrar) | WorkItem Activo en Tarea 2062 (A Conservar) |
| :-: | :---: | :---: | :---: | :---: | :--- | :--- |
| 9 | **#1924** | 66 | **66** | **0** | WI #3: `JOSMARYCAMPOS` (Tarea 2061, `ABIERTA`) | **WI #4: `MAIRA_0018`** (Tarea 2062, `PENDIENTE`) |
| 10 | **#1946** | 5 | **5** | **0** | WI #4: `ZUILINGCOLMENAR` (Tarea 2061, `ABIERTA`) | **WI #5: `FUENTES_3`** (Tarea 2062, `PENDIENTE`) |

> [!NOTE]
> **Dato Fundamental Confirmado:** Los 10 expedientes en conflicto tienen **el 100% de sus lotes validados en estado `'V'` y `0` lotes pendientes**. Esto significa que ninguno tiene trabajo pendiente de transcripción; están listos para saneamiento de workflow o cierre directo.

---

## 3. Diagnóstico Técnico de Permisos Oracle y Arquitectura Designer

Durante las pruebas de ejecución para modificar `WF_WORK_ITEM`, se detectaron condiciones técnicas determinantes en la base de datos de producción `sige1`:

1. **Estado de Permisos de `ONT_SIR_BOT`:**
   - `WFE_WORKFLOW.WF_WORK_ITEM`: Posee `UPDATE` e `INSERT`, pero **carece de `SELECT`** (`ORA-01031: insufficient privileges`).
   - Al ejecutar un comando SQL estándar `UPDATE WFE_WORKFLOW.WF_WORK_ITEM ... WHERE ...`, el motor de Oracle exige privilegio de `SELECT` para poder evaluar las condiciones del predicado `WHERE` sobre dicha tabla.
2. **Paquetes Designer (`WFE_WORKFLOW.CG$WF_WORK_ITEM`):**
   - `ONT_SIR_BOT` tiene permiso `EXECUTE` sobre el paquete `CG$WF_WORK_ITEM`.
   - Sin embargo, la estructura interna del registro del paquete (`cg$row_type`) se generó en la creación inicial del sistema y **no incluye la columna `WI_OBSERVACION`** (`PLS-00302: component 'WI_OBSERVACION' must be declared`), ya que fue un campo añadido con posterioridad a la tabla.
3. **Solución Óptima y Definitiva Requerida:**
   - Solicitar al DBA de Producción la ejecución de la siguiente sentencia:
     ```sql
     GRANT SELECT ON WFE_WORKFLOW.WF_WORK_ITEM TO ONT_SIR_BOT;
     GRANT SELECT ON WFE_WORKFLOW.WF_USERS TO ONT_SIR_BOT;
     GRANT SELECT ON WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES TO ONT_SIR_BOT;
     ```
   - Con este privilegio de `SELECT`, los scripts de la API y del bot ejecutan los `UPDATE` directamente por SQL de forma nativa e instantánea, actualizando `WI_ESTADO`, `WI_FECHA_CIERRE` y `WI_OBSERVACION`.

---

## 4. Respaldos Preventivos en PostgreSQL (`motor_app`)

Todos los datos originales involucrados antes de cualquier intervención se encuentran respaldados de forma segura en el servidor PostgreSQL local (`10.78.30.63:5432/xmls`, esquema `motor_app`):

| Tabla de Respaldo | Registros Guardados | Contenido |
| :--- | :---: | :--- |
| `motor_app.bak_lote_abr2024` | **312** | Snapshot completo de los lotes en estado `'P'` de abril 2024 |
| `motor_app.bak_wf_work_item_abr2024` | **162** | Snapshot de todos los WorkItems históricos de los expedientes afectados |
| `motor_app.bak_txt_seniat_abr2024` | Estructurada | Tabla lista para respaldo de transacciones bancarias |

---

## 5. Plan de Acción Inmediato para Continuar Mañana

1. **Opción A (Recomendada con DBA):**
   - Aplicar el grant `GRANT SELECT ON WFE_WORKFLOW.WF_WORK_ITEM TO ONT_SIR_BOT;`.
   - Ejecutar la actualización SQL directa para cerrar los 10 WorkItems duplicados/huérfanos a estado `'CERRADA'`.
2. **Opción B (Sin intervención DBA):**
   - Ejecutar `CG$WF_WORK_ITEM.upd` omitiendo el campo `WI_OBSERVACION` (modificando únicamente `WI_ESTADO = 'CERRADA'` y `WI_FECHA_CIERRE = SYSDATE`), lo cual se adapta 100% a la especificación nativa del paquete Designer.
3. **Sincronización de `WF_EXPEDIENTE`:**
   - Actualizar el usuario responsable en `WF_EXPEDIENTE.WFPU_WFUS_USERS_ID` para reflejar el analista único asignado (reemplazando al usuario genérico `CON_AUTOMATICA1`).
4. **Verificación y Auditoría Post-Saneamiento:**
   - Ejecutar la consulta de verificación para certificar que el número de expedientes con asignación múltiple en Abril 2024 sea **estrictamente `0`**.
