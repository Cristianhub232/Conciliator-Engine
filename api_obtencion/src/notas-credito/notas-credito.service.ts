import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface NotaCreditoItem {
  nocr_codigo: string;
  fecha_recaudacion: string;
  infn_codigo: string;
  fecha_registro: string;
  fecha_bcv: string;
  fecha_enterar_bcv: string;
  monto: number;
  monto_efectivo: number;
  monto_cheque: number;
  monto_bono: number;
  monto_certificado: number;
  monto_dpn: number;
  monto_divisas: number;
  monto_retenido: number;
  expediente: number;
  workitem: number;
  anho: number;
  infn_codigo_ctat: string;
  ctat_id: string;
}

export interface FormaSeniatSummary {
  forma_codigo: string;
  cantidad: number;
  monto_total: number;
  monto_conciliado: number;
  monto_pendiente: number;
}

export interface DuplicadoTxtItem {
  planilla: string;
  forma_codigo: string;
  monto: number;
  agencia: string;
  repeticiones: number;
  monto_excedente: number;
}

export interface ExpedienteTranscritoItem {
  expediente: number;
  cantidad: number;
  monto_total: number;
  monto_efectivo: number;
  cant_lotes: number;
}

export interface TotalesTranscrito {
  cantidad: number;
  monto_total: number;
  monto_efectivo: number;
  monto_cheque_otros: number;
  cant_lotes: number;
  expedientes: ExpedienteTranscritoItem[];
}

export interface ComparacionGeneral {
  monto_nc: number;
  monto_transcrito: number;
  monto_txt_total: number;
  monto_txt_pendiente: number;
  diferencia_nc_vs_transcrito: number;
  diferencia_nc_vs_total_dia: number;
  diferencia_proyectada_cierre: number;
  porcentaje_avance_transcrito: number;
  estado_cuadre: 'CUADRADO' | 'EN_PROCESO' | 'DISCREPANCIA';
}

export interface NotasCreditoResponse {
  fecha: string;
  banco: string | null;
  expediente: string | null;
  totales_nc: {
    cantidad: number;
    monto_total: number;
    monto_efectivo: number;
    monto_cheque: number;
    monto_otros: number;
  };
  totales_seniat: {
    total_planillas: number;
    total_monto: number;
    monto_conciliado: number;
    monto_pendiente: number;
    planillas_conciliadas: number;
    planillas_pendientes: number;
    planillas_pendientes_unicas: number;
    monto_pendiente_unico: number;
    planillas_duplicadas_count: number;
    monto_duplicadas: number;
    duplicados: DuplicadoTxtItem[];
  };
  totales_transcrito: TotalesTranscrito;
  comparacion_general: ComparacionGeneral;
  brecha: {
    diferencia_nc_vs_txt_pendiente: number;
    diferencia_nc_vs_txt_total: number;
    alerta_discrepancia: boolean;
    observacion: string;
  };
  formas_seniat: FormaSeniatSummary[];
  notas_credito: NotaCreditoItem[];
}

@Injectable()
export class NotasCreditoService {
  private readonly logger = new Logger(NotasCreditoService.name);

  constructor(private readonly db: DatabaseService) {}

