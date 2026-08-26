const oracledb = require('oracledb');

async function testFullConciliacionDirect() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const payload = {
      usuario_operador: "BOT_ORQUESTADOR",
      expediente: 7440,
      lote_id: 53,
      lote_seq: 127758,
      planilla_id: "2491314701",
      forma: "99225",
      monto: 851,
      banco: "105",
      agencia: "0800",
      fecha_recaudacion: "2024-04-15",
      asignaciones: [{ partida: "301010200", monto: 851 }]
    };

    const execOptions = { autoCommit: false };
    const fechaLimpia = payload.fecha_recaudacion.split('T')[0];
    const anho = parseInt(fechaLimpia.split('-')[0], 10);
    const periodo = parseInt(fechaLimpia.replace(/-/g, ''), 10);

    // 1. Extraer RIF
    const resultIdent = await connection.execute(
      `SELECT IDENT_CNTB, AGENCIA_CODIGO 
       FROM ORG_LIQ.TXT_SENIAT 
       WHERE PLANILLA = :planilla 
         AND INFN_CODIGO = :banco 
         AND TRUNC(FECHA_RECAUDACION) = TO_DATE(:fecha, 'YYYY-MM-DD')`,
      { planilla: payload.planilla_id, banco: payload.banco, fecha: fechaLimpia },
      execOptions
    );
    const rowIdent = resultIdent.rows[0];
    const identCntb = rowIdent[0];

    // 2. Next SEQ
    const resultSeq = await connection.execute(
      `SELECT NVL(MAX(PLAN_SEQ), 0) + 1 AS NEXT_SEQ 
       FROM ORG_LIQ.PLANILLA 
       WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
      { anho, loteSeq: payload.lote_seq },
      execOptions
    );
    const planSeq = resultSeq.rows[0][0];

    console.log(`Asignando PLAN_SEQ = ${planSeq}, RIF = ${identCntb}`);

    // 3. Insert PLANILLA
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
        loteId: payload.lote_id,
        planilla: payload.planilla_id,
        forma: payload.forma,
        ident: identCntb,
        monto: payload.monto,
        fecha: fechaLimpia,
        banco: payload.banco,
        expediente: payload.expediente,
        loteSeq: payload.lote_seq,
        planSeq: planSeq,
        periodo
      },
      execOptions
    );

    // 4. Insert DET_PLANILLA
    await connection.execute(
      `INSERT INTO ORG_LIQ.DET_PLANILLA 
       (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, PLUC_ID, DET_PLN_ID, 
        MONTO, MONTO_EFECTIVO, EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, DETP_SEQ) 
       VALUES 
       (:anho, :loteId, :planilla, :forma, :partida, 1, 
        :monto, :monto, :expediente, :loteSeq, :planSeq, 1)`,
      {
        anho,
        loteId: payload.lote_id,
        planilla: payload.planilla_id,
        forma: payload.forma,
        partida: payload.asignaciones[0].partida,
        monto: payload.asignaciones[0].monto,
        expediente: payload.expediente,
        loteSeq: payload.lote_seq,
        planSeq: planSeq
      },
      execOptions
    );

    // 5. Update TXT_SENIAT
    await connection.execute(
      `UPDATE ORG_LIQ.TXT_SENIAT 
       SET ESTADO = 1, ANHO = :anho, LOTE_SEQ = :loteSeq, PLAN_SEQ = :planSeq 
       WHERE PLANILLA = :planilla 
         AND INFN_CODIGO = :banco 
         AND TRUNC(FECHA_RECAUDACION) = TO_DATE(:fecha, 'YYYY-MM-DD')`,
      {
        anho,
        loteSeq: payload.lote_seq,
        planSeq: planSeq,
        planilla: payload.planilla_id,
        banco: payload.banco,
        fecha: fechaLimpia
      },
      execOptions
    );

    await connection.commit();
    console.log('¡CONCILIACIÓN EXITOSA DIRECTA EN ORACLE!');

  } catch (err) {
    console.error('Error en conciliación directa:', err);
    if (connection) await connection.rollback();
  } finally {
    if (connection) await connection.close();
  }
}

testFullConciliacionDirect();
