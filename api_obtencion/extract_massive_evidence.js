const oracledb = require('oracledb');

async function extractMassiveEvidence() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('=== CONTEO GLOBAL DE PLANILLA EN LOTE 127758 ===');
    const resCount = await connection.execute(
      `SELECT COUNT(*) AS TOTAL_PLANILLAS, 
              COUNT(DISTINCT FORMA_CODIGO) AS FORMAS_DISTINTAS,
              MIN(PLAN_SEQ) AS MIN_SEQ,
              MAX(PLAN_SEQ) AS MAX_SEQ,
              SUM(MONTO_EFECTIVO) AS MONTO_TOTAL_BS
       FROM ORG_LIQ.PLANILLA 
       WHERE ANHO = 2024 AND LOTE_SEQ = 127758`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(resCount.rows[0], null, 2));

    console.log('\n=== DESGLOSE POR FORMA CONCILIADA EN PLANILLA ===');
    const resFormas = await connection.execute(
      `SELECT FORMA_CODIGO, 
              COUNT(*) AS CANTIDAD_PLANILLAS, 
              SUM(MONTO_EFECTIVO) AS TOTAL_BS
       FROM ORG_LIQ.PLANILLA 
       WHERE ANHO = 2024 AND LOTE_SEQ = 127758
       GROUP BY FORMA_CODIGO
       ORDER BY CANTIDAD_PLANILLAS DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(resFormas.rows, null, 2));

    console.log('\n=== TOTAL REGISTROS EN DET_PLANILLA (PARTIDAS) ===');
    const resDet = await connection.execute(
      `SELECT COUNT(*) AS TOTAL_PARTIDAS_INSERTADAS,
              SUM(MONTO_EFECTIVO) AS TOTAL_DETALLE_BS
       FROM ORG_LIQ.DET_PLANILLA
       WHERE ANHO = 2024 AND LOTE_SEQ = 127758`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(resDet.rows[0], null, 2));

    console.log('\n=== LISTADO DE CORRELATIVOS PLAN_SEQ MASIVOS RECIENTES (Últimas 25) ===');
    const resSeqs = await connection.execute(
      `SELECT PLAN_SEQ, PLANILLA_ID, FORMA_CODIGO, MONTO_EFECTIVO, IDENT_CNTB, TO_CHAR(FECHA_REGISTRO, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_REGISTRO
       FROM ORG_LIQ.PLANILLA 
       WHERE ANHO = 2024 AND LOTE_SEQ = 127758
       ORDER BY PLAN_SEQ DESC
       FETCH FIRST 25 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(resSeqs.rows, null, 2));

    console.log('\n=== VERIFICACIÓN DE SECUENCIA CONTINUA (SIN SALTOS NI HUECOS) ===');
    const resGaps = await connection.execute(
      `SELECT COUNT(*) AS TOTAL_FILAS, 
              (MAX(PLAN_SEQ) - MIN(PLAN_SEQ) + 1) AS RANGO_ESPERADO,
              CASE WHEN COUNT(*) = (MAX(PLAN_SEQ) - MIN(PLAN_SEQ) + 1) THEN 'SECUENCIA_PERFECTA_SIN_HUECOS' ELSE 'CONTIENE_SALTOS' END AS INTEGRIDAD_SECUENCIA
       FROM ORG_LIQ.PLANILLA 
       WHERE ANHO = 2024 AND LOTE_SEQ = 127758`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(resGaps.rows[0], null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

extractMassiveEvidence();
