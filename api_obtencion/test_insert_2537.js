const oracledb = require('oracledb');

async function testInsert2537() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const execOptions = { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT };

    const t0 = Date.now();
    console.log('1. Obteniendo RIF de TXT_SENIAT...');
    const rIdent = await connection.execute(
      `SELECT IDENT_CNTB, AGENCIA_CODIGO FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '2491314701' AND FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD') AND INFN_CODIGO = '105'`,
      {},
      execOptions
    );
    console.log('RIF obtenido:', rIdent.rows[0]);

    console.log('2. Calculando NEXT_SEQ...');
    const rSeq = await connection.execute(
      `SELECT NVL(MAX(PLAN_SEQ), 0) + 1 AS NEXT_SEQ FROM ORG_LIQ.PLANILLA WHERE ANHO = 2024 AND LOTE_SEQ = 127758`,
      {},
      execOptions
    );
    const planSeq = rSeq.rows[0].NEXT_SEQ;
    console.log('NEXT_SEQ:', planSeq);

    console.log('3. Insertando en PLANILLA...');
    await connection.execute(
      `INSERT INTO ORG_LIQ.PLANILLA 
       (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, ORGA_ID, FECHA_REGISTRO, IDENT_CNTB, 
        MONTO, MONTO_EFECTIVO, PLANILLA_MANUAL, FECHA_RECAUDACION, INFN_CODIGO, 
        EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, PERIODO) 
       VALUES 
       (2024, 53, '2491314701', '99225', '00', SYSDATE, 'V155651853', 
        851, 851, 0, TO_DATE('2024-04-15', 'YYYY-MM-DD'), '105', 
        7440, 127758, :planSeq, 20240415)`,
      { planSeq },
      execOptions
    );
    console.log('PLANILLA insertada');

    console.log('4. Insertando en DET_PLANILLA...');
    await connection.execute(
      `INSERT INTO ORG_LIQ.DET_PLANILLA 
       (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, PLUC_ID, DET_PLN_ID, 
        MONTO, MONTO_EFECTIVO, EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, DETP_SEQ) 
       VALUES 
       (2024, 53, '2491314701', '99225', '301010200', 1, 
        851, 851, 7440, 127758, :planSeq, 1)`,
      { planSeq },
      execOptions
    );
    console.log('DET_PLANILLA insertada');

    console.log('5. Actualizando TXT_SENIAT...');
    await connection.execute(
      `UPDATE ORG_LIQ.TXT_SENIAT 
       SET ESTADO = 1, ANHO = 2024, LOTE_SEQ = 127758, PLAN_SEQ = :planSeq 
       WHERE PLANILLA = '2491314701' 
         AND FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD') 
         AND INFN_CODIGO = '105'`,
      { planSeq },
      execOptions
    );
    console.log('TXT_SENIAT actualizado');

    console.log('6. Ejecutando COMMIT...');
    await connection.commit();
    console.log(`¡CONCILIACIÓN COMPLETADA CON ÉXITO TOTAL EN ${Date.now() - t0}ms!`);

  } catch (err) {
    console.error('Error detallado:', err);
    if (connection) await connection.rollback();
  } finally {
    if (connection) await connection.close();
  }
}

testInsert2537();
