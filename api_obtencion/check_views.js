const oracledb = require('oracledb');

async function inspectViewsAndDet() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- DET_PLANILLA ROWS PARA 2390773119 ---');
    const det = await connection.execute(
      `SELECT * FROM ORG_LIQ.DET_PLANILLA WHERE PLANILLA_ID = '2390773119'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(det.rows, null, 2));

    console.log('\n--- VER SI EXISTEN VISTAS O TABLAS DE CONCILIACION EN SIGECOF ---');
    const views = await connection.execute(`
      SELECT view_name FROM all_views WHERE view_name LIKE '%CONCIL%' OR view_name LIKE '%PEND%' OR view_name LIKE '%PLANILLA%'
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(views.rows);

    console.log('\n--- VER ESTADO DEL LOTE 127758 ---');
    const lote = await connection.execute(`
      SELECT L.*, (SELECT COUNT(*) FROM ORG_LIQ.PLANILLA P WHERE P.LOTE_SEQ = L.LOTE_SEQ AND P.ANHO = L.ANHO) AS PLANILLAS_INSERTADAS
      FROM ORG_LIQ.LOTE L
      WHERE L.LOTE_SEQ = 127758
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(lote.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

inspectViewsAndDet();
