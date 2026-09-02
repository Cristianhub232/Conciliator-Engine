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
  }>;
}

export interface EjecutarDepuracionPayload {
  fecha: string;
  banco: string;
  planillas_ids: string[];
  motivo: string;
  password_autorizacion: string;
  usuario_email: string;
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
            T.IDENT_CNTB AS RIF
        FROM ORG_LIQ.TXT_SENIAT T
        WHERE T.FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
          AND T.INFN_CODIGO = :banco
          AND (T.ESTADO IS NULL OR T.ESTADO = 0)
      `;

      const binds: any = { fecha, banco };

      if (expediente) {
        query += ` AND EXISTS (
            SELECT 1 FROM ORG_LIQ.LOTE L 
            WHERE L.FECHA_RECAUDACION = T.FECHA_RECAUDACION 
              AND L.INFN_CODIGO = T.INFN_CODIGO 
              AND L.EXPEDIENTE = :expediente
        )`;
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

      const planillas = matchedRows.map(r => ({
        planilla_id: String(r.PLANILLA_ID),
        forma: String(r.FORMA),
        monto: Number(r.MONTO),
        banco: String(r.BANCO),
        agencia: String(r.AGENCIA),
        fecha_recaudacion: String(r.FECHA_RECAUDACION),
        rif: String(r.RIF || '')
      }));

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

    // 2. Ejecutar eliminación atómica en Oracle
    const connection = await this.db.getConnection();
    let eliminadasCount = 0;
    let montoDepurado = 0;
    const formasAfectadasSet = new Set<string>();
    const planillasProcesadas: any[] = [];

    try {
      for (const planillaId of planillas_ids) {
        // Consultar registro para auditoría antes de eliminar
        const checkRes = await connection.execute(
          `SELECT PLANILLA, FORMA_CODIGO, NVL(MONTO_EFECTIVO, 0) AS MONTO, IDENT_CNTB
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
          planillasProcesadas.push({
            planilla_id: String(row.PLANILLA),
            forma: String(row.FORMA_CODIGO),
            monto: Number(row.MONTO),
            rif: String(row.IDENT_CNTB || '')
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
        JSON.stringify({ planillas_ids_solicitadas: planillas_ids })
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

    return {
      success: true,
      mensaje: `Depuración completada: ${eliminadasCount} registros de formas no procesables eliminados exitosamente.`,
      eliminadas_count: eliminadasCount,
      monto_total_depurado: Math.round(montoDepurado * 100) / 100,
      formas_afectadas: Array.from(formasAfectadasSet),
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
    operador: string = 'BOT_TELEGRAM'
  ) {
    if (!fecha || !banco || !planillas_ids || planillas_ids.length === 0) {
      return { total_eliminadas: 0, monto_total: 0, formas_afectadas: [] };
    }

    const connection = await this.db.getConnection();
    let eliminadasCount = 0;
    let montoDepurado = 0;
    const formasAfectadasSet = new Set<string>();
    const planillasProcesadas: any[] = [];

    try {
      for (const planillaId of planillas_ids) {
        const checkRes = await connection.execute(
          `SELECT PLANILLA, FORMA_CODIGO, NVL(MONTO_EFECTIVO, 0) AS MONTO, IDENT_CNTB
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
          planillasProcesadas.push({
            planilla_id: String(row.PLANILLA),
            forma: String(row.FORMA_CODIGO),
            monto: Number(row.MONTO),
            rif: String(row.IDENT_CNTB || '')
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
          JSON.stringify({ origen: 'TelegramBot', total_solicitadas: planillas_ids.length })
        ]
      );
    } catch (auditErr) {
      console.warn('[DEPURACION] No se pudo guardar registro de auditoria en postgres:', auditErr);
    }

    return {
      total_eliminadas: eliminadasCount,
      monto_total: Math.round(montoDepurado * 100) / 100,
      formas_afectadas: Array.from(formasAfectadasSet),
      planillas_afectadas: planillasProcesadas
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

