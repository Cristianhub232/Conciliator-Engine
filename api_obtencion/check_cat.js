const oracledb = require('oracledb');

async function checkCatalogTable() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- VER TABLAS DE ONT_SIR_BOT_AUDIT ---');
    const tabs = await connection.execute(`
      SELECT owner, table_name FROM all_tables WHERE owner = 'ONT_SIR_BOT_AUDIT'
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(tabs.rows);

    if (tabs.rows.length > 0) {
      const res = await connection.execute(`
        SELECT * FROM ONT_SIR_BOT_AUDIT.FORMA_PARTIDA WHERE CODIGO_FORMA = '99229'
      `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      console.log('Forma 99229 en ONT_SIR_BOT_AUDIT:', res.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkCatalogTable();
