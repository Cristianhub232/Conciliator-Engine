const oracledb = require('oracledb');

async function checkTxtSeniatCols() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
      FROM ALL_TAB_COLS 
      WHERE OWNER = 'ORG_LIQ' AND TABLE_NAME = 'TXT_SENIAT'
      ORDER BY COLUMN_ID
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    console.log('Columnas de TXT_SENIAT:');
    console.log(JSON.stringify(res.rows, null, 2));

    const resIdx = await connection.execute(`
      SELECT INDEX_NAME, COLUMN_NAME, COLUMN_POSITION 
      FROM ALL_IND_COLUMNS 
      WHERE TABLE_OWNER = 'ORG_LIQ' AND TABLE_NAME = 'TXT_SENIAT'
      ORDER BY INDEX_NAME, COLUMN_POSITION
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    console.log('Índices de TXT_SENIAT:');
    console.log(JSON.stringify(resIdx.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkTxtSeniatCols();
