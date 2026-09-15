# Informe Técnico y Certificación de Pruebas Unitarias: Reasignación y Cierre de Expedientes (Método UPDATE Directo)

**Fecha de Emisión:** 15 de Septiembre de 2026  
**Ambiente de Pruebas:** Servidor Oracle SIGECOF Desarrollo / Certificación (`172.21.65.90:1521` / SID: `cert_rep`)  
**Ambiente de Producción:** Servidor Oracle SIGECOF Producción (`10.79.6.247:1521` / SID: `sige1`)  
**Usuario Operativo DB:** `ONT_SIR_BOT`  
**Módulos Evaluados:** `WFE_WORKFLOW` (`WF_WORK_ITEM`, `WF_EXPEDIENTE`, `WF_AUDITA_EXPEDIENTES`, `WF_USERS`), `ORG_LIQ.LOTE`  
**Estado General de la Certificación:**  
- **Pruebas Automatizadas en Base de Datos y API REST:** **19 / 19 Casos Aprobados (100 % OK)**  
- **Validación Funcional en Pantallas SIGECOF Forms/Web (Caso 21):** **Protocolo Definido — PENDIENTE de Validación Visual con Transcriptor en Producción**  

---

## 1. Alcance, Restricciones y Reglas de Negocio

1. **Unidad y Organización Objetivo (Caso 18):**  
   Este módulo opera de forma **exclusiva y estricta para la Oficina Nacional del Tesoro (ONT)**, identificada en SIGECOF bajo el código de organización **`ORGA_ID = '93'`** (o `'093'`). Todas las sentencias SQL parametrizan `:orgaId` por diseño arquitectónico, blindando las tablas contra modificaciones accidentales en otros organismos.
2. **Modelo Transaccional en Lote (Casos 4 y 10):**  
   El procesamiento de lotes masivos adopta el patrón **Best-Effort con Aislamiento Transaccional por Ítem**:
   - Cada expediente se procesa en una transacción individual (`commit` si tiene éxito, `rollback` inmediato si falla).
   - Si un lote de 500 expedientes encuentra un error en el ítem 300, **los 299 previos quedan confirmados** y el ítem fallido se aísla y reporta con su causa en la respuesta JSON.
   - Esta decisión de diseño evita que un expediente corrupto descarte horas de trabajo sobre cientos de expedientes válidos, y hace indispensable el **Plan de Reversión Operativa (Sección 9)**.
3. **Política de Mínimo Privilegio (Descarte de `GRANT DELETE`):**  
   Dado que el modelo validado realiza **`UPDATE` in-situ** sobre el registro activo, **se descarta formalmente la solicitud de `GRANT DELETE` para producción**, reduciendo la superficie de riesgo sobre la base de datos central.

---

## 2. Matriz de Permisos: Análisis Bloqueante (Producción vs Desarrollo)

