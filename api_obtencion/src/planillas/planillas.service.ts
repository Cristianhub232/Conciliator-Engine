import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PostgresService } from '../database/postgres.service';
import { ConsultarExpedientesReasignacionDto, EjecutarReasignacionDto } from './dto/reasignacion.dto';
import { getNombreCortoBanco } from '../bancos/bancos.service';
import * as oracledb from 'oracledb';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CerrarExpedienteDto {
  expediente: number;
  anho: number;
  analista_asignado?: string;
  usuario_operador?: string;
  observacion?: string;
  fecha_recaudacion?: string;
  banco?: string;
}

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

  // Obtener analistas activos para revisión/validación en SIGECOF (Tarea 2062, Organismo 93)
  async getAnalistasRevisores() {
    const query = `
      SELECT U.USERS_ID, 
             NVL(U.USERS_NOMBRE_CORTO, '') AS NOMBRE,
             NVL(U.USERS_NOMBRE_LARGO, '') AS APELLIDO,
             TRIM(NVL(U.USERS_NOMBRE_CORTO, '') || ' ' || NVL(U.USERS_NOMBRE_LARGO, '')) AS NOMBRE_COMPLETO,
             U.USERS_STATUS AS STATUS,
             TO_CHAR(MAX(WI.WI_FECHA_CREACION), 'YYYY-MM-DD HH24:MI:SS') AS ULTIMA_ASIGNACION,
             COUNT(WI.WORKITEM) AS TOTAL_ASIGNADOS
      FROM WFE_WORKFLOW.WF_USERS U
      JOIN WFE_WORKFLOW.WF_WORK_ITEM WI ON U.USERS_ID = WI.WFUS_USERS_ID
      WHERE WI.ORGA_ID = '93'
        AND WI.WFTA_TAREA_ID = 2062
        AND U.USERS_STATUS = 'A'
      GROUP BY U.USERS_ID, U.USERS_NOMBRE_CORTO, U.USERS_NOMBRE_LARGO, U.USERS_STATUS
      ORDER BY MAX(WI.WI_FECHA_CREACION) DESC NULLS LAST, COUNT(WI.WORKITEM) DESC
    `;
    const rows = await this.db.executeQuery<any>(query);
    return {
      success: true,
      total: rows.length,
      analistas: rows.map(r => ({
        users_id: r.USERS_ID,
        nombre: r.NOMBRE,
        apellido: r.APELLIDO,
        nombre_completo: r.NOMBRE_COMPLETO || r.USERS_ID,
        status: r.STATUS,
        ultima_asignacion: r.ULTIMA_ASIGNACION,
        total_asignados: Number(r.TOTAL_ASIGNADOS || 0),
      })),
    };
  }

  // Cerrar expediente mediante actualización in-situ (WF_EXPEDIENTE a CERRADO, LOTE a V, WF_WORK_ITEM a CERRADA)
  // Principio estricto: NO se realiza inserción de nuevo registro, solo actualización del existente
  async cerrarExpedienteYReasignar(dto: CerrarExpedienteDto) {
    const { expediente, anho, analista_asignado, usuario_operador, observacion, fecha_recaudacion, banco } = dto;

    if (!expediente || !anho) {
      throw new BadRequestException('Los campos expediente y anho son obligatorios.');
    }

    const expNum = Number(expediente);
    const anhoNum = Number(anho);

    // 1. Validar que los lotes del expediente existan
    const lotesQuery = `
      SELECT LOTE_ID, LOTE_SEQ, ANHO, EXPEDIENTE, TOTAL_PLN, ESTADO, INFN_CODIGO, AGENCIA_CODIGO, 
             TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION
      FROM ORG_LIQ.LOTE
      WHERE EXPEDIENTE = :expNum AND ANHO = :anhoNum
      ORDER BY LOTE_ID ASC
    `;
    const lotes = await this.db.executeQuery<any>(lotesQuery, { expNum, anhoNum });

    if (!lotes || lotes.length === 0) {
      throw new BadRequestException(`No se encontraron lotes asociados al expediente ${expNum} para el año ${anhoNum}.`);
    }

    // 2. Validar que no existan planillas pendientes de conciliar en TXT_SENIAT para los lotes de este expediente
    const txtCheckQuery = `
      SELECT COUNT(*) AS CANT_PENDIENTES
      FROM ORG_LIQ.TXT_SENIAT T
      WHERE EXISTS (
          SELECT 1 FROM ORG_LIQ.LOTE L
          WHERE L.EXPEDIENTE = :expNum AND L.ANHO = :anhoNum
            AND L.FECHA_RECAUDACION = T.FECHA_RECAUDACION
            AND L.INFN_CODIGO = T.INFN_CODIGO
            AND L.AGENCIA_CODIGO = T.AGENCIA_CODIGO
      )
      AND (T.ESTADO IS NULL OR T.ESTADO = 0)
    `;
    const txtCheckRes = await this.db.executeQuery<any>(txtCheckQuery, { expNum, anhoNum });
    const cantPendientesTxt = Number(txtCheckRes?.[0]?.CANT_PENDIENTES || 0);
    if (cantPendientesTxt > 0) {
      throw new BadRequestException(
        `No se puede cerrar el expediente ${expNum}: Existen ${cantPendientesTxt} planilla(s) en TXT_SENIAT pendientes de conciliar (ESTADO IS NULL o 0).`
      );
    }

    // 3. Consultar historial de WF_WORK_ITEM para este expediente (usa readPool con ONT_SIR_BOT_AUDIT)
    const wiQuery = `
      SELECT WORKITEM, WFEX_EXP_ID, ANHO, ORGA_ID, WI_NOMBRE, WI_DESCRIPCION, WI_ORIGEN,
             WI_ESTADO, WFUS_USERS_ID, WFTA_TAREA_ID
      FROM WFE_WORKFLOW.WF_WORK_ITEM
      WHERE WFEX_EXP_ID = :expNum AND ANHO = :anhoNum AND ORGA_ID = '93'
      ORDER BY WORKITEM ASC
    `;
    let workItems: any[] = [];
    try {
      workItems = await this.db.executeQuery<any>(wiQuery, { expNum, anhoNum });
    } catch (wiErr: any) {
      this.logger.warn(`Aviso al consultar WF_WORK_ITEM para expediente ${expNum}: ${wiErr.message}`);
    }

    // Identificar workitem actual activo (estado PENDIENTE / ABIERTA)
    const currentActiveWi = workItems.find(w =>
      (w.WI_ESTADO === 'PENDIENTE' || w.WI_ESTADO === 'ABIERTA')
    ) || workItems[workItems.length - 1];

    const currentWiNum = currentActiveWi ? Number(currentActiveWi.WORKITEM) : null;
    const origenUsuario = usuario_operador || currentActiveWi?.WFUS_USERS_ID || 'ONT_SIR_BOT';
    const observacionFinal = observacion || `Expediente conciliado y cerrado satisfactoriamente por ${origenUsuario}`;

    // 4. Ejecutar actualización in-situ en Oracle (SIN INSERCIÓN DE NUEVO WORKITEM)
    const writeConn = await this.db.getConnection();
    let lotesCerradosCount = 0;
    let expCabeceraCerrada = false;
    let workItemCerrado = false;

    try {
      // 4.1 Cierre de lotes: Actualizar a estado 'V' todos los lotes del expediente que permanezcan en 'P'
      const updateLotesRes: any = await writeConn.execute(
        `UPDATE ORG_LIQ.LOTE
         SET ESTADO = 'V'
         WHERE EXPEDIENTE = :expNum AND ANHO = :anhoNum AND ESTADO = 'P'`,
        { expNum, anhoNum },
        { autoCommit: false }
      );
      lotesCerradosCount = updateLotesRes?.rowsAffected || 0;

      // 4.2 Cierre de cabecera en WF_EXPEDIENTE: Actualizar EXP_ESTADO = 'CERRADO'
      // Esto dispara el trigger nativo AUDITAUPDATEEXPEDIENTES hacia WF_AUDITA_EXPEDIENTES
      const updateExpRes: any = await writeConn.execute(
        `UPDATE WFE_WORKFLOW.WF_EXPEDIENTE
         SET EXP_ESTADO = 'CERRADO',
             EXP_FECHA_CIERRE = SYSDATE,
             EXP_OBSERVACION = NVL(:observacion, EXP_OBSERVACION)
         WHERE EXP_ID = :expNum AND ANHO = :anhoNum AND ORGA_ID = '93'`,
        { expNum, anhoNum, observacion: observacionFinal },
        { autoCommit: false }
      );
      expCabeceraCerrada = (updateExpRes?.rowsAffected || 0) > 0;

      // 4.3 Cierre in-situ del WorkItem activo en WF_WORK_ITEM mediante paquete Designer CG$WF_WORK_ITEM
      if (currentWiNum) {
        try {
          await writeConn.execute(
            `DECLARE
               v_rec WFE_WORKFLOW.CG$WF_WORK_ITEM.cg$row_type;
               v_ind WFE_WORKFLOW.CG$WF_WORK_ITEM.cg$ind_type;
             BEGIN
               v_rec.WORKITEM := :currentWiNum;
               v_rec.ANHO := :anhoNum;
               v_rec.ORGA_ID := '93';
               v_rec.WFEX_EXP_ID := :expNum;
               
               WFE_WORKFLOW.CG$WF_WORK_ITEM.slct(v_rec);
               
               v_rec.WI_ESTADO := 'CERRADA';
               v_ind.WI_ESTADO := TRUE;
               
               v_rec.WI_FECHA_CIERRE := SYSDATE;
               v_ind.WI_FECHA_CIERRE := TRUE;
               
               WFE_WORKFLOW.CG$WF_WORK_ITEM.upd(v_rec, v_ind);
             END;`,
            { expNum, anhoNum, currentWiNum },
            { autoCommit: false },
          );
          workItemCerrado = true;
        } catch (wiUpdateErr: any) {
          this.logger.warn(`Aviso al actualizar WF_WORK_ITEM a CERRADA con CG$WF_WORK_ITEM: ${wiUpdateErr.message}`);
        }
      }

      // 4.4 Registro explícito en WF_AUDITA_EXPEDIENTES
      try {
        await writeConn.execute(
          `INSERT INTO WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES (
             USUARIO_ORACLE, ORGANISMO_ID, USUARIO_APLICATIVO, EXPEDIENTE_ID, FECHA_HORA
           ) VALUES (
             'ONT_SIR_BOT', '093', :operador, :expedienteStr, TO_CHAR(SYSDATE, 'DD/MM/YYYY:HH24:MI:SS')
           )`,
          {
            operador: origenUsuario.substring(0, 15),
            expedienteStr: String(expNum).substring(0, 10),
          },
          { autoCommit: false }
        );
      } catch (auditErr: any) {
        this.logger.warn(`Aviso al insertar en WF_AUDITA_EXPEDIENTES: ${auditErr.message}`);
      }

      await writeConn.commit();
    } catch (dbErr: any) {
      await writeConn.rollback();
      throw new BadRequestException(`Error ejecutando el cierre de expediente en Oracle: ${dbErr.message}`);
    } finally {
      try { await writeConn.close(); } catch {}
    }

    // 5. Auditoría y Trazabilidad en PostgreSQL
    const totalPlanillas = lotes.reduce((sum, l) => sum + Number(l.TOTAL_PLN || 0), 0);
    const auditData = {
      accion: 'CIERRE_EXPEDIENTE_DIRECTO',
      modulo: 'CIERRE_EXPEDIENTE',
      expediente: expNum,
      anho: anhoNum,
      usuario_operador: origenUsuario,
      analista_referencia: analista_asignado || 'N/A',
      lotes_cerrados: lotesCerradosCount,
      total_lotes: lotes.length,
      total_planillas: totalPlanillas,
      cabecera_expediente_cerrada: expCabeceraCerrada,
      workitem_actualizado: currentWiNum,
      workitem_cerrado: workItemCerrado,
      observacion: observacionFinal,
      timestamp: new Date().toISOString(),
    };

    await this.registrarAuditoriaJson(auditData);

    return {
      success: true,
      mensaje: `Expediente #${expNum} cerrado exitosamente en Oracle SIGECOF (Cabecera: CERRADO, Lotes validados).`,
      expediente: expNum,
      anho: anhoNum,
      cabecera_cerrada: expCabeceraCerrada,
      workitem_cerrado: workItemCerrado,
      workitem_actual: currentWiNum,
      lotes_actualizados: lotesCerradosCount,
      total_lotes: lotes.length,
      total_planillas: totalPlanillas,
    };
  }

  /**
   * Consulta expedientes con planillas pendientes por conciliar para balanceo/reasignación de carga.
   * Filtra por estado de WorkItem (por defecto ABIERTA) y usuario asignado (por defecto GILLIAMS_0028).
   */
  async consultarExpedientesPendientesReasignacion(dto: ConsultarExpedientesReasignacionDto) {
    const anho = dto.anho ? Number(dto.anho) : 2024;
    const limit = dto.limit ? Math.min(Math.max(Number(dto.limit), 1), 1000) : 100;
    const usuarioOrigen = dto.usuario_origen !== undefined ? dto.usuario_origen.trim() : 'GILLIAMS_0028';
    const estadoWi = dto.estado_wi ? dto.estado_wi.trim().toUpperCase() : 'ABIERTA';
    const banco = dto.banco ? dto.banco.trim() : '';
    const search = dto.search ? dto.search.trim() : '';

    const binds: any = { anho, limit };
    let whereClauses = `WHERE W.ORGA_ID = '93' AND W.WFTA_TAREA_ID = 2061 AND W.ANHO = :anho AND W.WORKITEM = (
      SELECT MAX(W2.WORKITEM)
      FROM WFE_WORKFLOW.WF_WORK_ITEM W2
      WHERE W2.WFEX_EXP_ID = W.WFEX_EXP_ID
        AND W2.ANHO = W.ANHO
        AND W2.ORGA_ID = W.ORGA_ID
    )`;

    if (usuarioOrigen && usuarioOrigen !== 'TODOS') {
      whereClauses += ` AND UPPER(W.WFUS_USERS_ID) = UPPER(:usuarioOrigen)`;
      binds.usuarioOrigen = usuarioOrigen;
    }

    if (estadoWi && estadoWi !== 'TODOS') {
      whereClauses += ` AND UPPER(W.WI_ESTADO) = UPPER(:estadoWi)`;
      binds.estadoWi = estadoWi;
    } else {
      whereClauses += ` AND W.WI_ESTADO IN ('ABIERTA', 'PENDIENTE')`;
    }

    if (banco && banco !== 'TODOS') {
      whereClauses += ` AND L.INFN_CODIGO = :banco`;
      binds.banco = banco;
    }

    if (dto.mes && dto.mes !== 'TODOS') {
      const mesPadded = String(dto.mes).trim().padStart(2, '0');
      whereClauses += ` AND TO_CHAR(L.FECHA_RECAUDACION, 'MM') = :mes`;
      binds.mes = mesPadded;
    }

    if (search) {
      whereClauses += ` AND TO_CHAR(W.WFEX_EXP_ID) LIKE :searchExp`;
      binds.searchExp = `%${search}%`;
    }

    const query = `
      SELECT * FROM (
        SELECT 
          W.WFEX_EXP_ID AS EXPEDIENTE,
          W.ANHO,
          W.WORKITEM,
          W.WFUS_USERS_ID AS USUARIO_ASIGNADO,
          W.WI_ESTADO AS ESTADO_WI,
          W.WI_NOMBRE,
          W.WI_DESCRIPCION,
          TO_CHAR(W.WI_FECHA_CREACION, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_ASIGNACION,
          MAX(L.INFN_CODIGO) AS BANCO,
          TO_CHAR(MAX(L.FECHA_RECAUDACION), 'YYYY-MM-DD') AS FECHA_RECAUDACION,
          COUNT(DISTINCT L.LOTE_ID) AS TOTAL_LOTES,
          COUNT(DISTINCT CASE WHEN L.ESTADO = 'P' THEN L.LOTE_ID END) AS LOTES_PENDIENTES,
          COUNT(DISTINCT CASE WHEN L.ESTADO = 'C' THEN L.LOTE_ID END) AS LOTES_CONCILIADOS,
          NVL(SUM(L.TOTAL_PLN), 0) AS TOTAL_PLANILLAS,
          NVL(SUM(CASE WHEN L.ESTADO = 'P' THEN L.TOTAL_PLN ELSE 0 END), 0) AS PLANILLAS_PENDIENTES
        FROM WFE_WORKFLOW.WF_WORK_ITEM W
        JOIN ORG_LIQ.LOTE L 
          ON L.EXPEDIENTE = W.WFEX_EXP_ID 
         AND L.ANHO = W.ANHO
        ${whereClauses}
        GROUP BY 
          W.WFEX_EXP_ID, W.ANHO, W.WORKITEM, W.WFUS_USERS_ID, 
          W.WI_ESTADO, W.WI_NOMBRE, W.WI_DESCRIPCION, W.WI_FECHA_CREACION
        HAVING SUM(CASE WHEN L.ESTADO = 'P' THEN 1 ELSE 0 END) > 0
        ORDER BY W.WFEX_EXP_ID DESC
      )
      WHERE ROWNUM <= :limit
    `;

    const expedientesRows = await this.db.executeQuery<any>(query, binds);

    // Consulta de KPIs rápidos de resumen
    const kpiQuery = `
      SELECT 
        COUNT(DISTINCT W.WFEX_EXP_ID) AS TOTAL_EXPEDIENTES_ABIERTA,
        COUNT(DISTINCT CASE WHEN UPPER(W.WFUS_USERS_ID) = 'GILLIAMS_0028' THEN W.WFEX_EXP_ID END) AS TOTAL_GILLIAMS_ABIERTA
      FROM WFE_WORKFLOW.WF_WORK_ITEM W
      WHERE W.ORGA_ID = '93'
        AND W.WFTA_TAREA_ID = 2061
        AND W.WI_ESTADO = 'ABIERTA'
        AND W.ANHO = :anho
        AND W.WORKITEM = (
          SELECT MAX(W2.WORKITEM)
          FROM WFE_WORKFLOW.WF_WORK_ITEM W2
          WHERE W2.WFEX_EXP_ID = W.WFEX_EXP_ID
            AND W2.ANHO = W.ANHO
            AND W2.ORGA_ID = W.ORGA_ID
        )
    `;
    let kpiData = { TOTAL_EXPEDIENTES_ABIERTA: 0, TOTAL_GILLIAMS_ABIERTA: 0 };
    try {
      const kpiRes = await this.db.executeQuery<any>(kpiQuery, { anho });
      if (kpiRes && kpiRes.length > 0) {
        kpiData = kpiRes[0];
      }
    } catch (kpiErr: any) {
      this.logger.warn(`No se pudo obtener KPI general de reasignación: ${kpiErr.message}`);
    }

    const totalPlanillasPendientes = expedientesRows.reduce(
      (sum, row) => sum + Number(row.PLANILLAS_PENDIENTES || 0),
      0,
    );
    const totalLotesPendientes = expedientesRows.reduce(
      (sum, row) => sum + Number(row.LOTES_PENDIENTES || 0),
      0,
    );

    return {
      success: true,
      total_encontrados: expedientesRows.length,
      kpis: {
        total_expedientes_abierta: Number(kpiData.TOTAL_EXPEDIENTES_ABIERTA || 0),
        total_gilliams_abierta: Number(kpiData.TOTAL_GILLIAMS_ABIERTA || 0),
        planillas_pendientes_en_vista: totalPlanillasPendientes,
        lotes_pendientes_en_vista: totalLotesPendientes,
      },
      filtros_aplicados: {
        usuario_origen: usuarioOrigen,
        estado_wi: estadoWi,
        anho,
        banco: banco || 'TODOS',
        limit,
      },
      data: expedientesRows.map((r) => ({
        expediente: Number(r.EXPEDIENTE),
        anho: Number(r.ANHO),
        workitem: Number(r.WORKITEM),
        usuario_asignado: r.USUARIO_ASIGNADO,
        estado_wi: r.ESTADO_WI,
        wi_nombre: r.WI_NOMBRE,
        wi_descripcion: r.WI_DESCRIPCION,
        fecha_asignacion: r.FECHA_ASIGNACION,
        banco: r.BANCO,
        fecha_recaudacion: r.FECHA_RECAUDACION,
        total_lotes: Number(r.TOTAL_LOTES || 0),
        lotes_pendientes: Number(r.LOTES_PENDIENTES || 0),
        lotes_conciliados: Number(r.LOTES_CONCILIADOS || 0),
        total_planillas: Number(r.TOTAL_PLANILLAS || 0),
        planillas_pendientes: Number(r.PLANILLAS_PENDIENTES || 0),
        monto_total: 0,
      })),
    };
  }

  /**
   * Obtiene la distribución y métricas de expedientes y planillas pendientes de conciliar por banco,
   * permitiendo visualizar gráficamente qué bancos tienen mayor volumen represado en ABIERTA / PENDIENTE.
   */
  async getResumenBancosPendientesReasignacion(dto: ConsultarExpedientesReasignacionDto) {
    const anho = dto.anho ? Number(dto.anho) : 2024;
    const usuarioOrigen = dto.usuario_origen !== undefined ? dto.usuario_origen.trim() : 'GILLIAMS_0028';
    const estadoWi = dto.estado_wi ? dto.estado_wi.trim().toUpperCase() : 'ABIERTA';

    const binds: any = { anho };
    let whereClauses = `WHERE W.ORGA_ID = '93' AND W.WFTA_TAREA_ID = 2061 AND W.ANHO = :anho AND W.WORKITEM = (
      SELECT MAX(W2.WORKITEM)
      FROM WFE_WORKFLOW.WF_WORK_ITEM W2
      WHERE W2.WFEX_EXP_ID = W.WFEX_EXP_ID
        AND W2.ANHO = W.ANHO
        AND W2.ORGA_ID = W.ORGA_ID
    )`;

    if (usuarioOrigen && usuarioOrigen !== 'TODOS') {
      whereClauses += ` AND UPPER(W.WFUS_USERS_ID) = UPPER(:usuarioOrigen)`;
      binds.usuarioOrigen = usuarioOrigen;
    }

    if (estadoWi && estadoWi !== 'TODOS') {
      whereClauses += ` AND UPPER(W.WI_ESTADO) = UPPER(:estadoWi)`;
      binds.estadoWi = estadoWi;
    } else {
      whereClauses += ` AND W.WI_ESTADO IN ('ABIERTA', 'PENDIENTE')`;
    }

    if (dto.mes && dto.mes !== 'TODOS') {
      const mesPadded = String(dto.mes).trim().padStart(2, '0');
      whereClauses += ` AND TO_CHAR(L.FECHA_RECAUDACION, 'MM') = :mes`;
      binds.mes = mesPadded;
    }

    const query = `
      SELECT 
        L.INFN_CODIGO AS BANCO,
        COUNT(DISTINCT W.WFEX_EXP_ID) AS TOTAL_EXPEDIENTES,
        COUNT(DISTINCT CASE WHEN L.ESTADO = 'P' THEN L.LOTE_ID END) AS LOTES_PENDIENTES,
        NVL(SUM(CASE WHEN L.ESTADO = 'P' THEN L.TOTAL_PLN ELSE 0 END), 0) AS PLANILLAS_PENDIENTES
      FROM WFE_WORKFLOW.WF_WORK_ITEM W
      JOIN ORG_LIQ.LOTE L 
        ON L.EXPEDIENTE = W.WFEX_EXP_ID 
       AND L.ANHO = W.ANHO
      ${whereClauses}
      GROUP BY L.INFN_CODIGO
      HAVING NVL(SUM(CASE WHEN L.ESTADO = 'P' THEN L.TOTAL_PLN ELSE 0 END), 0) > 0
      ORDER BY PLANILLAS_PENDIENTES DESC
    `;

    const rows = await this.db.executeQuery<any>(query, binds);

    const totalPlanillas = rows.reduce((acc, r) => acc + Number(r.PLANILLAS_PENDIENTES || 0), 0);
    const totalExpedientes = rows.reduce((acc, r) => acc + Number(r.TOTAL_EXPEDIENTES || 0), 0);
    const totalLotes = rows.reduce((acc, r) => acc + Number(r.LOTES_PENDIENTES || 0), 0);

    const bancos = rows.map((r) => {
      const pln = Number(r.PLANILLAS_PENDIENTES || 0);
      const porcentaje = totalPlanillas > 0 ? Number(((pln / totalPlanillas) * 100).toFixed(2)) : 0;
      const codBanco = String(r.BANCO || '').trim();
      return {
        banco: codBanco,
        nombre_banco: getNombreCortoBanco(codBanco),
        total_expedientes: Number(r.TOTAL_EXPEDIENTES || 0),
        lotes_pendientes: Number(r.LOTES_PENDIENTES || 0),
        planillas_pendientes: pln,
        porcentaje_planillas: porcentaje,
      };
    });

    return {
      success: true,
      total_bancos: bancos.length,
      total_planillas_pendientes: totalPlanillas,
      total_expedientes_pendientes: totalExpedientes,
      total_lotes_pendientes: totalLotes,
      banco_mayor_carga: bancos.length > 0 ? bancos[0] : null,
      bancos,
    };
  }

  /**
   * Obtiene la nómina de analistas conciliadores habilitados en ONT para reasignación de expedientes,
   * filtrando exclusivamente por el rol de CONCILIADOR (R_TNIN_VALIDA / R_TNIN_VALIDA_2 / R_TNIN_REVISOR / rol con CONCIL)
   * e incluyendo su carga actual de trabajo (expedientes en proceso).
   */
  async getTranscriptoresReasignacion() {
    const query = `
      SELECT 
        U.USERS_ID,
        NVL(U.USERS_NOMBRE_CORTO, '') AS NOMBRE_CORTO,
        NVL(U.USERS_NOMBRE_LARGO, '') AS NOMBRE_LARGO,
        TRIM(NVL(U.USERS_NOMBRE_CORTO, '') || ' ' || NVL(U.USERS_NOMBRE_LARGO, '')) AS NOMBRE_COMPLETO,
        U.USERS_STATUS,
        NVL(U.ORGA_ID, '93') AS ORGA_ID,
        'ANALISTA CONCILIADOR' AS ROL_NOMBRE,
        NVL(CARGA.EXPEDIENTES_ASIGNADOS, 0) AS EXPEDIENTES_ASIGNADOS
      FROM WFE_WORKFLOW.WF_USERS U
      LEFT JOIN (
        SELECT WI.WFUS_USERS_ID, 
               COUNT(DISTINCT WI.WFEX_EXP_ID) AS EXPEDIENTES_ASIGNADOS
        FROM WFE_WORKFLOW.WF_WORK_ITEM WI
        WHERE WI.ORGA_ID IN ('93', '093', '63', '063')
          AND WI.WFTA_TAREA_ID = 2061
          AND WI.WI_ESTADO IN ('ABIERTA', 'PENDIENTE')
          AND WI.WORKITEM = (
            SELECT MAX(W2.WORKITEM)
            FROM WFE_WORKFLOW.WF_WORK_ITEM W2
            WHERE W2.WFEX_EXP_ID = WI.WFEX_EXP_ID
              AND W2.ANHO = WI.ANHO
              AND W2.ORGA_ID = WI.ORGA_ID
          )
        GROUP BY WI.WFUS_USERS_ID
      ) CARGA ON CARGA.WFUS_USERS_ID = U.USERS_ID
      WHERE U.USERS_STATUS = 'A'
        AND U.ORGA_ID IN ('93', '093', '63', '063')
        AND (
          U.WFRO_ROLE_ID IN ('R_TNIN_VALIDA', 'R_TNIN_VALIDA_2', 'R_TNIN_REVISOR')
          OR UPPER(U.WFRO_ROLE_ID) LIKE '%CONCIL%'
        )
      ORDER BY CARGA.EXPEDIENTES_ASIGNADOS DESC, NOMBRE_COMPLETO ASC
    `;

    const rows = await this.db.executeQuery<any>(query);
    return {
      success: true,
      total: rows.length,
      data: rows.map((u) => ({
        users_id: u.USERS_ID,
        nombre_corto: u.NOMBRE_CORTO || '',
        nombre_largo: u.NOMBRE_LARGO || '',
        nombre_completo: u.NOMBRE_COMPLETO || u.USERS_ID,
        orga_id: u.ORGA_ID,
        rol: u.ROL_NOMBRE || 'ANALISTA CONCILIADOR',
        expedientes_asignados: Number(u.EXPEDIENTES_ASIGNADOS || 0),
      })),
    };
  }

  /**
   * Reasigna de forma masiva expedientes seleccionados a un nuevo transcriptor.
   * Cierra el WorkItem actual (estado CERRADA) y genera el nuevo WorkItem en estado PENDIENTE,
   * cumpliendo el requerimiento de que el expediente pase a PENDIENTE para el nuevo usuario.
   */
  async reasignarExpedientesMasivo(dto: EjecutarReasignacionDto) {
    const { expedientes, nuevo_transcriptor, usuario_operador, observacion } = dto;

    if (!expedientes || !Array.isArray(expedientes) || expedientes.length === 0) {
      throw new BadRequestException('Debe seleccionar al menos un expediente para reasignar.');
    }

    if (!nuevo_transcriptor || !nuevo_transcriptor.trim()) {
      throw new BadRequestException('Debe indicar el nuevo transcriptor destino.');
    }

    // 1. Validar límite máximo de tamaño de lote (Caso 16) y deduplicar payload (Caso 15)
    const seen = new Set<string>();
    const expedientesUnicos = expedientes.filter((item) => {
      const key = `${item.expediente}-${item.anho || 2024}-${item.workitem || 1}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (expedientesUnicos.length > 500) {
      throw new BadRequestException('El límite máximo por lote de reasignación es de 500 expedientes.');
    }

    const targetUser = nuevo_transcriptor.trim();

    // 2. Validar que el nuevo transcriptor exista, esté activo y tenga rol de Conciliador en SIGECOF (Caso 7)
    const userCheckQuery = `
      SELECT U.USERS_ID, U.USERS_NOMBRE_CORTO, U.USERS_NOMBRE_LARGO, U.USERS_STATUS, U.ORGA_ID, 'ANALISTA CONCILIADOR' AS ROLE_NOMBRE
      FROM WFE_WORKFLOW.WF_USERS U
      WHERE UPPER(U.USERS_ID) = UPPER(:targetUser) 
        AND U.USERS_STATUS = 'A'
        AND U.ORGA_ID IN ('93', '093', '63', '063')
        AND (
          U.WFRO_ROLE_ID IN ('R_TNIN_VALIDA', 'R_TNIN_VALIDA_2', 'R_TNIN_REVISOR')
          OR UPPER(U.WFRO_ROLE_ID) LIKE '%CONCIL%'
        )
    `;
    const userRows = await this.db.executeQuery<any>(userCheckQuery, { targetUser });
    if (!userRows || userRows.length === 0) {
      throw new BadRequestException(
        `El transcriptor destino '${targetUser}' no existe, no está activo o no posee el rol de Conciliador en el organismo.`,
      );
    }
    const targetUserData = userRows[0];
    const nombreNuevoTranscriptor =
      `${targetUserData.USERS_NOMBRE_CORTO || ''} ${targetUserData.USERS_NOMBRE_LARGO || ''}`.trim() ||
      targetUserData.USERS_ID;

    const operadorFinal = usuario_operador || 'ONT_SIR_BOT';
    
    // Truncar observación a máximo 500 BYTES para evitar ORA-12899 (semántica BYTE en AL32UTF8 - Caso 19)
    const rawObs = observacion || `Reasignación de balanceo operativo a ${nombreNuevoTranscriptor}`;
    let bufObs = Buffer.from(rawObs, 'utf-8');
    if (bufObs.length > 500) {
      bufObs = bufObs.subarray(0, 500);
    }
    const observacionFinal = bufObs.toString('utf-8').replace(/\uFFFD$/, '');

    const reasignadosExitosos: any[] = [];
    const reasignadosFallidos: any[] = [];

    const writeConn = await this.db.getConnection();

    try {
      for (const item of expedientesUnicos) {
        const expNum = Number(item.expediente);
        const anhoNum = Number(item.anho || 2024);
        const orgaId = (item as any).orga_id || '93';

        try {
          // Consultar historial de WorkItems de este expediente
          const wiQuery = `
            SELECT WORKITEM, WFEX_EXP_ID, ANHO, ORGA_ID, WI_NOMBRE, WI_DESCRIPCION, WI_ORIGEN,
                   WI_ESTADO, WFUS_USERS_ID, WFTA_TAREA_ID
            FROM WFE_WORKFLOW.WF_WORK_ITEM
            WHERE WFEX_EXP_ID = :expNum AND ANHO = :anhoNum AND ORGA_ID = :orgaId
            ORDER BY WORKITEM ASC
          `;
          const currentWis = await this.db.executeQuery<any>(wiQuery, { expNum, anhoNum, orgaId });

          // Detectar el WorkItem activo actual (ABIERTA o PENDIENTE)
          const activeWi =
            currentWis.find(
              (w) =>
                (w.WI_ESTADO === 'ABIERTA' || w.WI_ESTADO === 'PENDIENTE') &&
                (Number(w.WFTA_TAREA_ID) === 2061 || Number(w.WFTA_TAREA_ID) === 2060),
            ) || currentWis[currentWis.length - 1];

          const currentWiNum = activeWi ? Number(activeWi.WORKITEM) : item.workitem || null;
          const usuarioAnterior = activeWi?.WFUS_USERS_ID || 'GILLIAMS_0028';

          if (!currentWiNum) {
            throw new Error(`No se pudo determinar el WorkItem activo para el expediente ${expNum}.`);
          }

          // A) Reasignar in-situ mediante paquete oficial Oracle Designer CG$WF_WORK_ITEM (AUTHID DEFINER)
          // Bypasea ORA-01031 por falta de SELECT directo en WF_WORK_ITEM y actualiza usuario y estado
          await writeConn.execute(
            `DECLARE
               v_rec WFE_WORKFLOW.CG$WF_WORK_ITEM.cg$row_type;
               v_ind WFE_WORKFLOW.CG$WF_WORK_ITEM.cg$ind_type;
             BEGIN
               v_rec.WORKITEM := :currentWiNum;
               v_rec.ANHO := :anhoNum;
               v_rec.ORGA_ID := :orgaId;
               v_rec.WFEX_EXP_ID := :expNum;
               
               WFE_WORKFLOW.CG$WF_WORK_ITEM.slct(v_rec);
               
               v_rec.WFUS_USERS_ID := :nuevoTranscriptor;
               v_ind.WFUS_USERS_ID := TRUE;
               
               v_rec.WI_ESTADO := 'PENDIENTE';
               v_ind.WI_ESTADO := TRUE;
               
               WFE_WORKFLOW.CG$WF_WORK_ITEM.upd(v_rec, v_ind);
             END;`,
            {
              nuevoTranscriptor: targetUserData.USERS_ID,
              expNum,
              anhoNum,
              orgaId,
              currentWiNum,
            },
            { autoCommit: false },
          );

          // Sincronizar también la cabecera en WF_EXPEDIENTE
          try {
            await writeConn.execute(
              `UPDATE WFE_WORKFLOW.WF_EXPEDIENTE
               SET WFPU_WFUS_USERS_ID = :nuevoTranscriptor
               WHERE EXP_ID = :expNum AND ANHO = :anhoNum AND ORGA_ID = :orgaId`,
              {
                nuevoTranscriptor: targetUserData.USERS_ID,
                expNum,
                anhoNum,
                orgaId,
              },
              { autoCommit: false },
            );
          } catch (expUpdErr: any) {
            this.logger.warn(`Aviso al actualizar cabecera WF_EXPEDIENTE para exp ${expNum}: ${expUpdErr.message}`);
          }

          // B) Registro explícito en WF_AUDITA_EXPEDIENTES de Oracle (Caso 5)
          try {
            await writeConn.execute(
              `INSERT INTO WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES (
                 USUARIO_ORACLE, ORGANISMO_ID, USUARIO_APLICATIVO, EXPEDIENTE_ID, FECHA_HORA
               ) VALUES (
                 'ONT_SIR_BOT', :orgaId, :operador, :expedienteStr, TO_CHAR(SYSDATE, 'DD/MM/YYYY:HH24:MI:SS')
               )`,
              {
                orgaId: orgaId.substring(0, 3),
                operador: operadorFinal.substring(0, 15),
                expedienteStr: String(expNum).substring(0, 10),
              },
              { autoCommit: false },
            );
          } catch (auditErr: any) {
            this.logger.warn(`Aviso al insertar en WF_AUDITA_EXPEDIENTES para exp ${expNum}: ${auditErr.message}`);
          }

          // Commit individual por item exitoso
          await writeConn.commit();

          // C) Registrar auditoría en PostgreSQL
          await this.registrarAuditoriaJson({
            accion: 'REASIGNACION_EXPEDIENTES_CARGA',
            modulo: 'REASIGNACION_OPERATIVA',
            usuario: operadorFinal,
            detalles: {
              expediente: expNum,
              anho: anhoNum,
              workitem: currentWiNum,
              metodo: 'UPDATE_DIRECTO',
              usuario_anterior: usuarioAnterior,
              estado_anterior: activeWi?.WI_ESTADO || 'ABIERTA',
              nuevo_transcriptor: targetUserData.USERS_ID,
              estado_nuevo: 'PENDIENTE',
              observacion: observacionFinal,
            },
          });

          reasignadosExitosos.push({
            expediente: expNum,
            anho: anhoNum,
            workitem: currentWiNum,
            usuario_anterior: usuarioAnterior,
            nuevo_transcriptor: targetUserData.USERS_ID,
            nuevo_estado: 'PENDIENTE',
          });
        } catch (itemErr: any) {
          await writeConn.rollback();
          this.logger.error(`Error al reasignar expediente ${expNum}: ${itemErr.message}`);
          reasignadosFallidos.push({
            expediente: expNum,
            anho: anhoNum,
            error: itemErr.message,
          });
        }
      }
    } finally {
      try {
        await writeConn.close();
      } catch {}
    }

    return {
      success: reasignadosFallidos.length === 0,
      total_solicitados: expedientes.length,
      total_exitosos: reasignadosExitosos.length,
      total_fallidos: reasignadosFallidos.length,
      nuevo_transcriptor: targetUserData.USERS_ID,
      nombre_nuevo_transcriptor: nombreNuevoTranscriptor,
      exitosos: reasignadosExitosos,
      fallidos: reasignadosFallidos,
      mensaje:
        `Reasignación procesada: ${reasignadosExitosos.length} expediente(s) transferido(s) a ${nombreNuevoTranscriptor} en estado PENDIENTE.` +
        (reasignadosFallidos.length > 0 ? ` (${reasignadosFallidos.length} con error).` : ''),
    };
  }

  /**
   * Obtiene la métrica de productividad y transcripción de planillas agrupadas por usuario y por hora
   * para una fecha determinada (por defecto hoy en Oracle).
   * Reemplaza de forma nativa e interactiva el reporte legacy TRANSC_X_HORA sin necesidad de generar PDF.
   */
  async getProductividadPorHora(fechaInput?: string) {
    let fechaOracle = '';
    let fechaIso = '';

    if (!fechaInput || !fechaInput.trim()) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = String(now.getFullYear());
      fechaOracle = `${dd}/${mm}/${yyyy}`;
      fechaIso = `${yyyy}-${mm}-${dd}`;
    } else {
      const clean = fechaInput.trim();
      if (clean.includes('-')) {
        const parts = clean.split('-');
        if (parts.length === 3) {
          const [yyyy, mm, dd] = parts;
          fechaOracle = `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
          fechaIso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        } else {
          fechaOracle = clean;
          fechaIso = clean;
        }
      } else if (clean.includes('/')) {
        const parts = clean.split('/');
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          fechaOracle = `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
          fechaIso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        } else {
          fechaOracle = clean;
          fechaIso = clean;
        }
      } else {
        fechaOracle = clean;
        fechaIso = clean;
      }
    }

    const query = `
      WITH PLANILLAS_FECHA AS (
        SELECT /*+ INDEX(P IDX_FECHA_PLANILLA) */
          P.EXPEDIENTE,
          P.ANHO,
          TO_CHAR(P.FECHA_REGISTRO, 'HH24') AS HORA
        FROM ORG_LIQ.PLANILLA P
        WHERE TO_CHAR(P.FECHA_REGISTRO, 'DD/MM/RRRR') = :fechaOracle
      ),
      ASIGNACIONES AS (
        SELECT 
          WI.WFEX_EXP_ID,
          WI.ANHO,
          WI.WFUS_USERS_ID,
          ROW_NUMBER() OVER (
            PARTITION BY WI.WFEX_EXP_ID, WI.ANHO 
            ORDER BY WI.WORKITEM DESC
          ) AS RN
        FROM WFE_WORKFLOW.WF_WORK_ITEM WI
        WHERE WI.ORGA_ID IN ('93', '093', '63', '063')
          AND WI.WFTA_TAREA_ID = 2061
      )
      SELECT 
        NVL(U.USERS_NOMBRE_LARGO, A.WFUS_USERS_ID) AS NOMBRE_CONCILIADOR,
        NVL(U.USERS_NOMBRE_CORTO, '') AS NOMBRE_CORTO,
        A.WFUS_USERS_ID AS USERS_ID,
        P.HORA,
        COUNT(*) AS TOTAL_PLANILLAS
      FROM PLANILLAS_FECHA P
      JOIN ASIGNACIONES A 
        ON A.WFEX_EXP_ID = P.EXPEDIENTE 
       AND A.ANHO = P.ANHO
       AND A.RN = 1
      LEFT JOIN WFE_WORKFLOW.WF_USERS U 
        ON U.USERS_ID = A.WFUS_USERS_ID
      GROUP BY 
        NVL(U.USERS_NOMBRE_LARGO, A.WFUS_USERS_ID),
        NVL(U.USERS_NOMBRE_CORTO, ''),
        A.WFUS_USERS_ID,
        P.HORA
      ORDER BY NOMBRE_CONCILIADOR ASC, P.HORA ASC
    `;

    const rows = await this.db.executeQuery<any>(query, { fechaOracle });

    const horasSet = new Set<string>();
    const userMap = new Map<string, {
      users_id: string;
      nombre: string;
      nombre_corto: string;
      nombre_completo: string;
      horas: Record<string, number>;
      total_usuario: number;
    }>();

    const totalesPorHora: Record<string, number> = {};
    let granTotal = 0;

    for (const r of rows) {
      const hora = String(r.HORA || '').padStart(2, '0');
      const cant = Number(r.TOTAL_PLANILLAS || 0);
      const userId = r.USERS_ID;
      const nombreLargo = r.NOMBRE_CONCILIADOR || userId;
      const nombreCorto = r.NOMBRE_CORTO || '';
      const nombreCompleto = `${nombreCorto} ${nombreLargo}`.trim() || userId;

      horasSet.add(hora);

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          users_id: userId,
          nombre: nombreLargo,
          nombre_corto: nombreCorto,
          nombre_completo: nombreCompleto,
          horas: {},
          total_usuario: 0,
        });
      }

      const uObj = userMap.get(userId)!;
      uObj.horas[hora] = (uObj.horas[hora] || 0) + cant;
      uObj.total_usuario += cant;

      totalesPorHora[hora] = (totalesPorHora[hora] || 0) + cant;
      granTotal += cant;
    }

    const horasOrdenadas = Array.from(horasSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const conciliadores = Array.from(userMap.values()).sort((a, b) => b.total_usuario - a.total_usuario);

    let horaPico = { hora: '--', total: 0 };
    for (const [h, tot] of Object.entries(totalesPorHora)) {
      if (tot > horaPico.total) {
        horaPico = { hora: `${h}:00`, total: tot };
      }
    }

    const promedioConciliador = conciliadores.length > 0 
      ? Math.round(granTotal / conciliadores.length) 
      : 0;

    return {
      success: true,
      fecha_consultada: fechaOracle,
      fecha_iso: fechaIso,
      horas: horasOrdenadas,
      conciliadores,
      totales_por_hora: totalesPorHora,
      gran_total: granTotal,
      kpis: {
        total_planillas: granTotal,
        conciliadores_activos: conciliadores.length,
        hora_pico: horaPico,
        promedio_por_conciliador: promedioConciliador,
      }
    };
  }
}

