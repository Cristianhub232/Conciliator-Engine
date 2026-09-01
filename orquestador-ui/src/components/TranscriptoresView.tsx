"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { 
  Users, 
  Search, 
  FolderOpen, 
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', background: '#F6F8FA' }}>
      {/* ── Topbar ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '18px 28px', background: '#ffffff', borderBottom: '1px solid #E6EBF1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', flex: 'none', borderRadius: '9px', background: '#EDF4FB', color: '#1E5C99' }}>
            <Users size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#14263C' }}>
              Auditoría de Transcriptores
            </h1>
            <div style={{ marginTop: '2px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#8797A8', textTransform: 'uppercase' }}>
              CONTROL DE BANDEJAS Y RENDIMIENTO · SIGECOF
            </div>
          </div>
        </div>
        
        {/* Accesos rápidos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#8797A8' }}>ACCESOS:</span>
          {quickUsers.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => { setUsuario(u); handleSearch(undefined, u); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: usuario === u && data ? '#1E5C99' : '#E1E7EE',
                background: usuario === u && data ? '#EDF4FB' : '#ffffff',
                color: usuario === u && data ? '#1E5C99' : '#3D4F66',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {u}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main View Area ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Search Form Panel ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 160px auto', gap: '14px', alignItems: 'end', padding: '16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#6B7C90' }}>USUARIO DE SISTEMA (WF_USERS)</label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ej. KARENGUEVARA"
              style={{ height: '38px', padding: '0 11px', fontSize: '13.5px', fontFamily: "'IBM Plex Mono', monospace", color: '#14263C', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '8px', outline: 'none' }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#6B7C90' }}>EJERCICIO FISCAL</label>
            <select
              value={anho}
              onChange={(e) => setAnho(e.target.value)}
              style={{ height: '38px', padding: '0 10px', fontSize: '13.5px', fontFamily: "'IBM Plex Mono', monospace", color: '#14263C', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
            </select>
          </div>

          <button
            type="button"
            onClick={(e) => handleSearch(e)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '38px',
              padding: '0 20px',
              border: 0,
              borderRadius: '8px',
              background: '#1E5C99',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {loading ? <Loader2 size={15} className="spinner" /> : <Search size={15} />}
            Auditar usuario
          </button>
        </div>

        {/* ── Error Notification ── */}
        {error && (
          <div style={{ padding: '14px 16px', background: '#FBEDEA', border: '1px solid #F3C4BA', borderRadius: '10px', color: '#C0492F', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{error}</span>
          </div>
        )}

        {/* ── Results Area ── */}
        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Perfil del Transcriptor Card */}
            <div style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#EDF4FB', color: '#1E5C99', display: 'grid', placeItems: 'center', fontSize: '16px', fontWeight: 800 }}>
                  {data.perfil?.NOMBRE_CORTO ? data.perfil.NOMBRE_CORTO.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#14263C' }}>
                      {data.perfil?.NOMBRE_COMPLETO || data.perfil?.NOMBRE_CORTO}
                    </h3>
                    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: '#E9F6EE', color: '#2E7D4F' }}>
                      {data.perfil?.ESTATUS_USUARIO === 'A' ? 'ACTIVO' : (data.perfil?.ESTATUS_USUARIO || 'ACTIVO')}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#8797A8', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#1E5C99', fontWeight: 600 }}>@{data.perfil?.USUARIO_SISTEMA}</span>
                    <span>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={13} /> {data.perfil?.CARGO || 'Analista Conciliador'}</span>
                    <span>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building size={13} /> Órgano {data.perfil?.CODIGO_ORGANO || '093'}</span>
                  </div>
                </div>
              </div>

              {/* KPIs rápidos */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ padding: '8px 14px', background: '#FAFCFE', border: '1px solid #EDF1F5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#8797A8' }}>ABIERTOS</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '18px', fontWeight: 700, color: '#E5A32B' }}>
                    {data.resumen?.total_expedientes_abiertos || 0}
                  </div>
                </div>

                <div style={{ padding: '8px 14px', background: '#FAFCFE', border: '1px solid #EDF1F5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#8797A8' }}>LOTES</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '18px', fontWeight: 700, color: '#1E5C99' }}>
                    {data.resumen?.total_lotes_abiertos || 0}
                  </div>
                </div>

                <div style={{ padding: '8px 14px', background: '#FAFCFE', border: '1px solid #EDF1F5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#8797A8' }}>CERRADOS</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '18px', fontWeight: 700, color: '#2E7D4F' }}>
                    {data.resumen?.total_expedientes_cerrados || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de Expedientes */}
            <div style={{ background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px', overflow: 'hidden' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #EDF1F5' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#14263C' }}>Expedientes Activos en Bandeja ({expedientesFiltrados?.length || 0})</div>
                  <div style={{ fontSize: '11.5px', color: '#8797A8', marginTop: '2px' }}>Expedientes en estado ABIERTA o PENDIENTE para el ejercicio {anho}</div>
                </div>

                <input
                  type="text"
                  placeholder="Filtrar por N° Expediente…"
                  value={filtroExpediente}
                  onChange={(e) => setFiltroExpediente(e.target.value)}
                  style={{ width: '220px', height: '32px', padding: '0 10px', fontSize: '12.5px', color: '#14263C', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '6px', outline: 'none' }}
                />
              </div>

              {/* Columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 120px 120px 140px 140px', alignItems: 'center', gap: '12px', padding: '10px 16px', background: '#FAFCFE', borderBottom: '1px solid #EDF1F5', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.09em', color: '#8797A8' }}>
                <span>EXPEDIENTE</span>
                <span>FECHA ASIGNACIÓN</span>
                <span>ESTADO TAREA</span>
                <span>LOTES</span>
                <span style={{ textAlign: 'right' }}>DECLARADAS</span>
                <span style={{ textAlign: 'right' }}>ACCIÓN</span>
              </div>

              {/* Filas */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {expedientesFiltrados?.length === 0 ? (
                  <div style={{ padding: '36px 16px', textAlign: 'center', color: '#8797A8', fontSize: '13px' }}>
                    No se encontraron expedientes con el filtro actual.
                  </div>
                ) : (
                  expedientesFiltrados?.map((exp: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 140px 120px 120px 140px 140px',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '11px 16px',
                        borderBottom: '1px solid #F1F4F8',
                        transition: 'background 110ms'
                      }}
                    >
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 700, color: '#1E5C99', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FolderOpen size={15} />
                        #{exp.expediente_id}
                      </span>

                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#6B7C90' }}>
                        {exp.fecha_asignacion}
                      </span>

                      <span>
                        <span style={{
                          display: 'inline-flex',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: exp.estado_tarea === 'ABIERTA' ? '#FDF4E3' : '#EDF4FB',
                          color: exp.estado_tarea === 'ABIERTA' ? '#9A6A12' : '#1E5C99'
                        }}>
                          {exp.estado_tarea}
                        </span>
                      </span>

                      <span style={{ fontSize: '12.5px', color: '#14263C', fontWeight: 600 }}>
                        {exp.lotes?.length || 0} lotes
                      </span>

                      <span style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', fontWeight: 600, color: '#2E7D4F' }}>
                        {Number(exp.total_planillas_declaradas || 0).toLocaleString('es-VE')}
                      </span>

                      <span style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedExpedienteId(exp.expediente_id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', height: '28px', padding: '0 10px', border: '1px solid #E1E7EE', borderRadius: '6px', background: '#ffffff', fontSize: '11.5px', fontWeight: 700, color: '#1E5C99', cursor: 'pointer' }}
                        >
                          <ExternalLink size={12} />
                          Inspeccionar
                        </button>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>

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
