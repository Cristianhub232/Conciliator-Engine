const oracledb = require('oracledb');

async function readTriggerSource() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(
      `SELECT NAME, TYPE, LINE, TEXT 
       FROM ALL_SOURCE 
       WHERE OWNER = 'ORG_LIQ' 
         AND NAME IN ('CG$BIR_PLANILLA', 'CG$AIS_PLANILLA', 'CG$BIS_PLANILLA')
       ORDER BY NAME, LINE`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    let currentName = '';
    for (const row of res.rows) {
      if (row.NAME !== currentName) {
        currentName = row.NAME;
        console.log(`\n=== TRIGGER ${currentName} ===`);
      }
      process.stdout.write(row.TEXT);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

readTriggerSource();
