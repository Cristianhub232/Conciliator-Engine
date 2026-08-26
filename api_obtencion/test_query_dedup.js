const oracledb = require('oracledb');

async function testOptimizedQuery() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    console.log('--- TEST DE QUERY LIMPIA (SIN DUPLICADOS) ---');
    const res = await connection.execute(`
      SELECT 
          L.EXPEDIENTE,
          L.ANHO AS ANHO_LOTE,
          L.LOTE_ID AS NRO_LOTE,
          L.LOTE_SEQ,
          T.PLANILLA AS NRO_PLANILLA_FALTANTE,
          T.FORMA_CODIGO AS FORMA,
          (T.MONTO_EFECTIVO + NVL(T.MONTO_OTROS_PAGOS, 0)) AS MONTO_TOTAL,
          TO_CHAR(T.FECHA_RECAUDACION, 'DD/MM/YYYY') AS FECHA_RECAUDACION,
          T.INFN_CODIGO AS BANCO,
          T.AGENCIA_CODIGO AS AGENCIA,
          'PENDIENTE POR CARGAR' AS ESTATUS
      FROM ORG_LIQ.TXT_SENIAT T
      INNER JOIN ORG_LIQ.LOTE L 
          ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
         AND T.INFN_CODIGO = L.INFN_CODIGO 
         AND T.AGENCIA_CODIGO = L.AGENCIA_CODIGO
         AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
      WHERE T.FECHA_RECAUDACION = TO_DATE('2024-04-15', 'YYYY-MM-DD')
        AND T.INFN_CODIGO = '105'
        AND L.ESTADO = 'P'
        AND T.ESTADO IS NULL
        AND NOT EXISTS (
            SELECT 1 
            FROM ORG_LIQ.PLANILLA P
            WHERE P.ANHO = L.ANHO 
              AND P.LOTE_SEQ = L.LOTE_SEQ 
              AND P.PLANILLA_ID = T.PLANILLA
        )
      ORDER BY L.LOTE_ID, T.PLANILLA
    `, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    console.log(`Total planillas pendientes encontradas: ${res.rows.length}`);
    console.log('Primeras 3 filas:');
    console.log(JSON.stringify(res.rows.slice(0, 3), null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

testOptimizedQuery();
