import { Injectable, Logger } from '@nestjs/common';
import { PlanillasService } from '../planillas/planillas.service';
import { DepuracionService } from '../depuracion/depuracion.service';
import { DatabaseService } from '../database/database.service';
import { 
  PipelineBatchOptions, 
  DiaBalanceInicial, 
  DiaBarridoFinal 
} from './pipeline.interface';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);
  private isRunning = false;
  private stopRequested = false;
  private catalogoBaseUrl = 'http://10.46.0.189:3000/api/v1';

  constructor(
    private readonly planillasService: PlanillasService,
    private readonly depuracionService: DepuracionService,
    private readonly db: DatabaseService
  ) {}

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public requestStop(): void {
    if (this.isRunning) {
      this.stopRequested = true;
      this.logger.warn('[PIPELINE] Detención de lote solicitada por el operador.');
    }
  }

  /**
   * Genera la lista de fechas consecutivas YYYY-MM-DD entre inicio y fin
   */
  private generarRangoFechas(inicio: string, fin: string): string[] {
    const fechas: string[] = [];
    const current = new Date(inicio + 'T00:00:00Z');
    const last = new Date(fin + 'T00:00:00Z');

    if (current > last) {
      return [inicio];
    }

    while (current <= last) {
      fechas.push(current.toISOString().split('T')[0]);
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return fechas;
  }

  /**
   * Resuelve la forma en el catálogo de reglas (10.46.0.189:3000)
   */
  private async resolverCatalogoForma(forma: string, monto: number, rif?: string): Promise<any> {
    const url = `${this.catalogoBaseUrl}/formas/${forma}/resolver`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto, rif: rif || '' }),
        signal: controller.signal
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Catálogo HTTP ${resp.status}: ${errorText || 'Regla no encontrada'}`);
      }

      const data = await resp.json();
      if (!data.asignaciones || data.asignaciones.length === 0) {
        throw new Error(`Forma ${forma} no tiene partidas asignadas configuradas`);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Ejecuta el pipeline secuencial día por día asegurando NO-CONCURRENCIA (Mutex)
   */
  async ejecutarLoteSecuencial(options: PipelineBatchOptions): Promise<{
    exito: boolean;
    mensaje: string;
    diasProcesados: DiaBarridoFinal[];
  }> {
    if (this.isRunning) {
      return {
        exito: false,
        mensaje: 'Ya existe un proceso de conciliación en ejecución. Espere a que culmine para evitar concurrencia.',
        diasProcesados: []
      };
    }

    this.isRunning = true;
    this.stopRequested = false;
    const { banco, fechaInicio, fechaFin = fechaInicio, operador = 'BOT_TELEGRAM', onMensaje } = options;
    const fechas = this.generarRangoFechas(fechaInicio, fechaFin);
    const diasProcesados: DiaBarridoFinal[] = [];

    this.logger.log(`[PIPELINE] Iniciando conciliación para Banco ${banco}. Días a procesar: ${fechas.length} (${fechas[0]} a ${fechas[fechas.length - 1]})`);

    try {
      for (let i = 0; i < fechas.length; i++) {
        if (this.stopRequested) {
          if (onMensaje) {
            await onMensaje(`🛑 Proceso detenido por el operador. Se procesaron ${i} de ${fechas.length} días.`, 'info');
          }
          break;
        }

        const fechaActual = fechas[i];
        this.logger.log(`[PIPELINE] >>> Procesando día ${i + 1}/${fechas.length}: ${fechaActual} (Banco ${banco})`);

        const resultadoDia = await this.procesarDia(fechaActual, banco, operador, onMensaje);
        diasProcesados.push(resultadoDia);

        // Pausa preventiva de 1 segundo entre días para liberar transacciones
        await new Promise(res => setTimeout(res, 1000));
      }

      return {
        exito: true,
        mensaje: `Lote completado exitosamente. Se procesaron ${diasProcesados.length} días.`,
        diasProcesados
      };
    } catch (err: any) {
      this.logger.error(`[PIPELINE] Error crítico en la ejecución del lote: ${err.message}`, err.stack);
      if (onMensaje) {
        await onMensaje(`❌ Error crítico en el lote: ${err.message}`, 'error');
      }
      return {
        exito: false,
        mensaje: `Error en la ejecución: ${err.message}`,
        diasProcesados
      };
    } finally {
      this.isRunning = false;
      this.stopRequested = false;
    }
  }

  /**
   * Procesa un único día de forma atómica y envía los 3 mensajes correspondientes
   */
  private async procesarDia(
    fecha: string,
    banco: string,
    operador: string,
    onMensaje?: (mensaje: string, tipo: 'inicial' | 'mapeo' | 'final' | 'info' | 'error') => Promise<void>
  ): Promise<DiaBarridoFinal> {
    
    // -------------------------------------------------------------
    // FASE 1: BÚSQUEDA Y BALANCE INICIAL
    // -------------------------------------------------------------
    // 1.1 Obtener planillas asignadas a workflow y huérfanas
    let planillas: any[] = [];
    try {
      const [resAsignadas, resHuerfanas] = await Promise.all([
        this.planillasService.getPendientes({ fecha, banco, estado_asignacion: 'ASIGNADAS', limit: 10000 }),
        this.planillasService.getPendientes({ fecha, banco, estado_asignacion: 'HUERFANAS', limit: 10000 })
      ]);

      const listaA = Array.isArray(resAsignadas) ? resAsignadas : ((resAsignadas as any)?.data || []);
      const listaH = Array.isArray(resHuerfanas) ? resHuerfanas : ((resHuerfanas as any)?.data || []);

      // Unificar por NRO_PLANILLA_FALTANTE
      const mapPlanillas = new Map<string, any>();
      listaA.forEach((p: any) => mapPlanillas.set(String(p.NRO_PLANILLA_FALTANTE), p));
      listaH.forEach((p: any) => mapPlanillas.set(String(p.NRO_PLANILLA_FALTANTE), p));
      planillas = Array.from(mapPlanillas.values());
    } catch (err: any) {
      this.logger.error(`[PIPELINE] Error consultando planillas del día ${fecha}: ${err.message}`);
      if (onMensaje) {
        await onMensaje(`⚠️ Error consultando planillas en Oracle para el día ${fecha}: ${err.message}`, 'error');
      }
      return this.crearBarridoVacio(fecha, banco);
    }

    if (planillas.length === 0) {
      if (onMensaje) {
        await onMensaje(`📅 Día ${fecha} | Banco ${banco}\nℹ️ No se encontraron planillas pendientes en Oracle para este día. Pasando al siguiente...`, 'inicial');
      }
      return this.crearBarridoVacio(fecha, banco);
    }

    // 1.2 Scan de Depuración en PostgreSQL / Oracle
    let depuracionScan: any = null;
    try {
      depuracionScan = await this.depuracionService.escanearLote(fecha, banco);
    } catch (e: any) {
      this.logger.warn(`[PIPELINE] Error en scan de depuración para ${fecha}: ${e.message}`);
    }

    const totalExpedientes = new Set(planillas.map(p => p.EXPEDIENTE).filter(Boolean)).size;
    const totalPlanillas = planillas.length;
    const totalPorDepurar = depuracionScan?.total_detectadas || 0;
    const montoTotalDia = planillas.reduce((acc, p) => acc + Number(p.MONTO_EFECTIVO || 0), 0);
    const formasDetectadas = Array.from(new Set(planillas.map(p => String(p.FORMA))));

    // MENSAJE 1: BALANCE INICIAL DEL DÍA
    if (onMensaje) {
      const msg1 = 
        `🔍 *Iniciando búsqueda de expediente del día ${fecha}*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏦 *Banco:* ${banco}\n` +
        `📂 *Expedientes con planillas pendientes:* ${totalExpedientes}\n` +
        `📄 *Total planillas pendientes:* ${totalPlanillas.toLocaleString('es-VE')}\n` +
        `🧹 *Pendientes por depurar:* ${totalPorDepurar.toLocaleString('es-VE')}\n` +
        `💰 *Total del día:* Bs. ${montoTotalDia.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      await onMensaje(msg1, 'inicial');
    }

    // -------------------------------------------------------------
    // FASE 2: DEPURACIÓN AUTOMÁTICA
    // -------------------------------------------------------------
    let formasDepuradasResultado: Array<{ forma: string; cantidad: number }> = [];
    let totalPlanillasDepuradas = 0;
    let montoTotalDepurado = 0;
    const idsDepurados = new Set<string>();

    if (totalPorDepurar > 0 && depuracionScan?.planillas?.length > 0) {
      try {
        const planillasIdsDepurar = depuracionScan.planillas.map((p: any) => String(p.planilla_id));
        const resDepuracion = await this.depuracionService.ejecutarDepuracionAutomatica(
          fecha,
          banco,
          planillasIdsDepurar,
          'Depuración automática ejecutada por Bot Telegram',
          operador
        );

        totalPlanillasDepuradas = resDepuracion.total_eliminadas;
        montoTotalDepurado = resDepuracion.monto_total;
        planillasIdsDepurar.forEach((id: string) => idsDepurados.add(id));

        // Desglose depuradas
        formasDepuradasResultado = (depuracionScan.desglose_por_forma || []).map((d: any) => ({
          forma: d.forma,
          cantidad: d.cantidad
        }));
      } catch (depErr: any) {
        this.logger.error(`[PIPELINE] Fallo en depuración automática: ${depErr.message}`);
      }
    }

    // Filtrar planillas que no hayan sido depuradas
    const planillasProcesables = planillas.filter(p => !idsDepurados.has(String(p.NRO_PLANILLA_FALTANTE)));

    // -------------------------------------------------------------
    // FASE 3: MAPEO DE FORMAS CON EXCLUSIÓN DE FALLOS
    // -------------------------------------------------------------
    if (onMensaje) {
      await onMensaje(`⚙️ *Iniciando mapeo de formas...*`, 'mapeo');
    }

    const formasValidasCache = new Map<string, any>();
    const formasFallidasSet = new Set<string>();
    const formasFallidasMotivo = new Map<string, string>();
    const planillasMapeadas: Array<{ planilla: any; asignaciones: any[] }> = [];

    for (const p of planillasProcesables) {
      const formaStr = String(p.FORMA);

      if (formasFallidasSet.has(formaStr)) {
        continue;
      }

      if (formasValidasCache.has(formaStr)) {
        const plantillaAsignaciones = formasValidasCache.get(formaStr);
        // Calcular montos proporcionales si es directa
        const asignaciones = this.calcularAsignaciones(plantillaAsignaciones, Number(p.MONTO_EFECTIVO));
        planillasMapeadas.push({ planilla: p, asignaciones });
        continue;
      }

      try {
        const resCatalogo = await this.resolverCatalogoForma(formaStr, Number(p.MONTO_EFECTIVO), p.RIF);
        formasValidasCache.set(formaStr, resCatalogo.asignaciones);
        planillasMapeadas.push({ planilla: p, asignaciones: resCatalogo.asignaciones });
      } catch (catErr: any) {
        formasFallidasSet.add(formaStr);
        formasFallidasMotivo.set(formaStr, catErr.message);
      }
    }

    // Si hubo formas fallidas, emitir aviso de exclusión
    if (formasFallidasSet.size > 0 && onMensaje) {
      const listaFallidas = Array.from(formasFallidasSet).join(', ');
      const planillasAfectadas = planillasProcesables.filter(p => formasFallidasSet.has(String(p.FORMA))).length;
      const msgAlerta = 
        `⚠️ *Atención en el Mapeo:*\n` +
        `Las formas [${listaFallidas}] (${planillasAfectadas} planillas) no pudieron ser mapeadas en el catálogo.\n` +
        `➡️ *Se procederá a realizar la conciliación excluyendo dichas formas.*`;
      await onMensaje(msgAlerta, 'mapeo');
    }

    // -------------------------------------------------------------
    // FASE 4: CONCILIACIÓN ATÓMICA EN ORACLE
    // -------------------------------------------------------------
    let totalConciliadasExito = 0;
    let montoConciliadoExito = 0;
    const planillasFallidasConciliacion: Array<{ planillaId: string; forma: string; error: string }> = [];

    for (const item of planillasMapeadas) {
      if (this.stopRequested) break;

      const p = item.planilla;
      try {
        const payload = {
          usuario_operador: operador,
          expediente: Number(p.EXPEDIENTE),
          lote_id: Number(p.LOTE_ID),
          lote_seq: Number(p.LOTE_SEQ),
          planilla_id: String(p.NRO_PLANILLA_FALTANTE),
          forma: String(p.FORMA),
          monto: Number(p.MONTO_EFECTIVO),
          banco: String(p.BANCO),
          agencia: String(p.AGENCIA),
          fecha_recaudacion: String(p.FECHA_RECAUDACION).split('T')[0],
          asignaciones: item.asignaciones.map((a: any) => ({
            partida: String(a.cod_partida || a.partida),
            monto: Number(a.monto)
          }))
        };

        await this.planillasService.conciliarPlanilla(payload);
        totalConciliadasExito++;
        montoConciliadoExito += Number(p.MONTO_EFECTIVO || 0);
      } catch (conErr: any) {
        planillasFallidasConciliacion.push({
          planillaId: String(p.NRO_PLANILLA_FALTANTE),
          forma: String(p.FORMA),
          error: conErr.message
        });
      }
    }

    // -------------------------------------------------------------
    // FASE 5: FINALIZACIÓN Y BARRIDO CONSOLIDADO DEL DÍA
    // -------------------------------------------------------------
    const formasMapeadas = Array.from(formasValidasCache.keys());
    const formasPendientesExcluidas: Array<{ forma: string; cantidad: number; motivo: string }> = [];

    for (const f of formasFallidasSet) {
      const cant = planillasProcesables.filter(p => String(p.FORMA) === f).length;
      formasPendientesExcluidas.push({
        forma: f,
        cantidad: cant,
        motivo: formasFallidasMotivo.get(f) || 'Sin regla de partida en catálogo'
      });
    }

    const barrido: DiaBarridoFinal = {
      fecha,
      banco,
      formasDepuradas: formasDepuradasResultado,
      totalPlanillasDepuradas,
      montoDepurado: Math.round(montoTotalDepurado * 100) / 100,
      formasMapeadas,
      totalPlanillasMapeadas: planillasMapeadas.length,
      totalConciliadasExito,
      montoConciliadoExito: Math.round(montoConciliadoExito * 100) / 100,
      planillasFallidasConciliacion,
      formasPendientesExcluidas
    };

    // MENSAJE 3: REPORTE DE BARRIDO FINAL DEL DÍA
    if (onMensaje) {
      const depuradasTexto = formasDepuradasResultado.length > 0
        ? formasDepuradasResultado.map(d => `${d.forma} (${d.cantidad})`).join(', ')
        : 'Ninguna';

      const mapeadasTexto = formasMapeadas.length > 0
        ? formasMapeadas.join(', ')
        : 'Ninguna';

      const excluidasTexto = formasPendientesExcluidas.length > 0
        ? formasPendientesExcluidas.map(e => `${e.forma} (${e.cantidad} planillas)`).join(', ')
        : 'Ninguna';

      const msg3 = 
        `✅ *Finalizada la conciliación del día ${fecha}*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 *BARRIDO DE LO SUCEDIDO:*\n` +
        `• *Formas depuradas:* ${depuradasTexto} (Total: ${totalPlanillasDepuradas})\n` +
        `• *Formas mapeadas:* ${mapeadasTexto} (Total: ${planillasMapeadas.length})\n` +
        `• *Planillas conciliadas en Oracle:* ${totalConciliadasExito.toLocaleString('es-VE')} (Bs. ${montoConciliadoExito.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n` +
        `• *Planillas pendientes / excluidas:* ${excluidasTexto}` +
        (planillasFallidasConciliacion.length > 0 ? `\n• ⚠️ Fallas en transacción Oracle: ${planillasFallidasConciliacion.length}` : '');

      await onMensaje(msg3, 'final');
    }

    return barrido;
  }

  private calcularAsignaciones(plantillaAsignaciones: any[], montoEfectivo: number): any[] {
    if (!plantillaAsignaciones || plantillaAsignaciones.length === 0) return [];
    if (plantillaAsignaciones.length === 1) {
      return [{
        cod_partida: plantillaAsignaciones[0].cod_partida || plantillaAsignaciones[0].partida,
        monto: montoEfectivo
      }];
    }
    const montoTotalPlantilla = plantillaAsignaciones.reduce((acc, a) => acc + Number(a.monto || 0), 0);
    if (montoTotalPlantilla === 0) {
      return plantillaAsignaciones.map(a => ({
        cod_partida: a.cod_partida || a.partida,
        monto: Math.round((montoEfectivo / plantillaAsignaciones.length) * 100) / 100
      }));
    }
    return plantillaAsignaciones.map(a => ({
      cod_partida: a.cod_partida || a.partida,
      monto: Math.round(((Number(a.monto) / montoTotalPlantilla) * montoEfectivo) * 100) / 100
    }));
  }

  private crearBarridoVacio(fecha: string, banco: string): DiaBarridoFinal {
    return {
      fecha,
      banco,
      formasDepuradas: [],
      totalPlanillasDepuradas: 0,
      montoDepurado: 0,
      formasMapeadas: [],
      totalPlanillasMapeadas: 0,
      totalConciliadasExito: 0,
      montoConciliadoExito: 0,
      planillasFallidasConciliacion: [],
      formasPendientesExcluidas: []
    };
  }
}
