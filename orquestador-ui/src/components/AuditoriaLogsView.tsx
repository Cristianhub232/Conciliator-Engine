"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileCheck, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  RotateCcw, 
  Loader2, 
  AlertCircle,
  FileCode2,
  ShieldCheck
} from 'lucide-react';

export const AuditoriaLogsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<'ALL' | 'CONCILIACION' | 'REVERSION'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/orquestador/auditoria/eventos?limit=250');
      if (res.data.status === 200) {
        setData(res.data);
      } else {
        setError(res.data.error || 'Error al leer auditoría');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const eventos = data?.eventos || [];

  const filtrados = eventos.filter((ev: any) => {
    const matchesAction = filterAction === 'ALL' || ev.accion === filterAction;
    const matchesSearch = 
      !searchTerm ||
      String(ev.planilla_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(ev.expediente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(ev.usuario || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAction && matchesSearch;
  });

  const totalConciliaciones = eventos.filter((e: any) => e.accion === 'CONCILIACION').length;
  const totalReversiones = eventos.filter((e: any) => e.accion === 'REVERSION').length;

  return (
    <div className="container" style={{ maxWidth: '100%', padding: 0 }}>
      {/* ── Topbar / Page Head ── */}
      <header className="app-topbar">
        <div className="app-topbar-left">
          <div className="app-logo-mark" style={{ background: 'var(--success)' }}>
            <ShieldCheck size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="app-title">Trazabilidad y Auditoría</h1>
            <p className="app-subtitle">Bitácora Inmutable de Conciliaciones y Reversiones · auditoria.json</p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn btn-ghost btn-sm"
        >
          <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          Actualizar Bitácora
        </button>
      </header>

      {/* ── KPI Strip ── */}
      <div className="kpi-strip" style={{ marginBottom: '24px' }}>
        <div className="kpi-item">
          <span className="kpi-number">{data?.total || 0}</span>
          <span className="kpi-label">Total Eventos Registrados</span>
        </div>
        <div className="kpi-divider"></div>
        <div className="kpi-item">
          <span className="kpi-number" style={{ color: 'var(--success)' }}>{totalConciliaciones}</span>
          <span className="kpi-label">Conciliaciones Atómicas</span>
        </div>
        <div className="kpi-divider"></div>
        <div className="kpi-item">
          <span className="kpi-number" style={{ color: 'var(--danger)' }}>{totalReversiones}</span>
          <span className="kpi-label">Reversiones Ejecutadas</span>
        </div>
      </div>

      {/* ── Filtros y Buscador ── */}
      <div className="filter-bar" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilterAction('ALL')}
            className={`btn btn-sm ${filterAction === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Todos ({eventos.length})
          </button>
          <button
            onClick={() => setFilterAction('CONCILIACION')}
            className={`btn btn-sm ${filterAction === 'CONCILIACION' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Conciliaciones ({totalConciliaciones})
          </button>
          <button
            onClick={() => setFilterAction('REVERSION')}
            className={`btn btn-sm ${filterAction === 'REVERSION' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Reversiones ({totalReversiones})
          </button>
        </div>

        <div style={{ width: '320px' }}>
          <input
            type="text"
            placeholder="Buscar por Planilla, Expediente o Usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field input-sm"
          />
        </div>
      </div>

      {/* ── Error Notification ── */}
      {error && (
        <div style={{ padding: '16px', background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-md)', color: 'var(--danger)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span style={{ fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* ── Table Section ── */}
      <section className="table-section">
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 'var(--fs-sm)' }}>Leyendo registros de auditoria.json...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Planilla ID</th>
                  <th>Expediente / Lote</th>
                  <th>Monto (Bs)</th>
                  <th>Usuario Operador</th>
                  <th>Detalles</th>
                  <th>Fecha y Hora (ISO)</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No hay eventos que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((ev: any, i: number) => {
                    const isConcil = ev.accion === 'CONCILIACION';
                    return (
                      <tr key={i}>
                        <td>
                          <span className={`badge ${isConcil ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {isConcil ? <CheckCircle2 size={12} /> : <RotateCcw size={12} />}
                            {ev.accion}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{ev.planilla_id}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                          {ev.expediente ? `Exp #${ev.expediente} (Lote ${ev.lote_id})` : 'N/A'}
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                          {ev.monto_total ? `${Number(ev.monto_total).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs` : 'N/A'}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--brand)', background: 'var(--brand-soft)', padding: '2px 6px', borderRadius: '4px' }}>
                            @{ev.usuario}
                          </span>
                        </td>
                        <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>{ev.detalles}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {ev.fecha_hora ? new Date(ev.fecha_hora).toLocaleString('es-VE') : 'N/A'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
