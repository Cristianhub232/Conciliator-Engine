const oracledb = require('oracledb');

async function checkConstraints() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- CONSTRAINTS DE ORG_LIQ.PLANILLA ---');
    const res = await connection.execute(`
      SELECT uc.constraint_name, uc.constraint_type, ucc.column_name, ucc.position
      FROM all_constraints uc
      JOIN all_cons_columns ucc ON uc.constraint_name = ucc.constraint_name AND uc.owner = ucc.owner
      WHERE uc.owner = 'ORG_LIQ' AND uc.table_name = 'PLANILLA'
      ORDER BY uc.constraint_name, ucc.position
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(res.rows, null, 2));

    console.log('\n--- VERIFICAR PLANILLA 2390773119 EN PLANILLA ---');
    const res2 = await connection.execute(`
      SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = '2390773119'
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(res2.rows, null, 2));

    console.log('\n--- VERIFICAR NOT EXISTS EN getPendientes QUERY CON ANHO ---');
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkConstraints();
