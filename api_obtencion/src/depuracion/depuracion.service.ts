import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PostgresService } from '../database/postgres.service';
import * as oracledb from 'oracledb';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface FormaDepuracionItem {
  id: number;
  cod_forma: string;
  descripcion: string;
  motivo: string;
  estado: string;
  created_at: string;
  updated_at: string;
}

export interface DepuracionScanResult {
  fecha: string;
  banco: string;
  expediente?: string;
  total_detectadas: number;
  monto_total: number;
  formas_detectadas: string[];
  desglose_por_forma: Array<{
    forma: string;
    cantidad: number;
    monto_total: number;
  }>;
  planillas: Array<{
    planilla_id: string;
    forma: string;
    monto: number;
    banco: string;
    agencia: string;
    fecha_recaudacion: string;
    rif: string;
    expediente?: number;
    lote_id?: number;
    lote_seq?: number;
    total_pln?: number;
  }>;
}

export interface LoteAjustadoInfo {
  anho: number;
  lote_seq: number;
  lote_id: number;
  expediente: number;
  agencia_codigo: string;
  total_anterior: number;
  depuradas: number;
  total_nuevo: number;
  lote_cerrado?: boolean;
}

export interface EjecutarDepuracionPayload {
  fecha: string;
  banco: string;
  planillas_ids: string[];
  motivo: string;
  password_autorizacion: string;
  usuario_email: string;
  expediente?: string;
}

