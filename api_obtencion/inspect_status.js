const oracledb = require('oracledb');

async function inspectPlanillaStatus() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const planillaId = '2390773119';
    console.log(`=== ESTADO ACTUAL DE PLANILLA ${planillaId} EN LA BASE DE DATOS ===\n`);

    // 1. TXT_SENIAT
    console.log('1. ORG_LIQ.TXT_SENIAT:');
    const txt = await connection.execute(
      `SELECT * FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = :planilla`,
      { planilla: planillaId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(txt.rows, null, 2));

    // 2. PLANILLA
    console.log('\n2. ORG_LIQ.PLANILLA:');
    const plan = await connection.execute(
      `SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = :planilla`,
      { planilla: planillaId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(plan.rows, null, 2));

    // 3. DET_PLANILLA
    console.log('\n3. ORG_LIQ.DET_PLANILLA:');
    const det = await connection.execute(
      `SELECT * FROM ORG_LIQ.DET_PLANILLA WHERE PLANILLA_ID = :planilla`,
      { planilla: planillaId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(det.rows, null, 2));

    // 4. LOTE
    console.log('\n4. ORG_LIQ.LOTE:');
    const lote = await connection.execute(
      `SELECT * FROM ORG_LIQ.LOTE WHERE LOTE_ID = 53 AND ANHO = 2024`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(lote.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

inspectPlanillaStatus();
