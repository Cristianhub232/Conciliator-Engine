const oracledb = require('oracledb');

async function checkDetPlanilla() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- COLUMNAS DE ORG_LIQ.DET_PLANILLA ---');
    const res = await connection.execute(`
      SELECT column_name, data_type, nullable
      FROM all_tab_columns
      WHERE owner = 'ORG_LIQ' AND table_name = 'DET_PLANILLA'
      ORDER BY column_id
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(res.rows, null, 2));

    console.log('\n--- SAMPLE ROWS EN DET_PLANILLA ---');
    const sample = await connection.execute(`
      SELECT * FROM ORG_LIQ.DET_PLANILLA WHERE ROWNUM <= 2
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(sample.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkDetPlanilla();
