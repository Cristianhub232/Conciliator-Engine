const oracledb = require('oracledb');

async function testAnotherPlanilla() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- Probando con Planilla 2400118308 ---');
    const t0 = Date.now();
    const res = await connection.execute(
      `SELECT IDENT_CNTB, AGENCIA_CODIGO 
       FROM ORG_LIQ.TXT_SENIAT 
       WHERE PLANILLA = '2400118308' 
         AND FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD') 
         AND INFN_CODIGO = '105'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`Búsqueda en TXT_SENIAT tomó ${Date.now() - t0}ms:`, res.rows);

    const rSeq = await connection.execute(
      `SELECT NVL(MAX(PLAN_SEQ), 0) + 1 AS NEXT_SEQ FROM ORG_LIQ.PLANILLA WHERE ANHO = 2024 AND LOTE_SEQ = 127758`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const nextSeq = rSeq.rows[0].NEXT_SEQ;
    console.log(`Next SEQ disponible = ${nextSeq}`);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

testAnotherPlanilla();