  async getNotasCredito(
    fecha: string,
    banco?: string,
    expediente?: string,
  ): Promise<NotasCreditoResponse> {
    if (!fecha) {
      throw new BadRequestException('El parámetro fecha (YYYY-MM-DD) es requerido');
    }

    try {
      // 1. Consulta de Notas de Crédito
      let ncsSql = `
        SELECT 
          NOCR_CODIGO,
          TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION,
          INFN_CODIGO,
          TO_CHAR(FECHA_REGISTRO, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_REGISTRO,
          TO_CHAR(FECHA_BCV, 'YYYY-MM-DD') AS FECHA_BCV,
          TO_CHAR(FECHA_ENTERAR_BCV, 'YYYY-MM-DD') AS FECHA_ENTERAR_BCV,
          NVL(MONTO, 0) AS MONTO,
          NVL(MONTO_EFECTIVO, 0) AS MONTO_EFECTIVO,
          NVL(MONTO_CHEQUE, 0) AS MONTO_CHEQUE,
          NVL(MONTO_BONO, 0) AS MONTO_BONO,
          NVL(MONTO_CERTIFICADO, 0) AS MONTO_CERTIFICADO,
          NVL(MONTO_DPN, 0) AS MONTO_DPN,
          NVL(MONTO_DIVISAS, 0) AS MONTO_DIVISAS,
          NVL(MONTO_RETENIDO, 0) AS MONTO_RETENIDO,
          EXPEDIENTE,
          WORKITEM,
          ANHO,
          INFN_CODIGO_CTAT,
          CTAT_ID
        FROM ORG_LIQ.NOTA_CREDITO_PLN
        WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
      `;
      const ncsBinds: any = { fecha };

      if (banco && banco !== 'TODOS' && banco.trim() !== '') {
        ncsSql += ` AND INFN_CODIGO = :banco`;
        ncsBinds.banco = banco.trim();
      }

      if (expediente && expediente.trim() !== '') {
        ncsSql += ` AND (EXPEDIENTE = :expediente OR (WORKITEM IS NOT NULL AND WORKITEM IN (SELECT WORKITEM FROM ORG_LIQ.PLANILLA WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') AND EXPEDIENTE = :expediente AND WORKITEM IS NOT NULL)))`;
        ncsBinds.expediente = Number(expediente);
      }

      ncsSql += ` ORDER BY EXPEDIENTE ASC, NOCR_CODIGO ASC`;

      const rawNcs = await this.db.executeQuery<any>(ncsSql, ncsBinds);

      const notasCredito: NotaCreditoItem[] = rawNcs.map((r) => ({
        nocr_codigo: r.NOCR_CODIGO,
        fecha_recaudacion: r.FECHA_RECAUDACION,
        infn_codigo: r.INFN_CODIGO,
        fecha_registro: r.FECHA_REGISTRO,
        fecha_bcv: r.FECHA_BCV,
        fecha_enterar_bcv: r.FECHA_ENTERAR_BCV,
        monto: Number(r.MONTO || 0),
        monto_efectivo: Number(r.MONTO_EFECTIVO || 0),
        monto_cheque: Number(r.MONTO_CHEQUE || 0),
        monto_bono: Number(r.MONTO_BONO || 0),
        monto_certificado: Number(r.MONTO_CERTIFICADO || 0),
        monto_dpn: Number(r.MONTO_DPN || 0),
        monto_divisas: Number(r.MONTO_DIVISAS || 0),
        monto_retenido: Number(r.MONTO_RETENIDO || 0),
        expediente: Number(r.EXPEDIENTE || 0),
        workitem: Number(r.WORKITEM || 0),
        anho: Number(r.ANHO || 0),
        infn_codigo_ctat: r.INFN_CODIGO_CTAT || '',
        ctat_id: r.CTAT_ID || '',
      }));

      // Totales calculados de NCs
      const totalesNc = notasCredito.reduce(
        (acc, item) => {
          acc.cantidad += 1;
          acc.monto_total += item.monto;
          acc.monto_efectivo += item.monto_efectivo;
          acc.monto_cheque += item.monto_cheque;
          acc.monto_otros +=
            item.monto_bono +
            item.monto_certificado +
            item.monto_dpn +
            item.monto_divisas;
          return acc;
        },
        {
          cantidad: 0,
          monto_total: 0,
          monto_efectivo: 0,
          monto_cheque: 0,
          monto_otros: 0,
        },
      );

      // 2. Consulta comparativa en TXT_SENIAT
      let seniatSql = `
        SELECT 
          COUNT(*) AS TOTAL_PLANILLAS,
          NVL(SUM(NVL(MONTO_EFECTIVO, 0) + NVL(MONTO_OTROS_PAGOS, 0)), 0) AS TOTAL_MONTO,
          NVL(SUM(CASE WHEN ESTADO = 1 THEN NVL(MONTO_EFECTIVO, 0) + NVL(MONTO_OTROS_PAGOS, 0) ELSE 0 END), 0) AS MONTO_CONCILIADO,
          NVL(SUM(CASE WHEN ESTADO IS NULL THEN NVL(MONTO_EFECTIVO, 0) + NVL(MONTO_OTROS_PAGOS, 0) ELSE 0 END), 0) AS MONTO_PENDIENTE,
          COUNT(CASE WHEN ESTADO = 1 THEN 1 END) AS PLANILLAS_CONCILIADAS,
          COUNT(CASE WHEN ESTADO IS NULL THEN 1 END) AS PLANILLAS_PENDIENTES
        FROM ORG_LIQ.TXT_SENIAT
        WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
      `;
      const seniatBinds: any = { fecha };

      if (banco && banco !== 'TODOS' && banco.trim() !== '') {
        seniatSql += ` AND INFN_CODIGO = :banco`;
        seniatBinds.banco = banco.trim();
      }

      const rawSeniat = await this.db.executeQuery<any>(seniatSql, seniatBinds);
      const seniatRow = rawSeniat[0] || {};

      // 2.1. Detección de registros duplicados idénticos en TXT_SENIAT
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
      const dupsBinds: any = { fecha };
      if (banco && banco !== 'TODOS' && banco.trim() !== '') {
        dupsSql += ` AND T.INFN_CODIGO = :banco`;
        dupsBinds.banco = banco.trim();
      }
      dupsSql += ` GROUP BY T.PLANILLA, T.FORMA_CODIGO, T.MONTO_EFECTIVO, T.AGENCIA_CODIGO HAVING COUNT(*) > 1 ORDER BY T.MONTO_EFECTIVO DESC`;

      const rawDups = await this.db.executeQuery<any>(dupsSql, dupsBinds);
      let planillasDuplicadasCount = 0;
      let montoDuplicadas = 0;
      const duplicadosDetalle: DuplicadoTxtItem[] = (rawDups || []).map((d: any) => {
        const rep = Number(d.REPETICIONES || 1);
        const monto = Number(d.MONTO_EFECTIVO || 0);
        const sobrantes = rep - 1;
        planillasDuplicadasCount += sobrantes;
        montoDuplicadas += monto * sobrantes;
        return {
          planilla: String(d.PLANILLA),
          forma_codigo: String(d.FORMA_CODIGO),
          monto,
          agencia: String(d.AGENCIA_CODIGO || ''),
          repeticiones: rep,
          monto_excedente: Number((monto * sobrantes).toFixed(2)),
        };
      });

      const totalPendientesBrutas = Number(seniatRow.PLANILLAS_PENDIENTES || 0);
      const montoPendienteBruto = Number(seniatRow.MONTO_PENDIENTE || 0);
      const planillasPendientesUnicas = Math.max(0, totalPendientesBrutas - planillasDuplicadasCount);
      const montoPendienteUnico = Math.max(0, Number((montoPendienteBruto - montoDuplicadas).toFixed(2)));

      const totalesSeniat = {
        total_planillas: Number(seniatRow.TOTAL_PLANILLAS || 0),
        total_monto: Number(seniatRow.TOTAL_MONTO || 0),
        monto_conciliado: Number(seniatRow.MONTO_CONCILIADO || 0),
        monto_pendiente: montoPendienteBruto,
        planillas_conciliadas: Number(seniatRow.PLANILLAS_CONCILIADAS || 0),
        planillas_pendientes: totalPendientesBrutas,
        planillas_pendientes_unicas: planillasPendientesUnicas,
        monto_pendiente_unico: montoPendienteUnico,
        planillas_duplicadas_count: planillasDuplicadasCount,
        monto_duplicadas: Number(montoDuplicadas.toFixed(2)),
        duplicados: duplicadosDetalle,
      };

      // 3. Desglose de formas en TXT_SENIAT
      let formasSql = `
        SELECT 
          NVL(FORMA_CODIGO, 'DESCONOCIDA') AS FORMA_CODIGO,
          COUNT(*) AS CANTIDAD,
          NVL(SUM(NVL(MONTO_EFECTIVO, 0) + NVL(MONTO_OTROS_PAGOS, 0)), 0) AS MONTO_TOTAL,
          NVL(SUM(CASE WHEN ESTADO = 1 THEN NVL(MONTO_EFECTIVO, 0) + NVL(MONTO_OTROS_PAGOS, 0) ELSE 0 END), 0) AS MONTO_CONCILIADO,
          NVL(SUM(CASE WHEN ESTADO IS NULL THEN NVL(MONTO_EFECTIVO, 0) + NVL(MONTO_OTROS_PAGOS, 0) ELSE 0 END), 0) AS MONTO_PENDIENTE
        FROM ORG_LIQ.TXT_SENIAT
        WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
      `;
      const formasBinds: any = { fecha };

      if (banco && banco !== 'TODOS' && banco.trim() !== '') {
        formasSql += ` AND INFN_CODIGO = :banco`;
        formasBinds.banco = banco.trim();
      }

      formasSql += ` GROUP BY FORMA_CODIGO ORDER BY MONTO_PENDIENTE DESC`;

      const rawFormas = await this.db.executeQuery<any>(formasSql, formasBinds);
      const formasSeniat: FormaSeniatSummary[] = rawFormas.map((f) => ({
        forma_codigo: f.FORMA_CODIGO,
        cantidad: Number(f.CANTIDAD || 0),
        monto_total: Number(f.MONTO_TOTAL || 0),
        monto_conciliado: Number(f.MONTO_CONCILIADO || 0),
        monto_pendiente: Number(f.MONTO_PENDIENTE || 0),
      }));

      // 4. Consulta de lo Transcrito en ORG_LIQ.PLANILLA (Expediente / Lotes)
      let planSql = `
        SELECT 
          COUNT(*) AS CANTIDAD_TRANSCRITA,
          NVL(SUM(NVL(MONTO, 0)), 0) AS MONTO_TOTAL_TRANSCRITO,
          NVL(SUM(NVL(MONTO_EFECTIVO, 0)), 0) AS MONTO_EFECTIVO_TRANSCRITO,
          NVL(SUM(NVL(MONTO, 0) - NVL(MONTO_EFECTIVO, 0)), 0) AS MONTO_CHEQUE_OTROS_TRANSCRITO,
          COUNT(DISTINCT EXPEDIENTE) AS CANT_EXPEDIENTES,
          COUNT(DISTINCT LOTE_SEQ) AS CANT_LOTES
        FROM ORG_LIQ.PLANILLA
        WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
      `;
      const planBinds: any = { fecha };

      if (banco && banco !== 'TODOS' && banco.trim() !== '') {
        planSql += ` AND INFN_CODIGO = :banco`;
        planBinds.banco = banco.trim();
      }

      if (expediente && expediente.trim() !== '') {
        planSql += ` AND (EXPEDIENTE = :expediente OR (WORKITEM IS NOT NULL AND WORKITEM IN (SELECT WORKITEM FROM ORG_LIQ.NOTA_CREDITO_PLN WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') AND EXPEDIENTE = :expediente AND WORKITEM IS NOT NULL)))`;
        planBinds.expediente = Number(expediente);
      }

      const rawPlan = await this.db.executeQuery<any>(planSql, planBinds);
      const planRow = rawPlan[0] || {};

      // Desglose por expediente en PLANILLA
      let planExpSql = `
        SELECT 
          EXPEDIENTE,
          COUNT(*) AS CANTIDAD,
          NVL(SUM(NVL(MONTO, 0)), 0) AS MONTO_TOTAL,
          NVL(SUM(NVL(MONTO_EFECTIVO, 0)), 0) AS MONTO_EFECTIVO,
          COUNT(DISTINCT LOTE_SEQ) AS CANT_LOTES
        FROM ORG_LIQ.PLANILLA
        WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD')
      `;
      const planExpBinds: any = { fecha };
      if (banco && banco !== 'TODOS' && banco.trim() !== '') {
        planExpSql += ` AND INFN_CODIGO = :banco`;
        planExpBinds.banco = banco.trim();
      }
      if (expediente && expediente.trim() !== '') {
        planExpSql += ` AND (EXPEDIENTE = :expediente OR (WORKITEM IS NOT NULL AND WORKITEM IN (SELECT WORKITEM FROM ORG_LIQ.NOTA_CREDITO_PLN WHERE FECHA_RECAUDACION = TO_DATE(:fecha, 'YYYY-MM-DD') AND EXPEDIENTE = :expediente AND WORKITEM IS NOT NULL)))`;
        planExpBinds.expediente = Number(expediente);
      }
      planExpSql += ` GROUP BY EXPEDIENTE ORDER BY EXPEDIENTE ASC`;

      const rawPlanExps = await this.db.executeQuery<any>(planExpSql, planExpBinds);
      const expedientesTranscritos: ExpedienteTranscritoItem[] = (rawPlanExps || []).map((e: any) => ({
        expediente: Number(e.EXPEDIENTE || 0),
        cantidad: Number(e.CANTIDAD || 0),
        monto_total: Number(Number(e.MONTO_TOTAL || 0).toFixed(2)),
        monto_efectivo: Number(Number(e.MONTO_EFECTIVO || 0).toFixed(2)),
        cant_lotes: Number(e.CANT_LOTES || 0),
      }));

      const totalesTranscrito: TotalesTranscrito = {
        cantidad: Number(planRow.CANTIDAD_TRANSCRITA || 0),
        monto_total: Number(Number(planRow.MONTO_TOTAL_TRANSCRITO || 0).toFixed(2)),
        monto_efectivo: Number(Number(planRow.MONTO_EFECTIVO_TRANSCRITO || 0).toFixed(2)),
        monto_cheque_otros: Number(Number(planRow.MONTO_CHEQUE_OTROS_TRANSCRITO || 0).toFixed(2)),
        cant_lotes: Number(planRow.CANT_LOTES || 0),
        expedientes: expedientesTranscritos,
      };

      // 5. Diagnóstico, Cuadre General y Análisis de Brecha
      const montoNc = Number(totalesNc.monto_total.toFixed(2));
      const montoTranscrito = totalesTranscrito.monto_total;
      const montoTxtTotal = Number(totalesSeniat.total_monto.toFixed(2));
      const montoTxtPendiente = totalesSeniat.monto_pendiente_unico;

      const difNcVsTranscrito = Number((montoNc - montoTranscrito).toFixed(2));
      const difNcVsTotalDia = Number((montoNc - montoTxtTotal).toFixed(2));
      const difProyectada = Number((montoNc - (montoTranscrito + montoTxtPendiente)).toFixed(2));
      const difPendiente = Number((montoNc - montoTxtPendiente).toFixed(2));
      const tieneBrecha = Math.abs(difNcVsTotalDia) > 0.01;

      const avanceTranscrito = montoNc > 0
        ? Number(((montoTranscrito / montoNc) * 100).toFixed(2))
        : (montoTxtTotal > 0 ? Number(((montoTranscrito / montoTxtTotal) * 100).toFixed(2)) : 0);

      let estadoCuadre: 'CUADRADO' | 'EN_PROCESO' | 'DISCREPANCIA' = 'CUADRADO';
      if (Math.abs(difNcVsTotalDia) > 0.01) {
        estadoCuadre = 'DISCREPANCIA';
      } else if (Math.abs(difNcVsTranscrito) > 0.01) {
        estadoCuadre = 'EN_PROCESO';
      }

      const comparacionGeneral: ComparacionGeneral = {
        monto_nc: montoNc,
        monto_transcrito: montoTranscrito,
        monto_txt_total: montoTxtTotal,
        monto_txt_pendiente: montoTxtPendiente,
        diferencia_nc_vs_transcrito: difNcVsTranscrito,
        diferencia_nc_vs_total_dia: difNcVsTotalDia,
        diferencia_proyectada_cierre: difProyectada,
        porcentaje_avance_transcrito: avanceTranscrito,
        estado_cuadre: estadoCuadre,
      };

      let observacion = '';
      if (planillasDuplicadasCount > 0) {
        observacion = `Aviso de Duplicados en TXT: Se detectaron ${planillasDuplicadasCount} registros duplicados idénticos en el archivo transmitido (Bs. ${montoDuplicadas.toLocaleString('es-VE', { minimumFractionDigits: 2 })}). El total bruto de ${totalPendientesBrutas.toLocaleString('es-VE')} registros consolida ${planillasPendientesUnicas.toLocaleString('es-VE')} planillas únicas listas para conciliar por Bs. ${montoPendienteUnico.toLocaleString('es-VE', { minimumFractionDigits: 2 })}.`;
      } else if (!tieneBrecha && totalesNc.cantidad > 0) {
        observacion = `Conciliación perfecta del día: Las Notas de Crédito emitidas (Bs. ${montoNc.toLocaleString('es-VE', { minimumFractionDigits: 2 })}) cubren exactamente el 100% del archivo bancario. Actualmente se han transcrito Bs. ${montoTranscrito.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (${avanceTranscrito}%), restando Bs. ${montoTxtPendiente.toLocaleString('es-VE', { minimumFractionDigits: 2 })} en el expediente.`;
      } else if (totalesNc.cantidad === 0 && totalesSeniat.total_planillas > 0) {
        observacion = 'No se registran Notas de Crédito bancarias para los criterios seleccionados en esta fecha.';
      } else {
        // Chequeo de formas particulares como 99044 (aduanas)
        const formaAduana = formasSeniat.find((f) => f.forma_codigo === '99044');
        if (formaAduana && formaAduana.monto_pendiente > 0) {
          observacion = `Existe presencia de Forma Aduanera 99044 por Bs. ${formaAduana.monto_pendiente.toLocaleString('es-VE', { minimumFractionDigits: 2 })}, la cual habitualmente ingresa por expedientes o cuentas especiales de aduana.`;
        } else {
          observacion = `Discrepancia de Bs. ${Math.abs(difNcVsTotalDia).toLocaleString('es-VE', { minimumFractionDigits: 2 })} entre lo enterado en Notas de Crédito (Bs. ${montoNc.toLocaleString('es-VE', { minimumFractionDigits: 2 })}) y el archivo total transmitido del día (Bs. ${montoTxtTotal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}). Transcrito actual: Bs. ${montoTranscrito.toLocaleString('es-VE', { minimumFractionDigits: 2 })}.`;
        }
      }

      return {
        fecha,
        banco: banco || null,
        expediente: expediente || null,
        totales_nc: {
          cantidad: totalesNc.cantidad,
          monto_total: Number(totalesNc.monto_total.toFixed(2)),
          monto_efectivo: Number(totalesNc.monto_efectivo.toFixed(2)),
          monto_cheque: Number(totalesNc.monto_cheque.toFixed(2)),
          monto_otros: Number(totalesNc.monto_otros.toFixed(2)),
        },
        totales_seniat: {
          total_planillas: totalesSeniat.total_planillas,
          total_monto: Number(totalesSeniat.total_monto.toFixed(2)),
          monto_conciliado: Number(totalesSeniat.monto_conciliado.toFixed(2)),
          monto_pendiente: Number(totalesSeniat.monto_pendiente.toFixed(2)),
          planillas_conciliadas: totalesSeniat.planillas_conciliadas,
          planillas_pendientes: totalesSeniat.planillas_pendientes,
          planillas_pendientes_unicas: totalesSeniat.planillas_pendientes_unicas,
          monto_pendiente_unico: totalesSeniat.monto_pendiente_unico,
          planillas_duplicadas_count: totalesSeniat.planillas_duplicadas_count,
          monto_duplicadas: totalesSeniat.monto_duplicadas,
          duplicados: totalesSeniat.duplicados,
        },
        totales_transcrito: totalesTranscrito,
        comparacion_general: comparacionGeneral,
        brecha: {
          diferencia_nc_vs_txt_pendiente: Number(difPendiente.toFixed(2)),
          diferencia_nc_vs_txt_total: Number(difNcVsTotalDia.toFixed(2)),
          alerta_discrepancia: tieneBrecha,
          observacion,
        },
        formas_seniat: formasSeniat,
        notas_credito: notasCredito,
      };
    } catch (err: any) {
      this.logger.error(`Error al consultar Notas de Crédito (${fecha}, banco: ${banco}):`, err);
      throw err;
    }
  }

