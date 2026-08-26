const oracledb = require('oracledb');

async function testConnectionDetails2() {
  let connection;
  try {
    const startTime = Date.now();
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });
    const connTime = Date.now() - startTime;

    const resDual = await connection.execute(
      `SELECT USER AS USUARIO_ACTUAL, 
              SYS_CONTEXT('USERENV', 'DB_NAME') AS NOMBRE_BD,
              SYS_CONTEXT('USERENV', 'SERVER_HOST') AS SERVIDOR_BD,
              TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_HORA_BD
       FROM DUAL`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const resPing = await connection.execute(
      `SELECT COUNT(*) AS REGISTROS_PRUEBA FROM ORG_LIQ.LOTE WHERE ROWNUM <= 5`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log(JSON.stringify({
      status: 'CONECTADO_EXITOSAMENTE',
      tiempo_respuesta_ms: connTime,
      detalles_sesion: resDual.rows[0],
      prueba_consulta: resPing.rows[0]
    }, null, 2));

  } catch (err) {
    console.error(JSON.stringify({ status: 'ERROR', message: err.message }, null, 2));
  } finally {
    if (connection) await connection.close();
  }
}

testConnectionDetails2();
