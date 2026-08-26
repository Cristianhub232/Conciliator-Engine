const oracledb = require('oracledb');

async function checkCols() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- COLUMNAS DE ORG_LIQ.PLANILLA ---');
    const res = await connection.execute(`
      SELECT column_name, data_type, nullable, data_default
      FROM all_tab_columns
      WHERE owner = 'ORG_LIQ' AND table_name = 'PLANILLA'
      ORDER BY column_id
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(res.rows, null, 2));

    console.log('\n--- TRIGGERS EN ORG_LIQ.PLANILLA ---');
    const trg = await connection.execute(`
      SELECT trigger_name, status, trigger_type, triggering_event
      FROM all_triggers
      WHERE table_owner = 'ORG_LIQ' AND table_name = 'PLANILLA'
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(trg.rows, null, 2));

    console.log('\n--- TEST INSERT CON ANHO 2024 DE PLANILLA 2390773119 ---');
    // Let's test insert for 2024 with all required fields or see what happens
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkCols();
