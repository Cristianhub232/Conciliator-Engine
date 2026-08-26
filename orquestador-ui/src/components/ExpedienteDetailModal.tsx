"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  FolderOpen, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Loader2, 
  AlertCircle
} from 'lucide-react';

interface ExpedienteDetailModalProps {
  expedienteId: string | number | null;
  anho?: string | number;
  onClose: () => void;
}

export const ExpedienteDetailModal: React.FC<ExpedienteDetailModalProps> = ({
  expedienteId,
  anho = 2024,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'lotes' | 'conciliadas' | 'pendientes'>('lotes');

  useEffect(() => {
    if (!expedienteId) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`/api/orquestador/auditoria/expediente/${expedienteId}?anho=${anho}`);
        if (res.data.status === 200) {
          setData(res.data);
        } else {
          setError(res.data.error || 'Error al cargar expediente');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [expedienteId, anho]);

  if (!expedienteId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* ── Modal Header ── */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="app-logo-mark" style={{ width: '32px', height: '32px' }}>
              <FolderOpen size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Expediente #{expedienteId}
                </h3>
                <span className="badge badge-info">Ejercicio {anho}</span>
              </div>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                Detalle de lotes y conciliación en SIGECOF
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn-ghost btn-sm" style={{ padding: '6px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="modal-body">
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 'var(--fs-sm)' }}>Consultando datos del expediente en Oracle...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '16px', background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-md)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* KPIs Header */}
              <div className="kpi-strip" style={{ marginBottom: '20px' }}>
                <div className="kpi-item">
                  <span className="kpi-number">{data.lotes?.length || 0}</span>
                  <span className="kpi-label">Total Lotes</span>
                </div>
                <div className="kpi-divider"></div>
                <div className="kpi-item">
                  <span className="kpi-number" style={{ color: 'var(--success)' }}>{data.resumen?.total_conciliadas || 0}</span>
                  <span className="kpi-label">Conciliadas (PLANILLA)</span>
                </div>
                <div className="kpi-divider"></div>
                <div className="kpi-item">
                  <span className="kpi-number" style={{ color: 'var(--warning)' }}>{data.resumen?.total_pendientes || 0}</span>
                  <span className="kpi-label">Pendientes (TXT_SENIAT)</span>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="tab-nav">
                <button
                  onClick={() => setSubTab('lotes')}
                  className={`tab-nav-btn ${subTab === 'lotes' ? 'active' : ''}`}
                >
                  <Layers size={14} />
                  Lotes ({data.lotes?.length || 0})
                </button>
                <button
                  onClick={() => setSubTab('conciliadas')}
                  className={`tab-nav-btn ${subTab === 'conciliadas' ? 'active' : ''}`}
                >
                  <CheckCircle2 size={14} />
                  Conciliadas ({data.conciliadas?.length || 0})
                </button>
                <button
                  onClick={() => setSubTab('pendientes')}
                  className={`tab-nav-btn ${subTab === 'pendientes' ? 'active' : ''}`}
                >
                  <Clock size={14} />
                  Pendientes ({data.pendientes?.length || 0})
                </button>
              </div>

              {/* Sub-tab Content */}
              {subTab === 'lotes' && (
                <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Lote ID</th>
                        <th>Secuencia (SEQ)</th>
                        <th>Banco / Agencia</th>
                        <th>Fecha Recaudación</th>
                        <th>Total Declaradas</th>
                        <th>Conciliadas</th>
                        <th>Pendientes</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lotes?.map((l: any, i: number) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{l.LOTE_ID}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{l.LOTE_SEQ}</td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{l.INFN_CODIGO}</span> - {l.AGENCIA_CODIGO}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{l.FECHA_RECAUDACION}</td>
                          <td style={{ fontWeight: 700 }}>{l.TOTAL_PLN}</td>
                          <td style={{ fontWeight: 700, color: 'var(--success)' }}>{l.conciliadas}</td>
                          <td style={{ fontWeight: 700, color: 'var(--warning)' }}>{l.pendientes}</td>
                          <td>
                            <span className={`badge ${l.ESTADO === 'P' ? 'badge-warning' : 'badge-success'}`}>
                              {l.ESTADO === 'P' ? 'Pendiente' : l.ESTADO}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {subTab === 'conciliadas' && (
                <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>SEQ</th>
                        <th>Planilla ID</th>
                        <th>RIF / Contribuyente</th>
                        <th>Forma</th>
                        <th>Monto (Bs)</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.conciliadas?.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No hay planillas conciliadas en este expediente.
                          </td>
                        </tr>
                      ) : (
                        data.conciliadas?.map((p: any, i: number) => (
                          <tr key={i}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{p.PLAN_SEQ}</td>
                            <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{p.PLANILLA_ID}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{p.IDENT_CNTB || 'N/A'}</td>
                            <td>
                              <span className="badge badge-info">{p.FORMA_CODIGO}</span>
                            </td>
                            <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                              {Number(p.MONTO).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{p.FECHA_RECAUDACION}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {subTab === 'pendientes' && (
                <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Planilla ID</th>
                        <th>RIF</th>
                        <th>Forma</th>
                        <th>Monto (Bs)</th>
                        <th>Banco / Agencia</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pendientes?.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--success)', fontWeight: 600 }}>
                            ¡Todas las planillas de este expediente han sido conciliadas!
                          </td>
                        </tr>
                      ) : (
                        data.pendientes?.map((p: any, i: number) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{p.PLANILLA_ID}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{p.RIF || 'N/A'}</td>
                            <td>
                              <span className="badge badge-warning">{p.FORMA_CODIGO}</span>
                            </td>
                            <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>
                              {Number(p.MONTO).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                            </td>
                            <td style={{ fontSize: 'var(--fs-xs)' }}>
                              {p.INFN_CODIGO} - {p.AGENCIA_CODIGO}
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{p.FECHA_RECAUDACION}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* ── Modal Footer ── */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">
            Cerrar Detalle
          </button>
        </div>

      </div>
    </div>
  );
};
