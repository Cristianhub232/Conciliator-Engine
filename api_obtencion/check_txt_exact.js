const oracledb = require('oracledb');

async function checkTxtSeniatExact() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- BUSCANDO 2491306610 ---');
    const r1 = await connection.execute(
      `SELECT PLANILLA, INFN_CODIGO, AGENCIA_CODIGO, TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA, ESTADO, ANHO, LOTE_SEQ, PLAN_SEQ 
       FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '2491306610'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('2491306610:', JSON.stringify(r1.rows, null, 2));

    console.log('--- BUSCANDO 2491314701 ---');
    const r2 = await connection.execute(
      `SELECT PLANILLA, INFN_CODIGO, AGENCIA_CODIGO, TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA, ESTADO, ANHO, LOTE_SEQ, PLAN_SEQ 
       FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '2491314701'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('2491314701:', JSON.stringify(r2.rows, null, 2));

    console.log('--- BUSCANDO 2400118306 ---');
    const r3 = await connection.execute(
      `SELECT PLANILLA, INFN_CODIGO, AGENCIA_CODIGO, TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA, ESTADO, ANHO, LOTE_SEQ, PLAN_SEQ 
       FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '2400118306'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('2400118306:', JSON.stringify(r3.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkTxtSeniatExact();
