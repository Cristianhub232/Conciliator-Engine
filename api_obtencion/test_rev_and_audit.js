const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

async function testReversionAndAudit() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('=== 1. VERIFICACIÓN CP-024: EXPEDIENTE 7440 EN AÑOS DISTINTOS (2023 y 2024) ===');
    const resExp = await connection.execute(
      `SELECT ANHO, LOTE_ID, LOTE_SEQ, EXPEDIENTE, COUNT(*) AS TOTAL_PLANILLAS, SUM(MONTO_EFECTIVO) AS TOTAL_BS
       FROM ORG_LIQ.PLANILLA 
       WHERE EXPEDIENTE = 7440
       GROUP BY ANHO, LOTE_ID, LOTE_SEQ, EXPEDIENTE
       ORDER BY ANHO`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(resExp.rows, null, 2));

    console.log('\n=== 2. SELECCIONAR UNA PLANILLA PARA PRUEBA DE REVERSIÓN (CP-022 y CP-023) ===');
    const resSample = await connection.execute(
      `SELECT PLANILLA_ID, FORMA_CODIGO, MONTO_EFECTIVO, PLAN_SEQ, TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA, INFN_CODIGO AS BANCO
       FROM ORG_LIQ.PLANILLA 
       WHERE ANHO = 2024 AND LOTE_SEQ = 127758 AND FORMA_CODIGO = '99225'
       ORDER BY PLAN_SEQ DESC
       FETCH FIRST 1 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Planilla seleccionada para revertir:', resSample.rows[0]);

    console.log('\n=== 3. VERIFICACIÓN CP-025: CONTENIDO DE auditoria.json ===');
    const auditPath = path.join(process.cwd(), 'auditoria.json');
    if (fs.existsSync(auditPath)) {
      const auditContent = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      console.log(`Total registros de auditoría: ${auditContent.length}`);
      console.log('Muestra de últimos registros de auditoría:');
      console.log(JSON.stringify(auditContent.slice(-5), null, 2));
    } else {
      console.log('auditoria.json no existe aún.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

testReversionAndAudit();
