"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { 
  FolderGit2, 
  Search, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  AlertCircle,
  Eye
} from 'lucide-react';
import { ExpedienteDetailModal } from './ExpedienteDetailModal';

export const ExpedientesExplorerView: React.FC = () => {
  const [expedienteId, setExpedienteId] = useState('7440');
  const [anho, setAnho] = useState('2024');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModalExpId, setSelectedModalExpId] = useState<string | number | null>(null);

  const quickExpedientes = ['7440', '7638', '1819', '1271', '7666'];

  const handleSearch = async (e?: React.FormEvent, targetExp?: string) => {
    if (e) e.preventDefault();
    const exp = (targetExp || expedienteId).trim();
    if (!exp) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await axios.get(`/api/orquestador/auditoria/expediente/${exp}?anho=${anho}`);
      if (res.data.status === 200) {
        setData(res.data);
      } else {
        setError(res.data.error || 'Expediente no encontrado');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al consultar expediente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '100%', padding: 0 }}>
      {/* ── Topbar / Page Head ── */}
      <header className="app-topbar">
        <div className="app-topbar-left">
          <div className="app-logo-mark">
            <FolderGit2 size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="app-title">Explorador de Expedientes</h1>
            <p className="app-subtitle">Inspección de Lotes Bancarios y Planillas · ORG_LIQ</p>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Frecuentes:</span>
          {quickExpedientes.map((exp) => (
            <button
              key={exp}
              onClick={() => { setExpedienteId(exp); handleSearch(undefined, exp); }}
              className={`btn btn-sm ${expedienteId === exp && data ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              #{exp}
            </button>
          ))}
        </div>
      </header>

      {/* ── Search Form ── */}
      <section className="search-panel">
        <form onSubmit={(e) => handleSearch(e)} className="search-box">
          <div className="field">
            <label className="field-label">Número de Expediente</label>
            <div className="input-affix">
              <FolderGit2 size={15} />
              <input
                type="text"
                value={expedienteId}
                onChange={(e) => setExpedienteId(e.target.value)}
                placeholder="Ej. 7440"
                className="input-field mono"
                required
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Ejercicio Fiscal</label>
            <select
              value={anho}
              onChange={(e) => setAnho(e.target.value)}
              className="input-field"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ height: '44px' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spinner" />
                Buscando...
              </>
            ) : (
              <>
                <Search size={16} />
                Buscar Expediente
              </>
            )}
          </button>
        </form>
      </section>

      {/* ── Error Notification ── */}
      {error && (
        <div style={{ padding: '16px', background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-md)', color: 'var(--danger)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span style={{ fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* ── Results Area ── */}
      {data && (
        <div className="results-area">
          {/* KPI Strip */}
          <div className="kpi-strip">
            <div className="kpi-item">
              <span className="kpi-number" style={{ color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>#{data.expediente_id}</span>
              <span className="kpi-label">Expediente ID</span>
            </div>
            <div className="kpi-divider"></div>
            <div className="kpi-item">
              <span className="kpi-number">{data.lotes?.length || 0}</span>
              <span className="kpi-label">Lotes Asociados</span>
            </div>
            <div className="kpi-divider"></div>
            <div className="kpi-item">
              <span className="kpi-number" style={{ color: 'var(--success)' }}>{data.resumen?.total_conciliadas || 0}</span>
              <span className="kpi-label">Planillas Conciliadas (BD)</span>
            </div>
            <div className="kpi-divider"></div>
            <div className="kpi-item">
              <span className="kpi-number" style={{ color: 'var(--warning)' }}>{data.resumen?.total_pendientes || 0}</span>
              <span className="kpi-label">Pendientes Físicas (TXT)</span>
            </div>
          </div>

          {/* Tabla de Lotes del Expediente */}
          <section className="table-section">
            <div className="table-header-custom" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-1)' }}>
              <div>
                <h4 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Desglose de Lotes del Expediente #{data.expediente_id}
                </h4>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                  Lotes bancarios registrados en ORG_LIQ.LOTE para el ejercicio {anho}
                </p>
              </div>

              <button
                onClick={() => setSelectedModalExpId(data.expediente_id)}
                className="btn btn-primary btn-sm"
              >
                <Eye size={14} />
                Ver Planillas al Detalle
              </button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Lote ID</th>
                    <th>Secuencia (LOTE_SEQ)</th>
                    <th>Banco / Agencia</th>
                    <th>Fecha Recaudación</th>
                    <th>Total Declaradas</th>
                    <th>Conciliadas (BD)</th>
                    <th>Pendientes (TXT)</th>
                    <th>Estado Lote</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lotes?.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No se encontraron lotes para este expediente en el año seleccionado.
                      </td>
                    </tr>
                  ) : (
                    data.lotes?.map((lote: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{lote.LOTE_ID}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{lote.LOTE_SEQ}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lote.INFN_CODIGO}</span> - {lote.AGENCIA_CODIGO}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{lote.FECHA_RECAUDACION}</td>
                        <td style={{ fontWeight: 700 }}>{lote.TOTAL_PLN}</td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>{lote.conciliadas}</td>
                        <td style={{ fontWeight: 700, color: 'var(--warning)' }}>{lote.pendientes}</td>
                        <td>
                          <span className={`badge ${lote.ESTADO === 'P' ? 'badge-warning' : 'badge-success'}`}>
                            {lote.ESTADO === 'P' ? 'Pendiente' : lote.ESTADO}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Modal */}
      {selectedModalExpId && (
        <ExpedienteDetailModal
          expedienteId={selectedModalExpId}
          anho={anho}
          onClose={() => setSelectedModalExpId(null)}
        />
      )}
    </div>
  );
};
