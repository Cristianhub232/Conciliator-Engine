"use client";

import React from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export interface MapeoResumenData {
  tipo: 'MAPEO';
  total: number;
  exitosas: number;
  fallidas: number;
  montoTotal: number;
  desgloseFormas: Array<{
    forma: string;
    cantidad: number;
    monto: number;
    auditada: boolean;
  }>;
}

export interface ConciliacionResumenData {
  tipo: 'CONCILIACION';
  total: number;
  exitosas: number;
  fallidas: number;
  montoTotal: number;
  lotesCerrados: string[];
  lotesAfectados: Array<{
    loteId: number;
    loteSeq: number;
    exitosas: number;
    cerrado: boolean;
  }>;
}

export type ResumenOperacionData = MapeoResumenData | ConciliacionResumenData;

interface ResumenOperacionModalProps {
  data: ResumenOperacionData | null;
  onClose: () => void;
  onProcederConciliar?: () => void;
}

export const ResumenOperacionModal: React.FC<ResumenOperacionModalProps> = ({
  data,
  onClose,
  onProcederConciliar
}) => {
  if (!data) return null;

  const esMapeo = data.tipo === 'MAPEO';
  const esConciliacion = data.tipo === 'CONCILIACION';
  const tieneLotesCerrados = esConciliacion && data.lotesCerrados.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '100%',
          borderRadius: '16px',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
          background: '#ffffff',
          overflow: 'hidden'
        }}
      >
        {/* ── Header ── */}
        <div 
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: esMapeo 
              ? 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)' 
              : 'linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                background: esMapeo ? '#EEF2FF' : '#DCFCE7',
                color: esMapeo ? '#4F46E5' : '#16A34A',
                boxShadow: esMapeo ? '0 2px 8px rgba(79, 70, 229, 0.15)' : '0 2px 8px rgba(22, 163, 74, 0.15)'
              }}
            >
              {esMapeo ? <Sparkles size={22} /> : <CheckCircle2 size={24} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
                {esMapeo ? 'Mapeo Presupuestario Completado' : 'Conciliación en Oracle Finalizada'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
                {esMapeo 
                  ? 'Partidas presupuestarias asignadas según catálogo' 
                  : 'Registros insertados y validados transaccionalmente'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="modal-close-btn"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'grid',
              placeItems: 'center',
              border: 'none',
              background: 'transparent',
              color: '#94A3B8',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#FFFFFF' }}>
          
          {/* Banner especial si se cerró lote a estado 'V' */}
          {tieneLotesCerrados && (
            <div 
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <div 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#10B981',
                  color: '#FFFFFF',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  marginTop: '1px'
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#065F46' }}>
                  🎉 ¡Lote Cerrado Formalmente a ESTADO = 'V'!
                </div>
                <div style={{ fontSize: '12.5px', color: '#047857', marginTop: '3px', lineHeight: 1.4 }}>
                  Al completarse el 100% de las planillas requeridas, el motor actualizó automáticamente la cabecera en <strong>ORG_LIQ.LOTE</strong>.
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {data.lotesCerrados.map((lote, idx) => (
                    <span 
                      key={idx}
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '6px',
                        background: '#047857',
                        color: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCircle2 size={12} /> {lote}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tarjetas de Métricas Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {/* Card 1: Planillas */}
            <div 
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Planillas
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
                  {data.exitosas}
                </span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                  / {data.total}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
                {data.exitosas === data.total ? '✓ 100% procesadas' : `${data.total - data.exitosas} pendientes`}
              </span>
            </div>

            {/* Card 2: Monto Total */}
            <div 
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Monto Total
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Bs. {data.montoTotal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                Bolívares efectivos
              </span>
            </div>

            {/* Card 3: Formas o Lotes */}
            <div 
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {esMapeo ? 'Formas' : 'Lotes'}
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
                {esMapeo ? (data as MapeoResumenData).desgloseFormas.length : (data as ConciliacionResumenData).lotesAfectados.length}
              </div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                {esMapeo ? 'reglas activas' : tieneLotesCerrados ? 'con lote cerrado' : 'lotes impactados'}
              </span>
            </div>
          </div>

          {/* Desglose Detallado */}
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {esMapeo ? 'Desglose por Forma Tributaria' : 'Desglose por Lote'}
            </div>

            <div 
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                overflow: 'hidden',
                maxHeight: '180px',
                overflowY: 'auto'
              }}
            >
              {esMapeo && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Forma</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Planillas</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Monto (Bs)</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Auditoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data as MapeoResumenData).desgloseFormas.map((f, i) => (
                      <tr key={i} style={{ borderBottom: i < (data as MapeoResumenData).desgloseFormas.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1E293B' }}>
                          <span style={{ padding: '2px 6px', background: '#EEF2FF', color: '#4338CA', borderRadius: '4px' }}>
                            {f.forma}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                          {f.cantidad}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>
                          {f.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {f.auditada ? (
                            <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
                              ✓ Auditada
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                              ⚠ Por Auditar
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {esConciliacion && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Lote</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Planillas Conciliadas</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Estado Lote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data as ConciliacionResumenData).lotesAfectados.map((l, i) => (
                      <tr key={i} style={{ borderBottom: i < (data as ConciliacionResumenData).lotesAfectados.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1E293B' }}>
                          Lote {l.loteId} <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>(SEQ: {l.loteSeq})</span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#16A34A' }}>
                          {l.exitosas} planillas
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          {l.cerrado ? (
                            <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: '11.5px' }}>
                              ✓ Cerrado (V)
                            </span>
                          ) : (
                            <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: '11.5px' }}>
                              ⏳ Pendiente (P)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Advertencia si hubo fallas */}
          {data.fallidas > 0 && (
            <div 
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '12.5px',
                color: '#991B1B'
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>{data.fallidas} planilla(s)</strong> no pudieron ser procesadas. Revisa las celdas con error en la tabla para más detalle.
              </span>
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div 
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button 
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            {esMapeo && onProcederConciliar ? 'Volver a Tabla' : 'Entendido, Continuar'}
          </button>

          {esMapeo && onProcederConciliar && data.exitosas > 0 && (
            <button 
              type="button"
              onClick={() => {
                onClose();
                onProcederConciliar();
              }}
              className="btn btn-sm"
              style={{
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(180deg, #2E7D4F 0%, #246B42 100%)',
                color: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(46, 125, 79, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <span>Proceder a Conciliar ({data.exitosas})</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
