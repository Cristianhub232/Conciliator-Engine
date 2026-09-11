'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  FolderCheck, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  UserCheck, 
  Search, 
  ShieldCheck, 
  ArrowRight,
  Layers,
  Calendar,
  Building2,
  FileCheck2,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getBancoLabel } from '../services/bancosCatalog';

export interface AnalistaRevisor {
  users_id: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  status: string;
  ultima_asignacion: string;
  total_asignados: number;
}

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
  const [analistas, setAnalistas] = useState<AnalistaRevisor[]>([]);
  const [loadingAnalistas, setLoadingAnalistas] = useState(false);
  const [selectedAnalista, setSelectedAnalista] = useState<string>('');
  const [searchAnalista, setSearchAnalista] = useState('');
  const [observacion, setObservacion] = useState('Expediente conciliado al 100% y transferido a fase de validación');
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

  // Cargar lista de analistas revisores al abrir modal
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccessResult(null);
      setSubmitting(false);
      return;
    }

    const fetchAnalistas = async () => {
      setLoadingAnalistas(true);
      setError(null);
      try {
        const res = await axios.get('/api/orquestador/planillas/analistas-revisores');
        if (res.data?.success && Array.isArray(res.data.analistas)) {
          setAnalistas(res.data.analistas);
          // Si no hay analista seleccionado, pre-seleccionar el primero más activo
          if (res.data.analistas.length > 0 && !selectedAnalista) {
            setSelectedAnalista(res.data.analistas[0].users_id);
          }
        }
      } catch (err: any) {
        console.error('Error cargando analistas revisores:', err);
        setError('No se pudo cargar la lista de analistas revisores desde SIGECOF.');
      } finally {
        setLoadingAnalistas(false);
      }
    };

    fetchAnalistas();
  }, [isOpen]);

  // Analistas filtrados por búsqueda
  const analistasFiltrados = useMemo(() => {
    if (!searchAnalista.trim()) return analistas;
    const term = searchAnalista.toLowerCase().trim();
    return analistas.filter(
      a =>
        a.nombre_completo.toLowerCase().includes(term) ||
        a.users_id.toLowerCase().includes(term) ||
        a.nombre.toLowerCase().includes(term) ||
        a.apellido.toLowerCase().includes(term)
    );
  }, [analistas, searchAnalista]);

  const analistaActual = useMemo(() => {
    return analistas.find(a => a.users_id === selectedAnalista);
  }, [analistas, selectedAnalista]);

  if (!isOpen) return null;

  const handleCerrarExpediente = async (e: React.FormEvent) => {
    e.preventDefault();
    const expNum = parseInt(expedienteNumero.trim(), 10);
    if (!expNum || isNaN(expNum)) {
      setError('Debe especificar un número de expediente válido.');
      return;
    }

    if (!selectedAnalista) {
      setError('Debe seleccionar el analista revisor para la siguiente fase.');
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
        analista_asignado: selectedAnalista,
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
        style={{ maxWidth: '680px', width: '92vw', borderRadius: '16px', overflow: 'hidden' }}
      >
        {/* ── Modal Header ── */}
        <div 
          className="modal-header" 
          style={{ 
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', 
            color: '#ffffff',
            padding: '20px 24px',
            borderBottom: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '10px', 
                background: 'rgba(255, 255, 255, 0.15)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: 'inset 0 0 12px rgba(255, 255, 255, 0.1)'
              }}
            >
              <FolderCheck size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
                  Cerrar Expediente y Pasar a Validación
                </h3>
                <span 
                  style={{ 
                    fontSize: '11px', 
                    padding: '2px 8px', 
                    borderRadius: '20px', 
                    background: 'rgba(59, 130, 246, 0.3)', 
                    border: '1px solid rgba(147, 197, 253, 0.4)',
                    color: '#dbeafe', 
                    fontWeight: 700 
                  }}
                >
                  Tarea 2062
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#bfdbfe', margin: '3px 0 0 0' }}>
                Validar Conciliación de Ingreso · SIGECOF Workflow Oficial
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
                ¡Expediente Cerrado y Transferido con Éxito!
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 24px auto' }}>
                El expediente fue completado en la fase de conciliación y ha sido transferido en Oracle Workflow para su validación oficial.
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
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>NUEVO WORK ITEM</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#2563eb' }}>
                    Item #{successResult.workitem_nuevo}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>ANALISTA REVISOR</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {successResult.analista_nombre || successResult.analista_asignado}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{successResult.analista_asignado}</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>FASE DE DESTINO</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>
                    Validar Conciliación de Ingreso
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Tarea ID 2062 · Plazo: 3 días</div>
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
                  <strong>Verificación de Integridad Aprobada:</strong> Todos los lotes del expediente se validarán en estado <strong>'V'</strong> en <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 4px', borderRadius: '3px' }}>ORG_LIQ.LOTE</code> y se certificará que no existan planillas pendientes.
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

              {/* Campo Expediente (Editable si no se detectó o se quiere ajustar) */}
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

              {/* Selector de Analista Revisor */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserCheck size={14} color="#2563eb" />
                    Asignar Analista Revisor para Validación <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Fase: Validar Conciliación de Ingreso
                  </span>
                </div>

                {loadingAnalistas ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <Loader2 size={20} className="spinner" style={{ margin: '0 auto 8px auto' }} />
                    <span style={{ fontSize: '12px' }}>Cargando analistas activos en SIGECOF...</span>
                  </div>
                ) : (
                  <div>
                    {/* Input buscador rápido de analistas */}
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <Search 
                        size={14} 
                        color="var(--text-muted)" 
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} 
                      />
                      <input
                        type="text"
                        placeholder="Buscar analista por nombre o usuario..."
                        value={searchAnalista}
                        onChange={e => setSearchAnalista(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', paddingLeft: '32px', fontSize: '12.5px', height: '34px' }}
                      />
                    </div>

                    {/* Lista scrollable de opciones de analistas */}
                    <div 
                      style={{ 
                        maxHeight: '175px', 
                        overflowY: 'auto', 
                        border: '1px solid var(--border-color, #e2e8f0)', 
                        borderRadius: '10px',
                        background: 'var(--bg-main, #ffffff)'
                      }}
                    >
                      {analistasFiltrados.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                          No se encontraron analistas con "{searchAnalista}"
                        </div>
                      ) : (
                        analistasFiltrados.map(a => {
                          const isSelected = selectedAnalista === a.users_id;
                          return (
                            <div
                              key={a.users_id}
                              onClick={() => setSelectedAnalista(a.users_id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 12px',
                                borderBottom: '1px solid var(--border-color, #f1f5f9)',
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div 
                                  style={{ 
                                    width: '28px', 
                                    height: '28px', 
                                    borderRadius: '50%', 
                                    background: isSelected ? '#2563eb' : 'var(--border-color, #e2e8f0)', 
                                    color: isSelected ? '#ffffff' : 'var(--text-primary)',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 700
                                  }}
                                >
                                  {a.nombre ? a.nombre.charAt(0) : a.users_id.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontSize: '12.5px', fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary)' }}>
                                    {a.nombre_completo}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Usuario: <span style={{ fontWeight: 600 }}>{a.users_id}</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span 
                                  style={{ 
                                    fontSize: '10.5px', 
                                    padding: '2px 6px', 
                                    borderRadius: '6px', 
                                    background: isSelected ? 'rgba(37, 99, 235, 0.15)' : '#f1f5f9', 
                                    color: isSelected ? '#1d4ed8' : '#64748b',
                                    fontWeight: 600
                                  }}
                                >
                                  {a.total_asignados} asignados
                                </span>
                                {isSelected && <CheckCircle2 size={16} color="#2563eb" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Campo Observaciones */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Observaciones de Pase (Opcional)
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
                  disabled={submitting || !selectedAnalista || !expedienteNumero}
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
                      Validando y Cerrando...
                    </>
                  ) : (
                    <>
                      <FolderCheck size={16} />
                      Cerrar y Transferir a Validación
                      <ArrowRight size={14} />
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
