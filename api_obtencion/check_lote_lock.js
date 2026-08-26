const oracledb = require('oracledb');

async function testLoteRowLockNowait() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('Verificando bloqueo exclusivo en la fila del LOTE 127758...');
    try {
      const res = await connection.execute(
        `SELECT LOTE_ID, LOTE_SEQ, ESTADO, EXPEDIENTE 
         FROM ORG_LIQ.LOTE 
         WHERE ANHO = 2024 AND LOTE_SEQ = 127758 
         FOR UPDATE NOWAIT`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      console.log('Fila LOTE 127758 ESTÁ LIBRE (NO BLOQUEADA):', res.rows);
      await connection.rollback();
    } catch (e) {
      console.log('¡LA FILA DEL LOTE 127758 ESTÁ BLOQUEADA POR OTRA SESIÓN EN ORACLE!:', e.message);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (connection) await connection.close();
  }
}

testLoteRowLockNowait();
