const oracledb = require('oracledb');

async function testFastQuery() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const t0 = Date.now();
    const res = await connection.execute(
      `SELECT IDENT_CNTB, AGENCIA_CODIGO 
       FROM ORG_LIQ.TXT_SENIAT 
       WHERE PLANILLA = :planilla 
         AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') 
         AND INFN_CODIGO = :banco`,
      { planilla: '2491306810', fecha: '2024-04-15', banco: '105' },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`Query con índice compuesto tomó: ${Date.now() - t0}ms`, res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

testFastQuery();
