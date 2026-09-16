"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { 
  Clock, 
  Calendar, 
  RefreshCw, 
  Download, 
  Search, 
  Users, 
  TrendingUp, 
  FileSpreadsheet, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Layers,
  ArrowUpDown,
  Filter
} from 'lucide-react';

interface ConciliadorRow {
  users_id: string;
  nombre: string;
  nombre_corto: string;
  nombre_completo: string;
  horas: Record<string, number>;
  total_usuario: number;
}

interface ProductividadResponse {
  success: boolean;
  fecha_consultada: string;
  fecha_iso: string;
  horas: string[];
  conciliadores: ConciliadorRow[];
  totales_por_hora: Record<string, number>;
  gran_total: number;
  kpis: {
    total_planillas: number;
    conciliadores_activos: number;
    hora_pico: {
      hora: string;
      total: number;
    };
    promedio_por_conciliador: number;
  };
}

export const ProductividadHorasView: React.FC = () => {
  const getTodayIso = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [fecha, setFecha] = useState<string>(getTodayIso());
  const [data, setData] = useState<ProductividadResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortField, setSortField] = useState<'total' | 'nombre'>('total');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const fetchData = useCallback(async (targetFecha: string = fecha, isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await axios.get<ProductividadResponse>(
        `/api/orquestador/planillas/metricas/productividad-hora?fecha=${targetFecha}`
      );
      if (res.data?.success) {
        setData(res.data);
        setLastUpdated(new Date());
      } else {
        setError('No se pudieron obtener las métricas de productividad.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al consultar métricas');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    fetchData(fecha);
  }, [fecha, fetchData]);

  // Auto-refresco cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(fecha, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fecha, fetchData]);

  // Filtrado y ordenamiento de conciliadores
  const conciliadoresFiltrados = useMemo(() => {
    if (!data?.conciliadores) return [];
    let list = [...data.conciliadores];

    if (searchUser.trim()) {
      const q = searchUser.trim().toLowerCase();
      list = list.filter(
        c =>
          c.nombre.toLowerCase().includes(q) ||
          c.nombre_completo.toLowerCase().includes(q) ||
          c.users_id.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortField === 'total') {
        return sortAsc ? a.total_usuario - b.total_usuario : b.total_usuario - a.total_usuario;
      }
      return sortAsc 
        ? a.nombre.localeCompare(b.nombre) 
        : b.nombre.localeCompare(a.nombre);
    });

    return list;
  }, [data, searchUser, sortField, sortAsc]);

  // Exportar a CSV
  const exportToCsv = () => {
    if (!data || !data.conciliadores.length) return;

    const headers = ['#', 'ANALISTA', 'USUARIO SIGECOF', ...data.horas.map(h => `${h}:00`), 'TOTAL DÍA'];
    const rows = conciliadoresFiltrados.map((c, idx) => [
      idx + 1,
      `"${c.nombre_completo || c.nombre}"`,
      c.users_id,
      ...data.horas.map(h => c.horas[h] || 0),
      c.total_usuario
    ]);

    // Fila total
    const totalRow = [
      '',
      '"TOTAL GENERAL"',
      '',
      ...data.horas.map(h => data.totales_por_hora[h] || 0),
      data.gran_total
    ];

    const csvContent = [
      `"REPORTE DE TRANSCRIPCIÓN Y CONCILIACIÓN POR HORA"`,
      `"FECHA: ${data.fecha_consultada}"`,
      `"TOTAL PLANILLAS: ${data.gran_total}"`,
      '',
      headers.join(';'),
      ...rows.map(r => r.join(';')),
      totalRow.join(';')
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Productividad_Conciliacion_${data.fecha_iso || 'ONT'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const setHoy = () => {
    const today = getTodayIso();
    setFecha(today);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', background: '#F6F8FA' }}>
      {/* ── Header ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        background: '#ffffff',
        borderBottom: '1px solid #E6EBF1',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#EDF4FB',
            color: '#1E5C99'
          }}>
            <Clock size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#14263C' }}>
                Monitoreo de Productividad por Hora
              </h1>
              <span style={{
                padding: '2px 8px',
                borderRadius: '6px',
                background: '#E8F5E9',
                color: '#2E7D32',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.04em'
              }}>
                TIEMPO REAL
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6B7C90' }}>
              Planillas conciliadas y transcritas por analista directamente desde SIGECOF (Reemplazo nativo TRANSC_X_HORA)
            </p>
          </div>
        </div>

        {/* Timestamp de última actualización */}
        {lastUpdated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#8797A8' }}>
            <span>Última lectura:</span>
            <strong style={{ color: '#14263C', fontFamily: "'IBM Plex Mono', monospace" }}>
              {lastUpdated.toLocaleTimeString()}
            </strong>
          </div>
        )}
      </header>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* ── Barra de Control de Fecha, Filtros y Acciones ── */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '14px 18px',
          border: '1px solid #E6EBF1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          {/* Selector de fecha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90', textTransform: 'uppercase' }}>
              Fecha:
            </span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={{
                  height: '36px',
                  padding: '0 10px 0 32px',
                  borderRadius: '8px',
                  border: '1px solid #E1E7EE',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#14263C',
                  background: '#FFFFFF',
                  outline: 'none'
                }}
              />
              <Calendar size={15} color="#1E5C99" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            </div>

            <button
              onClick={setHoy}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #E1E7EE',
                background: '#FAFCFE',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#1E5C99',
                cursor: 'pointer'
              }}
            >
              Hoy
            </button>
          </div>

          {/* Buscador de usuario */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '380px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Buscar por analista o usuario..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px 0 32px',
                  borderRadius: '8px',
                  border: '1px solid #E1E7EE',
                  fontSize: '12.5px',
                  color: '#14263C',
                  background: '#FFFFFF',
                  outline: 'none'
                }}
              />
              <Search size={15} color="#8797A8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>
          </div>

          {/* Controles de auto-refresco y exportación */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Auto refresh pill */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: `1px solid ${autoRefresh ? '#81C784' : '#E1E7EE'}`,
                background: autoRefresh ? '#E8F5E9' : '#FFFFFF',
                color: autoRefresh ? '#2E7D32' : '#6B7C90',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: autoRefresh ? '#2E7D32' : '#B0BEC5'
              }} />
              {autoRefresh ? 'Auto (30s) Activo' : 'Auto-refrescar'}
            </button>

            {/* Botón Refrescar Manual */}
            <button
              onClick={() => fetchData(fecha)}
              disabled={loading}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #E1E7EE',
                background: '#FFFFFF',
                color: '#1E5C99',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>

            {/* Exportar CSV */}
            <button
              onClick={exportToCsv}
              disabled={!data || !data.conciliadores.length}
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                border: 'none',
                background: '#1E5C99',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: (!data || !data.conciliadores.length) ? 'not-allowed' : 'pointer'
              }}
            >
              <Download size={15} />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div style={{
            background: '#FDF2F2',
            border: '1px solid #F8B4B4',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#9B1C1C',
            fontSize: '13px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {/* Card 1: Total Planillas */}
          <div style={{ padding: '16px 18px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#8797A8', textTransform: 'uppercase' }}>
                Total Planillas
              </span>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#EDF4FB', color: '#1E5C99', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={16} />
              </div>
            </div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '26px', fontWeight: 700, color: '#14263C' }}>
              {data?.gran_total.toLocaleString('es-VE') || 0}
            </div>
            <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#6B7C90', fontWeight: 600 }}>
              Para el {data?.fecha_consultada || fecha}
            </div>
          </div>

          {/* Card 2: Conciliadores Activos */}
          <div style={{ padding: '16px 18px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#8797A8', textTransform: 'uppercase' }}>
                Conciliadores Activos
              </span>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={16} />
              </div>
            </div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '26px', fontWeight: 700, color: '#14263C' }}>
              {data?.kpis.conciliadores_activos || 0}
            </div>
            <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#6B7C90', fontWeight: 600 }}>
              Registrando transcripciones hoy
            </div>
          </div>

          {/* Card 3: Hora Pico */}
          <div style={{ padding: '16px 18px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#8797A8', textTransform: 'uppercase' }}>
                Hora Pico de Mayor Carga
              </span>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={16} />
              </div>
            </div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '26px', fontWeight: 700, color: '#14263C' }}>
              {data?.kpis.hora_pico.hora || '--'}
            </div>
            <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#6B7C90', fontWeight: 600 }}>
              Volumen: {data?.kpis.hora_pico.total.toLocaleString('es-VE') || 0} planillas
            </div>
          </div>

          {/* Card 4: Promedio por Conciliador */}
          <div style={{ padding: '16px 18px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#8797A8', textTransform: 'uppercase' }}>
                Rendimiento Promedio
              </span>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#FAF5FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={16} />
              </div>
            </div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '26px', fontWeight: 700, color: '#14263C' }}>
              {data?.kpis.promedio_por_conciliador.toLocaleString('es-VE') || 0}
            </div>
            <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#6B7C90', fontWeight: 600 }}>
              Planillas / Analista
            </div>
          </div>
        </div>

        {/* ── Curva de Distribución Horaria (Mini Gráfico de Barras) ── */}
        {data && data.horas.length > 0 && (
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid #E6EBF1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Distribución de Volumen por Hora
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.horas.length}, 1fr)`, gap: '10px' }}>
              {data.horas.map(h => {
                const totalHora = data.totales_por_hora[h] || 0;
                const maxHora = Math.max(...Object.values(data.totales_por_hora), 1);
                const percent = Math.round((totalHora / maxHora) * 100);
                const isPeak = data.kpis.hora_pico.hora === `${h}:00`;

                return (
                  <div key={h} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace", color: isPeak ? '#1E5C99' : '#14263C' }}>
                      {totalHora.toLocaleString('es-VE')}
                    </div>
                    <div style={{
                      width: '100%',
                      height: '42px',
                      background: '#F1F5F9',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      overflow: 'hidden',
                      padding: '2px'
                    }}>
                      <div style={{
                        width: '100%',
                        height: `${Math.max(percent, 10)}%`,
                        background: isPeak 
                          ? 'linear-gradient(180deg, #1E5C99 0%, #0F3C68 100%)' 
                          : 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%)',
                        borderRadius: '4px',
                        transition: 'height 0.4s ease'
                      }} />
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {h}:00
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tabla Matricial Replicando el Reporte Legacy (Interactivo) ── */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #E6EBF1',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid #EDF1F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FAFCFE'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#14263C' }}>
                Matriz de Transcripción por Conciliador
              </span>
              <span style={{ fontSize: '12px', color: '#6B7C90' }}>
                ({conciliadoresFiltrados.length} conciliadores)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#8797A8' }}>ORDENAR:</span>
              <button
                onClick={() => {
                  if (sortField === 'total') setSortAsc(!sortAsc);
                  else { setSortField('total'); setSortAsc(false); }
                }}
                style={{
                  background: sortField === 'total' ? '#EDF4FB' : '#FFFFFF',
                  color: sortField === 'total' ? '#1E5C99' : '#6B7C90',
                  border: '1px solid #E1E7EE',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Volumen Total {sortField === 'total' && (sortAsc ? '▲' : '▼')}
              </button>

              <button
                onClick={() => {
                  if (sortField === 'nombre') setSortAsc(!sortAsc);
                  else { setSortField('nombre'); setSortAsc(true); }
                }}
                style={{
                  background: sortField === 'nombre' ? '#EDF4FB' : '#FFFFFF',
                  color: sortField === 'nombre' ? '#1E5C99' : '#6B7C90',
                  border: '1px solid #E1E7EE',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Analista (A-Z) {sortField === 'nombre' && (sortAsc ? '▲' : '▼')}
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '550px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F8FAFC' }}>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#475569', textTransform: 'uppercase', width: '45px', textAlign: 'center' }}>
                    #
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#475569', textTransform: 'uppercase', minWidth: '220px' }}>
                    Analista Conciliador
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#475569', textTransform: 'uppercase', width: '160px' }}>
                    Usuario SIGECOF
                  </th>
                  {data?.horas.map(h => (
                    <th key={h} style={{ padding: '12px 12px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#475569', textTransform: 'uppercase', textAlign: 'right', minWidth: '90px' }}>
                      {h}:00
                    </th>
                  ))}
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#1E5C99', textTransform: 'uppercase', textAlign: 'right', minWidth: '120px', background: '#EDF4FB' }}>
                    Total Día
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#475569', textTransform: 'uppercase', textAlign: 'right', minWidth: '100px' }}>
                    % Aporte
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={5 + (data ? (data as ProductividadResponse).horas.length : 10)} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#1E5C99' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>Cargando métricas de productividad...</div>
                    </td>
                  </tr>
                )}

                {conciliadoresFiltrados.map((row, idx) => {
                  const share = data?.gran_total ? Math.round((row.total_usuario / data.gran_total) * 1000) / 10 : 0;
                  const isTop = idx === 0 && row.total_usuario > 0;

                  return (
                    <tr
                      key={row.users_id}
                      style={{
                        borderBottom: '1px solid #EDF1F5',
                        background: idx % 2 === 0 ? '#ffffff' : '#FAFCFE',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F0F4F9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#FAFCFE'}
                    >
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#94A3B8', fontWeight: 700, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                            {row.nombre}
                          </span>
                          {row.nombre_corto && (
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              ({row.nombre_corto})
                            </span>
                          )}
                          {isTop && (
                            <span style={{
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: '#FEF3C7',
                              color: '#B45309',
                              fontSize: '10px',
                              fontWeight: 800
                            }}>
                              LÍDER
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#F1F5F9',
                          color: '#334155'
                        }}>
                          {row.users_id}
                        </span>
                      </td>

                      {/* Horas dinámicas */}
                      {data?.horas.map(h => {
                        const val = row.horas[h] || 0;
                        const isHigh = val >= 5000;
                        const isMedium = val >= 2000 && val < 5000;

                        return (
                          <td
                            key={h}
                            style={{
                              padding: '12px 12px',
                              textAlign: 'right',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '12.5px',
                              fontWeight: val > 0 ? 700 : 400,
                              color: val > 0 ? (isHigh ? '#0F766E' : isMedium ? '#1E5C99' : '#1E293B') : '#CBD5E1',
                              background: isHigh ? '#F0FDFA' : isMedium ? '#F0F9FF' : 'transparent'
                            }}
                          >
                            {val > 0 ? val.toLocaleString('es-VE') : '—'}
                          </td>
                        );
                      })}

                      {/* Total usuario */}
                      <td style={{
                        padding: '12px 18px',
                        textAlign: 'right',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#1E5C99',
                        background: '#EDF4FB'
                      }}>
                        {row.total_usuario.toLocaleString('es-VE')}
                      </td>

                      {/* % Participación */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                        {share}%
                      </td>
                    </tr>
                  );
                })}

                {conciliadoresFiltrados.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5 + (data ? (data as ProductividadResponse).horas.length : 10)} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                      No se encontraron registros de transcripción para los criterios seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* ── Footer Institucional (Totales por Hora y Gran Total) ── */}
              {data && data.conciliadores.length > 0 && (
                <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10, background: '#14263C', color: '#ffffff' }}>
                  <tr>
                    <td colSpan={3} style={{ padding: '14px 20px', fontSize: '12.5px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      TOTAL GENERAL USUARIOS
                    </td>
                    {data.horas.map(h => (
                      <td
                        key={h}
                        style={{
                          padding: '14px 12px',
                          textAlign: 'right',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '13px',
                          fontWeight: 800,
                          color: '#93C5FD'
                        }}
                      >
                        {(data.totales_por_hora[h] || 0).toLocaleString('es-VE')}
                      </td>
                    ))}
                    <td style={{
                      padding: '14px 18px',
                      textAlign: 'right',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '14px',
                      fontWeight: 900,
                      color: '#FFFFFF',
                      background: '#0F3C68'
                    }}>
                      {data.gran_total.toLocaleString('es-VE')}
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 800, color: '#93C5FD' }}>
                      100%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
