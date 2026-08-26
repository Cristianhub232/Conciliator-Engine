const oracledb = require('oracledb');

async function checkExp7440Clean() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(`
      SELECT * FROM WFE_WORKFLOW.WF_WORK_ITEM
      WHERE TRIM(WFEX_EXP_ID) = '7440' AND WI_ESTADO = 'ABIERTA'
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    console.log('Work Items de Expediente 7440:');
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkExp7440Clean();