@Injectable()
export class DepuracionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly pg: PostgresService
  ) {}

  /**
   * Obtiene la lista de formas configuradas para depuración desde PostgreSQL
   */
  async getFormasConfiguradas(): Promise<FormaDepuracionItem[]> {
    const res = await this.pg.query<FormaDepuracionItem>(
      `SELECT id, cod_forma, descripcion, motivo, estado, created_at, updated_at 
       FROM motor_app.formas_depuracion 
       ORDER BY id ASC`
    );
    return res.rows;
  }

  /**
   * Obtiene sólo los códigos de formas activas para depuración
   */
  async getCodigosFormasActivas(): Promise<string[]> {
    const res = await this.pg.query<{ cod_forma: string }>(
      `SELECT cod_forma FROM motor_app.formas_depuracion WHERE estado = 'ACTIVO'`
    );
    return res.rows.map(r => r.cod_forma.trim());
  }

  /**
   * Agrega una nueva forma al catálogo de depuración
   */
  async addFormaConfigurada(cod_forma: string, descripcion: string, motivo: string): Promise<FormaDepuracionItem> {
    const cleanCod = cod_forma.trim();
    if (!cleanCod) throw new BadRequestException('El código de forma es obligatorio');

    const res = await this.pg.query<FormaDepuracionItem>(
      `INSERT INTO motor_app.formas_depuracion (cod_forma, descripcion, motivo, estado)
       VALUES ($1, $2, $3, 'ACTIVO')
       ON CONFLICT (cod_forma) DO UPDATE 
       SET descripcion = EXCLUDED.descripcion, motivo = EXCLUDED.motivo, estado = 'ACTIVO', updated_at = CURRENT_TIMESTAMP
       RETURNING id, cod_forma, descripcion, motivo, estado, created_at, updated_at`,
      [cleanCod, descripcion || `Forma ${cleanCod} marcada para depuración`, motivo || 'Configuración operativa ONT']
    );
    return res.rows[0];
  }

  /**
   * Actualiza el estado (ACTIVO / INACTIVO) de una forma de depuración
   */
  async toggleFormaEstado(id: number, estado: string): Promise<FormaDepuracionItem> {
    const cleanEstado = estado.toUpperCase() === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO';
    const res = await this.pg.query<FormaDepuracionItem>(
      `UPDATE motor_app.formas_depuracion 
       SET estado = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, cod_forma, descripcion, motivo, estado, created_at, updated_at`,
      [cleanEstado, id]
    );
    if (res.rowCount === 0) throw new BadRequestException(`Forma con ID ${id} no encontrada`);
    return res.rows[0];
  }

  /**
   * Elimina una forma del catálogo de depuración
   */
  async deleteFormaConfigurada(id: number): Promise<{ message: string }> {
    const res = await this.pg.query(
      `DELETE FROM motor_app.formas_depuracion WHERE id = $1`,
      [id]
    );
    if (res.rowCount === 0) throw new BadRequestException(`Forma con ID ${id} no encontrada`);
    return { message: 'Forma eliminada del catálogo de depuración' };
  }

  /**
   * Escanea Oracle TXT_SENIAT para detectar planillas pendientes con formas en depuración
   */
  async escanearLote(fecha: string, banco: string, expediente?: string): Promise<DepuracionScanResult> {
    if (!fecha || !banco) {
      throw new BadRequestException('Fecha y banco son obligatorios para el escaneo');
    }

    const codigosDepuracion = await this.getCodigosFormasActivas();
    if (codigosDepuracion.length === 0) {
      return {
        fecha,
        banco,
        expediente,
        total_detectadas: 0,
        monto_total: 0,
        formas_detectadas: [],
        desglose_por_forma: [],
        planillas: []
      };
    }

    // Expandir códigos con pad numérico (ej: '84' y '00084')
    const codigosExpanded = new Set<string>();
    for (const cod of codigosDepuracion) {
      codigosExpanded.add(cod);
      const num = parseInt(cod, 10);
      if (!isNaN(num)) {
        codigosExpanded.add(String(num));
        codigosExpanded.add(String(num).padStart(5, '0'));
      }
    }
    const codigosArray = Array.from(codigosExpanded);

    const connection = await this.db.getConnection();
    try {
      // Query en Oracle TXT_SENIAT para buscar planillas pendientes que coincidan con las formas
      let query = `
        SELECT 
            T.PLANILLA AS PLANILLA_ID,
            T.FORMA_CODIGO AS FORMA,
            NVL(T.MONTO_EFECTIVO, 0) AS MONTO,
            T.INFN_CODIGO AS BANCO,
            T.AGENCIA_CODIGO AS AGENCIA,
            TO_CHAR(T.FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION,
            T.IDENT_CNTB AS RIF,
            L.EXPEDIENTE,
            L.LOTE_ID,
            L.LOTE_SEQ,
            L.TOTAL_PLN
        FROM ORG_LIQ.TXT_SENIAT T
        LEFT JOIN ORG_LIQ.LOTE L 
            ON L.FECHA_RECAUDACION = T.FECHA_RECAUDACION 
           AND L.INFN_CODIGO = T.INFN_CODIGO 
           AND L.AGENCIA_CODIGO = T.AGENCIA_CODIGO
           AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
           AND (L.ESTADO = 'P' OR NOT EXISTS (
               SELECT 1 FROM ORG_LIQ.LOTE L_ACT 
               WHERE L_ACT.FECHA_RECAUDACION = T.FECHA_RECAUDACION 
                 AND L_ACT.INFN_CODIGO = T.INFN_CODIGO 
                 AND L_ACT.AGENCIA_CODIGO = T.AGENCIA_CODIGO 
                 AND L_ACT.ESTADO = 'P'
           ))
        WHERE T.FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
          AND T.INFN_CODIGO = :banco
          AND (T.ESTADO IS NULL OR T.ESTADO = 0)
      `;

      const binds: any = { fecha, banco };

      if (expediente) {
        query += ` AND L.EXPEDIENTE = :expediente`;
        binds.expediente = expediente;
      }

      const res = await connection.execute(query, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const rows = res.rows as any[];

      // Filtrar filas cuyas formas coincidan con el catálogo de depuración
      const matchedRows = rows.filter(r => {
        const formaStr = String(r.FORMA || '').trim();
        const formaNum = parseInt(formaStr, 10);
        return codigosArray.includes(formaStr) || (!isNaN(formaNum) && codigosArray.includes(String(formaNum)));
      });

      // Deduplicar por planilla_id garantizando un solo registro por planilla
      const seenPlanillas = new Set<string>();
      const planillas: any[] = [];
      for (const r of matchedRows) {
        const pid = String(r.PLANILLA_ID);
        if (seenPlanillas.has(pid)) continue;
        seenPlanillas.add(pid);
        planillas.push({
          planilla_id: pid,
          forma: String(r.FORMA),
          monto: Number(r.MONTO),
          banco: String(r.BANCO),
          agencia: String(r.AGENCIA),
          fecha_recaudacion: String(r.FECHA_RECAUDACION),
          rif: String(r.RIF || ''),
          expediente: r.EXPEDIENTE ? Number(r.EXPEDIENTE) : undefined,
          lote_id: r.LOTE_ID ? Number(r.LOTE_ID) : undefined,
          lote_seq: r.LOTE_SEQ ? Number(r.LOTE_SEQ) : undefined,
          total_pln: r.TOTAL_PLN ? Number(r.TOTAL_PLN) : undefined
        });
      }

      // Desglose por forma
      const desgloseMap = new Map<string, { cantidad: number; monto_total: number }>();
      let montoTotalAcum = 0;

      for (const p of planillas) {
        montoTotalAcum += p.monto;
        const entry = desgloseMap.get(p.forma) || { cantidad: 0, monto_total: 0 };
        entry.cantidad += 1;
        entry.monto_total += p.monto;
        desgloseMap.set(p.forma, entry);
      }

      const desglose_por_forma = Array.from(desgloseMap.entries()).map(([forma, data]) => ({
        forma,
        cantidad: data.cantidad,
        monto_total: Math.round(data.monto_total * 100) / 100
      }));

      const formas_detectadas = Array.from(desgloseMap.keys());

      return {
        fecha,
        banco,
        expediente,
        total_detectadas: planillas.length,
        monto_total: Math.round(montoTotalAcum * 100) / 100,
        formas_detectadas,
        desglose_por_forma,
        planillas
      };
    } finally {
      await connection.close();
    }
  }

  /**
   * Ejecuta la depuración definitiva bajo autorización de seguridad
   */
  async ejecutarDepuracion(payload: EjecutarDepuracionPayload, reqIp: string = '127.0.0.1') {
    const { fecha, banco, planillas_ids, motivo, password_autorizacion, usuario_email } = payload;

    if (!fecha || !banco || !planillas_ids || planillas_ids.length === 0) {
      throw new BadRequestException('Debe especificar fecha, banco y al menos una planilla para depurar');
    }

    if (!motivo || motivo.trim().length < 8) {
      throw new BadRequestException('Debe proporcionar un motivo formal de autorización de al menos 8 caracteres');
    }

    if (!password_autorizacion) {
      throw new BadRequestException('Se requiere la contraseña de autorización de seguridad');
    }

    // 1. Validar autorización del usuario en PostgreSQL
    const userRes = await this.pg.query(
      `SELECT id, email, nombre, apellido, password_hash, rol, estado 
       FROM motor_app.usuarios 
       WHERE email = $1 AND estado = 'ACTIVO'`,
      [usuario_email]
    );

    if (userRes.rowCount === 0) {
      throw new UnauthorizedException('Usuario autorizador no encontrado o inactivo');
    }

    const usuario = userRes.rows[0];
    const passwordMatch = await bcrypt.compare(password_autorizacion, usuario.password_hash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Contraseña de autorización incorrecta. Operación cancelada.');
    }

    // 2. Ejecutar eliminación atómica en Oracle y ajuste de lotes
    const connection = await this.db.getConnection();
    let eliminadasCount = 0;
    let montoDepurado = 0;
    const formasAfectadasSet = new Set<string>();
    const planillasProcesadas: any[] = [];
    const lotesAfectadosMap = new Map<string, {
      anho: number;
      lote_seq: number;
      lote_id: number;
      expediente: number;
      agencia_codigo: string;
      total_anterior: number;
      depuradasCount: number;
    }>();
    const lotesAjustados: LoteAjustadoInfo[] = [];

    try {
      for (const planillaId of planillas_ids) {
        // Consultar registro para auditoría e identificación de lote antes de eliminar
        const checkRes = await connection.execute(
          `SELECT PLANILLA, FORMA_CODIGO, NVL(MONTO_EFECTIVO, 0) AS MONTO, IDENT_CNTB,
                  AGENCIA_CODIGO, LOTE_SEQ, ANHO
           FROM ORG_LIQ.TXT_SENIAT 
           WHERE PLANILLA = :planillaId 
             AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') 
             AND INFN_CODIGO = :banco`,
          { planillaId, fecha, banco },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const rows = checkRes.rows as any[];
        if (rows && rows.length > 0) {
          const row = rows[0];
          montoDepurado += Number(row.MONTO || 0);
          formasAfectadasSet.add(String(row.FORMA_CODIGO));

          // Identificar lote asociado a la planilla
          let loteInfo: any = null;
          if (row.LOTE_SEQ) {
            const anhoVal = row.ANHO || new Date(fecha).getFullYear();
            const loteRes = await connection.execute(
              `SELECT LOTE_SEQ, LOTE_ID, ANHO, TOTAL_PLN, EXPEDIENTE, AGENCIA_CODIGO
               FROM ORG_LIQ.LOTE
               WHERE LOTE_SEQ = :loteSeq AND ANHO = :anho`,
              { loteSeq: row.LOTE_SEQ, anho: anhoVal },
              { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            if (loteRes.rows && loteRes.rows.length > 0) {
              loteInfo = (loteRes.rows as any[])[0];
            }
          }

          if (!loteInfo && row.AGENCIA_CODIGO) {
            let loteQuery = `
              SELECT LOTE_SEQ, LOTE_ID, ANHO, TOTAL_PLN, EXPEDIENTE, AGENCIA_CODIGO
              FROM ORG_LIQ.LOTE
              WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
                AND INFN_CODIGO = :banco
                AND AGENCIA_CODIGO = :agencia
                AND ANHO = EXTRACT(YEAR FROM TO_DATE(:fecha, 'YYYY-MM-DD'))
            `;
            const loteBinds: any = { fecha, banco, agencia: row.AGENCIA_CODIGO };
            if (payload.expediente) {
              loteQuery += ` AND EXPEDIENTE = :expediente`;
              loteBinds.expediente = payload.expediente;
            }
            loteQuery += ` ORDER BY CASE WHEN ESTADO = 'P' THEN 1 ELSE 2 END, LOTE_ID ASC`;

            const loteRes = await connection.execute(loteQuery, loteBinds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            if (loteRes.rows && loteRes.rows.length > 0) {
              loteInfo = (loteRes.rows as any[])[0];
            }
          }

          if (loteInfo) {
            const loteKey = `${loteInfo.ANHO}_${loteInfo.LOTE_SEQ}`;
            const existing = lotesAfectadosMap.get(loteKey);
            if (existing) {
              existing.depuradasCount += 1;
            } else {
              lotesAfectadosMap.set(loteKey, {
                anho: Number(loteInfo.ANHO),
                lote_seq: Number(loteInfo.LOTE_SEQ),
                lote_id: Number(loteInfo.LOTE_ID),
                expediente: Number(loteInfo.EXPEDIENTE || 0),
                agencia_codigo: String(loteInfo.AGENCIA_CODIGO || ''),
                total_anterior: Number(loteInfo.TOTAL_PLN || 0),
                depuradasCount: 1
              });
            }
          }

          planillasProcesadas.push({
            planilla_id: String(row.PLANILLA),
            forma: String(row.FORMA_CODIGO),
            monto: Number(row.MONTO),
            rif: String(row.IDENT_CNTB || ''),
            agencia: String(row.AGENCIA_CODIGO || ''),
            lote_id: loteInfo ? Number(loteInfo.LOTE_ID) : undefined,
            lote_seq: loteInfo ? Number(loteInfo.LOTE_SEQ) : undefined,
            expediente: loteInfo ? Number(loteInfo.EXPEDIENTE) : undefined
          });

          // Intentar eliminación física o marcaje de depuración (ESTADO = -1) según permisos
          try {
            const delRes = await connection.execute(
              `DELETE FROM ORG_LIQ.TXT_SENIAT 
               WHERE PLANILLA = :planillaId 
                 AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') 
                 AND INFN_CODIGO = :banco`,
              { planillaId, fecha, banco }
            );
            eliminadasCount += (delRes.rowsAffected || 0);
          } catch (delErr: any) {
            // Si el usuario de base de datos no tiene permiso DELETE, marcar ESTADO = -1 (Depurada)
            const updRes = await connection.execute(
              `UPDATE ORG_LIQ.TXT_SENIAT 
               SET ESTADO = -1, ANHO = NULL, LOTE_SEQ = NULL, PLAN_SEQ = NULL 
               WHERE PLANILLA = :planillaId 
                 AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') 
                 AND INFN_CODIGO = :banco`,
              { planillaId, fecha, banco }
            );
            eliminadasCount += (updRes.rowsAffected || 0);
          }
        }
      }

      // Ajustar TOTAL_PLN de cada lote afectado en la misma transacción Oracle
      for (const [, lote] of lotesAfectadosMap) {
        await connection.execute(
          `UPDATE ORG_LIQ.LOTE
           SET TOTAL_PLN = GREATEST(0, TOTAL_PLN - :count)
           WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
          {
            count: lote.depuradasCount,
            anho: lote.anho,
            loteSeq: lote.lote_seq
          }
        );

        // Consultar el nuevo TOTAL_PLN actualizado
        const checkLoteRes = await connection.execute(
          `SELECT TOTAL_PLN FROM ORG_LIQ.LOTE WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
          { anho: lote.anho, loteSeq: lote.lote_seq },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const nuevoTotal = (checkLoteRes.rows as any[])?.[0]?.TOTAL_PLN ?? Math.max(0, lote.total_anterior - lote.depuradasCount);

        // Evaluar si el nuevo total del lote ya fue completado por planillas conciliadas
        let loteCerrado = false;
        try {
          const countConc = await connection.execute(
            `SELECT COUNT(*) AS CANT FROM ORG_LIQ.PLANILLA WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
            { anho: lote.anho, loteSeq: lote.lote_seq },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          const cantConc = Number((countConc.rows as any[])?.[0]?.CANT ?? 0);
          if (cantConc >= Number(nuevoTotal) && Number(nuevoTotal) > 0) {
            const updLote = await connection.execute(
              `UPDATE ORG_LIQ.LOTE SET ESTADO = 'V' WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq AND ESTADO = 'P'`,
              { anho: lote.anho, loteSeq: lote.lote_seq }
            );
            if ((updLote.rowsAffected || 0) > 0) {
              loteCerrado = true;
              console.log(`[DEPURACION] Lote SEQ ${lote.lote_seq} cerrado a ESTADO 'V' al ajustar total a ${nuevoTotal} (Conciliadas: ${cantConc}).`);
            }
          }
        } catch (closeCheckErr: any) {
          console.warn(`[DEPURACION] Error verificando cierre de lote ${lote.lote_seq}:`, closeCheckErr.message);
        }

        lotesAjustados.push({
          anho: lote.anho,
          lote_seq: lote.lote_seq,
          lote_id: lote.lote_id,
          expediente: lote.expediente,
          agencia_codigo: lote.agencia_codigo,
          total_anterior: lote.total_anterior,
          depuradas: lote.depuradasCount,
          total_nuevo: Number(nuevoTotal),
          lote_cerrado: loteCerrado
        });
      }

      await connection.commit();
    } catch (err: any) {
      await connection.rollback();
      throw new BadRequestException('Error en la transacción Oracle al depurar planillas: ' + err.message);
    } finally {
      await connection.close();
    }

    // 3. Registrar auditoría en PostgreSQL motor_app.depuracion_audit
    const auditRes = await this.pg.query(
      `INSERT INTO motor_app.depuracion_audit 
       (usuario_email, usuario_nombre, fecha_recaudacion, banco_codigo, total_registros_eliminados, 
        monto_total_depurado, formas_afectadas, planillas_afectadas, motivo_autorizacion, ip_address, detalles)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, fecha_depuracion`,
      [
        usuario.email,
        `${usuario.nombre} ${usuario.apellido}`,
        fecha,
        banco,
        eliminadasCount,
        Math.round(montoDepurado * 100) / 100,
        Array.from(formasAfectadasSet).join(', '),
        JSON.stringify(planillasProcesadas),
        motivo,
        reqIp,
        JSON.stringify({
          planillas_ids_solicitadas: planillas_ids,
          expediente: payload.expediente || null,
          lotes_ajustados: lotesAjustados
        })
      ]
    );

    // 4. Registrar en auditoria.json
    try {
      const auditFilePath = path.join(process.cwd(), 'auditoria.json');
      const auditEntry = {
        evento: 'DEPURACION_FORMAS_EJECUTADA',
        fecha_hora: new Date().toISOString(),
        usuario: `${usuario.nombre} ${usuario.apellido} (${usuario.email})`,
        fecha_recaudacion: fecha,
        banco,
        total_eliminadas: eliminadasCount,
        monto_total_depurado: montoDepurado,
        formas_afectadas: Array.from(formasAfectadasSet),
        lotes_ajustados: lotesAjustados,
        motivo
      };
      let registros: any[] = [];
      try {
        const data = await fs.readFile(auditFilePath, 'utf8');
        if (data) registros = JSON.parse(data);
      } catch {}
      registros.push(auditEntry);
      await fs.writeFile(auditFilePath, JSON.stringify(registros, null, 2), 'utf8');
    } catch (e) {
      console.warn('[DEPURACION] Error escribiendo en auditoria.json:', e);
    }

    const mensajeLotes = lotesAjustados.length > 0
      ? ` y se ajustó el total de ${lotesAjustados.length} lote(s) en ORG_LIQ.LOTE (${lotesAjustados.map(l => `Lote ${l.lote_id}: ${l.total_anterior} -> ${l.total_nuevo}`).join(', ')}).`
      : '.';

    return {
      success: true,
      mensaje: `Depuración completada: ${eliminadasCount} registros de formas no procesables eliminados${mensajeLotes}`,
      eliminadas_count: eliminadasCount,
      monto_total_depurado: Math.round(montoDepurado * 100) / 100,
      formas_afectadas: Array.from(formasAfectadasSet),
      lotes_afectados: lotesAjustados,
      audit_id: auditRes.rows[0]?.id
    };
  }

  /**
   * Ejecuta depuración automática para el bot o pipeline sin requerir contraseña interactiva
   */
  async ejecutarDepuracionAutomatica(
    fecha: string,
    banco: string,
    planillas_ids: string[],
    motivo: string = 'Depuración automática por Bot Orquestador',
    operador: string = 'BOT_TELEGRAM',
    expediente?: string
  ) {
    if (!fecha || !banco || !planillas_ids || planillas_ids.length === 0) {
      return { total_eliminadas: 0, monto_total: 0, formas_afectadas: [], lotes_afectados: [] };
    }

    const connection = await this.db.getConnection();
    let eliminadasCount = 0;
    let montoDepurado = 0;
    const formasAfectadasSet = new Set<string>();
    const planillasProcesadas: any[] = [];
    const lotesAfectadosMap = new Map<string, {
      anho: number;
      lote_seq: number;
      lote_id: number;
      expediente: number;
      agencia_codigo: string;
      total_anterior: number;
      depuradasCount: number;
    }>();
    const lotesAjustados: LoteAjustadoInfo[] = [];

    try {
      for (const planillaId of planillas_ids) {
        const checkRes = await connection.execute(
          `SELECT PLANILLA, FORMA_CODIGO, NVL(MONTO_EFECTIVO, 0) AS MONTO, IDENT_CNTB,
                  AGENCIA_CODIGO, LOTE_SEQ, ANHO
           FROM ORG_LIQ.TXT_SENIAT 
           WHERE PLANILLA = :planillaId 
             AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') 
             AND INFN_CODIGO = :banco`,
          { planillaId, fecha, banco },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const rows = checkRes.rows as any[];
        if (rows && rows.length > 0) {
          const row = rows[0];
          montoDepurado += Number(row.MONTO || 0);
          formasAfectadasSet.add(String(row.FORMA_CODIGO));

          // Identificar lote asociado
          let loteInfo: any = null;
          if (row.LOTE_SEQ) {
            const anhoVal = row.ANHO || new Date(fecha).getFullYear();
            const loteRes = await connection.execute(
              `SELECT LOTE_SEQ, LOTE_ID, ANHO, TOTAL_PLN, EXPEDIENTE, AGENCIA_CODIGO
               FROM ORG_LIQ.LOTE
               WHERE LOTE_SEQ = :loteSeq AND ANHO = :anho`,
              { loteSeq: row.LOTE_SEQ, anho: anhoVal },
              { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            if (loteRes.rows && loteRes.rows.length > 0) {
              loteInfo = (loteRes.rows as any[])[0];
            }
          }

          if (!loteInfo && row.AGENCIA_CODIGO) {
            let loteQuery = `
              SELECT LOTE_SEQ, LOTE_ID, ANHO, TOTAL_PLN, EXPEDIENTE, AGENCIA_CODIGO
              FROM ORG_LIQ.LOTE
              WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
                AND INFN_CODIGO = :banco
                AND AGENCIA_CODIGO = :agencia
                AND ANHO = EXTRACT(YEAR FROM TO_DATE(:fecha, 'YYYY-MM-DD'))
            `;
            const loteBinds: any = { fecha, banco, agencia: row.AGENCIA_CODIGO };
            if (expediente) {
              loteQuery += ` AND EXPEDIENTE = :expediente`;
              loteBinds.expediente = expediente;
            }
            loteQuery += ` ORDER BY CASE WHEN ESTADO = 'P' THEN 1 ELSE 2 END, LOTE_ID ASC`;

            const loteRes = await connection.execute(loteQuery, loteBinds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            if (loteRes.rows && loteRes.rows.length > 0) {
              loteInfo = (loteRes.rows as any[])[0];
            }
          }

          if (loteInfo) {
            const loteKey = `${loteInfo.ANHO}_${loteInfo.LOTE_SEQ}`;
            const existing = lotesAfectadosMap.get(loteKey);
            if (existing) {
              existing.depuradasCount += 1;
            } else {
              lotesAfectadosMap.set(loteKey, {
                anho: Number(loteInfo.ANHO),
                lote_seq: Number(loteInfo.LOTE_SEQ),
                lote_id: Number(loteInfo.LOTE_ID),
                expediente: Number(loteInfo.EXPEDIENTE || 0),
                agencia_codigo: String(loteInfo.AGENCIA_CODIGO || ''),
                total_anterior: Number(loteInfo.TOTAL_PLN || 0),
                depuradasCount: 1
              });
            }
          }

          planillasProcesadas.push({
            planilla_id: String(row.PLANILLA),
            forma: String(row.FORMA_CODIGO),
            monto: Number(row.MONTO),
            rif: String(row.IDENT_CNTB || ''),
            agencia: String(row.AGENCIA_CODIGO || ''),
            lote_id: loteInfo ? Number(loteInfo.LOTE_ID) : undefined,
            lote_seq: loteInfo ? Number(loteInfo.LOTE_SEQ) : undefined,
            expediente: loteInfo ? Number(loteInfo.EXPEDIENTE) : undefined
          });

          try {
            const delRes = await connection.execute(
              `DELETE FROM ORG_LIQ.TXT_SENIAT 
               WHERE PLANILLA = :planillaId 
                 AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') 
                 AND INFN_CODIGO = :banco`,
              { planillaId, fecha, banco }
            );
            eliminadasCount += (delRes.rowsAffected || 0);
          } catch (delErr) {
            const updRes = await connection.execute(
              `UPDATE ORG_LIQ.TXT_SENIAT 
               SET ESTADO = -1, ANHO = NULL, LOTE_SEQ = NULL, PLAN_SEQ = NULL 
               WHERE PLANILLA = :planillaId 
                 AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') 
                 AND INFN_CODIGO = :banco`,
              { planillaId, fecha, banco }
            );
            eliminadasCount += (updRes.rowsAffected || 0);
          }
        }
      }

      // Ajustar TOTAL_PLN de cada lote afectado en la misma transacción Oracle
      for (const [, lote] of lotesAfectadosMap) {
        await connection.execute(
          `UPDATE ORG_LIQ.LOTE
           SET TOTAL_PLN = GREATEST(0, TOTAL_PLN - :count)
           WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
          {
            count: lote.depuradasCount,
            anho: lote.anho,
            loteSeq: lote.lote_seq
          }
        );

        const checkLoteRes = await connection.execute(
          `SELECT TOTAL_PLN FROM ORG_LIQ.LOTE WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
          { anho: lote.anho, loteSeq: lote.lote_seq },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const nuevoTotal = (checkLoteRes.rows as any[])?.[0]?.TOTAL_PLN ?? Math.max(0, lote.total_anterior - lote.depuradasCount);

        // Evaluar si el nuevo total del lote ya fue completado por planillas conciliadas
        let loteCerrado = false;
        try {
          const countConc = await connection.execute(
            `SELECT COUNT(*) AS CANT FROM ORG_LIQ.PLANILLA WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
            { anho: lote.anho, loteSeq: lote.lote_seq },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          const cantConc = Number((countConc.rows as any[])?.[0]?.CANT ?? 0);
          if (cantConc >= Number(nuevoTotal) && Number(nuevoTotal) > 0) {
            const updLote = await connection.execute(
              `UPDATE ORG_LIQ.LOTE SET ESTADO = 'V' WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq AND ESTADO = 'P'`,
              { anho: lote.anho, loteSeq: lote.lote_seq }
            );
            if ((updLote.rowsAffected || 0) > 0) {
              loteCerrado = true;
              console.log(`[DEPURACION] Lote SEQ ${lote.lote_seq} cerrado a ESTADO 'V' al ajustar total a ${nuevoTotal} (Conciliadas: ${cantConc}).`);
            }
          }
        } catch (closeCheckErr: any) {
          console.warn(`[DEPURACION] Error verificando cierre de lote ${lote.lote_seq}:`, closeCheckErr.message);
        }

        lotesAjustados.push({
          anho: lote.anho,
          lote_seq: lote.lote_seq,
          lote_id: lote.lote_id,
          expediente: lote.expediente,
          agencia_codigo: lote.agencia_codigo,
          total_anterior: lote.total_anterior,
          depuradas: lote.depuradasCount,
          total_nuevo: Number(nuevoTotal),
          lote_cerrado: loteCerrado
        });
      }

      await connection.commit();
    } catch (err: any) {
      await connection.rollback();
      throw new Error('Error en la transacción Oracle al depurar planillas: ' + err.message);
    } finally {
      await connection.close();
    }

    // Registrar auditoría en PostgreSQL si está disponible
    try {
      await this.pg.query(
        `INSERT INTO motor_app.depuracion_audit 
         (usuario_email, usuario_nombre, fecha_recaudacion, banco_codigo, total_registros_eliminados, 
          monto_total_depurado, formas_afectadas, planillas_afectadas, motivo_autorizacion, ip_address, detalles)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          operador,
          'Bot Automatizado ONT',
          fecha,
          banco,
          eliminadasCount,
          Math.round(montoDepurado * 100) / 100,
          Array.from(formasAfectadasSet).join(', '),
          JSON.stringify(planillasProcesadas),
          motivo,
          '127.0.0.1',
          JSON.stringify({
            origen: 'TelegramBot',
            total_solicitadas: planillas_ids.length,
            expediente: expediente || null,
            lotes_ajustados: lotesAjustados
          })
        ]
      );
    } catch (auditErr) {
      console.warn('[DEPURACION] No se pudo guardar registro de auditoria en postgres:', auditErr);
    }

    return {
      total_eliminadas: eliminadasCount,
      monto_total: Math.round(montoDepurado * 100) / 100,
      formas_afectadas: Array.from(formasAfectadasSet),
      planillas_afectadas: planillasProcesadas,
      lotes_afectados: lotesAjustados
    };
  }

  /**
   * Obtiene el historial de bitácoras de depuración desde PostgreSQL
   */
  async getHistorialAudit(): Promise<any[]> {
    const res = await this.pg.query(
      `SELECT id, fecha_depuracion, usuario_email, usuario_nombre, fecha_recaudacion, banco_codigo,
              total_registros_eliminados, monto_total_depurado, formas_afectadas, planillas_afectadas,
              motivo_autorizacion, ip_address
       FROM motor_app.depuracion_audit
       ORDER BY id DESC 
       LIMIT 100`
    );
    return res.rows;
  }
}

