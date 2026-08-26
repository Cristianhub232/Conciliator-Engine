const oracledb = require('oracledb');

async function checkPlanillaIndexes() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const resIdx = await connection.execute(`
      SELECT i.INDEX_NAME, i.UNIQUENESS, ic.COLUMN_NAME, ic.COLUMN_POSITION
      FROM ALL_INDEXES i
      JOIN ALL_IND_COLUMNS ic ON i.OWNER = ic.INDEX_OWNER AND i.INDEX_NAME = ic.INDEX_NAME
      WHERE i.TABLE_OWNER = 'ORG_LIQ' AND i.TABLE_NAME = 'PLANILLA'
      ORDER BY i.INDEX_NAME, ic.COLUMN_POSITION
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    console.log('Todos los indices de ORG_LIQ.PLANILLA:');
    console.log(JSON.stringify(resIdx.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkPlanillaIndexes();
