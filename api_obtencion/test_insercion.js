const oracledb = require('oracledb');

async function testInsercion() {
  let connection;
  
  console.log('=== TEST DE INSERCIÓN DIRECTA EN ORACLE ===\n');
  
  try {
    // 1. Conectar
    console.log('[1] Conectando a Oracle 172.21.65.90:1521/cert_rep...');
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });
    console.log('    ✅ Conexión establecida\n');

    // 2. SELECT de prueba básico
    console.log('[2] SELECT básico de prueba (TXT_SENIAT)...');
    const test1 = await connection.execute(
      `SELECT COUNT(*) AS TOTAL FROM ORG_LIQ.TXT_SENIAT WHERE ROWNUM <= 1`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('    ✅ SELECT ok:', test1.rows[0], '\n');

    // 3. Buscar la planilla específica que falló
    const planillaId = '2390773119';
    const banco = '105';
    const fecha = '2024-04-15';
    
    console.log(`[3] Buscando planilla ${planillaId} en TXT_SENIAT...`);
    const resultTxt = await connection.execute(
      `SELECT PLANILLA, IDENT_CNTB, FORMA_CODIGO, MONTO_EFECTIVO, ESTADO, AGENCIA_CODIGO
       FROM ORG_LIQ.TXT_SENIAT 
       WHERE PLANILLA = :planilla 
         AND INFN_CODIGO = :banco 
         AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')`,
      { planilla: planillaId, banco, fecha },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (resultTxt.rows.length === 0) {
      console.log('    ❌ NO se encontró la planilla en TXT_SENIAT\n');
      return;
    }
    
    const txt = resultTxt.rows[0];
    console.log('    ✅ Encontrada:', JSON.stringify(txt, null, 2), '\n');

    if (txt.ESTADO !== null) {
      console.log(`    ⚠️  ESTADO = ${txt.ESTADO} → Esta planilla YA fue procesada anteriormente.\n`);
    }

    // 4. Verificar si ya existe en PLANILLA
    console.log(`[4] Verificando si ya existe en ORG_LIQ.PLANILLA...`);
    const resultPlan = await connection.execute(
      `SELECT PLANILLA_ID, ANHO, LOTE_SEQ, PLAN_SEQ, MONTO, EXPEDIENTE 
       FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = :planilla`,
      { planilla: planillaId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (resultPlan.rows.length > 0) {
      console.log('    ⚠️  YA EXISTE en PLANILLA:', JSON.stringify(resultPlan.rows[0], null, 2));
      console.log('    → ESTO CAUSARÍA un error de clave duplicada al intentar INSERT\n');
    } else {
      console.log('    ✅ No existe en PLANILLA (se puede insertar)\n');
    }

    // 5. Verificar LOTE
    console.log('[5] Buscando LOTE asociado...');
    const resultLote = await connection.execute(
      `SELECT EXPEDIENTE, LOTE_ID, LOTE_SEQ, ESTADO
       FROM ORG_LIQ.LOTE 
       WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
         AND INFN_CODIGO = :banco
         AND AGENCIA_CODIGO = :agencia`,
      { fecha, banco, agencia: txt.AGENCIA_CODIGO },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (resultLote.rows.length === 0) {
      console.log('    ❌ No se encontró LOTE para esta planilla\n');
    } else {
      console.log('    ✅ LOTE encontrado:', JSON.stringify(resultLote.rows[0], null, 2), '\n');
    }

    // 6. Calcular PLAN_SEQ
    const loteSeq = resultLote.rows[0]?.LOTE_SEQ || 0;
    const anho = 2024;
    
    console.log('[6] Calculando PLAN_SEQ...');
    const resultSeq = await connection.execute(
      `SELECT NVL(MAX(PLAN_SEQ), 0) + 1 AS NEXT_SEQ 
       FROM ORG_LIQ.PLANILLA WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
      { anho, loteSeq },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('    ✅ Siguiente PLAN_SEQ:', resultSeq.rows[0].NEXT_SEQ, '\n');

    // 7. Verificar permisos INSERT
    console.log('[7] Probando INSERT de prueba (con ROLLBACK inmediato)...');
    const nextSeq = resultSeq.rows[0].NEXT_SEQ;
    const loteId = resultLote.rows[0]?.LOTE_ID || 0;
    const expediente = resultLote.rows[0]?.EXPEDIENTE || 0;

    try {
      await connection.execute(
        `INSERT INTO ORG_LIQ.PLANILLA 
         (ANHO, LOTE_ID, PLANILLA_ID, IDENT_CNTB, MONTO, EXPEDIENTE, LOTE_SEQ, PLAN_SEQ)
         VALUES (:anho, :loteId, :planilla, :ident, :monto, :expediente, :loteSeq, :planSeq)`,
        {
          anho,
          loteId,
          planilla: planillaId,
          ident: txt.IDENT_CNTB || 'V000000000',
          monto: txt.MONTO_EFECTIVO,
          expediente,
          loteSeq,
          planSeq: nextSeq
        },
        { autoCommit: false }
      );
      console.log('    ✅ INSERT exitoso en PLANILLA (sin commit)\n');

      // Probar DET_PLANILLA
      console.log('[8] Probando INSERT en DET_PLANILLA...');
      await connection.execute(
        `INSERT INTO ORG_LIQ.DET_PLANILLA 
         (PLANILLA_ID, LOTE_ID, PLUC_ID, MONTO, LOTE_SEQ, PLAN_SEQ, DETP_SEQ)
         VALUES (:planilla, :loteId, :partida, :monto, :loteSeq, :planSeq, :detpSeq)`,
        {
          planilla: planillaId,
          loteId,
          partida: '30101020',
          monto: txt.MONTO_EFECTIVO,
          loteSeq,
          planSeq: nextSeq,
          detpSeq: 1
        },
        { autoCommit: false }
      );
      console.log('    ✅ INSERT exitoso en DET_PLANILLA (sin commit)\n');

      // Probar UPDATE TXT_SENIAT
      console.log('[9] Probando UPDATE en TXT_SENIAT...');
      const upd = await connection.execute(
        `UPDATE ORG_LIQ.TXT_SENIAT 
         SET ESTADO = 1, ANHO = :anho, LOTE_SEQ = :loteSeq, PLAN_SEQ = :planSeq
         WHERE PLANILLA = :planilla 
           AND INFN_CODIGO = :banco 
           AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
           AND AGENCIA_CODIGO = :agencia`,
        {
          anho, loteSeq, planSeq: nextSeq,
          planilla: planillaId, banco, fecha,
          agencia: txt.AGENCIA_CODIGO
        },
        { autoCommit: false }
      );
      console.log(`    ✅ UPDATE exitoso (${upd.rowsAffected} filas afectadas)\n`);

      // ROLLBACK para no dejar basura
      console.log('[ROLLBACK] Revirtiendo cambios de prueba...');
      await connection.rollback();
      console.log('    ✅ Rollback completado. No se alteró la BD.\n');

    } catch (insertErr) {
      console.log('    ❌ ERROR EN INSERT/UPDATE:', insertErr.message);
      console.log('    Código:', insertErr.code || insertErr.errorNum);
      console.log('    Detalle completo:', insertErr);
      await connection.rollback();
    }

    console.log('\n=== FIN DEL TEST ===');

  } catch (err) {
    console.error('\n❌ ERROR GENERAL:', err.message);
    console.error('   Código:', err.code);
    console.error('   Detalle:', err);
  } finally {
    if (connection) {
      try { await connection.close(); } catch(e) {}
    }
  }
}

testInsercion();
