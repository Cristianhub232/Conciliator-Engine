const oracledb = require('oracledb');

async function checkPlanilla2390786541() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const planillaId = '2390786541';
    console.log(`--- ESTADO DE PLANILLA ${planillaId} ---`);

    const txt = await connection.execute(
      `SELECT * FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = :planilla`,
      { planilla: planillaId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('TXT_SENIAT:', JSON.stringify(txt.rows, null, 2));

    const plan = await connection.execute(
      `SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = :planilla`,
      { planilla: planillaId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('PLANILLA:', JSON.stringify(plan.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkPlanilla2390786541();
