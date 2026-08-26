const oracledb = require('oracledb');

async function findBlockingSessions() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('Consultando sesiones bloqueadas / bloqueadoras en Oracle:');
    try {
      const res = await connection.execute(`
        SELECT SID, SERIAL#, USERNAME, STATUS, OSUSER, MACHINE, PROGRAM, BLOCKING_SESSION 
        FROM V$SESSION 
        WHERE USERNAME = 'ONT_SIR_BOT'
      `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      console.log('Sesiones de ONT_SIR_BOT:', res.rows);
    } catch (e) {
      console.log('No hay acceso a V$SESSION:', e.message);
    }

    try {
      const resLocks = await connection.execute(`
        SELECT * FROM USER_LOCKS
      `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      console.log('Locks de usuario:', resLocks.rows);
    } catch (e) {
      console.log('No hay acceso a USER_LOCKS:', e.message);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

findBlockingSessions();
