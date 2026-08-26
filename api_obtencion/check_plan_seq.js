const oracledb = require('oracledb');

async function checkLocksAndSessions() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('Consultando MAX(PLAN_SEQ) actual en PLANILLA:');
    const r1 = await connection.execute(
      `SELECT MAX(PLAN_SEQ) AS MAX_SEQ FROM ORG_LIQ.PLANILLA WHERE ANHO = 2024 AND LOTE_SEQ = 127758`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('MAX PLAN_SEQ:', r1.rows);

    console.log('Consultando si 2537 ya existe en PLANILLA:');
    const r2 = await connection.execute(
      `SELECT PLANILLA_ID, PLAN_SEQ, LOTE_SEQ, ANHO FROM ORG_LIQ.PLANILLA WHERE ANHO = 2024 AND LOTE_SEQ = 127758 AND PLAN_SEQ >= 2535`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Planillas con seq >= 2535:', r2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkLocksAndSessions();
