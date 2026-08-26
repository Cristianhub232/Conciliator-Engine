# 04 — Compendio de Consultas SQL Especializadas, Diagnóstico y Cuadre

**Sistema:** SIGECOF / SIRONT  
**Motor:** Oracle Database 19c Enterprise Edition  
**Esquemas:** `ORG_LIQ`, `WFE_WORKFLOW`, `ONT_SIR_BOT_AUDIT`  
**Versión:** 2.0 (Consolidada)

---

## 1. Patrones de Diseño Transversales en SQL

1. **Delimitación Obligatoria por `ANHO`:** Debido a la naturaleza multianual de SIGECOF, todas las consultas filtran obligatoriamente por el año fiscal para evitar colisiones entre expedientes homónimos de diferentes periodos.
2. **Anti-Join Eficiente con `NOT EXISTS`:** Se utiliza `NOT EXISTS` en lugar de `LEFT JOIN ... IS NULL` para permitir a Oracle optimizar como *semi-join* y detener la búsqueda en la primera coincidencia.
3. **Uso Estricto de Bind Variables:** Se parametrizan las consultas (`:fecha`, `:banco`, `:anho`, `:loteSeq`) para reusar planes de ejecución en el cursor caché de Oracle y blindar contra inyecciones SQL.
4. **Paginación Nativa Oracle 12c+:** Uso de `OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`.

---

## 2. Consultas Operativas del Orquestador

### 2.1 Consulta Maestra de Planillas Pendientes por Conciliar
Utilizada por el endpoint `GET /api/planillas/pendientes`:

```sql
SELECT DISTINCT
    'SIN_ASIGNAR' AS ESTADO_ASIGNACION,
    L.EXPEDIENTE, 
    L.LOTE_ID, 
    L.LOTE_SEQ,
    T.PLANILLA AS NRO_PLANILLA_FALTANTE,
    T.FORMA_CODIGO AS FORMA,
    T.MONTO_EFECTIVO,
    T.INFN_CODIGO AS BANCO,
    T.AGENCIA_CODIGO AS AGENCIA,
    T.FECHA_RECAUDACION,
    T.IDENT_CNTB AS RIF
FROM ORG_LIQ.TXT_SENIAT T
INNER JOIN ORG_LIQ.LOTE L 
    ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
   AND T.INFN_CODIGO = L.INFN_CODIGO 
   AND T.AGENCIA_CODIGO = L.AGENCIA_CODIGO
   AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
WHERE L.ESTADO = 'P'
  AND (T.ESTADO IS NULL OR T.ESTADO = 0)
  AND NOT EXISTS (
      SELECT 1 FROM ORG_LIQ.PLANILLA P 
      WHERE P.PLANILLA_ID = T.PLANILLA 
        AND P.LOTE_SEQ = L.LOTE_SEQ 
        AND P.ANHO = L.ANHO
  )
  AND (
      NOT EXISTS (
          SELECT 1 FROM WFE_WORKFLOW.WF_WORK_ITEM W 
          WHERE L.EXPEDIENTE = W.WFEX_EXP_ID AND W.WI_ESTADO = 'ABIERTA'
      )
      OR EXISTS (
          SELECT 1 FROM WFE_WORKFLOW.WF_WORK_ITEM W 
          WHERE L.EXPEDIENTE = W.WFEX_EXP_ID 
            AND W.WI_ESTADO = 'ABIERTA' AND W.WFUS_USERS_ID IS NULL
      )
  )
  AND T.FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
  AND T.INFN_CODIGO = :banco
ORDER BY T.PLANILLA
OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY;
```

---

## 3. Consultas del Ciclo Transaccional

### 3.1 Cálculo del Próximo Correlativo Monotónico (`PLAN_SEQ`)
```sql
SELECT NVL(MAX(PLAN_SEQ), 0) + 1 AS NEXT_PLAN_SEQ 
FROM ORG_LIQ.PLANILLA 
WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq;
```

### 3.2 Inserción Atómica en Cabecera (`ORG_LIQ.PLANILLA`)
```sql
INSERT INTO ORG_LIQ.PLANILLA 
(ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, ORGA_ID, FECHA_REGISTRO, IDENT_CNTB, 
 MONTO, MONTO_EFECTIVO, PLANILLA_MANUAL, FECHA_RECAUDACION, INFN_CODIGO, 
 EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, PERIODO) 
VALUES 
(:anho, :loteId, :planilla, :forma, '00', SYSDATE, :ident, 
 :monto, :monto, 0, TO_DATE(:fecha, 'YYYY-MM-DD'), :banco, 
 :expediente, :loteSeq, :planSeq, :periodo);
```

