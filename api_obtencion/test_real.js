const oracledb = require('oracledb');

async function testInsercionReal() {
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
    const loteSeq = 127758;
    const loteId = 53;
    const expediente = 7440;
    const forma = '99225';
    const monto = 57.0;

    console.log('Probando INSERT con FORMA_CODIGO y ANHO = 2024...');
    
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
       (ANHO, LOTE_ID, PLANILLA_ID, IDENT_CNTB, MONTO, EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, FORMA_CODIGO) 
       VALUES (:anho, :loteId, :planilla, :ident, :monto, :expediente, :loteSeq, :planSeq, :forma)`,
      {
        anho,
        loteId,
        planilla: planillaId,
        ident: 'V210909024',
        monto,
        expediente,
        loteSeq,
        planSeq,
        forma
      },
      { autoCommit: false }
    );
    console.log('✅ INSERT en PLANILLA exitoso!');

    await connection.execute(
      `INSERT INTO ORG_LIQ.DET_PLANILLA 
       (PLANILLA_ID, LOTE_ID, PLUC_ID, MONTO, LOTE_SEQ, PLAN_SEQ, DETP_SEQ) 
       VALUES (:planilla, :loteId, :partida, :monto, :loteSeq, :planSeq, :detpSeq)`,
      {
        planilla: planillaId,
        loteId,
        partida: '301010200',
        monto,
        loteSeq,
        planSeq,
        detpSeq: 1
      },
      { autoCommit: false }
    );
    console.log('✅ INSERT en DET_PLANILLA exitoso!');

    await connection.rollback();
    console.log('✅ Rollback completado limpiamente.');

  } catch (err) {
    console.error('❌ Error en prueba:', err);
  } finally {
    if (connection) await connection.close();
  }
}

testInsercionReal();
