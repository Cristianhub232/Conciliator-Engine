const oracledb = require('oracledb');

async function runConciliacionTests() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const planillaId = '2390786541';
    const anho = 2024;
    const loteSeq = 127758;

    console.log('================================================================');
    console.log(`   EJECUCIÓN DE PRUEBAS DE CONCILIACIÓN: CP-013 AL CP-019`);
    console.log(`   Planilla Objetivo: ${planillaId}`);
    console.log('================================================================\n');

    // ==========================================
    // CP-013: Secuencial PLAN_SEQ correlativo
    // ==========================================
    console.log('--- [CP-013] VERIFICACIÓN DE SECUENCIA CORRELATIVA (PLAN_SEQ) ---');
    const qSeqPrev = await connection.execute(`
      SELECT PLANILLA_ID, PLAN_SEQ 
      FROM ORG_LIQ.PLANILLA 
      WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq AND PLAN_SEQ IN (2516, 2517)
      ORDER BY PLAN_SEQ
    `, { anho, loteSeq }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Secuencias consecutivas asignadas:', JSON.stringify(qSeqPrev.rows, null, 2));

    // ==========================================
    // CP-014: Registro completo en PLANILLA
    // ==========================================
    console.log('\n--- [CP-014] CABECERA COMPLETA EN ORG_LIQ.PLANILLA ---');
    const qPlan = await connection.execute(`
      SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = :planillaId AND ANHO = :anho
    `, { planillaId, anho }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(qPlan.rows[0], null, 2));

    // ==========================================
    // CP-015: Registros en DET_PLANILLA
    // ==========================================
    console.log('\n--- [CP-015] DETALLE EN ORG_LIQ.DET_PLANILLA ---');
    const qDet = await connection.execute(`
      SELECT * FROM ORG_LIQ.DET_PLANILLA WHERE PLANILLA_ID = :planillaId AND ANHO = :anho
    `, { planillaId, anho }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(qDet.rows, null, 2));

    // ==========================================
    // CP-016: Cuadre Financiero Cabecera vs Detalle
    // ==========================================
    console.log('\n--- [CP-016] CUADRE DE CONTROL: CABECERA VS SUMA DETALLE ---');
    const qCuadre = await connection.execute(`
      SELECT 
          P.PLANILLA_ID,
          P.MONTO AS MONTO_CABECERA,
          SUM(D.MONTO) AS SUMA_DETALLE_PARTIDAS,
          (P.MONTO - SUM(D.MONTO)) AS DIFERENCIA,
          CASE WHEN P.MONTO = SUM(D.MONTO) THEN 'CUADRADO_EXACTO' ELSE 'DESCUADRE' END AS ESTADO_CUADRE
      FROM ORG_LIQ.PLANILLA P
      JOIN ORG_LIQ.DET_PLANILLA D 
        ON P.ANHO = D.ANHO AND P.LOTE_SEQ = D.LOTE_SEQ AND P.PLAN_SEQ = D.PLAN_SEQ
      WHERE P.PLANILLA_ID = :planillaId AND P.ANHO = :anho
      GROUP BY P.PLANILLA_ID, P.MONTO
    `, { planillaId, anho }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(qCuadre.rows[0], null, 2));

    // ==========================================
    // CP-017: Fila de TXT_SENIAT actualizada
    // ==========================================
    console.log('\n--- [CP-017] ESTADO EN ORG_LIQ.TXT_SENIAT ---');
    const qTxt = await connection.execute(`
      SELECT PLANILLA, ESTADO, ANHO, LOTE_SEQ, PLAN_SEQ, FORMA_CODIGO, MONTO_EFECTIVO, IDENT_CNTB, TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION
      FROM ORG_LIQ.TXT_SENIAT 
      WHERE PLANILLA = :planillaId AND ANHO = :anho
    `, { planillaId, anho }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(qTxt.rows[0], null, 2));

    // ==========================================
    // CP-018: Atomicidad / Rollback ante error en Detalle
    // ==========================================
    console.log('\n--- [CP-018] PRUEBA DE ATOMICIDAD Y ROLLBACK ---');
    const dummyPlanillaId = '9999999999_TEST';
    try {
      // 1. Insert cabecera
      await connection.execute(`
        INSERT INTO ORG_LIQ.PLANILLA 
        (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, ORGA_ID, FECHA_REGISTRO, IDENT_CNTB, MONTO, MONTO_EFECTIVO, PLANILLA_MANUAL, FECHA_RECAUDACION, INFN_CODIGO, EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, PERIODO)
        VALUES (2024, 53, :pId, '99225', '00', SYSDATE, 'V00000000', 100, 100, 0, TO_DATE('2024-04-15','YYYY-MM-DD'), '105', 7440, 127758, 99999, 20240415)
      `, { pId: dummyPlanillaId }, { autoCommit: false });

      // 2. Provocar error en detalle (violación de clave foránea o valor no válido)
      await connection.execute(`
        INSERT INTO ORG_LIQ.DET_PLANILLA 
        (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, PLUC_ID, DET_PLN_ID, MONTO, MONTO_EFECTIVO, EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, DETP_SEQ)
        VALUES (2024, 53, :pId, '99225', 'PARTIDA_INEXISTENTE_ERROR_PROVOCADO', 1, 100, 100, 7440, 127758, 99999, 1)
      `, { pId: dummyPlanillaId }, { autoCommit: false });

      await connection.commit();
    } catch (atomicErr) {
      console.log('Error provocado exitosamente:', atomicErr.message);
      await connection.rollback();
      console.log('Rollback ejecutado.');

      // Verificar que NO quedó rastro en PLANILLA ni DET_PLANILLA
      const checkPlan = await connection.execute(`SELECT COUNT(*) AS CNT FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = :pId`, { pId: dummyPlanillaId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const checkDet = await connection.execute(`SELECT COUNT(*) AS CNT FROM ORG_LIQ.DET_PLANILLA WHERE PLANILLA_ID = :pId`, { pId: dummyPlanillaId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      console.log(`Verificación de limpieza: Filas en PLANILLA = ${checkPlan.rows[0].CNT}, Filas en DET_PLANILLA = ${checkDet.rows[0].CNT}`);
    }

    // ==========================================
    // CP-019: Segundo intento de conciliar la misma planilla (Rechazo)
    // ==========================================
    console.log('\n--- [CP-019] INTENTO DE RE-CONCILIACIÓN DE PLANILLA YA CONCILIADA ---');
    try {
      const resDup = await fetch('http://localhost:3010/api/planillas/conciliar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_operador: "BOT_ORQUESTADOR",
          expediente: 7440,
          lote_id: 53,
          lote_seq: 127758,
          planilla_id: planillaId,
          forma: "99225",
          monto: 28,
          banco: "105",
          agencia: "0800",
          fecha_recaudacion: "2024-04-15",
          asignaciones: [{ partida: "301010200", monto: 28 }]
        })
      });
      const dupData = await resDup.json();
      console.log('Respuesta del servidor ante intento duplicado (HTTP Status):', resDup.status);
      console.log('Mensaje de rechazo:', JSON.stringify(dupData, null, 2));
    } catch (dupErr) {
      console.log('Error capturado:', dupErr.message);
    }

  } catch (err) {
    console.error('Error general en pruebas de conciliación:', err);
  } finally {
    if (connection) await connection.close();
  }
}

runConciliacionTests();