  async getNotaCreditoDetalle(codigo: string) {
    if (!codigo) {
      throw new BadRequestException('El código de Nota de Crédito es requerido');
    }

    try {
      const sql = `
        SELECT 
          NOCR_CODIGO,
          TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION,
          INFN_CODIGO,
          TO_CHAR(FECHA_REGISTRO, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_REGISTRO,
          TO_CHAR(FECHA_BCV, 'YYYY-MM-DD') AS FECHA_BCV,
          TO_CHAR(FECHA_ENTERAR_BCV, 'YYYY-MM-DD') AS FECHA_ENTERAR_BCV,
          NVL(MONTO, 0) AS MONTO,
          NVL(MONTO_EFECTIVO, 0) AS MONTO_EFECTIVO,
          NVL(MONTO_CHEQUE, 0) AS MONTO_CHEQUE,
          NVL(MONTO_BONO, 0) AS MONTO_BONO,
          NVL(MONTO_CERTIFICADO, 0) AS MONTO_CERTIFICADO,
          NVL(MONTO_DPN, 0) AS MONTO_DPN,
          NVL(MONTO_DIVISAS, 0) AS MONTO_DIVISAS,
          NVL(MONTO_RETENIDO, 0) AS MONTO_RETENIDO,
          EXPEDIENTE,
          WORKITEM,
          ANHO,
          INFN_CODIGO_CTAT,
          CTAT_ID
        FROM ORG_LIQ.NOTA_CREDITO_PLN
        WHERE NOCR_CODIGO = :codigo
      `;
      const res = await this.db.executeQuery<any>(sql, { codigo });
      if (!res || res.length === 0) {
        return null;
      }
      const item = res[0];

      // Buscar lotes asociados al expediente si existe
      let lotes: any[] = [];
      if (item.EXPEDIENTE) {
        try {
          const lotesSql = `
            SELECT LOTE_ID, LOTE_SEQ, TOTAL_PLN, ESTADO, EXPEDIENTE, INFN_CODIGO, AGENCIA_CODIGO
            FROM ORG_LIQ.LOTE
            WHERE EXPEDIENTE = :expediente
          `;
          lotes = await this.db.executeQuery<any>(lotesSql, { expediente: item.EXPEDIENTE });
        } catch (loteErr) {
          this.logger.warn(`No se pudieron consultar lotes para expediente ${item.EXPEDIENTE}:`, loteErr);
        }
      }

      return {
        nota_credito: {
          nocr_codigo: item.NOCR_CODIGO,
          fecha_recaudacion: item.FECHA_RECAUDACION,
          infn_codigo: item.INFN_CODIGO,
          fecha_registro: item.FECHA_REGISTRO,
          fecha_bcv: item.FECHA_BCV,
          fecha_enterar_bcv: item.FECHA_ENTERAR_BCV,
          monto: Number(item.MONTO || 0),
          monto_efectivo: Number(item.MONTO_EFECTIVO || 0),
          monto_cheque: Number(item.MONTO_CHEQUE || 0),
          monto_bono: Number(item.MONTO_BONO || 0),
          monto_certificado: Number(item.MONTO_CERTIFICADO || 0),
          monto_dpn: Number(item.MONTO_DPN || 0),
          monto_divisas: Number(item.MONTO_DIVISAS || 0),
          monto_retenido: Number(item.MONTO_RETENIDO || 0),
          expediente: Number(item.EXPEDIENTE || 0),
          workitem: Number(item.WORKITEM || 0),
          anho: Number(item.ANHO || 0),
          infn_codigo_ctat: item.INFN_CODIGO_CTAT || '',
          ctat_id: item.CTAT_ID || '',
        },
        lotes_asociados: lotes,
      };
    } catch (err: any) {
      this.logger.error(`Error al consultar detalle de NC ${codigo}:`, err);
      throw err;
    }
  }
}
