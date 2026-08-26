const oracledb = require('oracledb');

async function checkTriggersAndConstraints() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('Consultando triggers en ORG_LIQ.PLANILLA:');
    const resTrg = await connection.execute(
      `SELECT TRIGGER_NAME, TRIGGER_TYPE, TRIGGERING_EVENT, STATUS 
       FROM ALL_TRIGGERS 
       WHERE TABLE_OWNER = 'ORG_LIQ' AND TABLE_NAME = 'PLANILLA'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Triggers:', resTrg.rows);

    console.log('Consultando constraints en ORG_LIQ.PLANILLA:');
    const resCst = await connection.execute(
      `SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, R_CONSTRAINT_NAME, STATUS 
       FROM ALL_CONSTRAINTS 
       WHERE OWNER = 'ORG_LIQ' AND TABLE_NAME = 'PLANILLA'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Constraints:', resCst.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkTriggersAndConstraints();
