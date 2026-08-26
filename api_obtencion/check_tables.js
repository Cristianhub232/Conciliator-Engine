const oracledb = require('oracledb');
require('dotenv').config();

async function run() {
  let connection;
  try {
    const connectString = `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${process.env.ORACLE_HOST})(PORT=${process.env.ORACLE_PORT}))(CONNECT_DATA=(SID=${process.env.ORACLE_SID})))`;
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: connectString
    });
    
    console.log("Connected to Oracle.");

    const result = await connection.execute(
      `SELECT table_name FROM sys.all_tables WHERE owner = 'SIRONT_BOT_AUDIT'`
    );
    console.log("Tables in SIRONT_BOT_AUDIT:", result.rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}
run();
