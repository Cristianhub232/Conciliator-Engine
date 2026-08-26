const oracledb = require('oracledb');

async function check2400118306Details() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(
      `SELECT * FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '2400118306'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Todas las filas de TXT_SENIAT para 2400118306:');
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

check2400118306Details();
