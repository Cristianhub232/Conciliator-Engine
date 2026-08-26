const oracledb = require('oracledb');

async function testLoteRowLock() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('Probando SELECT FOR UPDATE NOWAIT en LOTE (2024, 127758)...');
    try {
      const res = await connection.execute(
        `SELECT LOTE_ID, LOTE_SEQ, ESTADO, EXPEDIENTE FROM ORG_LIQ.LOTE WHERE ANHO = 2024 AND LOTE_SEQ = 127758 FOR UPDATE NOWAIT`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      console.log('LOTE 127758 NO TIENE BLOQUEO:', res.rows);
      await connection.rollback();
    } catch (e) {
      console.log('¡FILA LOTE 127758 BLOQUEADA POR OTRA SESIÓN!:', e.message);
    }

    console.log('Probando SELECT FOR UPDATE NOWAIT en FORMA_IMPUESTO (99225)...');
    try {
      const res2 = await connection.execute(
        `SELECT * FROM ORG_LIQ.FORMA_IMPUESTO WHERE FORMA_CODIGO = '99225' FOR UPDATE NOWAIT`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      console.log('FORMA_IMPUESTO 99225 NO TIENE BLOQUEO');
      await connection.rollback();
    } catch (e) {
      console.log('¡FORMA_IMPUESTO BLOQUEADA!:', e.message);
    }

    console.log('Probando SELECT FOR UPDATE NOWAIT en ORGANISMO_LIQUIDADOR (00)...');
    try {
      const res3 = await connection.execute(
        `SELECT * FROM ORG_LIQ.ORGANISMO_LIQUIDADOR WHERE ORGA_ID = '00' FOR UPDATE NOWAIT`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      console.log('ORGANISMO_LIQUIDADOR 00 NO TIENE BLOQUEO');
      await connection.rollback();
    } catch (e) {
      console.log('¡ORGANISMO_LIQUIDADOR BLOQUEADA!:', e.message);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

testLoteRowLock();
