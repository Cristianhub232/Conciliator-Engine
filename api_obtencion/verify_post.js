const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

async function verifyPostConciliacion() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const planillaId = '2391126684';
    const anho = 2024;

    console.log(`=== VERIFICACIÓN POST-CONCILIACIÓN: ${planillaId} ===\n`);

    // 1. PLANILLA
    console.log('[1] ORG_LIQ.PLANILLA (Cabecera):');
    const plan = await connection.execute(
      `SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = :planilla AND ANHO = :anho`,
      { planilla: planillaId, anho },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(plan.rows, null, 2));

    // 2. DET_PLANILLA
    console.log('\n[2] ORG_LIQ.DET_PLANILLA (Detalle de Partidas):');
    const det = await connection.execute(
      `SELECT * FROM ORG_LIQ.DET_PLANILLA WHERE PLANILLA_ID = :planilla AND ANHO = :anho`,
      { planilla: planillaId, anho },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(det.rows, null, 2));

    // 3. TXT_SENIAT
    console.log('\n[3] ORG_LIQ.TXT_SENIAT (Estado Bancario):');
    const txt = await connection.execute(
      `SELECT PLANILLA, ESTADO, ANHO, LOTE_SEQ, PLAN_SEQ, FORMA_CODIGO, MONTO_EFECTIVO, IDENT_CNTB
       FROM ORG_LIQ.TXT_SENIAT 
       WHERE PLANILLA = :planilla AND ANHO = :anho`,
      { planilla: planillaId, anho },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(txt.rows, null, 2));

    // 4. Auditoría JSON
    console.log('\n[4] Último registro en auditoria.json:');
    try {
      const auditData = JSON.parse(fs.readFileSync(path.join(__dirname, 'auditoria.json'), 'utf8'));
      const lastAudit = auditData[auditData.length - 1];
      console.log(JSON.stringify(lastAudit, null, 2));
    } catch(e) {
      console.log('No se pudo leer auditoria.json:', e.message);
    }

  } catch (err) {
    console.error('Error verificando:', err);
  } finally {
    if (connection) await connection.close();
  }
}

verifyPostConciliacion();
