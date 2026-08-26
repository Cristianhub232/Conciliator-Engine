const oracledb = require('oracledb');
require('dotenv').config();

async function run() {
  let connection;
  try {
    const connectString = `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${process.env.ORACLE_HOST})(PORT=${process.env.ORACLE_PORT}))(CONNECT_DATA=(SID=${process.env.ORACLE_SID})))`;
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT_AUDIT',
      password: 'ONT_SIR_BOT_AUDIT123456',
      connectString: connectString
    });
    
    console.log("Connected to Oracle as ONT_SIR_BOT_AUDIT.");

    const result = await connection.execute(
      `SELECT owner, table_name FROM sys.all_tables WHERE table_name LIKE '%AUDIT%' OR table_name LIKE '%LOG%'`
    );
    console.log("Found:", result.rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}
run();
