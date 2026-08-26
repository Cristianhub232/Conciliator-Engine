const oracledb = require('oracledb');

async function findPending99225() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(
      `SELECT PLANILLA, FORMA_DECLARACION, MONTO_EFECTIVO, IDENT_CNTB 
       FROM ORG_LIQ.TXT_SENIAT 
       WHERE FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD') 
         AND INFN_CODIGO = '105' 
         AND FORMA_DECLARACION = '99225' 
         AND (ESTADO = 0 OR ESTADO IS NULL)
         AND PLANILLA NOT IN (SELECT PLANILLA_ID FROM ORG_LIQ.PLANILLA WHERE ANHO = 2024 AND LOTE_SEQ = 127758)
       FETCH FIRST 1 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('Planilla pendiente 99225 para prueba:', res.rows[0]);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

findPending99225();