### 3.3 Inserción Atómica en Detalle (`ORG_LIQ.DET_PLANILLA`)
```sql
INSERT INTO ORG_LIQ.DET_PLANILLA 
(ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, PLUC_ID, DET_PLN_ID, 
 MONTO, MONTO_EFECTIVO, EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, DETP_SEQ) 
VALUES 
(:anho, :loteId, :planilla, :forma, :partida, :detpSeq, 
 :monto, :monto, :expediente, :loteSeq, :planSeq, :detpSeq);
```

### 3.4 Actualización de Estado en Extracto Bancario (`ORG_LIQ.TXT_SENIAT`)
```sql
UPDATE ORG_LIQ.TXT_SENIAT 
SET ESTADO = 1, ANHO = :anho, LOTE_SEQ = :loteSeq, PLAN_SEQ = :planSeq 
WHERE PLANILLA = :planilla 
  AND INFN_CODIGO = :banco 
  AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD');
```

---

## 4. Consultas de Cuadre Financiero y Verificación de Integridad

### 4.1 Cuadre Contable Estricto: Cabecera vs Sumatoria de Detalle
```sql
SELECT 
    P.ANHO,
    P.LOTE_SEQ,
    P.PLANILLA_ID,
    P.MONTO AS MONTO_CABECERA,
    SUM(D.MONTO) AS MONTO_DETALLES,
    (P.MONTO - SUM(D.MONTO)) AS DIFERENCIA,
    CASE 
        WHEN (P.MONTO - SUM(D.MONTO)) = 0 THEN 'CUADRADO_EXACTO' 
        ELSE 'DESCUADRE' 
    END AS ESTADO_CUADRE
FROM ORG_LIQ.PLANILLA P
INNER JOIN ORG_LIQ.DET_PLANILLA D 
    ON P.ANHO = D.ANHO 
   AND P.LOTE_SEQ = D.LOTE_SEQ 
   AND P.PLAN_SEQ = D.PLAN_SEQ
WHERE P.ANHO = :anho AND P.LOTE_SEQ = :loteSeq
GROUP BY P.ANHO, P.LOTE_SEQ, P.PLANILLA_ID, P.MONTO;
```

### 4.2 Verificación Matemática de Secuencia Continua (`PLAN_SEQ` sin huecos)
```sql
SELECT 
    COUNT(*) AS TOTAL_FILAS,
    MIN(PLAN_SEQ) AS MIN_SEQ,
    MAX(PLAN_SEQ) AS MAX_SEQ,
    (MAX(PLAN_SEQ) - MIN(PLAN_SEQ) + 1) AS RANGO_ESPERADO,
    CASE 
        WHEN COUNT(*) = (MAX(PLAN_SEQ) - MIN(PLAN_SEQ) + 1) 
        THEN 'SECUENCIA_PERFECTA_SIN_HUECOS' 
        ELSE 'CONTIENE_SALTOS' 
    END AS INTEGRIDAD_SECUENCIA
FROM ORG_LIQ.PLANILLA 
WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq;
```

### 4.3 Auditoría de Productividad y Estado de Tareas por Transcriptor
```sql
SELECT 
    U.WFUS_USERS_ID AS USUARIO_TRANSCRIPTOR,
    W.WI_ESTADO AS ESTADO_TAREA,
    COUNT(DISTINCT W.WFEX_EXP_ID) AS TOTAL_EXPEDIENTES,
    COUNT(DISTINCT P.PLANILLA_ID) AS TOTAL_PLANILLAS_CONCILIADAS,
    SUM(P.MONTO_EFECTIVO) AS TOTAL_BS_CONCILIADO
FROM WFE_WORKFLOW.WF_USERS U
INNER JOIN WFE_WORKFLOW.WF_WORK_ITEM W 
    ON U.WFUS_USERS_ID = W.WFUS_USERS_ID
LEFT JOIN ORG_LIQ.PLANILLA P 
    ON W.WFEX_EXP_ID = P.EXPEDIENTE
WHERE W.WI_FECHA_CREACION >= TO_DATE(:fechaInicio, 'YYYY-MM-DD')
GROUP BY U.WFUS_USERS_ID, W.WI_ESTADO
ORDER BY TOTAL_PLANILLAS_CONCILIADAS DESC;
```
