const oracledb = require('oracledb');

async function checkLote() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- COLUMNAS DE ORG_LIQ.LOTE ---');
    const res = await connection.execute(`
      SELECT column_name, data_type, nullable
      FROM all_tab_columns
      WHERE owner = 'ORG_LIQ' AND table_name = 'LOTE'
      ORDER BY column_id
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(res.rows, null, 2));

    console.log('\n--- LOTE 127758 / EXPEDIENTE 7440 ---');
    const res2 = await connection.execute(`
      SELECT * FROM ORG_LIQ.LOTE WHERE LOTE_SEQ = 127758 OR EXPEDIENTE = 7440
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(JSON.stringify(res2.rows, null, 2));

    console.log('\n--- VERIFICAR SI TEST INSERCION PASA CON FORMA_CODIGO ---');
    const testInsert = await connection.execute(`
      SELECT * FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '2390773119' AND FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD')
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('TXT_SENIAT row 2024:', testInsert.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkLote();
