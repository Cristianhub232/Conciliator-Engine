const oracledb = require('oracledb');

async function debugFailedPlanillas() {
  const pId1 = '2491306610';
  const pId2 = '2400118306';

  console.log('--- REVISANDO PLANILLA 2491306610 EN ORACLE ---');
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'ONT_SIR_BOT123456',
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.21.65.90)(PORT=1521))(CONNECT_DATA=(SID=cert_rep)))'
    });

    const t1 = await connection.execute(`SELECT * FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = :pId`, { pId: pId1 }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('TXT_SENIAT 2491306610:', JSON.stringify(t1.rows, null, 2));

    const p1 = await connection.execute(`SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = :pId`, { pId: pId1 }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('PLANILLA 2491306610:', JSON.stringify(p1.rows, null, 2));

    const t2 = await connection.execute(`SELECT * FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = :pId`, { pId: pId2 }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('TXT_SENIAT 2400118306:', JSON.stringify(t2.rows, null, 2));

    const p2 = await connection.execute(`SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = :pId`, { pId: pId2 }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('PLANILLA 2400118306:', JSON.stringify(p2.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }

  console.log('\n--- PROBANDO LLAMADA DE CONCILIACIÓN A LA API PARA 2491306610 ---');
  try {
    const res = await fetch('http://localhost:3010/api/planillas/conciliar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_operador: "BOT_ORQUESTADOR",
        expediente: 7440,
        lote_id: 53,
        lote_seq: 127758,
        planilla_id: pId1,
        forma: "99225",
        monto: 525,
        banco: "105",
        agencia: "0800",
        fecha_recaudacion: "2024-04-15",
        asignaciones: [{ partida: "301010200", monto: 525 }]
      })
    });
    console.log('Status:', res.status);
    console.log('Body:', await res.json());
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

debugFailedPlanillas();
