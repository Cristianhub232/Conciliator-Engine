const oracledb = require('oracledb');

async function checkPlanillaCols() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
      FROM ALL_TAB_COLS 
      WHERE OWNER = 'ORG_LIQ' AND TABLE_NAME = 'PLANILLA'
      ORDER BY COLUMN_ID
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    console.log('Columnas de ORG_LIQ.PLANILLA:');
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkPlanillaCols();
