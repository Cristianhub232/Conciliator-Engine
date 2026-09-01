"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldCheck, 
  RotateCcw, 
  Loader2, 
  AlertCircle,
  Search
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
      String(ev.usuario || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(ev.detalles || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAction && matchesSearch;
  });

  const totalConciliaciones = eventos.filter((e: any) => e.accion === 'CONCILIACION').length;
  const totalReversiones = eventos.filter((e: any) => e.accion === 'REVERSION').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', background: '#F6F8FA' }}>
      {/* ── Topbar / Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '18px 28px', background: '#ffffff', borderBottom: '1px solid #E6EBF1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', flex: 'none', borderRadius: '9px', background: '#E7F5F2', color: '#2E8F9C' }}>
            <ShieldCheck size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#14263C' }}>
              Trazabilidad y Auditoría
            </h1>
            <div style={{ marginTop: '2px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#8797A8', textTransform: 'uppercase' }}>
              BITÁCORA INMUTABLE DE CONCILIACIONES Y REVERSIONES
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            height: '36px',
            padding: '0 14px',
            border: '1px solid #E1E7EE',
            borderRadius: '8px',
            background: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            color: '#3D4F66',
            cursor: 'pointer'
          }}
        >
          <RotateCcw size={14} className={loading ? 'spinner' : ''} />
          Actualizar bitácora
        </button>
      </header>

      {/* ── Main Scroll View ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* ── 3 KPI Cards Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
          <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>EVENTOS REGISTRADOS</div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#14263C' }}>
              {data?.total || eventos.length}
            </div>
            <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>
              Historial de auditoría central
            </div>
          </div>

          <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>CONCILIACIONES ATÓMICAS</div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#2E7D4F' }}>
              {totalConciliaciones}
            </div>
            <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>
              100% con partida asignada
            </div>
          </div>

          <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>REVERSIONES EJECUTADAS</div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: totalReversiones > 0 ? '#C0492F' : '#14263C' }}>
              {totalReversiones}
            </div>
            <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>
              {totalReversiones === 0 ? 'Ninguna en el período' : 'Registradas formalmente'}
            </div>
          </div>
        </div>

        {/* ── Notificación de Error ── */}
        {error && (
          <div style={{ padding: '14px 16px', background: '#FBEDEA', border: '1px solid #F3C4BA', borderRadius: '10px', color: '#C0492F', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{error}</span>
          </div>
        )}

        {/* ── Tabla de Auditoría ── */}
        <div style={{ background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px', overflow: 'hidden' }}>
          
          {/* Header con pestañas y buscador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderBottom: '1px solid #EDF1F5' }}>
            <div style={{ display: 'flex', padding: '3px', borderRadius: '8px', background: '#F1F5F9' }}>
              <button
                type="button"
                onClick={() => setFilterAction('ALL')}
                style={{
                  height: '28px',
                  padding: '0 12px',
                  border: 0,
                  borderRadius: '6px',
                  background: filterAction === 'ALL' ? '#ffffff' : 'transparent',
                  boxShadow: filterAction === 'ALL' ? '0 1px 2px rgba(20,38,60,0.1)' : 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: filterAction === 'ALL' ? '#14263C' : '#6B7C90',
                  cursor: 'pointer'
                }}
              >
                Todos ({eventos.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterAction('CONCILIACION')}
                style={{
                  height: '28px',
                  padding: '0 12px',
                  border: 0,
                  borderRadius: '6px',
                  background: filterAction === 'CONCILIACION' ? '#ffffff' : 'transparent',
                  boxShadow: filterAction === 'CONCILIACION' ? '0 1px 2px rgba(20,38,60,0.1)' : 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: filterAction === 'CONCILIACION' ? '#14263C' : '#6B7C90',
                  cursor: 'pointer'
                }}
              >
                Conciliaciones ({totalConciliaciones})
              </button>
              <button
                type="button"
                onClick={() => setFilterAction('REVERSION')}
                style={{
                  height: '28px',
                  padding: '0 12px',
                  border: 0,
                  borderRadius: '6px',
                  background: filterAction === 'REVERSION' ? '#ffffff' : 'transparent',
                  boxShadow: filterAction === 'REVERSION' ? '0 1px 2px rgba(20,38,60,0.1)' : 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: filterAction === 'REVERSION' ? '#14263C' : '#6B7C90',
                  cursor: 'pointer'
                }}
              >
                Reversiones ({totalReversiones})
              </button>
            </div>

            <div style={{ flex: 1 }} />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '320px' }}>
              <Search size={15} color="#9CA9B8" style={{ position: 'absolute', left: '11px', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Buscar planilla, expediente o usuario…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 12px 0 34px',
                  fontSize: '13px',
                  color: '#14263C',
                  background: '#ffffff',
                  border: '1px solid #E1E7EE',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Column Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '132px 128px 150px 110px minmax(0, 1fr) 160px 150px', alignItems: 'center', gap: '12px', padding: '10px 16px', background: '#FAFCFE', borderBottom: '1px solid #EDF1F5', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.09em', color: '#8797A8' }}>
            <span>ACCIÓN</span>
            <span>PLANILLA</span>
            <span>EXPEDIENTE / LOTE</span>
            <span style={{ textAlign: 'right' }}>MONTO (BS)</span>
            <span>OPERADOR</span>
            <span>DETALLES</span>
            <span style={{ textAlign: 'right' }}>FECHA Y HORA</span>
          </div>

          {/* Table Rows */}
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#8797A8' }}>
              <Loader2 size={24} className="spinner" style={{ margin: '0 auto 12px', color: '#1E5C99' }} />
              <p style={{ fontSize: '13px', fontWeight: 600 }}>Cargando bitácora de auditoría...</p>
            </div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#8797A8', fontSize: '13px' }}>
              No hay eventos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtrados.map((ev: any, i: number) => {
                const isConcil = ev.accion === 'CONCILIACION';
                return (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '132px 128px 150px 110px minmax(0, 1fr) 160px 150px',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 16px',
                      borderBottom: '1px solid #F1F4F8',
                      transition: 'background 110ms'
                    }}
                  >
                    <span style={{
                      justifySelf: 'start',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 9px',
                      borderRadius: '999px',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '10.5px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      background: isConcil ? '#E9F6EE' : '#FBEDEA',
                      color: isConcil ? '#2E7D4F' : '#C0492F'
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isConcil ? '#2E7D4F' : '#C0492F' }} />
                      {ev.accion}
                    </span>

                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', fontWeight: 600, color: '#14263C' }}>
                      {ev.planilla_id}
                    </span>

                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11.5px', color: '#6B7C90' }}>
                      {ev.expediente ? `Exp #${ev.expediente} · Lote ${ev.lote_id || '1'}` : '—'}
                    </span>

                    <span style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', fontWeight: 500, color: '#14263C' }}>
                      {ev.monto_total ? `${Number(ev.monto_total).toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : '—'}
                    </span>

                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11.5px', color: '#1E5C99', fontWeight: 600 }}>
                      @{ev.usuario}
                    </span>

                    <span style={{ fontSize: '11.5px', color: '#6B7C90', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.detalles}
                    </span>

                    <span style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#8797A8', whiteSpace: 'nowrap' }}>
                      {ev.fecha_hora ? new Date(ev.fecha_hora).toLocaleString('es-VE') : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer de la Tabla */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #EDF1F5' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#8797A8' }}>
              Mostrando {filtrados.length} de {eventos.length} eventos
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
