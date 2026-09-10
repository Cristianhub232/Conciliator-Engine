import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PostgresService } from '../database/postgres.service';
import * as oracledb from 'oracledb';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DepurarDuplicadosTxtDto {
  fecha: string;
  banco: string;
  usuario_email: string;
  password_autorizacion: string;
  motivo?: string;
  planillas_ids?: string[];
  expediente?: string;
}

export interface LoteAjustadoDuplicadoInfo {
  anho: number;
  lote_seq: number;
  lote_id: number;
  expediente?: number;
  agencia_codigo: string;
  total_anterior: number;
  eliminadas: number;
  total_nuevo: number;
}

export interface PlanillasFilter {
  fecha: string;
  banco: string;
  estado_asignacion?: 'ASIGNADAS' | 'HUERFANAS' | 'TODAS';
  expediente?: string;
  lote_id?: string | number;
  limit?: number;
  offset?: number;
}

export interface PartidaAsignacion {
  partida: string;
  monto: number;
}

export interface ConciliarPayload {
  usuario_operador: string;
  expediente: number;
  lote_id: number;
  lote_seq: number;
  planilla_id: string;
  forma: string;
  monto: number;
  banco: string;
  agencia: string;
  fecha_recaudacion: string;
  asignaciones: PartidaAsignacion[];
}

export interface RevertirPayload {
  usuario_operador: string;
  planilla_id: string;
  banco: string;
  fecha_recaudacion: string;
  forma?: string;
  agencia?: string;
}

export interface PlanillaAtributoNullItem {
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
  motivo_alerta: string;
}

export interface DeteccionAtributosNullResponse {
  total: number;
  monto_total: number;
  formas_detectadas: string[];
  planillas: PlanillaAtributoNullItem[];
}

export interface DuplicadoTxtItem {
  planilla: string;
  forma_codigo: string;
  monto: number;
  agencia: string;
  repeticiones: number;
  monto_excedente: number;
}

export interface DuplicadosTxtResponse {
  total_duplicadas: number;
  monto_total_duplicadas: number;
  planillas_unicas_afectadas: number;
  duplicados: DuplicadoTxtItem[];
}

export interface ConciliarEspecialesDto {
  usuario_email: string;
  password_autorizacion: string;
  motivo?: string;
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
    asignaciones?: PartidaAsignacion[];
  }>;
}

@Injectable()
export class PlanillasService {
  private readonly logger = new Logger(PlanillasService.name);
  private validFormasCache: Set<string> = new Set();
  private lastCacheUpdate = 0;

  constructor(
    private readonly db: DatabaseService,
    private readonly pg: PostgresService
  ) {}

  private async getValidFormas(connection: oracledb.Connection): Promise<Set<string>> {
    const now = Date.now();
    if (this.validFormasCache.size > 0 && now - this.lastCacheUpdate < 3600000) {
      return this.validFormasCache;
    }
    try {
      const res = await connection.execute(
        `SELECT FORMA_CODIGO FROM ORG_LIQ.FORMA_IMPUESTO`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      this.validFormasCache = new Set((res.rows as any[]).map(r => String(r.FORMA_CODIGO)));
      this.lastCacheUpdate = now;
    } catch (err) {
      console.warn('[PLANILLAS] Error cargando catalogo FORMA_IMPUESTO en cache:', err);
    }
    return this.validFormasCache;
  }

  private async registrarAuditoriaJson(registro: any) {
    const auditFilePath = path.join(process.cwd(), 'auditoria.json');
    try {
      const auditEntry = {
        ...registro,
        fecha_hora: new Date().toISOString()
      };
      let registros: any[] = [];
      try {
        const data = await fs.readFile(auditFilePath, 'utf8');
        if (data) registros = JSON.parse(data);
      } catch {}
      registros.push(auditEntry);
      await fs.writeFile(auditFilePath, JSON.stringify(registros, null, 2), 'utf8');
    } catch (err) {
      console.error('[AUDITORIA] Error registrando auditoria:', err);
    }
  }

  async getPendientes(filters: PlanillasFilter) {
    const { fecha, banco, estado_asignacion, expediente, lote_id, limit = 1000, offset = 0 } = filters;
    
    let baseQuery = '';
    const binds: any = {};

    let filtersSql = ` AND T.FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') 
                       AND T.INFN_CODIGO = :banco`;
    binds.fecha = fecha;
    binds.banco = banco;

    if (expediente) {
      filtersSql += ` AND L.EXPEDIENTE = :expediente`;
      binds.expediente = expediente;
    }

    if (lote_id) {
      filtersSql += ` AND L.LOTE_ID = :lote_id`;
      binds.lote_id = Number(lote_id);
    }

    if (estado_asignacion === 'ASIGNADAS' || estado_asignacion === 'TODAS') {
      baseQuery = `
        SELECT DISTINCT
            'ASIGNADA' AS ESTADO_ASIGNACION,
            L.EXPEDIENTE,
            L.LOTE_ID,
            L.LOTE_SEQ,
            T.PLANILLA AS NRO_PLANILLA_FALTANTE,
            T.FORMA_CODIGO AS FORMA,
            T.MONTO_EFECTIVO,
            T.INFN_CODIGO AS BANCO,
            T.AGENCIA_CODIGO AS AGENCIA,
            T.FECHA_RECAUDACION,
            T.IDENT_CNTB AS RIF
        FROM ORG_LIQ.TXT_SENIAT T
        INNER JOIN ORG_LIQ.LOTE L 
            ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
           AND T.INFN_CODIGO = L.INFN_CODIGO 
           AND T.AGENCIA_CODIGO = L.AGENCIA_CODIGO
           AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
        INNER JOIN WFE_WORKFLOW.WF_WORK_ITEM W 
            ON L.EXPEDIENTE = W.WFEX_EXP_ID
            AND W.WI_ESTADO = 'ABIERTA'
            AND W.WFUS_USERS_ID IS NOT NULL
        WHERE L.ESTADO = 'P'
          AND T.ESTADO IS NULL 
          AND NOT EXISTS (
            SELECT 1 FROM ORG_LIQ.PLANILLA P 
            WHERE P.PLANILLA_ID = T.PLANILLA 
              AND P.FORMA_CODIGO = T.FORMA_CODIGO
              AND P.LOTE_SEQ = L.LOTE_SEQ 
              AND P.ANHO = L.ANHO
        )
        ${filtersSql}
      `;
    } else {
      baseQuery = `
        SELECT DISTINCT
            'SIN_ASIGNAR' AS ESTADO_ASIGNACION,
            L.EXPEDIENTE,
            L.LOTE_ID,
            L.LOTE_SEQ,
            T.PLANILLA AS NRO_PLANILLA_FALTANTE,
            T.FORMA_CODIGO AS FORMA,
            T.MONTO_EFECTIVO,
            T.INFN_CODIGO AS BANCO,
            T.AGENCIA_CODIGO AS AGENCIA,
            T.FECHA_RECAUDACION,
            T.IDENT_CNTB AS RIF
        FROM ORG_LIQ.TXT_SENIAT T
        INNER JOIN ORG_LIQ.LOTE L 
            ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
           AND T.INFN_CODIGO = L.INFN_CODIGO 
           AND T.AGENCIA_CODIGO = L.AGENCIA_CODIGO
           AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
        WHERE L.ESTADO = 'P'
          AND T.ESTADO IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM ORG_LIQ.PLANILLA P 
            WHERE P.PLANILLA_ID = T.PLANILLA 
              AND P.FORMA_CODIGO = T.FORMA_CODIGO
              AND P.LOTE_SEQ = L.LOTE_SEQ 
              AND P.ANHO = L.ANHO
        )
        AND (
            NOT EXISTS (
                SELECT 1 FROM WFE_WORKFLOW.WF_WORK_ITEM W 
                WHERE L.EXPEDIENTE = W.WFEX_EXP_ID 
                  AND W.WI_ESTADO = 'ABIERTA'
            )
            OR EXISTS (
                SELECT 1 FROM WFE_WORKFLOW.WF_WORK_ITEM W 
                WHERE L.EXPEDIENTE = W.WFEX_EXP_ID 
                  AND W.WI_ESTADO = 'ABIERTA' 
                  AND W.WFUS_USERS_ID IS NULL
            )
        )
        ${filtersSql}
      `;
    }

    const paginatedQuery = `
      ${baseQuery}
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;
    binds.offset = Number(offset);
    binds.limit = Number(limit);

    try {
      return await this.db.executeQuery(paginatedQuery, binds);
    } catch (error) {
      throw error;
    }
  }

  private async executeWithTimeout(
    connection: oracledb.Connection,
    sql: string,
    binds: any = {},
    options: oracledb.ExecuteOptions = {},
    timeoutMs = 8000
  ): Promise<oracledb.Result<any>> {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Timeout de consulta excedido (${timeoutMs}ms) en Oracle`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([
        connection.execute(sql, binds, options),
        timeoutPromise
      ]);
      return result as oracledb.Result<any>;
    } finally {
      clearTimeout(timeoutHandle!);
    }
  }

