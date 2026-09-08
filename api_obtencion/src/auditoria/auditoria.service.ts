import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as oracledb from 'oracledb';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly db: DatabaseService) {}

  async getAuditoriaTranscriptor(usuario: string, anho: number = 2024) {
    let connection;
    try {
      connection = await this.db.getReadConnection();
      const execOptions: oracledb.ExecuteOptions = { outFormat: oracledb.OUT_FORMAT_OBJECT };

      // 1. Obtener Datos del Usuario en WF_USERS
      const qUsuario = `
        SELECT USERS_ID AS USUARIO_SISTEMA,
               USERS_NOMBRE_CORTO AS NOMBRE_CORTO,
               USERS_NOMBRE_LARGO AS NOMBRE_COMPLETO,
               USERS_CEDULA AS CEDULA,
               ORGA_ID AS CODIGO_ORGANO,
               CARGO,
               TO_CHAR(USERS_FECH_CREACION, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_CREACION,
               USERS_STATUS AS ESTATUS_USUARIO
        FROM WFE_WORKFLOW.WF_USERS
        WHERE USERS_ID = :usuario
      `;
      const usuarioRes = await connection.execute(qUsuario, { usuario: usuario.toUpperCase() }, execOptions);
      const perfil = usuarioRes.rows && (usuarioRes.rows as any[])[0] ? (usuarioRes.rows as any[])[0] : null;

      if (!perfil) {
        return {
          status: 404,
          error: `Usuario '${usuario}' no encontrado en WFE_WORKFLOW.WF_USERS`
        };
      }

      // 2. Obtener Expedientes y Lotes Asignados en Curso
      const qExpedientes = `
        SELECT W.WFEX_EXP_ID AS EXPEDIENTE,
               L.LOTE_ID AS NRO_LOTE,
               L.LOTE_SEQ AS SECUENCIA_INTERNA,
               L.INFN_CODIGO AS BANCO,
               L.AGENCIA_CODIGO AS AGENCIA,
               TO_CHAR(L.FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION,
               L.TOTAL_PLN AS PLANILLAS_DECLARADAS,
               L.ESTADO AS ESTADO_LOTE,
               W.WI_ESTADO AS ESTADO_TAREA,
               TO_CHAR(W.WI_FECHA_CREACION, 'YYYY-MM-DD') AS FECHA_ASIGNACION
        FROM WFE_WORKFLOW.WF_WORK_ITEM W
        JOIN ORG_LIQ.LOTE L 
          ON W.WFEX_EXP_ID = L.EXPEDIENTE AND W.ANHO = L.ANHO
        WHERE W.WFUS_USERS_ID = :usuario
          AND L.ANHO = :anho
          AND W.WI_ESTADO IN ('ABIERTA', 'PENDIENTE', 'PENDEINTE')
        ORDER BY W.WFEX_EXP_ID DESC, L.LOTE_ID ASC
      `;
      const expedientesRes = await connection.execute(qExpedientes, { usuario: usuario.toUpperCase(), anho }, execOptions);
      const expedientesRaw = (expedientesRes.rows as any[]) || [];

      // Agrupar Lotes por Expediente
      const expedientesMap = new Map<string, any>();
      for (const row of expedientesRaw) {
        const expId = String(row.EXPEDIENTE);
        if (!expedientesMap.has(expId)) {
          expedientesMap.set(expId, {
            expediente_id: expId,
            estado_tarea: row.ESTADO_TAREA,
            fecha_asignacion: row.FECHA_ASIGNACION,
            lotes: [],
            total_planillas_declaradas: 0
          });
        }
        const exp = expedientesMap.get(expId);
        exp.lotes.push(row);
        exp.total_planillas_declaradas += Number(row.PLANILLAS_DECLARADAS) || 0;
      }
      const expedientesActivos = Array.from(expedientesMap.values());

      // 3. Obtener Total de Expedientes Cerrados
      const qCerrados = `
        SELECT COUNT(DISTINCT W.WFEX_EXP_ID) AS TOTAL_CERRADOS
        FROM WFE_WORKFLOW.WF_WORK_ITEM W
        WHERE W.WFUS_USERS_ID = :usuario
          AND W.ANHO = :anho
          AND W.WI_ESTADO IN ('CERRADA', 'CERRADO')
      `;
      const cerradosRes = await connection.execute(qCerrados, { usuario: usuario.toUpperCase(), anho }, execOptions);
      const totalCerrados = (cerradosRes.rows as any[])?.[0]?.TOTAL_CERRADOS || 0;

      return {
        status: 200,
        perfil,
        expedientes: expedientesActivos,
        resumen: {
          total_expedientes_abiertos: expedientesActivos.length,
          total_lotes_abiertos: expedientesRaw.length,
          total_expedientes_cerrados: totalCerrados
        }
      };
    } catch (error) {
      this.logger.error('Error en getAuditoriaTranscriptor:', error);
      throw new Error(`Error en consulta de auditoría: ${error.message}`);
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  }

  async getDetalleExpediente(expedienteId: string, anho: number = 2024) {
    let connection;
    try {
      connection = await this.db.getReadConnection();
      const execOptions: oracledb.ExecuteOptions = { outFormat: oracledb.OUT_FORMAT_OBJECT };

      // 1. Obtener lotes del expediente en estado 'P' o todos
      const qLotes = `
        SELECT DISTINCT LOTE_SEQ, ANHO, TOTAL_PLN, 
               TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION, 
               INFN_CODIGO, AGENCIA_CODIGO, LOTE_ID, ESTADO
        FROM ORG_LIQ.LOTE 
        WHERE EXPEDIENTE = :expedienteId 
          AND ANHO = :anho
        ORDER BY LOTE_ID ASC
      `;
      const lotesRes = await connection.execute(qLotes, { expedienteId: Number(expedienteId) || expedienteId, anho }, execOptions);
      const lotes = (lotesRes.rows as any[]) || [];

      let totalPlanillasLote = 0;
      const loteSeqs: number[] = [];
      lotes.forEach((l) => {
        totalPlanillasLote += Number(l.TOTAL_PLN) || 0;
        if (l.LOTE_SEQ) loteSeqs.push(l.LOTE_SEQ);
      });

      let conciliadas: any[] = [];
      let pendientes: any[] = [];

      if (loteSeqs.length > 0) {
        // 2. Planillas conciliadas en ORG_LIQ.PLANILLA
        const inClause = loteSeqs.join(',');
        const qConciliadas = `
          SELECT LOTE_SEQ, PLANILLA_ID, FORMA_CODIGO, MONTO_EFECTIVO AS MONTO, 
                 TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION, 
                 INFN_CODIGO, PLAN_SEQ, IDENT_CNTB
          FROM ORG_LIQ.PLANILLA
          WHERE LOTE_SEQ IN (${inClause}) AND ANHO = :anho
          ORDER BY PLAN_SEQ ASC
        `;
        const concRes = await connection.execute(qConciliadas, { anho }, execOptions);
        conciliadas = (concRes.rows as any[]) || [];

        // 3. Planillas en TXT_SENIAT pendientes de conciliar
        if (lotes.length > 0) {
          const conditions = lotes.map((l: any) => 
            `(T.INFN_CODIGO = '${l.INFN_CODIGO}' 
              AND T.AGENCIA_CODIGO = '${l.AGENCIA_CODIGO}' 
              AND T.FECHA_RECAUDACION = TO_DATE('${l.FECHA_RECAUDACION}', 'YYYY-MM-DD')
              AND NOT EXISTS (
                  SELECT 1 
                  FROM ORG_LIQ.PLANILLA P2
                  WHERE P2.ANHO = ${anho}
                    AND P2.LOTE_SEQ = ${l.LOTE_SEQ}
                    AND P2.PLANILLA_ID = T.PLANILLA
              ))`
          ).join(' OR ');

          if (conditions) {
            const qPendientes = `
              SELECT T.PLANILLA AS PLANILLA_ID, T.FORMA_CODIGO, T.MONTO_EFECTIVO AS MONTO,
                     TO_CHAR(T.FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION, 
                     T.INFN_CODIGO, T.AGENCIA_CODIGO, T.IDENT_CNTB AS RIF
              FROM ORG_LIQ.TXT_SENIAT T
              WHERE (${conditions})
              FETCH FIRST 500 ROWS ONLY
            `;
            const pendRes = await connection.execute(qPendientes, {}, execOptions);
            pendientes = (pendRes.rows as any[]) || [];
          }
        }
      }

      // Desglose por lote
      const lotesConEstadisticas = lotes.map((lote: any) => {
        const conciliadasLote = conciliadas.filter((c: any) => c.LOTE_SEQ === lote.LOTE_SEQ).length;
        const pendientesLote = pendientes.filter((p: any) => 
          p.INFN_CODIGO === lote.INFN_CODIGO && 
          p.AGENCIA_CODIGO === lote.AGENCIA_CODIGO && 
          p.FECHA_RECAUDACION === lote.FECHA_RECAUDACION
        ).length;

        return {
          ...lote,
          conciliadas: conciliadasLote,
          pendientes: pendientesLote
        };
      });

      return {
        status: 200,
        expediente_id: expedienteId,
        anho,
        lotes: lotesConEstadisticas,
        resumen: {
          total_planillas_lote: totalPlanillasLote,
          total_conciliadas: conciliadas.length,
          total_pendientes: pendientes.length
        },
        conciliadas,
        pendientes
      };
    } catch (error) {
      this.logger.error('Error en getDetalleExpediente:', error);
      throw new Error(`Error al consultar detalle del expediente: ${error.message}`);
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  }

  async getDetalleLote(loteSeq: number, anho: number = 2024) {
    let connection;
    try {
      connection = await this.db.getReadConnection();
      const execOptions: oracledb.ExecuteOptions = { outFormat: oracledb.OUT_FORMAT_OBJECT };

      const qLote = `
        SELECT LOTE_SEQ, LOTE_ID, ANHO, TOTAL_PLN, 
               TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION, 
               INFN_CODIGO, AGENCIA_CODIGO, ESTADO, EXPEDIENTE
        FROM ORG_LIQ.LOTE 
        WHERE LOTE_SEQ = :loteSeq AND ANHO = :anho
      `;
      const loteRes = await connection.execute(qLote, { loteSeq, anho }, execOptions);
      const lote = (loteRes.rows as any[])?.[0];

      if (!lote) {
        return { status: 404, error: `Lote ${loteSeq} no encontrado para el año ${anho}` };
      }

      // Conciliadas
      const qConciliadas = `
        SELECT PLANILLA_ID, FORMA_CODIGO, MONTO_EFECTIVO AS MONTO, 
               TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION, 
               INFN_CODIGO, PLAN_SEQ, IDENT_CNTB
        FROM ORG_LIQ.PLANILLA
        WHERE LOTE_SEQ = :loteSeq AND ANHO = :anho
        ORDER BY PLAN_SEQ ASC
      `;
      const concRes = await connection.execute(qConciliadas, { loteSeq, anho }, execOptions);
      const conciliadas = (concRes.rows as any[]) || [];

      // Pendientes en TXT_SENIAT
      const qPendientes = `
        SELECT T.PLANILLA AS PLANILLA_ID, T.FORMA_CODIGO, T.MONTO_EFECTIVO AS MONTO,
               TO_CHAR(T.FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION, 
               T.INFN_CODIGO, T.AGENCIA_CODIGO, T.IDENT_CNTB AS RIF
        FROM ORG_LIQ.TXT_SENIAT T
        WHERE T.INFN_CODIGO = :banco
          AND T.AGENCIA_CODIGO = :agencia
          AND T.FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
          AND NOT EXISTS (
              SELECT 1 
              FROM ORG_LIQ.PLANILLA P2
              WHERE P2.ANHO = :anho
                AND P2.LOTE_SEQ = :loteSeq
                AND P2.PLANILLA_ID = T.PLANILLA
          )
      `;
      const pendRes = await connection.execute(
        qPendientes, 
        { 
          banco: lote.INFN_CODIGO, 
          agencia: lote.AGENCIA_CODIGO, 
          fecha: lote.FECHA_RECAUDACION, 
          anho, 
          loteSeq 
        }, 
        execOptions
      );
      const pendientes = (pendRes.rows as any[]) || [];

      return {
        status: 200,
        lote,
        resumen: {
          total_planillas_lote: Number(lote.TOTAL_PLN) || 0,
          total_conciliadas: conciliadas.length,
          total_pendientes: pendientes.length
        },
        conciliadas,
        pendientes
      };
    } catch (error) {
      this.logger.error('Error en getDetalleLote:', error);
      throw new Error(`Error al consultar detalle del lote: ${error.message}`);
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch {}
      }
    }
  }

  async getEventosAuditoriaJson(limit: number = 100) {
    try {
      const auditPath = path.join(process.cwd(), 'auditoria.json');
      if (!fs.existsSync(auditPath)) {
        return { status: 200, total: 0, eventos: [] };
      }

      const raw = await fs.promises.readFile(auditPath, 'utf8');
      const parsed = JSON.parse(raw);
      const total = parsed.length;
      // Invertir para mostrar los más recientes primero
      const eventos = parsed.slice(-limit).reverse();

      return {
        status: 200,
        total,
        mostrando: eventos.length,
        eventos
      };
    } catch (err: any) {
      this.logger.error('Error al leer auditoria.json:', err);
      return { status: 500, error: err.message, eventos: [] };
    }
  }
}
