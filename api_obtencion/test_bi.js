const oracledb = require('oracledb');

async function testMetabaseQuery() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- BUSCANDO CONSULTAS SQL COMUNES EN EL BI ---');
    
    // Q1: TXT_SENIAT vs PLANILLA por PLANILLA_ID
    const q1 = await connection.execute(`
      SELECT T.PLANILLA, T.ESTADO AS ESTADO_TXT, P.PLANILLA_ID AS EXISTE_EN_PLANILLA, P.ANHO, P.LOTE_SEQ
      FROM ORG_LIQ.TXT_SENIAT T
      LEFT JOIN ORG_LIQ.PLANILLA P 
        ON T.PLANILLA = P.PLANILLA_ID AND P.ANHO = 2024 AND P.LOTE_SEQ = 127758
      WHERE T.PLANILLA = '2390773119' AND T.FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD')
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Q1 (TXT_SENIAT cruzado con PLANILLA 2024):', q1.rows);

    // Q2: ¿Cómo está TXT_SENIAT para esa planilla exactamente?
    const q2 = await connection.execute(`
      SELECT PLANILLA, ESTADO, ANHO, LOTE_SEQ, PLAN_SEQ 
      FROM ORG_LIQ.TXT_SENIAT 
      WHERE PLANILLA = '2390773119' AND FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD')
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Q2 (TXT_SENIAT exacto):', q2.rows);

    // Q3: ¿Cómo está PLANILLA y DET_PLANILLA para esa planilla?
    const q3 = await connection.execute(`
      SELECT PLANILLA_ID, ANHO, LOTE_SEQ, PLAN_SEQ, EXPEDIENTE, FORMA_CODIGO, MONTO
      FROM ORG_LIQ.PLANILLA 
      WHERE PLANILLA_ID = '2390773119' AND ANHO = 2024
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Q3 (PLANILLA exacto 2024):', q3.rows);

    const q4 = await connection.execute(`
      SELECT PLANILLA_ID, ANHO, LOTE_SEQ, PLAN_SEQ, PLUC_ID, MONTO
      FROM ORG_LIQ.DET_PLANILLA 
      WHERE PLANILLA_ID = '2390773119' AND ANHO = 2024
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Q4 (DET_PLANILLA exacto 2024):', q4.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

testMetabaseQuery();
