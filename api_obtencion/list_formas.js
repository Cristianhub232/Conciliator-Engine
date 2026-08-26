const oracledb = require('oracledb');

async function listAllFormas() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(
      `SELECT FORMA_CODIGO, DENOMINACION, EXPEDIENTE FROM ORG_LIQ.FORMA_IMPUESTO ORDER BY FORMA_CODIGO`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('Todas las formas registradas en SIGECOF (FORMA_IMPUESTO):');
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

listAllFormas();
