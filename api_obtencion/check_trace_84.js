const oracledb = require('oracledb');

async function checkTracePlanilla() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const planillaId = '2391126684';
    const fecha = '2024-04-15';
    const banco = '105';
    const anho = 2024;

    console.log(`=======================================================`);
    console.log(`   TRAZA PREVIA DE PLANILLA: ${planillaId}`);
    console.log(`=======================================================\n`);

    // 1. Estado en TXT_SENIAT
    console.log(`[1] Registro original en ORG_LIQ.TXT_SENIAT:`);
    const txt = await connection.execute(
      `SELECT * FROM ORG_LIQ.TXT_SENIAT 
       WHERE PLANILLA = :planilla AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') AND INFN_CODIGO = :banco`,
      { planilla: planillaId, fecha, banco },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(txt.rows[0], null, 2));

    // 2. Existencia en PLANILLA
    console.log(`\n[2] Búsqueda en ORG_LIQ.PLANILLA (Año 2024):`);
    const plan = await connection.execute(
      `SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = :planilla AND ANHO = :anho`,
      { planilla: planillaId, anho },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`    Total registros en PLANILLA (2024): ${plan.rows.length} (debe ser 0)`);
    if (plan.rows.length > 0) console.log(JSON.stringify(plan.rows, null, 2));

    // 3. Existencia en DET_PLANILLA
    console.log(`\n[3] Búsqueda en ORG_LIQ.DET_PLANILLA (Año 2024):`);
    const det = await connection.execute(
      `SELECT * FROM ORG_LIQ.DET_PLANILLA WHERE PLANILLA_ID = :planilla AND ANHO = :anho`,
      { planilla: planillaId, anho },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`    Total registros en DET_PLANILLA (2024): ${det.rows.length} (debe ser 0)`);

    // 4. LOTE y Próximo PLAN_SEQ
    console.log(`\n[4] Información de LOTE y Secuencia:`);
    const lote = await connection.execute(
      `SELECT LOTE_ID, ANHO, LOTE_SEQ, EXPEDIENTE, ESTADO, TOTAL_PLN
       FROM ORG_LIQ.LOTE 
       WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
         AND INFN_CODIGO = :banco
         AND AGENCIA_CODIGO = :agencia
         AND ANHO = :anho`,
      { fecha, banco, agencia: txt.rows[0]?.AGENCIA_CODIGO || '0800', anho },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('    Lote:', JSON.stringify(lote.rows[0], null, 2));

    const loteSeq = lote.rows[0]?.LOTE_SEQ;
    const seq = await connection.execute(
      `SELECT NVL(MAX(PLAN_SEQ), 0) + 1 AS NEXT_PLAN_SEQ 
       FROM ORG_LIQ.PLANILLA WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
      { anho, loteSeq },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`    Próximo PLAN_SEQ a asignar: ${seq.rows[0].NEXT_PLAN_SEQ}`);

    // 5. Test de Catálogo de Partidas
    console.log(`\n[5] Validación de Catálogo (Forma ${txt.rows[0]?.FORMA_CODIGO}):`);
    try {
      const catRes = await fetch(`http://localhost:3005/api/formas/${txt.rows[0]?.FORMA_CODIGO}/resolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: txt.rows[0]?.MONTO_EFECTIVO,
          rif: txt.rows[0]?.IDENT_CNTB
        })
      });
      const catData = await catRes.json();
      console.log('    Respuesta de Catálogo:', JSON.stringify(catData, null, 2));
    } catch (catErr) {
      console.log('    Catálogo info:', catErr.message);
    }

  } catch (err) {
    console.error('Error en traza:', err);
  } finally {
    if (connection) await connection.close();
  }
}

checkTracePlanilla();
