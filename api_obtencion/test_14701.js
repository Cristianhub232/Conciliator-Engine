async function test2491314701() {
  const pId = '2491314701';
  console.log(`--- PROBANDO CONCILIACIÓN DE ${pId} ---`);
  try {
    const res = await fetch('http://localhost:3010/api/planillas/conciliar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_operador: "BOT_ORQUESTADOR",
        expediente: 7440,
        lote_id: 53,
        lote_seq: 127758,
        planilla_id: pId,
        forma: "99225",
        monto: 851,
        banco: "105",
        agencia: "0800",
        fecha_recaudacion: "2024-04-15",
        asignaciones: [{ partida: "301010200", monto: 851 }]
      })
    });
    console.log('Status:', res.status);
    console.log('Response:', await res.json());
  } catch (err) {
    console.error(err);
  }
}

test2491314701();
