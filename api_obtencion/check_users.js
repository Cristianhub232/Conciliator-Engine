const oracledb = require('oracledb');
require('dotenv').config();

async function run() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${process.env.ORACLE_HOST})(PORT=${process.env.ORACLE_PORT}))(CONNECT_DATA=(SID=${process.env.ORACLE_SID})))`
    });
    
    console.log("Connected to Oracle.");

    const result = await connection.execute(
      `SELECT column_name FROM all_tab_columns WHERE table_name = 'WF_USERS' AND owner = 'WFE_WORKFLOW'`
    );
    console.log("Columns:", result.rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}
run();
