const oracledb = require('oracledb');

async function runAllRemainingTests() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('====================================================');
    console.log('   EJECUCIÓN DE CASOS CP-007 AL CP-011');
    console.log('====================================================\n');

    // ==========================================
    // CP-007: Work item ABIERTA sin usuario / Huérfana
    // ==========================================
    console.log('--- [CP-007] EXPEDIENTES HUÉRFANOS ---');
    const qCp007 = await connection.execute(`
      SELECT 
          L.EXPEDIENTE, L.LOTE_ID, L.LOTE_SEQ, L.ANHO,
          COUNT(T.PLANILLA) AS TOTAL_PLANILLAS
      FROM ORG_LIQ.TXT_SENIAT T
      INNER JOIN ORG_LIQ.LOTE L 
          ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
         AND T.INFN_CODIGO = L.INFN_CODIGO 
         AND T.AGENCIA_CODIGO = L.AGENCIA_CODIGO
         AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
      WHERE L.ESTADO = 'P'
        AND T.ESTADO IS NULL
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
        AND ROWNUM <= 3
      GROUP BY L.EXPEDIENTE, L.LOTE_ID, L.LOTE_SEQ, L.ANHO
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Lotes huérfanos encontrados:', JSON.stringify(qCp007.rows, null, 2));

    // ==========================================
    // CP-008: Lotes con estado != 'P' (ej. 'V' o 'C')
    // ==========================================
    console.log('\n--- [CP-008] LOTES EXCLUIDOS POR ESTADO != "P" ---');
    const qCp008 = await connection.execute(`
      SELECT LOTE_ID, LOTE_SEQ, ESTADO, EXPEDIENTE, TOTAL_PLN, AGENCIA_CODIGO
      FROM ORG_LIQ.LOTE
      WHERE FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD')
        AND INFN_CODIGO = '105'
        AND ANHO = 2024
        AND ESTADO != 'P'
        AND ROWNUM <= 5
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Lotes con ESTADO != "P" que la query excluye:', JSON.stringify(qCp008.rows, null, 2));

    // ==========================================
    // CP-009: Paginación con limit=500 vs limit=10
    // ==========================================
    console.log('\n--- [CP-009] PRUEBA DE LÍMITES / PAGINACIÓN ---');
    const resLimit500 = await fetch('http://localhost:3010/api/planillas/pendientes?fecha=2024-04-15&banco=105&estado_asignacion=ASIGNADAS&limit=500');
    const data500 = await resLimit500.json();
    console.log('Pagination limit 500:', JSON.stringify(data500.pagination, null, 2));

    const resLimit10 = await fetch('http://localhost:3010/api/planillas/pendientes?fecha=2024-04-15&banco=105&estado_asignacion=ASIGNADAS&limit=10');
    const data10 = await resLimit10.json();
    console.log('Pagination limit 10:', JSON.stringify(data10.pagination, null, 2));

    // ==========================================
    // CP-010: Totalizadores con y sin filtro de Forma
    // ==========================================
    console.log('\n--- [CP-010] TOTALIZADORES SIN FILTRO VS CON FILTRO FORMA ---');
    const qCp010_Total = await connection.execute(`
      SELECT 
          COUNT(T.PLANILLA) AS TOTAL_PLANILLAS,
          COUNT(DISTINCT L.EXPEDIENTE) AS TOTAL_EXPEDIENTES,
          COUNT(DISTINCT T.FORMA_CODIGO) AS TOTAL_FORMAS,
          SUM(T.MONTO_EFECTIVO) AS MONTO_TOTAL
      FROM ORG_LIQ.TXT_SENIAT T
      INNER JOIN ORG_LIQ.LOTE L 
          ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
         AND T.INFN_CODIGO = L.INFN_CODIGO 
         AND T.AGENCIA_CODIGO = L.AGENCIA_CODIGO
         AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
      WHERE T.FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD')
        AND T.INFN_CODIGO = '105'
        AND L.ESTADO = 'P'
        AND T.ESTADO IS NULL
        AND NOT EXISTS (
            SELECT 1 FROM ORG_LIQ.PLANILLA P 
            WHERE P.PLANILLA_ID = T.PLANILLA AND P.LOTE_SEQ = L.LOTE_SEQ AND P.ANHO = L.ANHO
        )
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Totalizadores Globales (Sin Filtro):', JSON.stringify(qCp010_Total.rows[0], null, 2));

    const qCp010_Forma99229 = await connection.execute(`
      SELECT 
          COUNT(T.PLANILLA) AS TOTAL_PLANILLAS,
          COUNT(DISTINCT L.EXPEDIENTE) AS TOTAL_EXPEDIENTES,
          '99229' AS FORMA,
          SUM(T.MONTO_EFECTIVO) AS MONTO_TOTAL
      FROM ORG_LIQ.TXT_SENIAT T
      INNER JOIN ORG_LIQ.LOTE L 
          ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
         AND T.INFN_CODIGO = L.INFN_CODIGO 
         AND T.AGENCIA_CODIGO = L.AGENCIA_CODIGO
         AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
      WHERE T.FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD')
        AND T.INFN_CODIGO = '105'
        AND T.FORMA_CODIGO = '99229'
        AND L.ESTADO = 'P'
        AND T.ESTADO IS NULL
        AND NOT EXISTS (
            SELECT 1 FROM ORG_LIQ.PLANILLA P 
            WHERE P.PLANILLA_ID = T.PLANILLA AND P.LOTE_SEQ = L.LOTE_SEQ AND P.ANHO = L.ANHO
        )
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Totalizadores Filtrados (Forma 99229):', JSON.stringify(qCp010_Forma99229.rows[0], null, 2));

    // ==========================================
    // CP-011: Fecha sin datos
    // ==========================================
    console.log('\n--- [CP-011] BÚSQUEDA CON FECHA SIN DATOS ---');
    const resSinDatos = await fetch('http://localhost:3010/api/planillas/pendientes?fecha=2099-01-01&banco=105&estado_asignacion=ASIGNADAS');
    const dataSinDatos = await resSinDatos.json();
    console.log('Respuesta fecha sin datos (2099-01-01):', JSON.stringify(dataSinDatos, null, 2));

  } catch (err) {
    console.error('Error en pruebas combinadas:', err);
  } finally {
    if (connection) await connection.close();
  }
}

runAllRemainingTests();
