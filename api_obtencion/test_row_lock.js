const oracledb = require('oracledb');

async function testLock() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('Verificando bloqueo de 2491306810...');
    try {
      await connection.execute(`SELECT * FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '2491306810' FOR UPDATE NOWAIT`);
      console.log('Fila 2491306810 NO esta bloqueada');
      await connection.rollback();
    } catch (e) {
      console.log('¡FILA 2491306810 BLOQUEADA!:', e.message);
    }

    console.log('Verificando si la tabla PLANILLA tiene lock...');
    try {
      await connection.execute(`SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = '2491306810' FOR UPDATE NOWAIT`);
      console.log('PLANILLA 2491306810 NO esta bloqueada');
      await connection.rollback();
    } catch (e) {
      console.log('¡PLANILLA 2491306810 BLOQUEADA!:', e.message);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

testLock();