  async conciliarPlanilla(payload: ConciliarPayload): Promise<any> {
    const t0 = Date.now();
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      let connection: oracledb.Connection | null = null;

      const execOptions: oracledb.ExecuteOptions = {
        autoCommit: false,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };

      try {
        connection = await this.db.getConnection();

        const validFormas = await this.getValidFormas(connection);
        if (validFormas.size > 0 && !validFormas.has(String(payload.forma))) {
          throw new Error(`La forma ${payload.forma} no existe en el catálogo FORMA_IMPUESTO de SIGECOF. Planilla omitida.`);
        }

        const fechaLimpia = payload.fecha_recaudacion.split('T')[0];
        const anho = parseInt(fechaLimpia.split('-')[0], 10);
        const periodo = parseInt(fechaLimpia.replace(/-/g, ''), 10);

        // Construir bloques dinámicos para DET_PLANILLA en el mismo PL/SQL atómico
        let detSql = '';
        const plsqlBinds: any = {
          planilla: String(payload.planilla_id).trim(),
          fecha: fechaLimpia,
          banco: String(payload.banco).trim(),
          agencia: payload.agencia ? String(payload.agencia).trim() : null,
          anho,
          loteId: Number(payload.lote_id) || 0,
          loteSeq: Number(payload.lote_seq) || 0,
          forma: String(payload.forma).trim(),
          montoTotal: Number(payload.monto) || 0,
          expediente: Number(payload.expediente) || 0,
          periodo,
          outSeq: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          outLoteCerrado: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };

        let detpSeq = 1;
        for (const item of (payload.asignaciones || [])) {
          const partidaKey = `partida_${detpSeq}`;
          const montoKey = `monto_${detpSeq}`;
          const codPartida = String(item.partida || (item as any).cod_partida || '').trim();
          const montoPartida = Number(item.monto) || 0;

          plsqlBinds[partidaKey] = codPartida;
          plsqlBinds[montoKey] = montoPartida;

          detSql += `
            INSERT INTO ORG_LIQ.DET_PLANILLA 
             (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, PLUC_ID, DET_PLN_ID, 
              MONTO, MONTO_EFECTIVO, EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, DETP_SEQ) 
            VALUES 
             (:anho, :loteId, :planilla, :forma, :${partidaKey}, ${detpSeq}, 
              :${montoKey}, :${montoKey}, :expediente, :loteSeq, v_seq, ${detpSeq});
          `;
          detpSeq++;
        }

        const plsql = `
          DECLARE
            v_ident VARCHAR2(30);
            v_seq NUMBER(6);
            v_total_pln NUMBER;
            v_conciliadas NUMBER;
            v_lote_cerrado NUMBER := 0;
          BEGIN
            -- 1. Obtener RIF de TXT_SENIAT
            BEGIN
              SELECT NVL(IDENT_CNTB, 'V000000000') INTO v_ident
              FROM ORG_LIQ.TXT_SENIAT
              WHERE PLANILLA = :planilla 
                AND FORMA_CODIGO = :forma
                AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') 
                AND INFN_CODIGO = :banco
                AND (:agencia IS NULL OR AGENCIA_CODIGO = :agencia)
                AND ROWNUM = 1;
            EXCEPTION
              WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(-20001, 'No se encontro el registro en TXT_SENIAT para la planilla ' || :planilla || ', forma ' || :forma || ' y agencia ' || NVL(:agencia, 'N/A'));
            END;

            -- 2. Calcular siguiente correlativo PLAN_SEQ
            SELECT NVL(MAX(PLAN_SEQ), 0) + 1 INTO v_seq
            FROM ORG_LIQ.PLANILLA
            WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq;

            -- 3. Insertar Cabecera en PLANILLA
            INSERT INTO ORG_LIQ.PLANILLA 
             (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, ORGA_ID, FECHA_REGISTRO, IDENT_CNTB, 
              MONTO, MONTO_EFECTIVO, PLANILLA_MANUAL, FECHA_RECAUDACION, INFN_CODIGO, 
              EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, PERIODO) 
            VALUES 
             (:anho, :loteId, :planilla, :forma, '00', SYSDATE, v_ident, 
              :montoTotal, :montoTotal, 0, TO_DATE(:fecha, 'YYYY-MM-DD'), :banco, 
              :expediente, :loteSeq, v_seq, :periodo);

            -- 4. Insertar Renglones Presupuestarios en DET_PLANILLA
            ${detSql}

            -- 5. Actualizar TXT_SENIAT a estado conciliado (ESTADO = 1)
            UPDATE ORG_LIQ.TXT_SENIAT 
            SET ESTADO = 1, ANHO = :anho, LOTE_SEQ = :loteSeq, PLAN_SEQ = v_seq 
            WHERE PLANILLA = :planilla 
              AND FORMA_CODIGO = :forma
              AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
              AND INFN_CODIGO = :banco
              AND (:agencia IS NULL OR AGENCIA_CODIGO = :agencia);

            -- 6. Verificar si el lote se completó (Planillas conciliadas >= TOTAL_PLN)
            BEGIN
              SELECT TOTAL_PLN INTO v_total_pln
              FROM ORG_LIQ.LOTE
              WHERE LOTE_SEQ = :loteSeq AND ANHO = :anho;

              SELECT COUNT(*) INTO v_conciliadas
              FROM ORG_LIQ.PLANILLA
              WHERE LOTE_SEQ = :loteSeq AND ANHO = :anho;

              IF v_conciliadas >= v_total_pln THEN
                UPDATE ORG_LIQ.LOTE
                SET ESTADO = 'V'
                WHERE LOTE_SEQ = :loteSeq AND ANHO = :anho AND ESTADO = 'P';
                IF SQL%ROWCOUNT > 0 THEN
                  v_lote_cerrado := 1;
                END IF;
              END IF;
            EXCEPTION
              WHEN OTHERS THEN
                NULL;
            END;

            -- 7. Confirmar transaccion
            COMMIT;

            :outSeq := v_seq;
            :outLoteCerrado := v_lote_cerrado;
          END;
        `;

        const resultPlsql = await this.executeWithTimeout(
          connection,
          plsql,
          plsqlBinds,
          execOptions,
          12000
        );

        const planSeq = resultPlsql.outBinds?.outSeq || 1;
        const loteCerrado = (resultPlsql.outBinds?.outLoteCerrado === 1);

        if (loteCerrado) {
          console.log(`[LOTE CERRADO] Lote SEQ ${payload.lote_seq} (Lote ${payload.lote_id}, Exp ${payload.expediente}) pasó a ESTADO 'V' automáticamente.`);
          this.registrarAuditoriaJson({
            planilla_id: payload.planilla_id,
            accion: 'CIERRE_LOTE',
            usuario: payload.usuario_operador,
            expediente: payload.expediente || null,
            lote_id: payload.lote_id || null,
            monto_total: payload.monto,
            detalles: `Lote SEQ ${payload.lote_seq} cerrado automáticamente (ESTADO = 'V') al alcanzar el 100% de planillas requeridas.`
          }).catch(() => {});
        }
        
        this.registrarAuditoriaJson({
          planilla_id: payload.planilla_id,
          accion: 'CONCILIACION',
          usuario: payload.usuario_operador,
          expediente: payload.expediente || null,
          lote_id: payload.lote_id || null,
          monto_total: payload.monto,
          detalles: `Forma: ${payload.forma} - Partidas: ${payload.asignaciones.length}${loteCerrado ? ' - [LOTE CERRADO AUTOMÁTICAMENTE]' : ''}`
        }).catch(() => {});
        
        return {
          status: 200,
          message: loteCerrado 
            ? 'Conciliación ejecutada exitosamente. ¡El lote ha alcanzado el 100% y fue cerrado (ESTADO = V)!' 
            : 'Conciliación ejecutada exitosamente',
          data: {
            planilla: payload.planilla_id,
            plan_seq_asignado: planSeq,
            partidas_asignadas: payload.asignaciones.length,
            lote_cerrado: loteCerrado
          }
        };
      } catch (error: any) {
        if (connection) {
          try {
            await connection.rollback();
          } catch (rollbackErr) {
            // Ignorar
          }
          try {
            await connection.close();
          } catch (closeErr) {
            // Ignorar
          }
          connection = null;
        }

        const isNetworkErr = error.message && (
          error.message.includes('NJS-500') ||
          error.message.includes('NJS-501') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('closed or broken')
        );

        if (isNetworkErr && attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 150 * attempt));
          continue;
        }

