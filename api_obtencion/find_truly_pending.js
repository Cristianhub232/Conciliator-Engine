const oracledb = require('oracledb');

async function findActualPending() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(
      `SELECT PLANILLA, FORMA_CODIGO, MONTO_EFECTIVO, IDENT_CNTB 
       FROM ORG_LIQ.TXT_SENIAT 
       WHERE FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD') 
         AND INFN_CODIGO = '105' 
         AND (ESTADO IS NULL OR ESTADO = 0)
         AND FORMA_CODIGO = '99225'
       FETCH FIRST 3 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('Planillas realmente pendientes 99225:', res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

findActualPending();