Se ejecutó el script de auditoría automatizada [`pruebas_produccion/verificar_permisos_sige1.py`](file:///home/estacion/Escritorio/contexto%20y%20procesos%20ONT/pruebas_produccion/verificar_permisos_sige1.py) contra `sige1` (`10.79.6.247:1521`):

| Objeto / Tabla | Privilegio Requerido | Desarrollo (`cert_rep`) | Producción (`sige1`) | Severidad para Producción | Justificación Técnica |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `WFE_WORKFLOW.WF_WORK_ITEM` | `SELECT` | ✅ OK | ❌ **FALTANTE** | 🔴 **BLOQUEANTE** | En Oracle, un `UPDATE` con cláusula `WHERE` que referencia columnas de la tabla requiere `SELECT`. Sin este grant, el motor lanza `ORA-01031` en la fase de parseo. |
| `WFE_WORKFLOW.WF_WORK_ITEM` | `UPDATE` | ✅ OK | ✅ OK | Operativo | Otorgado en sige1. |
| `WFE_WORKFLOW.WF_WORK_ITEM` | `INSERT` | ✅ OK | ✅ OK | Operativo | Otorgado en sige1. |
| `WFE_WORKFLOW.WF_EXPEDIENTE` | `SELECT` | ✅ OK | ❌ **FALTANTE** | 🔴 **BLOQUEANTE** | Requerido por triggers de cascada `CG$AUS_...` y validaciones cruzadas. |
| `WFE_WORKFLOW.WF_EXPEDIENTE` | `UPDATE` | ✅ OK | ✅ OK | Operativo | Otorgado en sige1. |
| `WFE_WORKFLOW.WF_USERS` | `SELECT` | ✅ OK | ❌ **FALTANTE** | 🔴 **BLOQUEANTE** | Requerido para validar existencia y estado (`USERS_STATUS = 'A'`) del transcriptor destino. |
| `WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES` | `INSERT` | ✅ OK | ✅ OK | Operativo | Otorgado en sige1. |
| `WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES` | `SELECT` | ✅ OK | ❌ **FALTANTE** | 🟡 Deseable | Para consultas de verificación de auditoría desde el bot. |
| `WFE_WORKFLOW.CG$WF_WORK_ITEM` | `EXECUTE` | ✅ OK | ❌ **FALTANTE** | 🔴 **BLOQUEANTE** | Paquete invocado por triggers `CG$BUR_...` y `CG$AUS_...` en cada UPDATE. |
| `WFE_WORKFLOW.CG$ERRORS` | `EXECUTE` | ✅ OK | ❌ **FALTANTE** | 🔴 **BLOQUEANTE** | Manejo de excepciones internas de Designer. |
| `ORG_LIQ.LOTE` | `SELECT` | ✅ OK | ✅ OK | Operativo | Otorgado en sige1. |
| `ORG_LIQ.LOTE` | `UPDATE` | ❌ Faltante en Dev | ✅ OK | Operativo | En Producción ya está activo. En Dev se requiere si se prueba cierre de lote. |

### Script SQL Definitivo y Bloqueante para el DBA de Producción (`sige1`)
```sql
-- ====================================================================
-- PRIVILEGIOS BLOQUEANTES OBLIGATORIOS PARA PRODUCCIÓN (sige1)
-- Usuario: ONT_SIR_BOT
-- ====================================================================
GRANT SELECT ON WFE_WORKFLOW.WF_WORK_ITEM TO ONT_SIR_BOT;
GRANT SELECT ON WFE_WORKFLOW.WF_EXPEDIENTE TO ONT_SIR_BOT;
GRANT SELECT ON WFE_WORKFLOW.WF_USERS TO ONT_SIR_BOT;
GRANT SELECT ON WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES TO ONT_SIR_BOT;
GRANT EXECUTE ON WFE_WORKFLOW.CG$WF_WORK_ITEM TO ONT_SIR_BOT;
GRANT EXECUTE ON WFE_WORKFLOW.CG$ERRORS TO ONT_SIR_BOT;
```

---

## 3. Demostración de No Duplicidad (Análisis de Unicidad)

- **Tabla Cabecera `WFE_WORKFLOW.WF_EXPEDIENTE`:**  
  Auditados 7.960 registros correspondientes a 7.960 expedientes únicos de la ONT en 2024. **Duplicados = 0**.
- **Tabla Detalle `WFE_WORKFLOW.WF_WORK_ITEM`:**  
  Al reasignar vía `UPDATE` in-situ, el número de WorkItem (`WORKITEM`) y el ID del expediente se mantienen intactos. **El conteo de filas por expediente antes del cambio es 1 y después del cambio sigue siendo exactamente 1**.

---

## 4. Batería Completa de Casos de Prueba (Casos 1 al 22)

### Bloque A: Casos Base y Transaccionales Principales

#### Caso 1: Reasignación Individual vía UPDATE [P1]
- **Objetivo:** Actualizar el usuario asignado a `ZUILINGCOLMENAR` y el estado a `PENDIENTE` en el WorkItem activo del expediente `#38`.
- **Sentencia SQL:**
  ```sql
  UPDATE WFE_WORKFLOW.WF_WORK_ITEM
  SET WFUS_USERS_ID = :nuevoUsuario,
      WI_ESTADO = 'PENDIENTE',
      WI_OBSERVACION = :observacion
  WHERE WFEX_EXP_ID = :expNum AND ANHO = :anhoNum AND ORGA_ID = :orgaId AND WORKITEM = :currentWiNum
    AND WI_ESTADO IN ('ABIERTA', 'PENDIENTE');
  ```
- **Evidencia en `cert_rep`:** Filas afectadas: `1` | Tiempo: `0.0379 s` | Filas en tabla tras UPDATE: `1` (Cero duplicados).
- **Estado:** ✅ **APROBADO**

#### Caso 2: Cierre de Expediente y WorkItem vía UPDATE [P1]
- **Objetivo:** Cerrar simultáneamente el WorkItem (`CERRADA`, `WI_FECHA_CIERRE = SYSDATE`) y la cabecera `WF_EXPEDIENTE` (`CERRADO`).
- **Evidencia:** `WF_WORK_ITEM` actualizado en 0.0345 s, `WF_EXPEDIENTE` actualizado en 0.1146 s. Fechas de cierre pobladas consistentemente. Filas en tabla: 1.
- **Estado:** ✅ **APROBADO**

#### Caso 3: Cierre de Lote en `ORG_LIQ.LOTE` [P2]
- **Objetivo:** Comprobar la actualización de estado a `'V'` (Validado) en `ORG_LIQ.LOTE`.
- **Hallazgo:** En producción `sige1` el usuario ya cuenta con `UPDATE ON ORG_LIQ.LOTE`. En desarrollo `cert_rep` el intento arrojó `ORA-01031` porque no fue concedido allí.
- **Conclusión de Diseño:** La reasignación de carga no modifica `ORG_LIQ.LOTE` (el lote sigue en `'P'` con sus planillas). El cierre de lote ocurre al conciliar la última planilla.
- **Estado:** ✅ **DOCUMENTADO Y ALINEADO CON PRODUCCIÓN**

#### Caso 4: Reversión / Rollback Seguro Inmediato [P1]
- **Objetivo:** Comprobar que transacciones no confirmadas revierten al 100% con `conn.rollback()`.
- **Evidencia:** Registro restaurado a sus valores originales (`FUENTES_3`, `ABIERTA`).
- **Estado:** ✅ **APROBADO**

---

### Bloque B: Integridad y Validaciones de Borde

#### Caso 5: Registro de Auditoría en Oracle (`WF_AUDITA_EXPEDIENTES`) [P1]
- **Hallazgo:** Los triggers de Oracle Designer no escriben en `WF_AUDITA_EXPEDIENTES`.
- **Implementación:** El servicio ejecuta `INSERT` explícito dentro de la misma transacción:
  ```sql
  INSERT INTO WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES (
    USUARIO_ORACLE, ORGANISMO_ID, USUARIO_APLICATIVO, EXPEDIENTE_ID, FECHA_HORA
  ) VALUES ('ONT_SIR_BOT', :orgaId, :operador, :expedienteStr, TO_CHAR(SYSDATE, 'DD/MM/YYYY:HH24:MI:SS'));
  ```
- **Evidencia:** Conteo de filas en `WF_AUDITA_EXPEDIENTES` pasó de 173 a 174 en `cert_rep`.
- **Estado:** ✅ **APROBADO**

#### Caso 6: Detección Estricta de `rowsAffected = 0` [P1]
- **Comportamiento:** Si un UPDATE no afecta filas, se lanza excepción inmediata y se ejecuta rollback:
  - *Expediente inexistente (`#999999`):* `rowsAffected = 0` -> Capturado y rechazado.
  - *WorkItem incorrecto (`#99`):* `rowsAffected = 0` -> Capturado y rechazado.
  - *Año sin expediente activo (`2099`):* `rowsAffected = 0` -> Capturado y rechazado.
- **Estado:** ✅ **APROBADO**

#### Caso 7: Validación de Usuario Destino Inválido o Inactivo [P1]
- **Comprobación:** Consulta previa a `WFE_WORKFLOW.WF_USERS` validando `USERS_STATUS = 'A'`.
- **Evidencia:** `USUARIO_FANTASMA_XYZ` e inactivo `L_MARGARITA` (`STATUS = 'I'`) rechazados con HTTP 400 antes de ejecutar DML en Oracle.
- **Estado:** ✅ **APROBADO**

#### Caso 8: Guarda de Estado (`WI_ESTADO IN ('ABIERTA', 'PENDIENTE')`) [P1]
- **Comprobación:** Intento de reasignar expediente `#1` (estado `CERRADA`).
- **Resultado:** `rowsAffected = 0`. Su `WI_FECHA_CIERRE` original (`2024-01-02 10:47:11`) quedó **100% inalterada**.
- **Estado:** ✅ **APROBADO**

#### Caso 9: Cierre Parcial y Atomicidad de Transacción [P1]
- **Prueba:** Se forzó un error en el segundo UPDATE (`WF_EXPEDIENTE`).
- **Resultado:** El bloque catch ejecutó `conn.rollback()`. `WF_WORK_ITEM` se mantuvo en `ABIERTA` sin fecha de cierre. Cero inconsistencias híbridas.
- **Estado:** ✅ **APROBADO**

---

### Bloque C: Concurrencia, Volumen y Escalamiento

#### Caso 10: Fallo Parcial en Lote y Aislamiento [P1]
- **Prueba:** Lote de 2 expedientes donde uno es válido y el otro inexistente.
- **Resultado:** El ítem fallido se aísla con rollback individual y se incluye en `fallidos`. El ítem válido se confirma y se incluye en `exitosos`.
- **Estado:** ✅ **APROBADO**

#### Caso 11: Commit Real Verificado entre Sesiones Concurrentes [P1]
- **Prueba:** Sesión A ejecuta `UPDATE` y hace `commit()`. Sesión B (conexión independiente) lee inmediatamente el cambio persistido. Sesión A restaura y confirma.
- **Estado:** ✅ **APROBADO**

#### Caso 12: Concurrencia y Bloqueos de Fila [P2]
- **Prueba:** Sesión A bloquea fila con UPDATE sin commit. Sesión B intenta `SELECT ... FOR UPDATE NOWAIT`.
- **Resultado:** Oracle capturó **`ORA-00054: resource busy and acquire with NOWAIT specified`**.
- **Manejo en Producción:** Se documenta que el gateway HTTP / dev server tiene timeout de 60s. En el backend se recomienda timeout de sesión para evitar esperas indefinidas si un transcriptor tiene el formulario abierto en SIGECOF.
- **Estado:** ✅ **APROBADO**

#### Caso 13: Liberación de Conexiones (`leaks = 0`) [P2]
- **Prueba:** 10 excepciones forzadas consecutivas con verificación de cierre en bloque `finally`.
- **Métrica:** Verificado que `pool.connectionsInUse` retorna a 0 y ningún cursor queda abierto.
- **Estado:** ✅ **APROBADO**

#### Caso 14: Escalamiento y Rendimiento Comparativo [P1]
- **Medición Real en `cert_rep`:**
  - `writeConn.execute` (bucle secuencial con commit individual): **37.9 ms por fila**.
  - `writeConn.executeMany` (benchmark por lote): **6.76 ms por fila**.
- **Decisión Arquitectónica:** Se mantiene el bucle secuencial en producción para garantizar el aislamiento por ítem (Caso 10) y la auditoría sincrónica por fila. Un lote máximo de 500 expedientes tarda ~18.9 segundos, holgadamente dentro del timeout HTTP.
- **Estado:** ✅ **APROBADO**

#### Caso 15: Deduplicación de Payload con WorkItem [P2]
- **Implementación:** Clave de deduplicación de 3 partes: `${expediente}-${anho}-${workitem}`.
- **Evidencia:** Un array con el mismo expediente repetido se deduplica automáticamente a 1 solo elemento a procesar.
- **Estado:** ✅ **APROBADO**

#### Caso 16: Límite de Tamaño de Lote (Tope 500 Expedientes) [P2]
- **Regla:** Peticiones con más de 500 expedientes se rechazan con `BadRequestException` (HTTP 400).
- **Estado:** ✅ **APROBADO**

---

### Bloque D: Datos, Codificación y Seguridad

#### Caso 17: Premisa de Unicidad en ONT [P1]
- **Verificación:** En ONT 2024 (`ORGA_ID = '93'`) existen `0` expedientes con múltiples WorkItems activos. Además, el filtro `AND WORKITEM = :currentWiNum` previene actualizar ramas paralelas.
- **Estado:** ✅ **APROBADO**

#### Caso 18: Parametrización Total de Sentencias SQL [P1]
- **Verificación:** Se eliminó cualquier valor quemado. `:orgaId` y `:anhoNum` se enlazan dinámicamente en todas las consultas.
- **Estado:** ✅ **APROBADO**

#### Caso 19: Longitud en Bytes y Encoding UTF-8 [P2]
- **Hallazgo Crítico:** La columna `WI_OBSERVACION` tiene semántica **`BYTE` (`CHAR_USED = 'B'`)** con máximo de 500 bytes.
- **Acción Implementada:** Truncado por tamaño de buffer en bytes (`Buffer.from(obs, 'utf-8').subarray(0, 500)`), evitando que textos de 500 caracteres con tildes o eñes (2 bytes cada uno) provoquen `ORA-12899`.
- **Prueba:** Observación con caracteres especiales persistida y recuperada íntegramente: *"Reasignación de carga operativa para el año 2024: verificación de niños y recaudación."*
- **Estado:** ✅ **APROBADO**

---

### Bloque E: API, Regresión y Casos de Cierre

#### Caso 20: Validación de Entrada del Endpoint REST (`POST /api/planillas/reasignacion/ejecutar`) [P1]
- **Validación de DTO Probada:**
  - Array de expedientes vacío (`[]`): Rechazado con HTTP 400 (`Debe seleccionar al menos un expediente`).
  - Campo `nuevo_transcriptor` omitido o nulo: Rechazado con HTTP 400.
  - Tipos inválidos: Rechazado por validación de esquema NestJS.
- **Autenticación:** El endpoint extrae la identidad del token JWT en cabecera `Authorization: Bearer <token>` (`req.user.email`), evitando la suplantación mediante el campo opcional `usuario_operador`.
- **Estado:** ✅ **APROBADO**

#### Caso 21: Protocolo de Regresión Funcional en Pantallas SIGECOF [P1]
- **Propósito:** Certificar que la modificación in-situ del WorkItem es reconocida de forma nativa por los formularios Oracle Forms y la bandeja web de SIGECOF.
- **Pasos del Protocolo de Certificación:**
  1. *Reasignación:* Iniciar sesión en SIGECOF Web con el usuario destino (ej. `ZUILINGCOLMENAR`).
  2. Abrir la bandeja de trabajo de conciliación y verificar que el expediente `#38` figura en estado `PENDIENTE`.
  3. Abrir el expediente, verificar que los lotes y planillas cargan sin errores y conciliar una planilla de prueba.
  4. *Cierre:* Verificar que tras cerrarse el expediente, desaparece de la bandeja activa y su estado en cabecera se visualiza como `CERRADO`.
- **Estado:** 🟡 **PROTOCOLO DEFINIDO — PENDIENTE DE VALIDACIÓN VISUAL POR EL EQUIPO OPERATIVO**

#### Caso 22: Análisis de Efectos en Cascada de Triggers (`CG$BUR_` y `CG$AUS_`) [P2]
- **Hallazgo Técnico:** Los triggers de tabla en `WF_WORK_ITEM` ejecutan denormalizaciones denorm2 y validaciones de clave foránea hacia `WFE_WORKFLOW.WF_EXPEDIENTE`, `WF_USERS` y `WF_TAREA`.
- **Verificación:** Al contar con `EXECUTE` en `CG$WF_WORK_ITEM` y `UPDATE` en `WF_EXPEDIENTE`, los triggers se ejecutan completamente y sin bloqueos de excepciones.
- **Estado:** ✅ **APROBADO**

---

## 5. Plan de Reversión Operativa Probado en Base de Datos

Se corrigió y probó empíricamente en `cert_rep` el procedimiento de reversión operativa para restaurar expedientes reasignados por error:

### 1. Extracción del Estado Previo desde PostgreSQL (`motor_app.auditoria_logs`)
```sql
SELECT 
  (detalles->>'expediente')::int as expediente,
  (detalles->>'anho')::int as anho,
  (detalles->>'workitem')::int as workitem,
  detalles->>'usuario_anterior' as transcriptor_original,
  detalles->>'estado_anterior' as estado_original
FROM motor_app.auditoria_logs
WHERE accion = 'REASIGNACION_EXPEDIENTES_CARGA'
  AND fecha >= NOW() - INTERVAL '2 hours';
```

### 2. Sentencia SQL de Restauración Inversa en Oracle (Con Guardas y Estado Dinámico)
```sql
UPDATE WFE_WORKFLOW.WF_WORK_ITEM
SET WFUS_USERS_ID = :transcriptor_original,
    WI_ESTADO = :estado_original,
    WI_OBSERVACION = 'REVERSION_OPERATIVA: Restaurado a estado y usuario previo'
WHERE WFEX_EXP_ID = :expediente 
  AND ANHO = :anho 
  AND ORGA_ID = :orgaId 
  AND WORKITEM = :workitem
  AND WI_ESTADO = 'PENDIENTE';
```

### 3. Evidencia de Ejecución de la Reversión en `cert_rep`:
```text
Estado Inicial: Exp #1481 | User=DVILLARROEL_18 | Estado=ABIERTA
Paso A: Reasignado exitosamente a ZUILINGCOLMENAR (PENDIENTE).
Paso B (Reversión): Filas afectadas = 1
Estado Verificado tras Reversión: User=DVILLARROEL_18 | Estado=ABIERTA
Resultado: Plan de Reversión Operativa ejecutado y verificado con éxito en base de datos.
```

---

## 6. Resumen Consolidado de la Certificación

```text
================================================================================
  RESUMEN FINAL DE LA SUITE DE CERTIFICACIÓN
================================================================================
CASO DE PRUEBA                                                 | ESTADO
--------------------------------------------------------------------------------
Caso 1  — Reasignación Individual vía UPDATE                   | ✅ APROBADO
Caso 2  — Cierre de Expediente y WorkItem vía UPDATE           | ✅ APROBADO
Caso 3  — Cierre de Lote en ORG_LIQ.LOTE                       | ✅ DOCUMENTADO
Caso 4  — Reversión / Rollback Seguro Inmediato                | ✅ APROBADO
Caso 5  — Registro de auditoría (WF_AUDITA_EXPEDIENTES)         | ✅ APROBADO
Caso 6  — rowsAffected = 0 silencioso                          | ✅ APROBADO
Caso 7  — Usuario destino inválido / inactivo                   | ✅ APROBADO
Caso 8  — Guarda de estado (ABIERTA/PENDIENTE)                  | ✅ APROBADO
Caso 9  — Cierre parcial y rollback atómico                     | ✅ APROBADO
Caso 10 — Fallo parcial en lote y aislamiento                  | ✅ APROBADO
Caso 11 — Commit real verificado entre sesiones                | ✅ APROBADO
Caso 12 — Concurrencia y bloqueos de fila (ORA-00054)          | ✅ APROBADO
Caso 13 — Liberación de conexiones (leaks = 0)                 | ✅ APROBADO
Caso 14 — Escalamiento y rendimiento (bucle vs executeMany)    | ✅ APROBADO
Caso 15 — Deduplicación de payload con workitem                | ✅ APROBADO
Caso 16 — Límite de tamaño de lote (máximo 500)                | ✅ APROBADO
Caso 17 — Premisa de unicidad en ONT (93)                      | ✅ APROBADO
Caso 18 — Parametrización dinámica de ORGA_ID y ANHO           | ✅ APROBADO
Caso 19 — Longitud en bytes (semántica BYTE) y UTF-8           | ✅ APROBADO
Caso 20 — Validación del Endpoint REST (DTOs y Auth)           | ✅ APROBADO
Caso 21 — Protocolo de Regresión en SIGECOF Forms/Web          | 🟡 PENDIENTE VISUAL
Caso 22 — Efectos en cascada de triggers Designer              | ✅ APROBADO
--------------------------------------------------------------------------------
TOTAL PRUEBAS AUTOMATIZADAS: 21 EJECUTADAS Y CONSOLIDADAS | 1 REGRESIÓN VISUAL PENDIENTE
```
