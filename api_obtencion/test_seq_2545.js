const oracledb = require('oracledb');

async function testWithSeq() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const execOptions = { autoCommit: true, outFormat: oracledb.OUT_FORMAT_OBJECT };

    console.log('Probando insert con seq 2545...');
    const t0 = Date.now();
    await connection.execute(
      `INSERT INTO ORG_LIQ.PLANILLA 
       (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, ORGA_ID, FECHA_REGISTRO, IDENT_CNTB, 
        MONTO, MONTO_EFECTIVO, PLANILLA_MANUAL, FECHA_RECAUDACION, INFN_CODIGO, 
        EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, PERIODO) 
       VALUES 
       (2024, 53, '2491314701', '99225', '00', SYSDATE, 'V155651853', 
        851, 851, 0, TO_DATE('2024-04-15', 'YYYY-MM-DD'), '105', 
        7440, 127758, 2545, 20240415)`,
      {},
      execOptions
    );
    console.log(`Insert completado en ${Date.now() - t0}ms`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (connection) await connection.close();
  }
}

testWithSeq();
