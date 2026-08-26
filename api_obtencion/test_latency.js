const oracledb = require('oracledb');

async function testDirectOracleSteps() {
  let connection;
  try {
    console.log('Connecting...');
    const t0 = Date.now();
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });
    console.log(`Connected in ${Date.now() - t0}ms`);

    // Paso 1: Lookup en TXT_SENIAT
    const t1 = Date.now();
    const r1 = await connection.execute(
      `SELECT IDENT_CNTB, AGENCIA_CODIGO 
       FROM ORG_LIQ.TXT_SENIAT 
       WHERE PLANILLA = '2491314701' 
         AND INFN_CODIGO = '105' 
         AND TRUNC(FECHA_RECAUDACION) = TO_DATE('2024-04-15', 'YYYY-MM-DD')`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`Step 1 (TXT_SENIAT) in ${Date.now() - t1}ms:`, r1.rows);

    // Paso 2: MAX(PLAN_SEQ)
    const t2 = Date.now();
    const r2 = await connection.execute(
      `SELECT NVL(MAX(PLAN_SEQ), 0) + 1 AS NEXT_SEQ 
       FROM ORG_LIQ.PLANILLA 
       WHERE ANHO = 2024 AND LOTE_SEQ = 127758`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`Step 2 (MAX PLAN_SEQ) in ${Date.now() - t2}ms:`, r2.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (connection) await connection.close();
  }
}

testDirectOracleSteps();
