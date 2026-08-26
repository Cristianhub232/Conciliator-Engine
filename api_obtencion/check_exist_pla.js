const oracledb = require('oracledb');

async function checkExistingPlanillas() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(
      `SELECT ANHO, LOTE_ID, PLANILLA_ID, PLAN_SEQ, FORMA_CODIGO, MONTO 
       FROM ORG_LIQ.PLANILLA 
       WHERE PLANILLA_ID IN ('2491306810', '2491314701', '2400118308', '2390786541')`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Planillas ya insertadas en ORG_LIQ.PLANILLA:', res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkExistingPlanillas();
