const oracledb = require('oracledb');

async function testInsercionCompleta2() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const planillaId = '2390773119';
    const banco = '105';
    const fecha = '2024-04-15';
    const anho = 2024;
    const periodo = 20240415;
    const loteSeq = 127758;
    const loteId = 53;
    const expediente = 7440;
    const forma = '99225';
    const monto = 57.0;

    console.log('--- TEST COMPLETO 2 ---');
    
    const resultSeq = await connection.execute(
      `SELECT NVL(MAX(PLAN_SEQ), 0) + 1 AS NEXT_SEQ 
       FROM ORG_LIQ.PLANILLA WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
      { anho, loteSeq },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const planSeq = resultSeq.rows[0].NEXT_SEQ;
    console.log('PLAN_SEQ calculado:', planSeq);

    await connection.execute(
      `INSERT INTO ORG_LIQ.PLANILLA 
       (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, ORGA_ID, FECHA_REGISTRO, IDENT_CNTB, 
        MONTO, MONTO_EFECTIVO, PLANILLA_MANUAL, FECHA_RECAUDACION, INFN_CODIGO, 
        EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, PERIODO) 
       VALUES 
       (:anho, :loteId, :planilla, :forma, '00', SYSDATE, :ident, 
        :monto, :monto, 0, TO_DATE(:fecha, 'YYYY-MM-DD'), :banco, 
        :expediente, :loteSeq, :planSeq, :periodo)`,
      {
        anho,
        loteId,
        planilla: planillaId,
        forma,
        ident: 'V210909024',
        monto,
        fecha,
        banco,
        expediente,
        loteSeq,
        planSeq,
        periodo
      },
      { autoCommit: false }
    );
    console.log('✅ INSERT en PLANILLA exitoso!');

    await connection.execute(
      `INSERT INTO ORG_LIQ.DET_PLANILLA 
       (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, PLUC_ID, DET_PLN_ID, MONTO, MONTO_EFECTIVO, EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, DETP_SEQ) 
       VALUES 
       (:anho, :loteId, :planilla, :forma, :partida, :detpSeq, :monto, :monto, :expediente, :loteSeq, :planSeq, :detpSeq)`,
      {
        anho,
        loteId,
        planilla: planillaId,
        forma,
        partida: '301010200',
        detpSeq: 1,
        monto,
        expediente,
        loteSeq,
        planSeq
      },
      { autoCommit: false }
    );
    console.log('✅ INSERT en DET_PLANILLA exitoso!');

    const upd = await connection.execute(
      `UPDATE ORG_LIQ.TXT_SENIAT 
       SET ESTADO = 1, ANHO = :anho, LOTE_SEQ = :loteSeq, PLAN_SEQ = :planSeq
       WHERE PLANILLA = :planilla 
         AND INFN_CODIGO = :banco 
         AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
         AND AGENCIA_CODIGO = '0800'`,
      {
        anho, loteSeq, planSeq,
        planilla: planillaId, banco, fecha
      },
      { autoCommit: false }
    );
    console.log(`✅ UPDATE en TXT_SENIAT exitoso (${upd.rowsAffected} filas afectadas)`);

    await connection.rollback();
    console.log('✅ Rollback completado con éxito. TODO FUNCIONA 100% PERFECTO!');

  } catch (err) {
    console.error('❌ Error en prueba:', err);
  } finally {
    if (connection) await connection.close();
  }
}

testInsercionCompleta2();
