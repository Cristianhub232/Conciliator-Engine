const oracledb = require('oracledb');

async function getOrgLiqPrivs() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(
      `SELECT OWNER, TABLE_NAME, PRIVILEGE, GRANTABLE
       FROM USER_TAB_PRIVS
       WHERE OWNER IN ('ORG_LIQ', 'WFE_WORKFLOW') 
         AND TABLE_NAME IN ('PLANILLA', 'DET_PLANILLA', 'TXT_SENIAT', 'LOTE', 'WF_WORK_ITEM', 'WF_USERS')
       ORDER BY OWNER, TABLE_NAME, PRIVILEGE`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

getOrgLiqPrivs();
