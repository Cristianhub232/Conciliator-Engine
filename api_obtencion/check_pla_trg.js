const oracledb = require('oracledb');

async function checkPlanillaTriggers() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const resTrg = await connection.execute(
      `SELECT TRIGGER_NAME, TRIGGER_TYPE, TRIGGERING_EVENT, STATUS, DESCRIPTION 
       FROM ALL_TRIGGERS 
       WHERE TABLE_OWNER = 'ORG_LIQ' AND TABLE_NAME = 'PLANILLA'
       ORDER BY TRIGGER_NAME`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('Triggers en ORG_LIQ.PLANILLA:');
    console.log(JSON.stringify(resTrg.rows, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (connection) await connection.close();
  }
}

checkPlanillaTriggers();
