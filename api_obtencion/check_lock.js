const oracledb = require('oracledb');

async function checkLocks() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('Verificando si 2491314701 ya está en PLANILLA...');
    const resP = await connection.execute(
      `SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = '2491314701'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('PLANILLA:', resP.rows);

    console.log('Verificando TXT_SENIAT...');
    const resT = await connection.execute(
      `SELECT PLANILLA, ESTADO, LOTE_SEQ, PLAN_SEQ FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '2491314701'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('TXT_SENIAT:', resT.rows);

    console.log('Probando UPDATE con NOWAIT para detectar locks...');
    try {
      await connection.execute(
        `SELECT * FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '2491314701' FOR UPDATE NOWAIT`
      );
      console.log('Fila en TXT_SENIAT NO ESTÁ BLOQUEADA (Disponible)');
      await connection.rollback();
    } catch (errLock) {
      console.log('¡FILA BLOQUEADA POR OTRA SESIÓN!:', errLock.message);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkLocks();
