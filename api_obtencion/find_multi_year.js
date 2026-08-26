const oracledb = require('oracledb');

async function findMultiYearExpedientes() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(
      `SELECT EXPEDIENTE, COUNT(DISTINCT ANHO) AS CANT_ANIOS, LISTAGG(DISTINCT ANHO, ', ') WITHIN GROUP (ORDER BY ANHO) AS ANHOS
       FROM ORG_LIQ.PLANILLA 
       WHERE EXPEDIENTE IS NOT NULL AND EXPEDIENTE > 0
       GROUP BY EXPEDIENTE
       HAVING COUNT(DISTINCT ANHO) >= 2
       ORDER BY EXPEDIENTE
       FETCH FIRST 5 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('Expedientes que coexisten en múltiples años fiscales:', res.rows);

    if (res.rows.length > 0) {
      const expTest = res.rows[0].EXPEDIENTE;
      const resDetail = await connection.execute(
        `SELECT ANHO, LOTE_ID, LOTE_SEQ, EXPEDIENTE, COUNT(*) AS CANTIDAD_PLANILLAS, SUM(MONTO_EFECTIVO) AS TOTAL_BS
         FROM ORG_LIQ.PLANILLA 
         WHERE EXPEDIENTE = :expTest
         GROUP BY ANHO, LOTE_ID, LOTE_SEQ, EXPEDIENTE
         ORDER BY ANHO, LOTE_SEQ`,
        { expTest },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      console.log(`Detalle para Expediente ${expTest} en distintos años:`, resDetail.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

findMultiYearExpedientes();