        console.error('[PLANILLAS] Error en conciliarPlanilla:', error?.message || error, 'Payload:', JSON.stringify(payload));
        throw new Error(`Error en conciliación atómica: ${error.message}`);
      } finally {
        if (connection) {
          try {
            await connection.close();
          } catch (closeErr) {
            // Ignorar
          }
        }
      }
    }
  }

  // Conciliación Masiva de Lote en una sola conexión reutilizada
  async conciliarLote(payloads: ConciliarPayload[]): Promise<any> {
    const t0 = Date.now();
    if (!payloads || payloads.length === 0) {
      return { total: 0, exitosas: 0, fallidas: 0, resultados: [] };
    }

    const connection = await this.db.getConnection();
    const execOptions: oracledb.ExecuteOptions = {
      autoCommit: false,
      outFormat: oracledb.OUT_FORMAT_OBJECT
    };

    const resultados: any[] = [];
    let exitosas = 0;
    let fallidas = 0;

    try {
      const validFormas = await this.getValidFormas(connection);

      for (const payload of payloads) {
        const tPlanilla = Date.now();
        try {
          if (validFormas.size > 0 && !validFormas.has(String(payload.forma))) {
            throw new Error(`Forma ${payload.forma} no registrada en SIGECOF`);
          }

          const fechaLimpia = payload.fecha_recaudacion.split('T')[0];
          const anho = parseInt(fechaLimpia.split('-')[0], 10);
          const periodo = parseInt(fechaLimpia.replace(/-/g, ''), 10);

          const resultIdent = await this.executeWithTimeout(
            connection,
            `SELECT IDENT_CNTB, AGENCIA_CODIGO 
             FROM ORG_LIQ.TXT_SENIAT 
             WHERE PLANILLA = :planilla 
               AND FORMA_CODIGO = :forma
               AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
               AND INFN_CODIGO = :banco
               AND (:agencia IS NULL OR AGENCIA_CODIGO = :agencia)
               AND ROWNUM = 1`,
            {
              planilla: String(payload.planilla_id),
              forma: String(payload.forma),
              fecha: fechaLimpia,
              banco: String(payload.banco),
              agencia: payload.agencia ? String(payload.agencia).trim() : null
            },
            execOptions,
            5000
          );

          if (!resultIdent.rows || (resultIdent.rows as any[]).length === 0) {
            throw new Error(`No existe en TXT_SENIAT`);
          }
          const rowIdent: any = (resultIdent.rows as any[])[0];
          const identCntb = rowIdent.IDENT_CNTB || rowIdent[0] || 'V000000000';

          const resultSeq = await this.executeWithTimeout(
            connection,
            `SELECT NVL(MAX(PLAN_SEQ), 0) + 1 AS NEXT_SEQ 
             FROM ORG_LIQ.PLANILLA 
             WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
            { anho, loteSeq: payload.lote_seq },
            execOptions,
            5000
          );
          const planSeq = (resultSeq.rows as any[])[0]?.NEXT_SEQ || 1;

          await this.executeWithTimeout(
            connection,
            `INSERT INTO ORG_LIQ.PLANILLA 
             (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, ORGA_ID, FECHA_REGISTRO, IDENT_CNTB, 
              MONTO, MONTO_EFECTIVO, PLANILLA_MANUAL, FECHA_RECAUDACION, INFN_CODIGO, 
              EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, PERIODO) 
             VALUES 
             (:anho, :loteId, :planilla, :forma, '00', SYSDATE, :ident, 
              :monto, :monto, 0, TO_DATE(:fecha, 'YYYY-MM-DD'), :banco, 
              :expediente, :loteSeq, :planSeq, :periodo)`,
            {
              anho,
              loteId: payload.lote_id,
              planilla: String(payload.planilla_id),
              forma: String(payload.forma),
              ident: identCntb,
              monto: payload.monto,
              fecha: fechaLimpia,
              banco: String(payload.banco),
              expediente: payload.expediente,
              loteSeq: payload.lote_seq,
              planSeq,
              periodo
            },
            execOptions,
            8000
          );

          let detpSeq = 1;
          for (const item of payload.asignaciones) {
            await this.executeWithTimeout(
              connection,
              `INSERT INTO ORG_LIQ.DET_PLANILLA 
               (ANHO, LOTE_ID, PLANILLA_ID, FORMA_CODIGO, PLUC_ID, DET_PLN_ID, 
                MONTO, MONTO_EFECTIVO, EXPEDIENTE, LOTE_SEQ, PLAN_SEQ, DETP_SEQ) 
               VALUES 
               (:anho, :loteId, :planilla, :forma, :partida, :detPlnId, 
                :monto, :monto, :expediente, :loteSeq, :planSeq, :detpSeq)`,
              {
                anho,
                loteId: payload.lote_id,
                planilla: String(payload.planilla_id),
                forma: String(payload.forma),
                partida: String(item.partida),
                detPlnId: detpSeq,
                monto: item.monto,
                expediente: payload.expediente,
                loteSeq: payload.lote_seq,
                planSeq,
                detpSeq
              },
              execOptions,
              5000
            );
            detpSeq++;
          }

          await this.executeWithTimeout(
            connection,
            `UPDATE ORG_LIQ.TXT_SENIAT 
             SET ESTADO = 1, ANHO = :anho, LOTE_SEQ = :loteSeq, PLAN_SEQ = :planSeq 
             WHERE PLANILLA = :planilla 
               AND FORMA_CODIGO = :forma
               AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
               AND INFN_CODIGO = :banco
               AND (:agencia IS NULL OR AGENCIA_CODIGO = :agencia)`,
            {
              anho,
              loteSeq: payload.lote_seq,
              planSeq,
              planilla: String(payload.planilla_id),
              forma: String(payload.forma),
              fecha: fechaLimpia,
              banco: String(payload.banco),
              agencia: payload.agencia ? String(payload.agencia).trim() : null
            },
            execOptions,
            5000
          );

          await connection.commit();
          exitosas++;
          resultados.push({
            planilla_id: payload.planilla_id,
            status: 'success',
            plan_seq: planSeq,
            tiempo_ms: Date.now() - tPlanilla
          });
        } catch (planErr: any) {
          await connection.rollback();
          fallidas++;
          resultados.push({
            planilla_id: payload.planilla_id,
            status: 'error',
            error: planErr.message,
            tiempo_ms: Date.now() - tPlanilla
          });
        }
      }

      // Evaluar cierre de lotes afectados que alcanzaron el 100%
      const lotesCerrados: any[] = [];
      if (exitosas > 0) {
        const lotesMap = new Map<string, { loteSeq: number; anho: number; loteId: number; expediente: number }>();
        for (const p of payloads) {
          const anhoLote = parseInt(p.fecha_recaudacion.split('T')[0].split('-')[0], 10);
          const key = `${p.lote_seq}_${anhoLote}`;
          if (!lotesMap.has(key)) {
            lotesMap.set(key, {
              loteSeq: Number(p.lote_seq),
              anho: anhoLote,
              loteId: Number(p.lote_id),
              expediente: Number(p.expediente)
            });
          }
        }

        for (const [, item] of lotesMap) {
          try {
            const checkLote = await this.executeWithTimeout(
              connection,
              `SELECT TOTAL_PLN, ESTADO FROM ORG_LIQ.LOTE WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
              { anho: item.anho, loteSeq: item.loteSeq },
              execOptions,
              5000
            );
            const loteRow = (checkLote.rows as any[])?.[0];
            const estadoActual = loteRow?.ESTADO ?? loteRow?.[1];
            const totalPln = Number(loteRow?.TOTAL_PLN ?? loteRow?.[0] ?? 0);

            if (estadoActual === 'P') {
              const countRes = await this.executeWithTimeout(
                connection,
                `SELECT COUNT(*) AS CANT FROM ORG_LIQ.PLANILLA WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
                { anho: item.anho, loteSeq: item.loteSeq },
                execOptions,
                5000
              );
              const cantConciliadas = Number((countRes.rows as any[])?.[0]?.CANT ?? (countRes.rows as any[])?.[0]?.[0] ?? 0);

              if (cantConciliadas >= totalPln && totalPln > 0) {
                await this.executeWithTimeout(
                  connection,
                  `UPDATE ORG_LIQ.LOTE SET ESTADO = 'V' WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq AND ESTADO = 'P'`,
                  { anho: item.anho, loteSeq: item.loteSeq },
                  execOptions,
                  5000
                );
                await connection.commit();
                lotesCerrados.push({ lote_seq: item.loteSeq, lote_id: item.loteId, expediente: item.expediente });
                console.log(`[CONCILIAR_LOTE] Lote SEQ ${item.loteSeq} cerrado a ESTADO 'V' (${cantConciliadas}/${totalPln} planillas).`);
              }
            }
          } catch (loteCloseErr: any) {
            console.warn(`[CONCILIAR_LOTE] Error evaluando cierre de lote SEQ ${item.loteSeq}:`, loteCloseErr.message);
          }
        }
      }

      return {
        total: payloads.length,
        exitosas,
        fallidas,
        lotes_cerrados: lotesCerrados,
        tiempo_total_ms: Date.now() - t0,
        resultados
      };
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  }

  async revertirPlanilla(payload: RevertirPayload) {
    let connection;
    try {
      connection = await this.db.getConnection();
      
      const execOptions = { autoCommit: false };

      // 0. Obtener data previa para auditoría e integridad de lote
      const currentData = await connection.execute(
        `SELECT EXPEDIENTE, LOTE_ID, LOTE_SEQ, ANHO, MONTO FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = :planilla`,
        { planilla: payload.planilla_id },
        execOptions
      );
      const planillaData = currentData.rows[0] || {};

      // 1. Insert Audit Trail (JSON Local)
      await this.registrarAuditoriaJson({
        planilla_id: payload.planilla_id,
        accion: 'REVERSION',
        usuario: payload.usuario_operador,
        expediente: planillaData.EXPEDIENTE || null,
        lote_id: planillaData.LOTE_ID || null,
        monto_total: planillaData.MONTO || null,
        detalles: 'Reversión desde Orquestador UI'
      });

      // 2. Borrar en DET_PLANILLA (discriminando por forma si se provee)
      await connection.execute(
        `DELETE FROM ORG_LIQ.DET_PLANILLA 
         WHERE PLANILLA_ID = :planilla 
           AND (:forma IS NULL OR FORMA_CODIGO = :forma)`,
        { planilla: payload.planilla_id, forma: payload.forma || null },
        execOptions
      );

      // 3. Borrar en PLANILLA (Cabecera)
      await connection.execute(
        `DELETE FROM ORG_LIQ.PLANILLA 
         WHERE PLANILLA_ID = :planilla 
           AND (:forma IS NULL OR FORMA_CODIGO = :forma)`,
        { planilla: payload.planilla_id, forma: payload.forma || null },
        execOptions
      );

      // 4. Desvincular de TXT_SENIAT
      const updateResult = await connection.execute(
        `UPDATE ORG_LIQ.TXT_SENIAT 
         SET ESTADO = NULL, 
             ANHO = NULL, 
             LOTE_SEQ = NULL, 
             PLAN_SEQ = NULL 
         WHERE PLANILLA = :planilla 
           AND (:forma IS NULL OR FORMA_CODIGO = :forma)
           AND (:agencia IS NULL OR AGENCIA_CODIGO = :agencia)
           AND INFN_CODIGO = :banco 
           AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')`,
        {
          planilla: payload.planilla_id,
          forma: payload.forma || null,
          agencia: payload.agencia || null,
          banco: payload.banco,
          fecha: payload.fecha_recaudacion
        },
        execOptions
      );

      if (updateResult.rowsAffected === 0) {
        throw new Error('No se encontró el registro original en TXT_SENIAT para revertir. Revise los parámetros de Banco y Fecha.');
      }

      // 5. Integridad de Lote: Si el lote estaba en 'V' (cerrado) y ahora faltan planillas, reabrir a 'P'
      const loteSeqRev = planillaData.LOTE_SEQ || planillaData[2];
      const anhoRev = planillaData.ANHO || planillaData[3];
      if (loteSeqRev && anhoRev) {
        try {
          const checkLote = await connection.execute(
            `SELECT TOTAL_PLN, ESTADO FROM ORG_LIQ.LOTE WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
            { anho: anhoRev, loteSeq: loteSeqRev },
            execOptions
          );
          const loteRow = (checkLote.rows as any[])?.[0];
          const estadoActual = loteRow?.ESTADO ?? loteRow?.[1];
          const totalPln = Number(loteRow?.TOTAL_PLN ?? loteRow?.[0] ?? 0);

          if (estadoActual === 'V') {
            const countRes = await connection.execute(
              `SELECT COUNT(*) AS CANT FROM ORG_LIQ.PLANILLA WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
              { anho: anhoRev, loteSeq: loteSeqRev },
              execOptions
            );
            const conciliadas = Number((countRes.rows as any[])?.[0]?.CANT ?? (countRes.rows as any[])?.[0]?.[0] ?? 0);
            if (conciliadas < totalPln) {
              await connection.execute(
                `UPDATE ORG_LIQ.LOTE SET ESTADO = 'P' WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq AND ESTADO = 'V'`,
                { anho: anhoRev, loteSeq: loteSeqRev },
                execOptions
              );
              console.log(`[LOTE REABIERTO] Lote SEQ ${loteSeqRev} volvió a ESTADO 'P' tras reversión de planilla.`);
            }
          }
        } catch (reopenErr: any) {
          console.warn(`[REVERSION] Error verificando reapertura de lote ${loteSeqRev}:`, reopenErr.message);
        }
      }

      // 6. Confirmar Transacción
      await connection.commit();

      return {
        status: 200,
        message: 'Planilla revertida y desvinculada exitosamente',
        data: {
          planilla: payload.planilla_id
        }
      };
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (closeError) {
          console.error('Error cerrando la conexión al revertir planilla:', closeError);
        }
      }
    }
  }

  // Método público para verificar y cerrar un lote que ya alcanzó el 100% de planillas
  async verificarYCerrarLote(loteSeq: number, anho: number, usuario: string = 'BOT_ORQUESTADOR') {
    let connection;
    try {
      connection = await this.db.getConnection();
      const execOptions: oracledb.ExecuteOptions = {
        autoCommit: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };

      const loteRes = await connection.execute(
        `SELECT LOTE_ID, LOTE_SEQ, TOTAL_PLN, ESTADO, EXPEDIENTE, INFN_CODIGO, AGENCIA_CODIGO 
         FROM ORG_LIQ.LOTE 
         WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
        { anho, loteSeq },
        execOptions
      );

      const lote = (loteRes.rows as any[])?.[0];
      if (!lote) {
        throw new Error(`Lote SEQ ${loteSeq} para el año ${anho} no encontrado`);
      }

      const countRes = await connection.execute(
        `SELECT COUNT(*) AS CANT FROM ORG_LIQ.PLANILLA WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
        { anho, loteSeq },
        execOptions
      );
      const conciliadas = Number((countRes.rows as any[])?.[0]?.CANT || 0);
      const totalPln = Number(lote.TOTAL_PLN || 0);

      const puedeCerrar = (conciliadas >= totalPln && totalPln > 0);

      if (puedeCerrar && lote.ESTADO === 'P') {
        await connection.execute(
          `UPDATE ORG_LIQ.LOTE SET ESTADO = 'V' WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq AND ESTADO = 'P'`,
          { anho, loteSeq },
          execOptions
        );

        this.registrarAuditoriaJson({
          planilla_id: 'CIERRE_LOTE',
          accion: 'CIERRE_LOTE',
          usuario,
          expediente: lote.EXPEDIENTE,
          lote_id: lote.LOTE_ID,
          monto_total: 0,
          detalles: `Lote SEQ ${loteSeq} verificado y cerrado exitosamente (ESTADO 'P' -> 'V'). Total: ${totalPln}, Conciliadas: ${conciliadas}`
        }).catch(() => {});

        return {
          success: true,
          cerrado: true,
          mensaje: `Lote SEQ ${loteSeq} (Lote ${lote.LOTE_ID}) cerrado exitosamente a ESTADO 'V'.`,
          lote_seq: loteSeq,
          lote_id: lote.LOTE_ID,
          expediente: lote.EXPEDIENTE,
          anho,
          total_pln: totalPln,
          conciliadas,
          estado_anterior: 'P',
          estado_nuevo: 'V'
        };
      }

      return {
        success: true,
        cerrado: lote.ESTADO === 'V',
        mensaje: lote.ESTADO === 'V' 
          ? `El lote SEQ ${loteSeq} ya se encontraba cerrado (ESTADO = 'V').`
          : `El lote SEQ ${loteSeq} aún tiene planillas faltantes (${totalPln - conciliadas} faltantes).`,
        lote_seq: loteSeq,
        lote_id: lote.LOTE_ID,
        expediente: lote.EXPEDIENTE,
        anho,
        total_pln: totalPln,
        conciliadas,
        estado: lote.ESTADO
      };
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  }

  async detectarAtributosNull(
    fecha: string,
    banco: string,
    expediente?: string,
    lote_id?: string | number,
  ): Promise<DeteccionAtributosNullResponse> {
    if (!fecha || !banco) {
      throw new BadRequestException('Fecha y banco son requeridos');
    }

    let query = `
      SELECT 
        T.PLANILLA AS PLANILLA_ID,
        T.FORMA_CODIGO AS FORMA,
        NVL(T.MONTO_EFECTIVO, 0) + NVL(T.MONTO_OTROS_PAGOS, 0) AS MONTO,
        T.INFN_CODIGO AS BANCO,
        T.AGENCIA_CODIGO AS AGENCIA,
        TO_CHAR(T.FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION,
        NVL(T.IDENT_CNTB, 'S/R') AS RIF,
        L.EXPEDIENTE,
        L.LOTE_ID,
        L.LOTE_SEQ,
        CASE 
          WHEN T.FORMA_CODIGO = '99044' THEN 'Forma 99044 (ISLR Aduanas / Retención especial)'
          WHEN T.IDENT_CNTB IS NULL THEN 'RIF / Contribuyente NULL'
          WHEN T.LOTE_SEQ IS NULL THEN 'LOTE_SEQ no asignado (NULL)'
          WHEN T.PLAN_SEQ IS NULL THEN 'PLAN_SEQ no asignado (NULL)'
          WHEN T.ANHO IS NULL THEN 'Año Fiscal no asignado (NULL)'
          ELSE 'Atributo no vinculado'
        END AS MOTIVO_ALERTA
      FROM ORG_LIQ.TXT_SENIAT T
      LEFT JOIN ORG_LIQ.LOTE L 
        ON T.FECHA_RECAUDACION = L.FECHA_RECAUDACION 
       AND T.INFN_CODIGO = L.INFN_CODIGO 
       AND T.LOTE_SEQ = L.LOTE_SEQ
      WHERE T.FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
        AND T.INFN_CODIGO = :banco
        AND (T.ESTADO IS NULL OR T.ESTADO = 0)
        AND (
          T.FORMA_CODIGO = '99044' 
          OR T.IDENT_CNTB IS NULL 
          OR (T.LOTE_SEQ IS NULL AND T.FORMA_CODIGO = '99044')
          OR (T.LOTE_SEQ IS NOT NULL AND (T.PLAN_SEQ IS NULL OR T.ANHO IS NULL))
        )
    `;

    const binds: any = { fecha, banco };

    if (expediente && String(expediente).trim() !== '') {
      query += ` AND (
        L.EXPEDIENTE = :expediente 
        OR (
          L.EXPEDIENTE IS NULL 
          AND T.AGENCIA_CODIGO IN (
            SELECT DISTINCT AGENCIA_CODIGO 
            FROM ORG_LIQ.LOTE 
            WHERE EXPEDIENTE = :expediente 
              AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') 
              AND INFN_CODIGO = :banco
          )
        )
      )`;
      binds.expediente = Number(expediente);
    }

    if (lote_id && String(lote_id).trim() !== '' && lote_id !== expediente) {
      query += ` AND (
        L.LOTE_ID = :lote_id 
        OR (
          L.LOTE_ID IS NULL 
          AND T.AGENCIA_CODIGO IN (
            SELECT DISTINCT AGENCIA_CODIGO 
            FROM ORG_LIQ.LOTE 
            WHERE LOTE_ID = :lote_id 
              AND FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') 
              AND INFN_CODIGO = :banco
          )
        )
      )`;
      binds.lote_id = Number(lote_id);
    }

    query += ` AND ROWNUM <= 1000 ORDER BY T.FORMA_CODIGO DESC, T.PLANILLA ASC`;

    const rawRows = await this.db.executeQuery<any>(query, binds);

    const seen = new Set<string>();
    const planillas: PlanillaAtributoNullItem[] = [];
    let montoTotal = 0;
    const formasSet = new Set<string>();

    for (const r of rawRows) {
      const pid = String(r.PLANILLA_ID);
      if (seen.has(pid)) continue;
      seen.add(pid);

      const monto = Number(r.MONTO || 0);
      montoTotal += monto;
      formasSet.add(String(r.FORMA));

      planillas.push({
        planilla_id: pid,
        forma: String(r.FORMA),
        monto: Number(monto.toFixed(2)),
        banco: String(r.BANCO),
        agencia: String(r.AGENCIA || ''),
        fecha_recaudacion: String(r.FECHA_RECAUDACION),
        rif: String(r.RIF || 'S/R'),
        expediente: r.EXPEDIENTE ? Number(r.EXPEDIENTE) : undefined,
        lote_id: r.LOTE_ID ? Number(r.LOTE_ID) : undefined,
        lote_seq: r.LOTE_SEQ ? Number(r.LOTE_SEQ) : undefined,
        motivo_alerta: String(r.MOTIVO_ALERTA),
      });
    }

    return {
      total: planillas.length,
      monto_total: Number(montoTotal.toFixed(2)),
      formas_detectadas: Array.from(formasSet),
      planillas,
    };
  }

  async conciliarPlanillasEspeciales(payload: ConciliarEspecialesDto): Promise<any> {
    const { usuario_email, password_autorizacion, planillas, motivo } = payload;

    if (!usuario_email || !password_autorizacion) {
      throw new BadRequestException('El correo del usuario y la contraseña de autorización son requeridos.');
    }

    if (!planillas || planillas.length === 0) {
      throw new BadRequestException('No se enviaron planillas para conciliar.');
    }

    // 1. Validar contraseña contra PostgreSQL
    const userRes = await this.pg.query<{ id: number; email: string; nombre: string; apellido: string; password_hash: string; rol: string; estado: string }>(
      `SELECT id, email, nombre, apellido, password_hash, rol, estado 
       FROM motor_app.usuarios 
       WHERE LOWER(email) = LOWER($1)`,
      [usuario_email.trim()]
    );

    if (!userRes.rows || userRes.rows.length === 0) {
      throw new UnauthorizedException('Usuario no encontrado para autorizar la operación.');
    }

    const usuario = userRes.rows[0];
    if (usuario.estado !== 'ACTIVO') {
      throw new UnauthorizedException('El usuario se encuentra inactivo.');
    }

    const isMatch = await bcrypt.compare(password_autorizacion, usuario.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Contraseña de autorización incorrecta.');
    }

    // 2. Ejecutar conciliación para cada planilla
    let exitosas = 0;
    let fallidas = 0;
    let montoConciliado = 0;
    const detallesResultados: any[] = [];
    const lotesCerradosSet = new Set<string>();

    for (const p of planillas) {
      try {
        let expediente = p.expediente;
        let lote_id = p.lote_id;
        let lote_seq = p.lote_seq;

        // Si faltan datos de lote, buscar lote activo en la misma agencia
        if (!lote_seq) {
          const loteFind = await this.db.executeQuery<any>(
            `SELECT LOTE_ID, LOTE_SEQ, EXPEDIENTE, TOTAL_PLN, ANHO
             FROM ORG_LIQ.LOTE
             WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
               AND INFN_CODIGO = :banco
               AND AGENCIA_CODIGO = :agencia
               AND (ESTADO = 'P' OR ROWNUM = 1)
               AND ROWNUM = 1`,
            {
              fecha: p.fecha_recaudacion.split('T')[0],
              banco: p.banco,
              agencia: p.agencia,
            }
          );
          if (loteFind && loteFind.length > 0) {
            lote_id = Number(loteFind[0].LOTE_ID);
            lote_seq = Number(loteFind[0].LOTE_SEQ);
            expediente = Number(loteFind[0].EXPEDIENTE);
          }
        }

        // Asignaciones presupuestarias: si no vienen asignadas, para la 99044 se aplica la partida estándar
        let asignaciones = p.asignaciones || [];
        if (asignaciones.length === 0) {
          if (p.forma === '99044') {
            asignaciones = [{ partida: '301010111', monto: Number(p.monto) }];
          } else {
            asignaciones = [{ partida: '301010200', monto: Number(p.monto) }];
          }
        }

        const conciliarRes = await this.conciliarPlanilla({
          usuario_operador: usuario.email,
          expediente: Number(expediente) || 0,
          lote_id: Number(lote_id) || 0,
          lote_seq: Number(lote_seq) || 0,
          planilla_id: p.planilla_id,
          forma: p.forma,
          monto: Number(p.monto),
          banco: p.banco,
          agencia: p.agencia,
          fecha_recaudacion: p.fecha_recaudacion.split('T')[0],
          asignaciones,
        });

        exitosas++;
        montoConciliado += Number(p.monto);
        detallesResultados.push({
          planilla_id: p.planilla_id,
          success: true,
          lote_cerrado: conciliarRes?.data?.lote_cerrado || false,
        });

        if (conciliarRes?.data?.lote_cerrado && lote_id) {
          lotesCerradosSet.add(`Lote ${lote_id} (SEQ: ${lote_seq})`);
        }
      } catch (err: any) {
        fallidas++;
        detallesResultados.push({
          planilla_id: p.planilla_id,
          success: false,
          error: err.message,
        });
      }
    }

    // 3. Registrar en auditoría
    await this.registrarAuditoriaJson({
      accion: 'CONCILIACION_ESPECIAL_99044',
      usuario: usuario.email,
      usuario_nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
      total_solicitadas: planillas.length,
      exitosas,
      fallidas,
      monto_total: Number(montoConciliado.toFixed(2)),
      motivo: motivo || 'Conciliación autorizada de planillas con atributos NULL / Forma 99044',
      lotes_cerrados: Array.from(lotesCerradosSet),
      detalles: detallesResultados,
    });

      return {
        success: true,
        mensaje: `Conciliación especial completada: ${exitosas} de ${planillas.length} planillas procesadas exitosamente.`,
        total_procesadas: planillas.length,
        exitosas,
        fallidas,
        monto_total_conciliado: Number(montoConciliado.toFixed(2)),
        lotes_cerrados: Array.from(lotesCerradosSet),
        detalles: detallesResultados,
      };
    }

    async detectarDuplicadosTxt(fecha: string, banco?: string): Promise<DuplicadosTxtResponse> {
      if (!fecha) {
        throw new BadRequestException('El parámetro fecha (YYYY-MM-DD) es requerido');
      }

      let dupsSql = `
        SELECT 
          T.PLANILLA,
          T.FORMA_CODIGO,
          T.MONTO_EFECTIVO,
          T.AGENCIA_CODIGO,
          COUNT(*) AS REPETICIONES
        FROM ORG_LIQ.TXT_SENIAT T
        WHERE T.FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
          AND (T.ESTADO IS NULL OR T.ESTADO = 0)
      `;
      const binds: any = { fecha };

      if (banco && banco !== 'TODOS' && String(banco).trim() !== '') {
        dupsSql += ` AND T.INFN_CODIGO = :banco`;
        binds.banco = String(banco).trim();
      }

      dupsSql += ` GROUP BY T.PLANILLA, T.FORMA_CODIGO, T.MONTO_EFECTIVO, T.AGENCIA_CODIGO HAVING COUNT(*) > 1 ORDER BY T.MONTO_EFECTIVO DESC`;

      const rawDups = await this.db.executeQuery<any>(dupsSql, binds);

      let totalDuplicadas = 0;
      let montoTotalDuplicadas = 0;

      const duplicados: DuplicadoTxtItem[] = (rawDups || []).map((d: any) => {
        const rep = Number(d.REPETICIONES || 1);
        const monto = Number(d.MONTO_EFECTIVO || 0);
        const sobrantes = rep - 1;
        totalDuplicadas += sobrantes;
        montoTotalDuplicadas += monto * sobrantes;
        return {
          planilla: String(d.PLANILLA),
          forma_codigo: String(d.FORMA_CODIGO),
          monto,
          agencia: String(d.AGENCIA_CODIGO || ''),
          repeticiones: rep,
          monto_excedente: Number((monto * sobrantes).toFixed(2)),
        };
      });

      return {
        total_duplicadas: totalDuplicadas,
        monto_total_duplicadas: Number(montoTotalDuplicadas.toFixed(2)),
        planillas_unicas_afectadas: duplicados.length,
        duplicados,
      };
    }

    /**
     * Elimina físicamente (o marca) las filas duplicadas excedentes en TXT_SENIAT
     * (conservando 1 copia única para conciliación) y ajusta el TOTAL_PLN en ORG_LIQ.LOTE.
     */
    async depurarDuplicadosTxt(payload: DepurarDuplicadosTxtDto): Promise<{
      success: boolean;
      mensaje: string;
      total_eliminadas: number;
      monto_total_depurado: number;
      lotes_ajustados: LoteAjustadoDuplicadoInfo[];
      detalles: any[];
    }> {
      const { fecha, banco, usuario_email, password_autorizacion, motivo, planillas_ids, expediente } = payload;

      if (!fecha || !banco) {
        throw new BadRequestException('Fecha y banco son obligatorios.');
      }
      if (!usuario_email || !password_autorizacion) {
        throw new BadRequestException('El correo del usuario y la contraseña de autorización son requeridos.');
      }

      // 1. Validar autorización de seguridad contra PostgreSQL
      const userRes = await this.pg.query<{ id: number; email: string; nombre: string; apellido: string; password_hash: string; rol: string; estado: string }>(
        `SELECT id, email, nombre, apellido, password_hash, rol, estado 
         FROM motor_app.usuarios 
         WHERE LOWER(email) = LOWER($1) AND estado = 'ACTIVO'`,
        [usuario_email.trim()]
      );

      if (userRes.rowCount === 0) {
        throw new UnauthorizedException('Usuario autorizador no encontrado o inactivo.');
      }

      const usuario = userRes.rows[0];
      const passwordMatch = await bcrypt.compare(password_autorizacion, usuario.password_hash);
      if (!passwordMatch) {
        throw new UnauthorizedException('Contraseña de autorización incorrecta. Operación cancelada.');
      }

      // 2. Conectar a Oracle y obtener filas duplicadas con ROWID y RN > 1
      const connection = await this.db.getConnection();
      const lotesAfectadosMap = new Map<string, {
        anho: number;
        lote_seq: number;
        lote_id: number;
        expediente?: number;
        agencia_codigo: string;
        total_anterior: number;
        eliminadas: number;
      }>();

      let totalEliminadas = 0;
      let montoTotalDepurado = 0;
      const formasAfectadasSet = new Set<string>();
      const planillasAfectadasList: any[] = [];
      const detalles: any[] = [];

      try {
        const queryExcess = `
          SELECT 
            ROWIDTOCHAR(T.ROWID) AS RID,
            T.PLANILLA,
            T.FORMA_CODIGO,
            NVL(T.MONTO_EFECTIVO, 0) AS MONTO,
            T.AGENCIA_CODIGO,
            T.INFN_CODIGO AS BANCO,
            T.LOTE_SEQ,
            T.ANHO,
            T.IDENT_CNTB AS RIF,
            ROW_NUMBER() OVER (
              PARTITION BY T.PLANILLA, T.FORMA_CODIGO, NVL(T.MONTO_EFECTIVO, 0), T.AGENCIA_CODIGO
              ORDER BY T.ROWID ASC
            ) AS RN
          FROM ORG_LIQ.TXT_SENIAT T
          WHERE T.FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
            AND T.INFN_CODIGO = :banco
            AND (T.ESTADO IS NULL OR T.ESTADO = 0)
        `;

        const resAll = await connection.execute(queryExcess, { fecha, banco }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const rows = (resAll.rows as any[]) || [];

        // Filtrar exclusivamente los excedentes (RN > 1), conservando la primera copia (RN = 1)
        let excessRows = rows.filter((r) => Number(r.RN) > 1);

        if (planillas_ids && planillas_ids.length > 0) {
          const idSet = new Set(planillas_ids.map((id) => String(id).trim()));
          excessRows = excessRows.filter((r) => idSet.has(String(r.PLANILLA).trim()));
        }

        if (excessRows.length === 0) {
          throw new BadRequestException('No se encontraron registros duplicados pendientes para eliminar.');
        }

        for (const row of excessRows) {
          const rid = String(row.RID);
          const pid = String(row.PLANILLA);
          const forma = String(row.FORMA_CODIGO);
          const monto = Number(row.MONTO || 0);
          const agencia = String(row.AGENCIA_CODIGO || '');
          const anhoVal = row.ANHO || new Date(fecha).getFullYear();

          montoTotalDepurado += monto;
          formasAfectadasSet.add(forma);

          // Identificar Lote correspondiente
          let loteInfo: any = null;
          if (row.LOTE_SEQ) {
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

          if (!loteInfo && agencia) {
            let loteQuery = `
              SELECT LOTE_SEQ, LOTE_ID, ANHO, TOTAL_PLN, EXPEDIENTE, AGENCIA_CODIGO
              FROM ORG_LIQ.LOTE
              WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
                AND INFN_CODIGO = :banco
                AND AGENCIA_CODIGO = :agencia
                AND ANHO = EXTRACT(YEAR FROM TO_DATE(:fecha, 'YYYY-MM-DD'))
            `;
            const loteBinds: any = { fecha, banco, agencia };
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
              existing.eliminadas += 1;
            } else {
              lotesAfectadosMap.set(loteKey, {
                anho: Number(loteInfo.ANHO),
                lote_seq: Number(loteInfo.LOTE_SEQ),
                lote_id: Number(loteInfo.LOTE_ID),
                expediente: loteInfo.EXPEDIENTE ? Number(loteInfo.EXPEDIENTE) : undefined,
                agencia_codigo: String(loteInfo.AGENCIA_CODIGO || agencia),
                total_anterior: Number(loteInfo.TOTAL_PLN || 0),
                eliminadas: 1,
              });
            }
          }

          // Eliminar quirúrgicamente la fila duplicada por ROWID
          try {
            const delRes = await connection.execute(
              `DELETE FROM ORG_LIQ.TXT_SENIAT WHERE ROWID = CHARTOROWID(:rid)`,
              { rid }
            );
            totalEliminadas += (delRes.rowsAffected || 1);
          } catch (delErr: any) {
            const updRes = await connection.execute(
              `UPDATE ORG_LIQ.TXT_SENIAT 
               SET ESTADO = -1, ANHO = NULL, LOTE_SEQ = NULL, PLAN_SEQ = NULL 
               WHERE ROWID = CHARTOROWID(:rid)`,
              { rid }
            );
            totalEliminadas += (updRes.rowsAffected || 1);
          }

          planillasAfectadasList.push({
            planilla: pid,
            forma,
            monto,
            agencia,
            lote_id: loteInfo ? Number(loteInfo.LOTE_ID) : undefined,
            lote_seq: loteInfo ? Number(loteInfo.LOTE_SEQ) : undefined,
          });

          detalles.push({
            rid,
            planilla: pid,
            forma,
            monto,
            eliminada: true,
          });
        }

        // 3. Ajustar TOTAL_PLN de los lotes afectados en Oracle
        const lotesAjustados: LoteAjustadoDuplicadoInfo[] = [];

        for (const [, lote] of lotesAfectadosMap) {
          await connection.execute(
            `UPDATE ORG_LIQ.LOTE
             SET TOTAL_PLN = GREATEST(0, TOTAL_PLN - :count)
             WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
            {
              count: lote.eliminadas,
              anho: lote.anho,
              loteSeq: lote.lote_seq,
            }
          );

          const checkLote = await connection.execute(
            `SELECT TOTAL_PLN FROM ORG_LIQ.LOTE WHERE ANHO = :anho AND LOTE_SEQ = :loteSeq`,
            { anho: lote.anho, loteSeq: lote.lote_seq },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          const nuevoTotal = (checkLote.rows as any[])?.[0]?.TOTAL_PLN ?? Math.max(0, lote.total_anterior - lote.eliminadas);

          lotesAjustados.push({
            anho: lote.anho,
            lote_seq: lote.lote_seq,
            lote_id: lote.lote_id,
            expediente: lote.expediente,
            agencia_codigo: lote.agencia_codigo,
            total_anterior: lote.total_anterior,
            eliminadas: lote.eliminadas,
            total_nuevo: Number(nuevoTotal),
          });
        }

        // Confirmar transacción atómica en Oracle
        await connection.commit();

        // 4. Registrar en PostgreSQL en motor_app.depuracion_audit
        try {
          await this.pg.query(
            `INSERT INTO motor_app.depuracion_audit (
              usuario_email, usuario_nombre, fecha_recaudacion, banco_codigo,
              total_registros_eliminados, monto_total_depurado, formas_afectadas,
              planillas_afectadas, motivo_autorizacion, ip_address, detalles
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              usuario.email,
              `${usuario.nombre} ${usuario.apellido}`.trim(),
              fecha,
              banco,
              totalEliminadas,
              montoTotalDepurado,
              Array.from(formasAfectadasSet).join(', '),
              JSON.stringify(planillasAfectadasList),
              motivo || 'Depuración autorizada de registros duplicados en archivo TXT transmitido por banco',
              '127.0.0.1',
              JSON.stringify({
                tipo: 'DUPLICADOS_TXT',
                lotes_ajustados: lotesAjustados,
                planillas_unicas_conservadas: excessRows.length,
              }),
            ]
          );
        } catch (auditPgErr) {
          this.logger.error('Error registrando en motor_app.depuracion_audit:', auditPgErr);
        }

        // Registrar en auditoría de eventos
        await this.registrarAuditoriaJson({
          accion: 'DEPURACION_DUPLICADOS_TXT',
          usuario: usuario.email,
          usuario_nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
          total_solicitadas: excessRows.length,
          exitosas: totalEliminadas,
          fallidas: 0,
          monto_total: Number(montoTotalDepurado.toFixed(2)),
          motivo: motivo || 'Depuración de registros duplicados en archivo TXT',
          lotes_ajustados: lotesAjustados,
          detalles,
        });

        return {
          success: true,
          mensaje: `Se depuraron exitosamente ${totalEliminadas} registros duplicados en TXT y se ajustó el contador del lote.`,
          total_eliminadas: totalEliminadas,
          monto_total_depurado: Number(montoTotalDepurado.toFixed(2)),
          lotes_ajustados: lotesAjustados,
          detalles,
        };
      } catch (err: any) {
        await connection.rollback();
        throw err;
      } finally {
        await connection.close();
      }
    }
  }

