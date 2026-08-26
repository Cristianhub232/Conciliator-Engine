const oracledb = require('oracledb');

async function checkIndexes() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const tables = ['TXT_SENIAT', 'PLANILLA', 'DET_PLANILLA', 'LOTE'];
    for (const t of tables) {
      const res = await connection.execute(`
        SELECT i.INDEX_NAME, i.UNIQUENESS, LISTAGG(ic.COLUMN_NAME, ', ') WITHIN GROUP (ORDER BY ic.COLUMN_POSITION) AS COLUMNS
        FROM ALL_INDEXES i
        JOIN ALL_IND_COLUMNS ic ON i.OWNER = ic.INDEX_OWNER AND i.INDEX_NAME = ic.INDEX_NAME
        WHERE i.TABLE_OWNER = 'ORG_LIQ' AND i.TABLE_NAME = :tableName
        GROUP BY i.INDEX_NAME, i.UNIQUENESS
        ORDER BY i.INDEX_NAME
      `, { tableName: t }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      
      console.log(`\n=== Índices de ORG_LIQ.${t} ===`);
      console.log(JSON.stringify(res.rows, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkIndexes();
