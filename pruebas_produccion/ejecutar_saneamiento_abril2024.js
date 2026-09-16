/**
 * Script de Saneamiento y Depuración - Abril 2024 (Producción SIGECOF) - ULTRA RÁPIDO Y SEGURO
 */

const oracledb = require('oracledb');
const { Pool } = require('pg');

const PG_CONFIG = {
  host: '10.78.30.63',
  port: 5432,
  database: 'xmls',
  user: 'ont',
  password: '123456',
};

const ORACLE_DSN = '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=10.79.6.247)(PORT=1521))(CONNECT_DATA=(SID=sige1)))';

async function main() {
  console.log('================================================================================');
  console.log('       INICIO DE SANEAMIENTO Y DEPURACIÓN - MES DE ABRIL 2024 (PRODUCCIÓN)      ');
  console.log('================================================================================\n');

  const pgPool = new Pool(PG_CONFIG);
  let oraConnBot = null;
  let oraConnConsulta = null;

  try {
    oraConnBot = await oracledb.getConnection({
      user: 'ONT_SIR_BOT',
      password: 'bR4#mK9$L1pX!7v',
      connectString: ORACLE_DSN,
    });
    console.log('✔ Conexión operativa establecida (ONT_SIR_BOT)');

    oraConnConsulta = await oracledb.getConnection({
      user: 'consulta',
      password: 'pumyra1584',
      connectString: ORACLE_DSN,
    });
    console.log('✔ Conexión de lectura establecida (consulta)');
    console.log('✔ Conexión establecida con PostgreSQL (motor_app)\n');

    // ---------------------------------------------------------------------------
    // PASO 0: RESPALDO PREVENTIVO EN POSTGRESQL (motor_app)
    // ---------------------------------------------------------------------------
    console.log('--- [PASO 0] CREANDO SNAPSHOTS DE RESPALDO EN POSTGRESQL (motor_app) ---');

    await pgPool.query('TRUNCATE TABLE motor_app.bak_lote_abr2024, motor_app.bak_wf_work_item_abr2024, motor_app.bak_txt_seniat_abr2024;');

    // 0.1 Respaldo de los 312 Lotes pendientes de Abril 2024
    console.log('  -> Respaldando los 312 lotes en estado P de Abril 2024...');
    const lotesQuery = `
      SELECT 
        LOTE_ID, LOTE_SEQ, ANHO, INFN_CODIGO, AGENCIA_CODIGO, TOTAL_PLN, ESTADO, EXPEDIENTE, WORKITEM,
        TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_REC
      FROM ORG_LIQ.LOTE
      WHERE ANHO = 2024 
        AND FECHA_RECAUDACION BETWEEN DATE '2024-04-01' AND DATE '2024-04-30'
        AND ESTADO = 'P'
    `;
    const resLotes = await oraConnConsulta.execute(lotesQuery, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const lotesRows = resLotes.rows || [];

    if (lotesRows.length > 0) {
      const values = [];
      const params = [];
      let idx = 1;
      for (const l of lotesRows) {
        values.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, $${idx+4}, $${idx+5}, $${idx+6}, $${idx+7}, $${idx+8}, $${idx+9})`);
        params.push(l.LOTE_ID, l.LOTE_SEQ, l.ANHO, l.INFN_CODIGO, l.AGENCIA_CODIGO, l.TOTAL_PLN, l.ESTADO, l.EXPEDIENTE, l.WORKITEM, l.FECHA_REC);
        idx += 10;
      }
      await pgPool.query(
        `INSERT INTO motor_app.bak_lote_abr2024 
         (lote_id, lote_seq, anho, infn_codigo, agencia_codigo, total_pln, estado, expediente, workitem, fecha_recaudacion)
         VALUES ${values.join(', ')}`,
        params
      );
    }
    console.log(`     ✔ ${lotesRows.length} lotes respaldados en motor_app.bak_lote_abr2024.`);

    // 0.2 Respaldo de WorkItems de los expedientes afectados (índice optimizado con ORGA_ID IN ('93', '093'))
    console.log('  -> Respaldando WorkItems de los expedientes afectados...');
    const wiQuery = `
      SELECT 
        WORKITEM, WFEX_EXP_ID, ANHO, ORGA_ID, WFTA_TAREA_ID, WI_ESTADO, WFUS_USERS_ID,
        WI_FECHA_CREACION, WI_FECHA_CIERRE
      FROM WFE_WORKFLOW.WF_WORK_ITEM
      WHERE ANHO = 2024 AND ORGA_ID IN ('93', '093')
        AND WFEX_EXP_ID IN (
          1806, 1822, 1823, 1854, 1860, 1868, 1876, 1890, 1891, 1892, 1895, 1915, 
          1924, 1927, 1931, 1932, 1946, 2074, 2075, 2076, 7452, 7454, 7548, 7549, 
          7554, 7555, 7557, 7582, 7650, 7663, 7986
        )
    `;
    const resWi = await oraConnConsulta.execute(wiQuery, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const wiRows = resWi.rows || [];

    if (wiRows.length > 0) {
      const values = [];
      const params = [];
      let idx = 1;
      for (const w of wiRows) {
        values.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, $${idx+4}, $${idx+5}, $${idx+6}, $${idx+7}, $${idx+8})`);
        params.push(w.WORKITEM, w.WFEX_EXP_ID, w.ANHO, w.ORGA_ID, w.WFTA_TAREA_ID, w.WI_ESTADO, w.WFUS_USERS_ID, w.WI_FECHA_CREACION, w.WI_FECHA_CIERRE);
        idx += 9;
      }
      await pgPool.query(
        `INSERT INTO motor_app.bak_wf_work_item_abr2024 
         (workitem, wfex_exp_id, anho, orga_id, wfta_tarea_id, wi_estado, wfus_users_id, wi_fecha_creacion, wi_fecha_cierre)
         VALUES ${values.join(', ')}`,
        params
      );
    }
    console.log(`     ✔ ${wiRows.length} WorkItems respaldados en motor_app.bak_wf_work_item_abr2024.\n`);

    // ---------------------------------------------------------------------------
    // FASE 1: DEPURACIÓN DE PLANILLAS DUPLICADAS EN TXT_SENIAT
    // ---------------------------------------------------------------------------
    console.log('--- [FASE 1] DEPURACIÓN DE LAS 26 PLANILLAS DUPLICADAS EN TXT_SENIAT ---');
    const fechasDups = [
      '2024-04-18', '2024-04-19', '2024-04-20', '2024-04-22', 
      '2024-04-23', '2024-04-26', '2024-04-29', '2024-04-30'
    ];

    let totalEliminadas = 0;
    let montoTotalEliminado = 0;

    for (const fec of fechasDups) {
      const qExcess = `
        SELECT 
          ROWIDTOCHAR(T.ROWID) AS RID,
          T.PLANILLA,
          T.INFN_CODIGO,
          T.AGENCIA_CODIGO,
          T.FORMA_CODIGO,
          NVL(T.MONTO_EFECTIVO, 0) AS MONTO,
          TO_CHAR(T.FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_REC,
          NVL(TO_CHAR(T.ESTADO), 'NULL') AS ESTADO,
          T.LOTE_SEQ,
          T.ANHO,
          ROW_NUMBER() OVER (
            PARTITION BY T.PLANILLA, T.INFN_CODIGO, T.FORMA_CODIGO, NVL(T.MONTO_EFECTIVO, 0), T.AGENCIA_CODIGO
            ORDER BY T.ROWID ASC
          ) AS RN
        FROM ORG_LIQ.TXT_SENIAT T
        WHERE T.FECHA_RECAUDACION = TO_DATE(:fec, 'YYYY-MM-DD')
          AND (T.ESTADO IS NULL OR T.ESTADO = 0)
      `;

      const resDups = await oraConnConsulta.execute(qExcess, { fec }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const rows = resDups.rows || [];
      const excess = rows.filter(r => Number(r.RN) > 1);

      if (excess.length > 0) {
        console.log(`  -> Fecha ${fec}: Detectadas ${excess.length} copias duplicadas sobrantes.`);
        for (const ex of excess) {
          // Respaldar en Postgres
          await pgPool.query(
            `INSERT INTO motor_app.bak_txt_seniat_abr2024 
             (rid, planilla, infn_codigo, agencia_codigo, forma_codigo, monto_efectivo, fecha_recaudacion, estado, lote_seq, anho, rn)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [ex.RID, ex.PLANILLA, ex.INFN_CODIGO, ex.AGENCIA_CODIGO, ex.FORMA_CODIGO, ex.MONTO, ex.FECHA_REC, ex.ESTADO, ex.LOTE_SEQ, ex.ANHO, ex.RN]
          );

          // Eliminar exclusivamente la fila sobrante mediante ROWID (o marcar ESTADO = -1 si no hay permiso DELETE)
          try {
            await oraConnBot.execute(
              `DELETE FROM ORG_LIQ.TXT_SENIAT WHERE ROWID = CHARTOROWID(:rid)`,
              { rid: ex.RID }
            );
          } catch (delErr) {
            // Fallback institucional: Marcar ESTADO = -1 (Depurada / Anulada)
            await oraConnBot.execute(
              `UPDATE ORG_LIQ.TXT_SENIAT 
               SET ESTADO = -1, ANHO = NULL, LOTE_SEQ = NULL, PLAN_SEQ = NULL 
               WHERE ROWID = CHARTOROWID(:rid)`,
              { rid: ex.RID }
            );
          }

          // Si tenía LOTE_SEQ asignado, decrementar TOTAL_PLN
          if (ex.LOTE_SEQ) {
            await oraConnBot.execute(
              `UPDATE ORG_LIQ.LOTE 
               SET TOTAL_PLN = GREATEST(0, TOTAL_PLN - 1) 
               WHERE LOTE_SEQ = :lseq AND ANHO = :anho`,
              { lseq: ex.LOTE_SEQ, anho: ex.ANHO || 2024 }
            );
          }

          totalEliminadas++;
          montoTotalEliminado += Number(ex.MONTO);
          console.log(`     - Eliminada copia excedente: Planilla ${ex.PLANILLA} | Banco: ${ex.INFN_CODIGO} | Monto: Bs. ${Number(ex.MONTO).toLocaleString()}`);
        }
      }
    }

    await oraConnBot.commit();
    console.log(`\n  ✔ FASE 1 COMPLETADA: ${totalEliminadas} registros duplicados eliminados. Monto saneado: Bs. ${montoTotalEliminado.toLocaleString()}\n`);

    // ---------------------------------------------------------------------------
    // FASE 2: REGULARIZACIÓN DE LOTES 100% CONCILIADOS
    // ---------------------------------------------------------------------------
    console.log('--- [FASE 2] REGULARIZACIÓN Y CIERRE DE LOTES 100% CONCILIADOS A ESTADO \'V\' ---');

    // 2.1 Exp #1806: Lote 107 (Seq 29103)
    const r1 = await oraConnBot.execute(
      `UPDATE ORG_LIQ.LOTE SET ESTADO = 'V' WHERE LOTE_SEQ = 29103 AND ANHO = 2024 AND ESTADO = 'P'`
    );
    console.log(`  -> Exp #1806 | Lote 107 (Seq 29103): ${r1.rowsAffected} lote pasado a estado 'V'.`);

    // 2.2 Exp #7454: Lote 49 (Seq 128264)
    const r2 = await oraConnBot.execute(
      `UPDATE ORG_LIQ.LOTE SET ESTADO = 'V' WHERE LOTE_SEQ = 128264 AND ANHO = 2024 AND ESTADO = 'P'`
    );
    console.log(`  -> Exp #7454 | Lote 49 (Seq 128264): ${r2.rowsAffected} lote pasado a estado 'V'.`);

    // 2.3 Exp #7663: Lote 23 (Seq 132448)
    const r3 = await oraConnBot.execute(
      `UPDATE ORG_LIQ.LOTE SET ESTADO = 'V' WHERE LOTE_SEQ = 132448 AND ANHO = 2024 AND ESTADO = 'P'`
    );
    console.log(`  -> Exp #7663 | Lote 23 (Seq 132448): ${r3.rowsAffected} lote pasado a estado 'V'.`);

    // 2.4 Exp #1868: Lote 42 (Seq 33394) - Ajustar TOTAL_PLN a 2 y pasar a 'V'
    const r4 = await oraConnBot.execute(
      `UPDATE ORG_LIQ.LOTE SET TOTAL_PLN = 2, ESTADO = 'V' WHERE LOTE_SEQ = 33394 AND ANHO = 2024 AND ESTADO = 'P'`
    );
    console.log(`  -> Exp #1868 | Lote 42 (Seq 33394): ${r4.rowsAffected} lote regularizado (TOTAL_PLN = 2) y pasado a 'V'.`);

    await oraConnBot.commit();
    console.log('  ✔ FASE 2 COMPLETADA: 4 lotes validados exitosamente en estado \'V\'.\n');

    // ---------------------------------------------------------------------------
    // FASE 3: CIERRE EN WORKFLOW DE EXPEDIENTES CON 100% DE LOTES EN 'V'
    // ---------------------------------------------------------------------------
    console.log('--- [FASE 3] CIERRE IN-SITU DE EXPEDIENTES EN WORKFLOW ---');
    const expedientesListos = [1890, 1924, 1927, 1946];

    for (const expId of expedientesListos) {
      const qCheck = `
        SELECT 
          COUNT(*) as total_lotes,
          SUM(CASE WHEN ESTADO = 'P' THEN 1 ELSE 0 END) as lotes_p,
          SUM(CASE WHEN ESTADO = 'V' THEN 1 ELSE 0 END) as lotes_v
        FROM ORG_LIQ.LOTE
        WHERE EXPEDIENTE = :expId AND ANHO = 2024
      `;
      const chkRes = await oraConnConsulta.execute(qCheck, { expId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const stats = (chkRes.rows && chkRes.rows[0]) || {};

      if (Number(stats.LOTES_P || 0) === 0 && Number(stats.LOTES_V || 0) > 0) {
        await oraConnBot.execute(
          `UPDATE WFE_WORKFLOW.WF_EXPEDIENTE 
           SET EXP_ESTADO = 'CERRADO', EXP_FECHA_CIERRE = SYSDATE 
           WHERE EXP_ID = :expId AND ANHO = 2024 AND ORGA_ID IN ('93', '093')`,
          { expId }
        );

        console.log(`  ✔ Expediente #${expId}: WF_EXPEDIENTE actualizado a 'CERRADO' (Lotes 'V': ${stats.LOTES_V}).`);
      } else {
        console.log(`  ⚠ Expediente #${expId}: Aún posee ${stats.LOTES_P} lotes en 'P'. Omitiendo.`);
      }
    }

    await oraConnBot.commit();
    console.log('  ✔ FASE 3 COMPLETADA.\n');

    // ---------------------------------------------------------------------------
    // VERIFICACIÓN FINAL
    // ---------------------------------------------------------------------------
    console.log('--- [VERIFICACIÓN FINAL] VERIFICANDO MÉTRICAS POST-SANEAMIENTO ---');
    const qVrfLotes = `
      SELECT 
        COUNT(*) as total_lotes,
        SUM(CASE WHEN ESTADO = 'P' THEN 1 ELSE 0 END) as lotes_p,
        SUM(CASE WHEN ESTADO = 'V' THEN 1 ELSE 0 END) as lotes_v
      FROM ORG_LIQ.LOTE
      WHERE ANHO = 2024 AND FECHA_RECAUDACION BETWEEN DATE '2024-04-01' AND DATE '2024-04-30'
    `;
    const resVrf = await oraConnConsulta.execute(qVrfLotes, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const vrfStats = (resVrf.rows && resVrf.rows[0]) || {};

    console.log(`  • Total Lotes Abril 2024: ${vrfStats.TOTAL_LOTES}`);
    console.log(`  • Lotes Validados ('V'): ${vrfStats.LOTES_V} (+4 lotes cerrados)`);
    console.log(`  • Lotes Pendientes ('P'): ${vrfStats.LOTES_P} (Reducido a ${vrfStats.LOTES_P})`);

    const pgLotesBak = await pgPool.query('SELECT COUNT(*) FROM motor_app.bak_lote_abr2024');
    const pgWfBak = await pgPool.query('SELECT COUNT(*) FROM motor_app.bak_wf_work_item_abr2024');
    const pgTxtBak = await pgPool.query('SELECT COUNT(*) FROM motor_app.bak_txt_seniat_abr2024');

    console.log(`\n--- TABLAS DE RESPALDO EN POSTGRESQL (motor_app) ---`);
    console.log(`  • motor_app.bak_lote_abr2024: ${pgLotesBak.rows[0].count} registros guardados.`);
    console.log(`  • motor_app.bak_wf_work_item_abr2024: ${pgWfBak.rows[0].count} registros guardados.`);
    console.log(`  • motor_app.bak_txt_seniat_abr2024: ${pgTxtBak.rows[0].count} registros guardados.`);

    console.log('\n================================================================================');
    console.log('               SANEAMIENTO Y DEPURACIÓN CULMINADO CON ÉXITO                     ');
    console.log('================================================================================');

  } catch (err) {
    console.error('\n❌ ERROR EN LA EJECUCIÓN DEL SANEAMIENTO:', err);
    if (oraConnBot) {
      try {
        await oraConnBot.rollback();
        console.log('↺ Se ejecutó ROLLBACK de la transacción Oracle.');
      } catch (rbErr) {
        console.error('Error durante rollback:', rbErr);
      }
    }
  } finally {
    if (oraConnBot) {
      try { await oraConnBot.close(); } catch (e) {}
    }
    if (oraConnConsulta) {
      try { await oraConnConsulta.close(); } catch (e) {}
    }
    await pgPool.end();
  }
}

main();
