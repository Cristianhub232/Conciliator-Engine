const oracledb = require('oracledb');

async function checkFks() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(`
      SELECT a.table_name, a.column_name, a.constraint_name, 
             c_pk.table_name r_table_name, c_pk.constraint_name r_pk
      FROM all_cons_columns a
      JOIN all_constraints c ON a.owner = c.owner AND a.constraint_name = c.constraint_name
      JOIN all_constraints c_pk ON c.r_owner = c_pk.owner AND c.r_constraint_name = c_pk.constraint_name
      WHERE c.constraint_type = 'R' AND a.owner = 'ORG_LIQ' AND a.table_name = 'PLANILLA'
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    console.log('FKs de PLANILLA:', JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkFks();
