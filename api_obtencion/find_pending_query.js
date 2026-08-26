const oracledb = require('oracledb');

async function findPendingQuery() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- BUSCANDO OBJETOS QUE CONTENGAN "PENDIENTE" O "CONCILIA" ---');
    const objs = await connection.execute(`
      SELECT owner, object_name, object_type 
      FROM all_objects 
      WHERE (object_name LIKE '%PEND%' OR object_name LIKE '%CONCIL%' OR object_name LIKE '%TXT_SENIAT%')
        AND object_type IN ('VIEW', 'PROCEDURE', 'PACKAGE', 'FUNCTION')
        AND owner IN ('ORG_LIQ', 'WFE_WORKFLOW', 'SIGECOF', 'SIS_AUD')
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(objs.rows);

    console.log('\n--- VER SI EL REPORTE DE SIGECOF ES DE POWERBI / METABASE O VISTA ---');
    // Look for views in ORG_LIQ
    const views = await connection.execute(`
      SELECT owner, view_name FROM all_views WHERE owner = 'ORG_LIQ'
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Vistas en ORG_LIQ:', views.rows);

    console.log('\n--- VERIFICAR SI EN NUESTRO ORQUESTADOR SIGUE APARECIENDO O NO ---');
    const getPend = await connection.execute(`
      SELECT COUNT(*) as CNT
      FROM ORG_LIQ.TXT_SENIAT T
      INNER JOIN ORG_LIQ.LOTE L 
          ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
         AND T.INFN_CODIGO = L.INFN_CODIGO 
         AND T.AGENCIA_CODIGO = L.AGENCIA_CODIGO
         AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
      WHERE T.PLANILLA = '2390773119'
        AND T.FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD')
        AND T.ESTADO IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM ORG_LIQ.PLANILLA P 
          WHERE P.PLANILLA_ID = T.PLANILLA 
            AND P.LOTE_SEQ = L.LOTE_SEQ 
            AND P.ANHO = L.ANHO
        )
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Aparece en nuestro getPendientes?', getPend.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

findPendingQuery();
