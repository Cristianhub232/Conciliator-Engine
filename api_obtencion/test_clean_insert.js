const oracledb = require('oracledb');

async function testCleanInsert() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const execOptions = { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT };

    const rSeq = await connection.execute(
      `SELECT NVL(MAX(PLAN_SEQ), 0) + 1 AS NEXT_SEQ 
       FROM ORG_LIQ.PLANILLA 
       WHERE ANHO = 2024 AND LOTE_SEQ = 127758`,
      {},
      execOptions
    );
    const planSeq = rSeq.rows[0].NEXT_SEQ;
    console.log(`NEXT_SEQ disponible ahora = ${planSeq}`);

    const t0 = Date.now();
    await connection.execute(
      `INSERT INTO ORG_LIQ.PLANILLA 
       (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, ORGA_ID, FECHA_REGISTRO, IDENT_CNTB, 
        MONTO, MONTO_EFECTIVO, PLANILLA_MANUAL, FECHA_RECAUDACION, INFN_CODIGO, 
        EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, PERIODO) 
       VALUES 
       (2024, 53, '2491306810', '99225', '00', SYSDATE, 'V067028585', 
        525, 525, 0, TO_DATE('2024-04-15', 'YYYY-MM-DD'), '105', 
        7440, 127758, :planSeq, 20240415)`,
      { planSeq },
      execOptions
    );
    console.log(`Insert PLANILLA completado en ${Date.now() - t0}ms`);

    await connection.execute(
      `INSERT INTO ORG_LIQ.DET_PLANILLA 
       (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, PLUC_ID, DET_PLN_ID, 
        MONTO, MONTO_EFECTIVO, EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, DETP_SEQ) 
       VALUES 
       (2024, 53, '2491306810', '99225', '301010200', 1, 
        525, 525, 7440, 127758, :planSeq, 1)`,
      { planSeq },
      execOptions
    );
    console.log(`Insert DET_PLANILLA completado`);

    await connection.execute(
      `UPDATE ORG_LIQ.TXT_SENIAT 
       SET ESTADO = 1, ANHO = 2024, LOTE_SEQ = 127758, PLAN_SEQ = :planSeq 
       WHERE PLANILLA = '2491306810' 
         AND FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD') 
         AND INFN_CODIGO = '105'`,
      { planSeq },
      execOptions
    );
    console.log(`Update TXT_SENIAT completado`);

    await connection.commit();
    console.log(`¡CONCILIACIÓN DE 2491306810 EXITOSA EN ORACLE CON SEQ ${planSeq}!`);

  } catch (err) {
    console.error('Error:', err);
    if (connection) await connection.rollback();
  } finally {
    if (connection) await connection.close();
  }
}

testCleanInsert();
