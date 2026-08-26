const oracledb = require('oracledb');

async function testInsertDirect() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const execOptions = { autoCommit: true, outFormat: oracledb.OUT_FORMAT_OBJECT };
    const t0 = Date.now();
    console.log('Probando insert en PLANILLA con seq 2537...');
    await connection.execute(
      `INSERT INTO ORG_LIQ.PLANILLA 
       (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, ORGA_ID, FECHA_REGISTRO, IDENT_CNTB, 
        MONTO, MONTO_EFECTIVO, PLANILLA_MANUAL, FECHA_RECAUDACION, INFN_CODIGO, 
        EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, PERIODO) 
       VALUES 
       (2024, 53, '2491306810', '99225', '00', SYSDATE, 'V067028585', 
        525, 525, 0, TO_DATE('2024-04-15', 'YYYY-MM-DD'), '105', 
        7440, 127758, 2537, 20240415)`,
      {},
      execOptions
    );
    console.log(`Insert en PLANILLA completado en ${Date.now() - t0}ms`);

    console.log('Probando insert en DET_PLANILLA...');
    const t1 = Date.now();
    await connection.execute(
      `INSERT INTO ORG_LIQ.DET_PLANILLA 
       (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, PLUC_ID, DET_PLN_ID, 
        MONTO, MONTO_EFECTIVO, EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, DETP_SEQ) 
       VALUES 
       (2024, 53, '2491306810', '99225', '301010200', 1, 
        525, 525, 7440, 127758, 2537, 1)`,
      {},
      execOptions
    );
    console.log(`Insert en DET_PLANILLA completado en ${Date.now() - t1}ms`);

    console.log('Probando update en TXT_SENIAT...');
    const t2 = Date.now();
    await connection.execute(
      `UPDATE ORG_LIQ.TXT_SENIAT 
       SET ESTADO = 1, ANHO = 2024, LOTE_SEQ = 127758, PLAN_SEQ = 2537 
       WHERE PLANILLA = '2491306810' 
         AND FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD') 
         AND INFN_CODIGO = '105'`,
      {},
      execOptions
    );
    console.log(`Update en TXT_SENIAT completado en ${Date.now() - t2}ms`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (connection) await connection.close();
  }
}

testInsertDirect();
