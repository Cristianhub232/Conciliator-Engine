const oracledb = require('oracledb');

async function testFullReversion() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const targetPlanilla = '2390651288';
    console.log(`=== 1. ESTADO PRE-REVERSIÓN PARA PLANILLA ${targetPlanilla} ===`);
    const rPrePla = await connection.execute(
      `SELECT PLANILLA_ID, PLAN_SEQ, FORMA_CODIGO, MONTO_EFECTIVO FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = :targetPlanilla AND ANHO = 2024`,
      { targetPlanilla },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('PLANILLA pre-reversión:', rPrePla.rows);

    const rPreDet = await connection.execute(
      `SELECT PLANILLA_ID, PLUC_ID, MONTO_EFECTIVO FROM ORG_LIQ.DET_PLANILLA WHERE PLANILLA_ID = :targetPlanilla AND ANHO = 2024`,
      { targetPlanilla },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('DET_PLANILLA pre-reversión:', rPreDet.rows);

    const rPreTxt = await connection.execute(
      `SELECT PLANILLA, ESTADO, ANHO, LOTE_SEQ, PLAN_SEQ FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = :targetPlanilla AND FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD') AND INFN_CODIGO = '105'`,
      { targetPlanilla },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('TXT_SENIAT pre-reversión:', rPreTxt.rows);

    console.log('\n=== 2. EJECUTANDO REVERSIÓN ATÓMICA (POST /api/planillas/revertir) ===');
    const response = await fetch('http://localhost:3010/api/planillas/revertir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_operador: 'BOT_ORQUESTADOR',
        planilla_id: targetPlanilla,
        banco: '105',
        fecha_recaudacion: '2024-04-15'
      })
    });
    const revResult = await response.json();
    console.log('Respuesta de Reversión API:', revResult);

    console.log('\n=== 3. VERIFICACIÓN POST-REVERSIÓN EN LAS TRES TABLAS (CP-022) ===');
    const rPostPla = await connection.execute(
      `SELECT COUNT(*) AS FILAS_PLANILLA FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = :targetPlanilla AND ANHO = 2024`,
      { targetPlanilla },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const rPostDet = await connection.execute(
      `SELECT COUNT(*) AS FILAS_DET_PLANILLA FROM ORG_LIQ.DET_PLANILLA WHERE PLANILLA_ID = :targetPlanilla AND ANHO = 2024`,
      { targetPlanilla },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const rPostTxt = await connection.execute(
      `SELECT PLANILLA, ESTADO, ANHO, LOTE_SEQ, PLAN_SEQ FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = :targetPlanilla AND FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD') AND INFN_CODIGO = '105'`,
      { targetPlanilla },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('FILAS EN PLANILLA (Debe ser 0):', rPostPla.rows[0].FILAS_PLANILLA);
    console.log('FILAS EN DET_PLANILLA (Debe ser 0):', rPostDet.rows[0].FILAS_DET_PLANILLA);
    console.log('ESTADO EN TXT_SENIAT (Debe ser NULL):', rPostTxt.rows[0]);

    console.log('\n=== 4. VERIFICACIÓN CP-023: PLANILLA LISTADA NUEVAMENTE COMO PENDIENTE ===');
    const resPend = await fetch('http://localhost:3010/api/planillas/pendientes?fecha=2024-04-15&banco=105&limit=500');
    const pendData = await resPend.json();
    const isPresent = pendData.data.some(p => p.NRO_PLANILLA_FALTANTE === targetPlanilla);
    console.log(`¿La planilla ${targetPlanilla} aparece nuevamente en Pendientes?:`, isPresent);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

testFullReversion();
