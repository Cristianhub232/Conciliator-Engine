export interface PipelineBatchOptions {
  banco: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin?: string;   // YYYY-MM-DD
  operador?: string;
  onMensaje?: (mensaje: string, tipo: 'inicial' | 'mapeo' | 'final' | 'info' | 'error') => Promise<void>;
}

export interface DiaBalanceInicial {
  fecha: string;
  banco: string;
  totalExpedientes: number;
  totalPlanillas: number;
  totalPorDepurar: number;
  montoTotalDia: number;
  formasDetectadas: string[];
}

export interface DiaMapeoResultado {
  formasExitosas: string[];
  formasFallidas: string[];
  totalPlanillasExcluidas: number;
  detalleFallas: Record<string, string>;
}

export interface DiaBarridoFinal {
  fecha: string;
  banco: string;
  formasDepuradas: Array<{ forma: string; cantidad: number }>;
  totalPlanillasDepuradas: number;
  montoDepurado: number;
  formasMapeadas: string[];
  totalPlanillasMapeadas: number;
  totalConciliadasExito: number;
  montoConciliadoExito: number;
  planillasFallidasConciliacion: Array<{ planillaId: string; forma: string; error: string }>;
  formasPendientesExcluidas: Array<{ forma: string; cantidad: number; motivo: string }>;
}
