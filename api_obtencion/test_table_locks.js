const oracledb = require('oracledb');

async function testTableLock() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('Probando LOCK TABLE PLANILLA IN ROW SHARE MODE NOWAIT...');
    try {
      await connection.execute(`LOCK TABLE ORG_LIQ.PLANILLA IN ROW SHARE MODE NOWAIT`);
      console.log('LOCK TABLE PLANILLA OK (La tabla NO tiene bloqueo exclusivo)');
      await connection.rollback();
    } catch (e) {
      console.log('¡BLOQUEO EXCLUSIVO EN TABLA PLANILLA!:', e.message);
    }

    console.log('Probando LOCK TABLE DET_PLANILLA IN ROW SHARE MODE NOWAIT...');
    try {
      await connection.execute(`LOCK TABLE ORG_LIQ.DET_PLANILLA IN ROW SHARE MODE NOWAIT`);
      console.log('LOCK TABLE DET_PLANILLA OK');
      await connection.rollback();
    } catch (e) {
      console.log('¡BLOQUEO EN TABLA DET_PLANILLA!:', e.message);
    }

    console.log('Probando LOCK TABLE TXT_SENIAT IN ROW SHARE MODE NOWAIT...');
    try {
      await connection.execute(`LOCK TABLE ORG_LIQ.TXT_SENIAT IN ROW SHARE MODE NOWAIT`);
      console.log('LOCK TABLE TXT_SENIAT OK');
      await connection.rollback();
    } catch (e) {
      console.log('¡BLOQUEO EN TABLA TXT_SENIAT!:', e.message);
    }

    console.log('Probando LOCK TABLE LOTE IN ROW SHARE MODE NOWAIT...');
    try {
      await connection.execute(`LOCK TABLE ORG_LIQ.LOTE IN ROW SHARE MODE NOWAIT`);
      console.log('LOCK TABLE LOTE OK');
      await connection.rollback();
    } catch (e) {
      console.log('¡BLOQUEO EN TABLA LOTE!:', e.message);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

testTableLock();
