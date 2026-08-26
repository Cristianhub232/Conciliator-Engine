const oracledb = require('oracledb');

async function testIndexSpeed() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- TEST 1: Con TRUNC(FECHA_RECAUDACION) ---');
    const t0 = Date.now();
    const r1 = await connection.execute(
      `SELECT IDENT_CNTB FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '2491306810' AND INFN_CODIGO = '105' AND TRUNC(FECHA_RECAUDACION) = TO_DATE('2024-04-15', 'YYYY-MM-DD')`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`Test 1 tomo: ${Date.now() - t0}ms`);

    console.log('--- TEST 2: Solo con PLANILLA (Usando índice) ---');
    const t1 = Date.now();
    const r2 = await connection.execute(
      `SELECT IDENT_CNTB, AGENCIA_CODIGO, TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '2491306810' AND INFN_CODIGO = '105'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`Test 2 tomo: ${Date.now() - t1}ms`, r2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

testIndexSpeed();
