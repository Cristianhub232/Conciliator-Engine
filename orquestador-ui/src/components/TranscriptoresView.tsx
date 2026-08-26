"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { 
  Users, 
  Search, 
  UserCheck, 
  FolderOpen, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Loader2, 
  AlertCircle, 
  ExternalLink,
  Briefcase,
  Building
} from 'lucide-react';
import { ExpedienteDetailModal } from './ExpedienteDetailModal';

export const TranscriptoresView: React.FC = () => {
  const [usuario, setUsuario] = useState('KARENGUEVARA');
  const [anho, setAnho] = useState('2024');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtroExpediente, setFiltroExpediente] = useState('');
  const [selectedExpedienteId, setSelectedExpedienteId] = useState<string | number | null>(null);

  const quickUsers = ['KARENGUEVARA', 'MARELLANO_18', 'ZUILINGCOLMENAR', 'ADM_JDORIA'];

  const handleSearch = async (e?: React.FormEvent, userToSearch?: string) => {
    if (e) e.preventDefault();
    const targetUser = (userToSearch || usuario).trim();
    if (!targetUser) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await axios.get(`/api/orquestador/auditoria/transcriptor?usuario=${targetUser.toUpperCase()}&anho=${anho}`);
      if (res.data.status === 200) {
        setData(res.data);
      } else {
        setError(res.data.error || 'Usuario no encontrado');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al consultar auditoría');
    } finally {
      setLoading(false);
    }
  };

  const expedientesFiltrados = data?.expedientes?.filter((exp: any) =>
    String(exp.expediente_id).toLowerCase().includes(filtroExpediente.toLowerCase())
  );

  return (
    <div className="container" style={{ maxWidth: '100%', padding: 0 }}>
      {/* ── Topbar / Page Head ── */}
      <header className="app-topbar">
        <div className="app-topbar-left">
          <div className="app-logo-mark">
            <Users size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="app-title">Auditoría de Transcriptores</h1>
            <p className="app-subtitle">Control de Bandejas y Rendimiento · SIGECOF</p>
          </div>
        </div>
        
        {/* Accesos rápidos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Accesos:</span>
          {quickUsers.map((u) => (
            <button
              key={u}
              onClick={() => { setUsuario(u); handleSearch(undefined, u); }}
              className={`btn btn-sm ${usuario === u && data ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {u}
            </button>
          ))}
        </div>
      </header>

      {/* ── Search Form ── */}
      <section className="search-panel">
        <form onSubmit={(e) => handleSearch(e)} className="search-box">
          <div className="field">
            <label className="field-label">Usuario de Sistema (WF_USERS)</label>
            <div className="input-affix">
              <Users size={15} />
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ej. KARENGUEVARA"
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
                Consultando...
              </>
            ) : (
              <>
                <Search size={16} />
                Auditar Usuario
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
          {/* Perfil del Transcriptor + KPIs */}
          <div className="card">
            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: 'var(--r-lg)', background: 'var(--brand)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                  {data.perfil?.NOMBRE_CORTO ? data.perfil.NOMBRE_CORTO.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {data.perfil?.NOMBRE_COMPLETO || data.perfil?.NOMBRE_CORTO}
                    </h3>
                    <span className="badge badge-success">
                      {data.perfil?.ESTATUS_USUARIO === 'A' ? 'ACTIVO' : (data.perfil?.ESTATUS_USUARIO || 'ACTIVO')}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 600 }}>@{data.perfil?.USUARIO_SISTEMA}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={13} /> {data.perfil?.CARGO || 'Analista Conciliador'}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building size={13} /> Órgano {data.perfil?.CODIGO_ORGANO || '093'}</span>
                  </div>
                </div>
              </div>

              {/* KPIs de Rendimiento */}
              <div className="kpi-strip" style={{ margin: 0 }}>
                <div className="kpi-item">
                  <span className="kpi-number" style={{ color: 'var(--warning)' }}>{data.resumen?.total_expedientes_abiertos || 0}</span>
                  <span className="kpi-label">Expedientes Abiertos</span>
                </div>
                <div className="kpi-divider"></div>
                <div className="kpi-item">
                  <span className="kpi-number" style={{ color: 'var(--brand)' }}>{data.resumen?.total_lotes_abiertos || 0}</span>
                  <span className="kpi-label">Lotes en Bandeja</span>
                </div>
                <div className="kpi-divider"></div>
                <div className="kpi-item">
                  <span className="kpi-number" style={{ color: 'var(--success)' }}>{data.resumen?.total_expedientes_cerrados || 0}</span>
                  <span className="kpi-label">Expedientes Cerrados</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Expedientes */}
          <section className="table-section">
            <div className="table-header-custom" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-1)' }}>
              <div>
                <h4 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Expedientes Activos en Bandeja ({expedientesFiltrados?.length || 0})
                </h4>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                  Expedientes en estado ABIERTA o PENDIENTE para el ejercicio {anho}
                </p>
              </div>

              <div style={{ width: '240px' }}>
                <input
                  type="text"
                  placeholder="Filtrar por N° Expediente..."
                  value={filtroExpediente}
                  onChange={(e) => setFiltroExpediente(e.target.value)}
                  className="input-field input-sm"
                />
              </div>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Expediente</th>
                    <th>Fecha Asignación</th>
                    <th>Estado Tarea</th>
                    <th>Lotes Asociados</th>
                    <th>Planillas Declaradas</th>
                    <th style={{ textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientesFiltrados?.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No se encontraron expedientes con el filtro actual.
                      </td>
                    </tr>
                  ) : (
                    expedientesFiltrados?.map((exp: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--brand)' }}>
                            <FolderOpen size={16} />
                            #{exp.expediente_id}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                          {exp.fecha_asignacion}
                        </td>
                        <td>
                          <span className={`badge ${exp.estado_tarea === 'ABIERTA' ? 'badge-warning' : 'badge-info'}`}>
                            {exp.estado_tarea}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {exp.lotes?.length || 0} lotes
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                          {Number(exp.total_planillas_declaradas || 0).toLocaleString('es-VE')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedExpedienteId(exp.expediente_id)}
                            className="btn btn-ghost btn-sm"
                          >
                            <ExternalLink size={13} />
                            Inspeccionar Lotes
                          </button>
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
      {selectedExpedienteId && (
        <ExpedienteDetailModal
          expedienteId={selectedExpedienteId}
          anho={anho}
          onClose={() => setSelectedExpedienteId(null)}
        />
      )}
    </div>
  );
};
