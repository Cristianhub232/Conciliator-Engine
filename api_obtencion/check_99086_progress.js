const oracledb = require('oracledb');

async function checkForma99086Progress() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(
      `SELECT COUNT(*) AS CONCILIADAS_99086, SUM(MONTO_EFECTIVO) AS MONTO_TOTAL 
       FROM ORG_LIQ.PLANILLA 
       WHERE ANHO = 2024 AND LOTE_SEQ = 127758 AND FORMA_CODIGO = '99086'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('Progreso de Forma 99086 en Oracle:');
    console.log(JSON.stringify(res.rows[0], null, 2));

    const resDet = await connection.execute(
      `SELECT COUNT(*) AS TOTAL_DETALLES_PARTIDAS 
       FROM ORG_LIQ.DET_PLANILLA 
       WHERE ANHO = 2024 AND LOTE_SEQ = 127758 AND FORMA_CODIGO = '99086'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Total de registros de partidas (DET_PLANILLA) generados para 99086:', resDet.rows[0].TOTAL_DETALLES_PARTIDAS);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkForma99086Progress();
