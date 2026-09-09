"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { 
  AlertTriangle, 
  X, 
  Lock, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  FileText, 
  Check, 
  Copy, 
  Key, 
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

interface PlanillasAtributosNullModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    total: number;
    monto_total: number;
    formas_detectadas: string[];
    planillas: PlanillaAtributoNullItem[];
  } | null;
  fecha: string;
  banco: string;
  expediente?: string;
  onSuccessConciliacion?: () => void;
}

export const PlanillasAtributosNullModal: React.FC<PlanillasAtributosNullModalProps> = ({
  isOpen,
  onClose,
  data,
  fecha,
  banco,
  expediente,
  onSuccessConciliacion
}) => {
  const { usuario } = useAuth();

  // Selección de planillas
  const [selectedPlanillas, setSelectedPlanillas] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal de autorización con clave
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [motivo, setMotivo] = useState('');
  const [authorizing, setAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !data) return null;

  const planillas = data.planillas || [];

  // Toggle seleccionar todas
  const handleToggleSelectAll = () => {
    if (selectedPlanillas.size === planillas.length) {
      setSelectedPlanillas(new Set());
    } else {
      setSelectedPlanillas(new Set(planillas.map(p => p.planilla_id)));
    }
  };

  const handleTogglePlanilla = (id: string) => {
    const next = new Set(selectedPlanillas);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPlanillas(next);
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatBs = (num: number) => {
    return Number(num || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Planillas seleccionadas activas
  const targetPlanillas = selectedPlanillas.size > 0
    ? planillas.filter(p => selectedPlanillas.has(p.planilla_id))
    : planillas;

  const montoSeleccionado = targetPlanillas.reduce((acc, p) => acc + (p.monto || 0), 0);

  // Ejecución de Mapeo y Conciliación con Clave
  const handleProcederConciliacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setAuthError('Por favor ingrese su clave de autorización.');
      return;
    }

    setAuthorizing(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    try {
      const userEmail = usuario?.email || 'operador@ont.gob.ve';

      const payload = {
        usuario_email: userEmail,
        password_autorizacion: password,
        motivo: motivo.trim() || 'Conciliación especial de planillas con atributos NULL / Forma 99044',
        planillas: targetPlanillas.map(p => ({
          planilla_id: p.planilla_id,
          forma: p.forma,
          monto: p.monto,
          banco: p.banco,
          agencia: p.agencia,
          fecha_recaudacion: p.fecha_recaudacion,
          rif: p.rif,
          expediente: p.expediente,
          lote_id: p.lote_id,
          lote_seq: p.lote_seq
        }))
      };

      const res = await axios.post('/api/orquestador/planillas/conciliar-especiales', payload);

      if (res.data?.success) {
        setAuthSuccessMsg(res.data.mensaje);
        setTimeout(() => {
          setShowPasswordModal(false);
          setPassword('');
          setMotivo('');
          if (onSuccessConciliacion) onSuccessConciliacion();
          onClose();
        }, 2000);
      } else {
        setAuthError(res.data?.message || 'Error durante la conciliación especial.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error de autorización o conexión';
      setAuthError(msg);
    } finally {
      setAuthorizing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden'
      }}>
        {/* ── Modal Header ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 28px',
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFBEB'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#F59E0B',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)'
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#92400E' }}>
                  Planillas con Atributos NULL Detectadas
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: '#FEF3C7', color: '#B45309' }}>
                  Forma 99044 / No Vinculadas
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
                Fecha: <strong>{fecha}</strong> • Banco: <strong>{banco}</strong> {expediente ? `• Expediente: ${expediente}` : ''}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#92400E',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Modal KPI Bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px 28px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', letterSpacing: '0.06em' }}>PLANILLAS DETECTADAS</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', fontFamily: "'IBM Plex Mono', monospace", marginTop: '3px' }}>
              {data.total}
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', letterSpacing: '0.06em' }}>MONTO TOTAL ACUMULADO</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#D97706', fontFamily: "'IBM Plex Mono', monospace", marginTop: '3px' }}>
              Bs. {formatBs(data.monto_total)}
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', letterSpacing: '0.06em' }}>FORMAS DETECTADAS</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '5px' }}>
              {data.formas_detectadas.map((f: string) => (
                <span key={f} style={{ fontSize: '11px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: f === '99044' ? '#EDE9FE' : '#EFF6FF', color: f === '99044' ? '#7C3AED' : '#2563EB' }}>
                  Forma {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Table Container ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569', fontSize: '11px', fontWeight: 800 }}>
                <th style={{ padding: '10px 14px', width: '36px' }}>
                  <input
                    type="checkbox"
                    checked={selectedPlanillas.size === planillas.length && planillas.length > 0}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '10px 14px' }}>N° PLANILLA</th>
                <th style={{ padding: '10px 14px' }}>FORMA</th>
                <th style={{ padding: '10px 14px' }}>RIF / CONTRIBUYENTE</th>
                <th style={{ padding: '10px 14px' }}>AGENCIA</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>MONTO (BS)</th>
                <th style={{ padding: '10px 14px' }}>MOTIVO / ATRIBUTO DETECTADO</th>
              </tr>
            </thead>
            <tbody>
              {planillas.map((p, idx) => {
                const isSelected = selectedPlanillas.has(p.planilla_id);
                const is99044 = p.forma === '99044';
                return (
                  <tr
                    key={p.planilla_id || idx}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: isSelected ? '#EFF6FF' : is99044 ? '#FAF5FF' : idx % 2 === 0 ? '#ffffff' : '#FBFDFF'
                    }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTogglePlanilla(p.planilla_id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{p.planilla_id}</span>
                        <button
                          onClick={() => handleCopy(p.planilla_id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: copiedId === p.planilla_id ? '#16A34A' : '#94A3B8' }}
                        >
                          {copiedId === p.planilla_id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 800, color: is99044 ? '#7C3AED' : '#0F172A' }}>
                      Forma {p.forma}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace", color: '#475569' }}>
                      {p.rif || 'S/R'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      Agencia {p.agencia || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: '#0F172A' }}>
                      Bs. {formatBs(p.monto)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: is99044 ? '#EDE9FE' : '#FEF3C7', color: is99044 ? '#7C3AED' : '#B45309' }}>
                        {p.motivo_alerta}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Modal Footer ── */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            Seleccionadas: <strong>{targetPlanillas.length}</strong> de {planillas.length} planillas • Monto: <strong style={{ color: '#D97706', fontFamily: "'IBM Plex Mono', monospace" }}>Bs. {formatBs(montoSeleccionado)}</strong>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#475569',
                background: '#ffffff',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cerrar
            </button>

            <button
              onClick={() => setShowPasswordModal(true)}
              disabled={targetPlanillas.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 800,
                color: '#ffffff',
                background: '#D97706',
                border: 'none',
                borderRadius: '8px',
                cursor: targetPlanillas.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
              }}
            >
              <Lock size={15} />
              Mapear y Conciliar ({targetPlanillas.length}) con Clave
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL DE AUTORIZACIÓN POR CLAVE ── */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', background: '#FFFBEB', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: '#F59E0B', color: '#ffffff', borderRadius: '8px' }}>
                <Key size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#92400E' }}>
                  Autorización de Seguridad Requerida
                </h4>
                <div style={{ fontSize: '11.5px', color: '#B45309' }}>
                  Conciliación especial de {targetPlanillas.length} planillas con atributos NULL
                </div>
              </div>
            </div>

            <form onSubmit={handleProcederConciliacion} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {authError && (
                <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', fontSize: '12.5px', fontWeight: 600 }}>
                  {authError}
                </div>
              )}

              {authSuccessMsg && (
                <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', color: '#166534', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} /> {authSuccessMsg}
                </div>
              )}

              <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                <div>Usuario Operador: <strong>{usuario?.email || 'operador@ont.gob.ve'}</strong></div>
                <div style={{ marginTop: '4px' }}>Monto a Imputar: <strong style={{ color: '#D97706', fontFamily: "'IBM Plex Mono', monospace" }}>Bs. {formatBs(montoSeleccionado)}</strong></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>
                  MOTIVO / JUSTIFICACIÓN DE LA CONCILIACIÓN
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej. Imputación especial de Forma 99044 autorizada..."
                  style={{
                    height: '38px',
                    padding: '0 12px',
                    fontSize: '13px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>
                  CLAVE DE AUTORIZACIÓN DE SEGURIDAD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña de usuario"
                  required
                  autoFocus
                  style={{
                    height: '38px',
                    padding: '0 12px',
                    fontSize: '13px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    outline: 'none',
                    fontFamily: "'IBM Plex Mono', monospace"
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={authorizing}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#64748B',
                    background: '#ffffff',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={authorizing || !password}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#ffffff',
                    background: '#D97706',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: authorizing || !password ? 'not-allowed' : 'pointer'
                  }}
                >
                  {authorizing && <Loader2 size={14} className="animate-spin" />}
                  {authorizing ? 'Conciliando...' : 'Confirmar y Conciliar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
