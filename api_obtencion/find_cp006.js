const oracledb = require('oracledb');

async function findCp006Example2() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const res = await connection.execute(`
      SELECT 
          W.WFEX_EXP_ID AS EXPEDIENTE,
          W.WI_ESTADO,
          W.WFUS_USERS_ID AS USUARIO_ASIGNADO,
          L.LOTE_ID,
          L.LOTE_SEQ,
          L.ANHO,
          L.INFN_CODIGO AS BANCO,
          TO_CHAR(L.FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION,
          COUNT(T.PLANILLA) AS PLANILLAS_PENDIENTES
      FROM WFE_WORKFLOW.WF_WORK_ITEM W
      INNER JOIN ORG_LIQ.LOTE L 
          ON TRIM(W.WFEX_EXP_ID) = TRIM(TO_CHAR(L.EXPEDIENTE))
      INNER JOIN ORG_LIQ.TXT_SENIAT T 
          ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
         AND T.INFN_CODIGO = L.INFN_CODIGO 
         AND T.AGENCIA_CODIGO = L.AGENCIA_CODIGO
      WHERE W.WI_ESTADO = 'ABIERTA'
        AND W.WFUS_USERS_ID IS NOT NULL
        AND L.ESTADO = 'P'
        AND T.ESTADO IS NULL
        AND ROWNUM <= 5
      GROUP BY 
          W.WFEX_EXP_ID, W.WI_ESTADO, W.WFUS_USERS_ID, 
          L.LOTE_ID, L.LOTE_SEQ, L.ANHO, L.INFN_CODIGO, L.FECHA_RECAUDACION
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    console.log('Casos reales encontrados:');
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

findCp006Example2();
