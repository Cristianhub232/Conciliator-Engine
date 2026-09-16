'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FolderCheck, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Layers, 
  Calendar, 
  Building2, 
  FileCheck2,
  Lock,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getBancoLabel } from '../services/bancosCatalog';

interface CerrarExpedienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: number | string | null;
  anho: number;
  fecha: string;
  banco: string;
  totalPlanillasConciliadas?: number;
  montoTotalConciliado?: number;
  onCierreSuccess?: (result: any) => void;
}

export const CerrarExpedienteModal: React.FC<CerrarExpedienteModalProps> = ({
  isOpen,
  onClose,
  expediente,
  anho,
  fecha,
  banco,
  totalPlanillasConciliadas = 0,
  montoTotalConciliado = 0,
  onCierreSuccess,
}) => {
  const { usuario } = useAuth();
  const [observacion, setObservacion] = useState('Expediente conciliado y cerrado satisfactoriamente');
  const [expedienteNumero, setExpedienteNumero] = useState<string>(expediente ? String(expediente) : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Sincronizar expediente si cambia prop
  useEffect(() => {
    if (expediente) {
      setExpedienteNumero(String(expediente));
    }
  }, [expediente]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccessResult(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCerrarExpediente = async (e: React.FormEvent) => {
    e.preventDefault();
    const expNum = parseInt(expedienteNumero.trim(), 10);
    if (!expNum || isNaN(expNum)) {
      setError('Debe especificar un número de expediente válido.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const userOperador = usuario
      ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.email
      : 'BOT_ORQUESTADOR';

    try {
      const res = await axios.post('/api/orquestador/planillas/cerrar-expediente', {
        expediente: expNum,
        anho: Number(anho) || new Date(fecha).getFullYear() || 2024,
        usuario_operador: userOperador,
        observacion: observacion.trim(),
        fecha_recaudacion: fecha,
        banco: banco,
      });

      if (res.data?.success) {
        setSuccessResult(res.data);
        if (onCierreSuccess) {
          onCierreSuccess(res.data);
        }
      } else {
        setError(res.data?.mensaje || 'Error al procesar el cierre del expediente.');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Error de comunicación con el servidor.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '620px', width: '92vw', borderRadius: '16px', overflow: 'hidden' }}
      >
        {/* ── Modal Header ── */}
        <div 
          className="modal-header" 
          style={{ 
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', 
            color: '#ffffff',
            padding: '20px 24px',
            borderBottom: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: 'rgba(255, 255, 255, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: 'inset 0 0 12px rgba(255, 255, 255, 0.1)'
              }}
            >
              <FolderCheck size={24} color="#60a5fa" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
                  Cierre de Expediente
                </h3>
                <span 
                  style={{ 
                    fontSize: '11px', 
                    padding: '2px 8px', 
                    borderRadius: '20px', 
                    background: 'rgba(34, 197, 94, 0.25)', 
                    border: '1px solid rgba(74, 222, 128, 0.4)',
                    color: '#86efac', 
                    fontWeight: 700 
                  }}
                >
                  UPDATE In-Situ
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0 0' }}>
                Actualización atómica en SIGECOF: WF_EXPEDIENTE a 'CERRADO' y lotes a 'V'
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="btn-ghost btn-sm" 
            style={{ color: '#ffffff', opacity: 0.8, padding: '6px' }}
            disabled={submitting}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="modal-body" style={{ padding: '24px', maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
          {successResult ? (
            /* Vista de Éxito */
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div 
                style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: 'rgba(34, 197, 94, 0.15)', 
                  color: '#16a34a',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  border: '2px solid rgba(34, 197, 94, 0.3)'
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                ¡Expediente Cerrado Exitosamente!
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 24px auto' }}>
                Se actualizó la cabecera en SIGECOF Workflow y se validaron todos los lotes sin generar inserciones duplicadas.
              </p>

              <div 
                style={{ 
                  background: 'var(--bg-card, #f8fafc)', 
                  border: '1px solid var(--border-color, #e2e8f0)', 
                  borderRadius: '12px', 
                  padding: '16px 20px', 
                  textAlign: 'left',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  marginBottom: '24px'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>EXPEDIENTE</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    #{successResult.expediente} <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>({successResult.anho})</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>ESTADO CABECERA</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#16a34a' }}>
                    CERRADO
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>WF_EXPEDIENTE.EXP_ESTADO</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>LOTES VALIDADOS</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {successResult.lotes_actualizados || successResult.total_lotes} lote(s) en 'V'
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>ORG_LIQ.LOTE.ESTADO</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PLANILLAS CONCILIADAS</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {successResult.total_planillas || totalPlanillasConciliadas} registros
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>100% Verificado</div>
                </div>
              </div>

              <button 
                type="button" 
                onClick={onClose}
                className="btn btn-primary"
                style={{ minWidth: '180px', margin: '0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <CheckCircle2 size={16} />
                Aceptar y Finalizar
              </button>
            </div>
          ) : (
            /* Formulario de Cierre */
            <form onSubmit={handleCerrarExpediente}>
              {/* Tarjetas de Resumen del Expediente */}
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  gap: '10px', 
                  marginBottom: '16px' 
                }}
              >
                <div 
                  style={{ 
                    background: 'var(--bg-card, #f8fafc)', 
                    border: '1px solid var(--border-color, #e2e8f0)', 
                    borderRadius: '10px', 
                    padding: '10px 12px' 
                  }}
                >
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Layers size={12} /> EXPEDIENTE
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>
                    #{expedienteNumero || '—'}
                  </div>
                </div>

                <div 
                  style={{ 
                    background: 'var(--bg-card, #f8fafc)', 
                    border: '1px solid var(--border-color, #e2e8f0)', 
                    borderRadius: '10px', 
                    padding: '10px 12px' 
                  }}
                >
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> FECHA / AÑO
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {fecha} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({anho})</span>
                  </div>
                </div>

                <div 
                  style={{ 
                    background: 'var(--bg-card, #f8fafc)', 
                    border: '1px solid var(--border-color, #e2e8f0)', 
                    borderRadius: '10px', 
                    padding: '10px 12px' 
                  }}
                >
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={12} /> BANCO
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getBancoLabel(banco)}
                  </div>
                </div>

                <div 
                  style={{ 
                    background: 'var(--bg-card, #f8fafc)', 
                    border: '1px solid var(--border-color, #e2e8f0)', 
                    borderRadius: '10px', 
                    padding: '10px 12px' 
                  }}
                >
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileCheck2 size={12} /> CONCILIADAS
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                    {totalPlanillasConciliadas} <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>plns</span>
                  </div>
                </div>
              </div>

              {/* Badge de Verificación y Control Previo */}
              <div 
                style={{ 
                  background: 'rgba(34, 197, 94, 0.08)', 
                  border: '1px solid rgba(34, 197, 94, 0.25)', 
                  borderRadius: '10px', 
                  padding: '12px 16px', 
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <ShieldCheck size={22} color="#16a34a" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '12.5px', lineHeight: '1.4', color: '#15803d' }}>
                  <strong>Regla de Negocio Aplicada:</strong> El cierre se efectúa mediante <strong>actualización in-situ</strong> sobre el registro activo. No se realiza inserción de registros nuevos. Se actualizará la cabecera en <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 4px', borderRadius: '3px' }}>WF_EXPEDIENTE</code> a 'CERRADO' y los lotes a 'V'.
                </div>
              </div>

              {/* Mensaje de Error si aplica */}
              {error && (
                <div 
                  style={{ 
                    background: '#fef2f2', 
                    border: '1px solid #fecaca', 
                    borderRadius: '10px', 
                    padding: '12px 16px', 
                    color: '#991b1b', 
                    fontSize: '13px', 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '10px', 
                    marginBottom: '20px' 
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Validación Rechazada:</strong> {error}
                  </div>
                </div>
              )}

              {/* Campo Expediente (Editable si no se detectó) */}
              {!expediente && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Número de Expediente <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={expedienteNumero}
                    onChange={e => setExpedienteNumero(e.target.value)}
                    placeholder="Ej: 7638"
                    required
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              {/* Campo Observaciones */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  <FileText size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                  Observación de Cierre
                </label>
                <textarea
                  value={observacion}
                  onChange={e => setObservacion(e.target.value)}
                  placeholder="Nota o detalle sobre el cierre del expediente..."
                  rows={2}
                  className="input-field"
                  style={{ width: '100%', resize: 'none', fontSize: '12.5px' }}
                />
              </div>

              {/* Footer de Botones */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end', 
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-color, #e2e8f0)'
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="btn btn-ghost"
                  style={{ fontSize: '13px' }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting || !expedienteNumero}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 700,
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      Cerrando Expediente...
                    </>
                  ) : (
                    <>
                      <FolderCheck size={16} />
                      Confirmar Cierre de Expediente
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
