const oracledb = require('oracledb');

async function checkCheckConstraints() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(`
      SELECT constraint_name, search_condition
      FROM all_constraints
      WHERE owner = 'ORG_LIQ' AND table_name = 'PLANILLA' AND constraint_type = 'C'
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('CHECK CONSTRAINTS EN PLANILLA:');
    console.log(JSON.stringify(res.rows, null, 2));

    const sample = await connection.execute(`
      SELECT * FROM ORG_LIQ.PLANILLA WHERE ROWNUM <= 2
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('\nSAMPLE ROWS EN PLANILLA:');
    console.log(JSON.stringify(sample.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkCheckConstraints();
