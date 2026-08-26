const oracledb = require('oracledb');

async function checkLoteStats() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const resTotal = await connection.execute(
      `SELECT COUNT(*) AS TOTAL_CONCILIADAS, 
              MIN(PLAN_SEQ) AS MIN_SEQ, 
              MAX(PLAN_SEQ) AS MAX_SEQ, 
              SUM(MONTO_EFECTIVO) AS SUMA_MONTO 
       FROM ORG_LIQ.PLANILLA 
       WHERE ANHO = 2024 AND LOTE_SEQ = 127758`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('Estadísticas actuales de PLANILLA en Lote 127758:');
    console.log(JSON.stringify(resTotal.rows[0], null, 2));

    const resSeniat = await connection.execute(
      `SELECT ESTADO, COUNT(*) AS CANTIDAD 
       FROM ORG_LIQ.TXT_SENIAT 
       WHERE FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD') 
         AND INFN_CODIGO = '105'
       GROUP BY ESTADO`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Estado de registros en TXT_SENIAT para 15/04/2024 Banco 105:');
    console.log(JSON.stringify(resSeniat.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkLoteStats();
