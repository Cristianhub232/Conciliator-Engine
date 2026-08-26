const oracledb = require('oracledb');

async function compareWithNativeRows() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- COMPARAR CON FILAS NATIVAS DE 2024 EN LOTE 127758 ---');
    
    const nativePlan = await connection.execute(`
      SELECT * FROM ORG_LIQ.PLANILLA 
      WHERE ANHO = 2024 AND LOTE_SEQ = 127758 AND PLAN_SEQ != 2515 AND ROWNUM <= 2
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('NATIVE PLANILLA 2024:');
    console.log(JSON.stringify(nativePlan.rows, null, 2));

    const ourPlan = await connection.execute(`
      SELECT * FROM ORG_LIQ.PLANILLA 
      WHERE ANHO = 2024 AND LOTE_SEQ = 127758 AND PLAN_SEQ = 2515
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('\nNUESTRA PLANILLA 2024:');
    console.log(JSON.stringify(ourPlan.rows, null, 2));

    const nativeDet = await connection.execute(`
      SELECT * FROM ORG_LIQ.DET_PLANILLA 
      WHERE ANHO = 2024 AND LOTE_SEQ = 127758 AND PLAN_SEQ = ${nativePlan.rows[0]?.PLAN_SEQ || 1}
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('\nNATIVE DET_PLANILLA 2024:');
    console.log(JSON.stringify(nativeDet.rows, null, 2));

    const ourDet = await connection.execute(`
      SELECT * FROM ORG_LIQ.DET_PLANILLA 
      WHERE ANHO = 2024 AND LOTE_SEQ = 127758 AND PLAN_SEQ = 2515
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('\nNUESTRO DET_PLANILLA 2024:');
    console.log(JSON.stringify(ourDet.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

compareWithNativeRows();
