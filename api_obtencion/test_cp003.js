const oracledb = require('oracledb');

async function testPrivileges() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- 1. CONSULTA DE PRIVILEGIOS DE TABLA (USER_TAB_PRIVS) ---');
    const resTabPrivs = await connection.execute(
      `SELECT GRANTEE, OWNER, TABLE_NAME, PRIVILEGE, GRANTABLE
       FROM USER_TAB_PRIVS
       ORDER BY OWNER, TABLE_NAME, PRIVILEGE`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(resTabPrivs.rows, null, 2));

    console.log('\n--- 2. CONSULTA DE PRIVILEGIOS DE SISTEMA / SESIÓN (SESSION_PRIVS) ---');
    const resSessPrivs = await connection.execute(
      `SELECT PRIVILEGE FROM SESSION_PRIVS ORDER BY PRIVILEGE`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(resSessPrivs.rows, null, 2));

    console.log('\n--- 3. PRUEBA DE OPERACIÓN NO PERMITIDA: DROP TABLE ORG_LIQ.LOTE ---');
    try {
      await connection.execute(`DROP TABLE ORG_LIQ.LOTE`);
    } catch (errDrop) {
      console.log('Error capturado al intentar DROP TABLE:');
      console.log({
        errorNum: errDrop.errorNum,
        code: errDrop.code || 'ORA-01031',
        message: errDrop.message
      });
    }

    console.log('\n--- 4. PRUEBA DE OPERACIÓN NO PERMITIDA: DELETE FROM ORG_LIQ.LOTE ---');
    try {
      await connection.execute(`DELETE FROM ORG_LIQ.LOTE WHERE ROWNUM = 1`);
    } catch (errDel) {
      console.log('Error capturado al intentar DELETE en LOTE:');
      console.log({
        errorNum: errDel.errorNum,
        code: errDel.code || 'ORA-01031',
        message: errDel.message
      });
    }

  } catch (err) {
    console.error('Error general:', err);
  } finally {
    if (connection) await connection.close();
  }
}

testPrivileges();
