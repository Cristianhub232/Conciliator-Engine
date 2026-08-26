const oracledb = require('oracledb');

async function checkCurrentMaxSeq() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(
      `SELECT MAX(PLAN_SEQ) AS MAX_SEQ FROM ORG_LIQ.PLANILLA WHERE ANHO = 2024 AND LOTE_SEQ = 127758`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('MAX(PLAN_SEQ) en 127758:', res.rows[0].MAX_SEQ);

    const res2 = await connection.execute(
      `SELECT PLANILLA_ID, PLAN_SEQ, FORMA_CODIGO, MONTO FROM ORG_LIQ.PLANILLA WHERE ANHO = 2024 AND LOTE_SEQ = 127758 ORDER BY PLAN_SEQ DESC FETCH FIRST 5 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Ultimas planillas insertadas:', res2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkCurrentMaxSeq();
