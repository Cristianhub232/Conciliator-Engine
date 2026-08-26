const oracledb = require('oracledb');

async function testCp006Execution() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('=== CASO CP-006: EJECUCIÓN Y VERIFICACIÓN EN BASE DE DATOS ===\n');

    // 1. Fila exacta en WF_WORK_ITEM
    console.log('[1] Registro activo en WFE_WORKFLOW.WF_WORK_ITEM para Expediente 7440 (Año 2024):');
    const resWf = await connection.execute(
      `SELECT WORKITEM, WFEX_EXP_ID AS EXPEDIENTE, ANHO, ORGA_ID, WI_NOMBRE, 
              WI_ESTADO, WFUS_USERS_ID AS TRANSCRIPTOR_ASIGNADO, 
              TO_CHAR(WI_FECHA_CREACION, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_CREACION,
              TO_CHAR(WI_FECHA_ABRE, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_ABRE
       FROM WFE_WORKFLOW.WF_WORK_ITEM
       WHERE TRIM(WFEX_EXP_ID) = '7440' AND ANHO = 2024 AND WI_ESTADO = 'ABIERTA'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(resWf.rows[0], null, 2));

    // 2. Consulta en Modo HUÉRFANAS (Aislamiento de Seguridad)
    console.log('\n[2] Consulta en Modo HUÉRFANAS (estado_asignacion = "HUERFANAS"):');
    const resHuerfanas = await connection.execute(
      `SELECT DISTINCT
           'SIN_ASIGNAR' AS ESTADO_ASIGNACION,
           L.EXPEDIENTE,
           L.LOTE_ID,
           L.LOTE_SEQ,
           T.PLANILLA AS NRO_PLANILLA_FALTANTE,
           T.FORMA_CODIGO AS FORMA,
           T.MONTO_EFECTIVO,
           T.INFN_CODIGO AS BANCO,
           T.AGENCIA_CODIGO AS AGENCIA,
           TO_CHAR(T.FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION
       FROM ORG_LIQ.TXT_SENIAT T
       INNER JOIN ORG_LIQ.LOTE L 
           ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
          AND T.INFN_CODIGO = L.INFN_CODIGO 
          AND T.AGENCIA_CODIGO = L.AGENCIA_CODIGO
          AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
       WHERE L.ESTADO = 'P'
         AND T.ESTADO IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM ORG_LIQ.PLANILLA P 
           WHERE P.PLANILLA_ID = T.PLANILLA 
             AND P.LOTE_SEQ = L.LOTE_SEQ 
             AND P.ANHO = L.ANHO
         )
         -- Filtro de Seguridad: Expediente sin transcriptor activo
         AND (
             NOT EXISTS (
                 SELECT 1 FROM WFE_WORKFLOW.WF_WORK_ITEM W 
                 WHERE L.EXPEDIENTE = W.WFEX_EXP_ID 
                   AND W.WI_ESTADO = 'ABIERTA'
             )
             OR EXISTS (
                 SELECT 1 FROM WFE_WORKFLOW.WF_WORK_ITEM W 
                 WHERE L.EXPEDIENTE = W.WFEX_EXP_ID 
                   AND W.WI_ESTADO = 'ABIERTA' 
                   AND W.WFUS_USERS_ID IS NULL
             )
         )
         AND T.FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD')
         AND T.INFN_CODIGO = '105'
         AND L.EXPEDIENTE = 7440`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`    Total planillas devueltas para Expediente 7440 en modo HUÉRFANAS: ${resHuerfanas.rows.length}`);
    console.log(`    Resultado: ${resHuerfanas.rows.length === 0 ? 'CORRECTO (EXPEDIENTE BLOQUEADO/PROTEGIDO)' : 'ERROR'}`);

    // 3. Consulta en Modo ASIGNADAS
    console.log('\n[3] Consulta en Modo ASIGNADAS (estado_asignacion = "ASIGNADAS"):');
    const resAsignadas = await connection.execute(
      `SELECT DISTINCT
           'ASIGNADA' AS ESTADO_ASIGNACION,
           L.EXPEDIENTE,
           L.LOTE_ID,
           L.LOTE_SEQ,
           T.PLANILLA AS NRO_PLANILLA_FALTANTE,
           T.FORMA_CODIGO AS FORMA,
           T.MONTO_EFECTIVO,
           T.INFN_CODIGO AS BANCO,
           T.AGENCIA_CODIGO AS AGENCIA,
           TO_CHAR(T.FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION
       FROM ORG_LIQ.TXT_SENIAT T
       INNER JOIN ORG_LIQ.LOTE L 
           ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
          AND T.INFN_CODIGO = L.INFN_CODIGO 
          AND T.AGENCIA_CODIGO = L.AGENCIA_CODIGO
          AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
       INNER JOIN WFE_WORKFLOW.WF_WORK_ITEM W 
           ON L.EXPEDIENTE = W.WFEX_EXP_ID
          AND W.WI_ESTADO = 'ABIERTA'
          AND W.WFUS_USERS_ID IS NOT NULL
       WHERE L.ESTADO = 'P'
         AND T.ESTADO IS NULL 
         AND NOT EXISTS (
           SELECT 1 FROM ORG_LIQ.PLANILLA P 
           WHERE P.PLANILLA_ID = T.PLANILLA 
             AND P.LOTE_SEQ = L.LOTE_SEQ 
             AND P.ANHO = L.ANHO
         )
         AND T.FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD')
         AND T.INFN_CODIGO = '105'
         AND L.EXPEDIENTE = 7440`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`    Total planillas devueltas para Expediente 7440 en modo ASIGNADAS: ${resAsignadas.rows.length}`);
    console.log(`    Resultado: ${resAsignadas.rows.length > 0 ? 'CORRECTO (EXPEDIENTE ACCESIBLE EN MODO ASIGNADO)' : 'ERROR'}`);

  } catch (err) {
    console.error('Error en CP-006:', err);
  } finally {
    if (connection) await connection.close();
  }
}

testCp006Execution();
