"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { 
  FolderGit2, 
  Search, 
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', background: '#F6F8FA' }}>
      {/* ── Topbar ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '18px 28px', background: '#ffffff', borderBottom: '1px solid #E6EBF1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', flex: 'none', borderRadius: '9px', background: '#EDF4FB', color: '#1E5C99' }}>
            <FolderGit2 size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#14263C' }}>
              Explorador de Expedientes
            </h1>
            <div style={{ marginTop: '2px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#8797A8', textTransform: 'uppercase' }}>
              INSPECCIÓN DE LOTES BANCARIOS Y PLANILLAS · ORG_LIQ
            </div>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#8797A8' }}>FRECUENTES:</span>
          {quickExpedientes.map((exp) => (
            <button
              key={exp}
              type="button"
              onClick={() => { setExpedienteId(exp); handleSearch(undefined, exp); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: expedienteId === exp && data ? '#1E5C99' : '#E1E7EE',
                background: expedienteId === exp && data ? '#EDF4FB' : '#ffffff',
                color: expedienteId === exp && data ? '#1E5C99' : '#3D4F66',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              #{exp}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main View Area ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Search Form Panel ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 160px auto', gap: '14px', alignItems: 'end', padding: '16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#6B7C90' }}>NÚMERO DE EXPEDIENTE</label>
            <input
              type="text"
              value={expedienteId}
              onChange={(e) => setExpedienteId(e.target.value)}
              placeholder="Ej. 7440"
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
            Buscar expediente
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
            
            {/* 4 KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
              <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>EXPEDIENTE ID</div>
                <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#1E5C99' }}>#{data.expediente_id}</div>
                <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>Ejercicio {anho}</div>
              </div>

              <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>LOTES ASOCIADOS</div>
                <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#14263C' }}>{data.lotes?.length || 0}</div>
                <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>Lotes registrados en BD</div>
              </div>

              <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>CONCILIADAS (BD)</div>
                <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#2E7D4F' }}>{data.resumen?.total_conciliadas || 0}</div>
                <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>Planillas autorizadas</div>
              </div>

              <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>PENDIENTES FÍSICAS</div>
                <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#E5A32B' }}>{data.resumen?.total_pendientes || 0}</div>
                <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>Archivos TXT restantes</div>
              </div>
            </div>

            {/* Tabla de Lotes */}
            <div style={{ background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px', overflow: 'hidden' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #EDF1F5' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#14263C' }}>Desglose de Lotes del Expediente #{data.expediente_id}</div>
                  <div style={{ fontSize: '11.5px', color: '#8797A8', marginTop: '2px' }}>Registrados en ORG_LIQ.LOTE para el ejercicio fiscal {anho}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedModalExpId(data.expediente_id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '32px', padding: '0 12px', border: 0, borderRadius: '7px', background: '#1E5C99', color: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Eye size={14} />
                  Ver planillas al detalle
                </button>
              </div>

              {/* Header de columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: '100px 100px 140px 140px 110px 110px 110px 100px', alignItems: 'center', gap: '12px', padding: '10px 16px', background: '#FAFCFE', borderBottom: '1px solid #EDF1F5', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.09em', color: '#8797A8' }}>
                <span>LOTE ID</span>
                <span>SECUENCIA</span>
                <span>BANCO / AGENCIA</span>
                <span>FECHA RECAUDACIÓN</span>
                <span style={{ textAlign: 'right' }}>DECLARADAS</span>
                <span style={{ textAlign: 'right' }}>CONCILIADAS</span>
                <span style={{ textAlign: 'right' }}>PENDIENTES</span>
                <span style={{ textAlign: 'right' }}>ESTADO</span>
              </div>

              {/* Filas */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.lotes?.map((lote: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 100px 140px 140px 110px 110px 110px 100px',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '11px 16px',
                      borderBottom: '1px solid #F1F4F8',
                      transition: 'background 110ms'
                    }}
                  >
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 700, color: '#14263C' }}>
                      {lote.LOTE_ID}
                    </span>

                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#8797A8' }}>
                      {lote.LOTE_SEQ}
                    </span>

                    <span style={{ fontSize: '12.5px', color: '#14263C', fontWeight: 600 }}>
                      {lote.INFN_CODIGO} - {lote.AGENCIA_CODIGO}
                    </span>

                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#6B7C90' }}>
                      {lote.FECHA_RECAUDACION}
                    </span>

                    <span style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', fontWeight: 600, color: '#14263C' }}>
                      {lote.TOTAL_PLN}
                    </span>

                    <span style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', fontWeight: 600, color: '#2E7D4F' }}>
                      {lote.conciliadas}
                    </span>

                    <span style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', fontWeight: 600, color: '#E5A32B' }}>
                      {lote.pendientes}
                    </span>

                    <span style={{ justifySelf: 'end' }}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: lote.ESTADO === 'P' ? '#FDF4E3' : '#E9F6EE',
                        color: lote.ESTADO === 'P' ? '#9A6A12' : '#2E7D4F'
                      }}>
                        {lote.ESTADO === 'P' ? 'Pendiente' : lote.ESTADO}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Modal Detalle */}
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
