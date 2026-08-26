const oracledb = require('oracledb');

async function getMultiYearCoexistence() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(
      `SELECT ANHO, LOTE_ID, LOTE_SEQ, EXPEDIENTE, COUNT(*) AS TOTAL_PLANILLAS, SUM(MONTO_EFECTIVO) AS TOTAL_BS
       FROM ORG_LIQ.PLANILLA 
       WHERE EXPEDIENTE = 7638
       GROUP BY ANHO, LOTE_ID, LOTE_SEQ, EXPEDIENTE
       ORDER BY ANHO, LOTE_ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Expediente 7638 en múltiples años:', res.rows);

    const resAll = await connection.execute(
      `SELECT EXPEDIENTE, 
              SUM(CASE WHEN ANHO = 2023 THEN 1 ELSE 0 END) AS PLANILLAS_2023,
              SUM(CASE WHEN ANHO = 2024 THEN 1 ELSE 0 END) AS PLANILLAS_2024,
              SUM(MONTO_EFECTIVO) AS TOTAL_BS_GLOBAL
       FROM ORG_LIQ.PLANILLA
       WHERE EXPEDIENTE IS NOT NULL AND ANHO IN (2023, 2024)
       GROUP BY EXPEDIENTE
       HAVING SUM(CASE WHEN ANHO = 2023 THEN 1 ELSE 0 END) > 0 
          AND SUM(CASE WHEN ANHO = 2024 THEN 1 ELSE 0 END) > 0
       FETCH FIRST 5 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Muestra de expedientes coexistiendo en 2023 y 2024:', resAll.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

getMultiYearCoexistence();
