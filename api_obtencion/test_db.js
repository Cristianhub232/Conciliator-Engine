const oracledb = require('oracledb');
require('dotenv').config();

async function run() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SID}`
    });
    
    const result = await connection.execute(`
      SELECT column_name 
      FROM all_tab_columns 
      WHERE table_name = 'TXT_SENIAT' AND owner = 'ORG_LIQ'
    `);
    console.log(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}
run();
