const oracledb = require('oracledb');

async function viewTriggerCode() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(
      `SELECT TEXT FROM ALL_SOURCE WHERE OWNER = 'ORG_LIQ' AND NAME IN ('CG$BIR_PLANILLA', 'CG$AIS_PLANILLA', 'CG$BIS_PLANILLA') ORDER BY NAME, LINE`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(res.rows.map(r => r.TEXT).join(''));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

viewTriggerCode();
