'use client';

import { useState, useRef } from 'react';
import axios from 'axios';
import { Search, CheckCircle, AlertCircle, Layers, ServerCog, Filter, X, Loader2, Square, AlertTriangle, RefreshCw } from 'lucide-react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SplashLoader } from '../components/SplashLoader';
import { LoginView } from '../components/LoginView';
import { Sidebar, NavTab } from '../components/Sidebar';
import { TranscriptoresView } from '../components/TranscriptoresView';
import { ExpedientesExplorerView } from '../components/ExpedientesExplorerView';
import { AuditoriaLogsView } from '../components/AuditoriaLogsView';
import { CatalogoFormasView } from '../components/CatalogoFormasView';
import { DepuracionView } from '../components/DepuracionView';
import { UsuariosView } from '../components/UsuariosView';
import { ConfiguracionView } from '../components/ConfiguracionView';

function OrquestadorPageInner() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('conciliacion');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [fecha, setFecha] = useState('2024-04-15');
  const [banco, setBanco] = useState('105');
  const [estado, setEstado] = useState('HUERFANAS');
  const [limit, setLimit] = useState(500);

  const [planillas, setPlanillas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depuracionAlert, setDepuracionAlert] = useState<any>(null);
  const [mappingStates, setMappingStates] = useState<Record<string, any>>({});
  const [authStates, setAuthStates] = useState<Record<string, any>>({});
  const [successStates, setSuccessStates] = useState<Record<string, any>>({});

  // Mass selection
  const [selectedPlanillas, setSelectedPlanillas] = useState(new Set());
  const [isMassAuthorizing, setIsMassAuthorizing] = useState(false);
  const [massProgress, setMassProgress] = useState({ total: 0, current: 0, successes: 0, failures: 0 });

  // Mapping Progress
  const [isMappingAll, setIsMappingAll] = useState(false);
  const [mappingProgress, setMappingProgress] = useState({ total: 0, current: 0, successes: 0, failures: 0 });

  // Control de Detención de Proceso
  const stopProcessRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [stoppedByUser, setStoppedByUser] = useState(false);

  // Interactive filters
  const [selectedForma, setSelectedForma] = useState<string | null>(null);
  const [selectedExp, setSelectedExp] = useState<any>(null);
  const [filterOnlyErrors, setFilterOnlyErrors] = useState(false);

  // --- Derived ---
  const formasCount = planillas.reduce((acc, p) => {
    acc[p.FORMA] = (acc[p.FORMA] || 0) + 1;
    return acc;
  }, {});
  const expedientesUnicos = [...new Set(planillas.map(p => p.EXPEDIENTE).filter(Boolean))];
  const planillasFiltradas = planillas.filter(p => {
    const id = p.NRO_PLANILLA_FALTANTE;
    if (selectedForma && p.FORMA !== selectedForma) return false;
    if (selectedExp && p.EXPEDIENTE !== selectedExp) return false;
    if (filterOnlyErrors) {
      const isAuthErr = authStates[id]?.status === 'error';
      const isMapErr = mappingStates[id]?.status === 'error';
      return isAuthErr || isMapErr;
    }
    return true;
  });
  const totalMonto = planillasFiltradas.reduce((s, p) => s + (p.MONTO_EFECTIVO || 0), 0);
  const hasActiveFilter = Boolean(selectedForma || selectedExp || filterOnlyErrors);

  // --- Handlers ---
  const handleSearch = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSelectedForma(null);
    setSelectedExp(null);
    setSelectedPlanillas(new Set());
    setAuthStates({});
    setSuccessStates({});
    setMappingStates({});
    setDepuracionAlert(null);
    setStoppedByUser(false);
    try {
      const [res, depScanRes] = await Promise.all([
        axios.get(`/api/orquestador/planillas/pendientes`, {
          params: { fecha, banco, estado_asignacion: estado, limit }
        }),
        axios.get(`/api/orquestador/depuracion/scan`, {
          params: { fecha, banco }
        }).catch(() => ({ data: { total_detectadas: 0 } }))
      ]);

      setPlanillas(res.data.data || []);
      if (depScanRes.data && depScanRes.data.total_detectadas > 0) {
        setDepuracionAlert(depScanRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const resolverCatalogo = async (planilla: any, signal?: AbortSignal) => {
    const id = planilla.NRO_PLANILLA_FALTANTE;
    setMappingStates(prev => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await axios.post(`/api/catalogo/formas/${planilla.FORMA}/resolver`, {
        monto: planilla.MONTO_EFECTIVO,
        rif: planilla.RIF
      }, { signal, timeout: 8000 });
      setMappingStates(prev => ({ ...prev, [id]: { status: 'success', data: res.data } }));
      return { id, success: true, data: res.data };
    } catch (error: any) {
      if (axios.isCancel(error)) {
        setMappingStates(prev => ({ ...prev, [id]: undefined }));
        return { id, success: false, cancelled: true };
      }
      const errMsg = error.response?.data?.message || error.message;
      setMappingStates(prev => ({
        ...prev,
        [id]: { status: 'error', error: errMsg }
      }));
      return { id, success: false, error: errMsg };
    }
  };

  const toggleSelect = (id: any) => {
    setSelectedPlanillas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPlanillas.size === planillasFiltradas.length && planillasFiltradas.length > 0) {
      setSelectedPlanillas(new Set());
    } else {
      setSelectedPlanillas(new Set(planillasFiltradas.map(p => p.NRO_PLANILLA_FALTANTE)));
    }
  };

  // Detener cualquier proceso en curso de forma inmediata
  const detenerProceso = () => {
    stopProcessRef.current = true;
    setStoppedByUser(true);
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {}
    }
  };

  // Mapear Todas con Concurrencia (Chunks) y Soporte de Detención
  const resolverTodas = async () => {
    const pendientesDeMapeo = planillasFiltradas.filter(p => !mappingStates[p.NRO_PLANILLA_FALTANTE] || mappingStates[p.NRO_PLANILLA_FALTANTE].status !== 'success');
    if (pendientesDeMapeo.length === 0) return;

    stopProcessRef.current = false;
    abortControllerRef.current = new AbortController();
    setStoppedByUser(false);
    setIsMappingAll(true);
    setMappingProgress({ total: pendientesDeMapeo.length, current: 0, successes: 0, failures: 0 });
    let successes = 0, failures = 0, current = 0;

    const chunkSize = 5;
    for (let i = 0; i < pendientesDeMapeo.length; i += chunkSize) {
      if (stopProcessRef.current) {
        setStoppedByUser(true);
        break;
      }
      const chunk = pendientesDeMapeo.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(p => resolverCatalogo(p, abortControllerRef.current?.signal)));
      if (stopProcessRef.current) {
        setStoppedByUser(true);
        break;
      }
      results.forEach(r => {
        if (r.cancelled) return;
        current++;
        if (r.success) successes++; else failures++;
      });
      setMappingProgress({ total: pendientesDeMapeo.length, current, successes, failures });
    }
    setIsMappingAll(false);
  };

  // Conciliación Masiva Secuencial Atómica con Soporte de Detención Inmediata
  const autorizarMasivo = async () => {
    const seleccionadas = planillasFiltradas.filter(p => selectedPlanillas.has(p.NRO_PLANILLA_FALTANTE));
    if (seleccionadas.length === 0) return;

    stopProcessRef.current = false;
    abortControllerRef.current = new AbortController();
    setStoppedByUser(false);
    setIsMassAuthorizing(true);
    setMassProgress({ total: seleccionadas.length, current: 0, successes: 0, failures: 0 });
    let successes = 0, failures = 0;

    for (let i = 0; i < seleccionadas.length; i++) {
      if (stopProcessRef.current) {
        setStoppedByUser(true);
        break;
      }

      const p = seleccionadas[i];
      const id = p.NRO_PLANILLA_FALTANTE;
      const mapState = mappingStates[id];

      if (!mapState || mapState.status !== 'success') {
        failures++;
        setAuthStates(prev => ({ ...prev, [id]: { isAuthorizing: false, status: 'error', message: 'Requiere mapeo de catálogo' } }));
        setMassProgress({ total: seleccionadas.length, current: i + 1, successes, failures });
        continue;
      }

      setAuthStates(prev => ({ ...prev, [id]: { isAuthorizing: true } }));
      try {
        const payload = {
          usuario_operador: 'BOT_ORQUESTADOR',
          expediente: p.EXPEDIENTE,
          lote_id: p.LOTE_ID,
          lote_seq: p.LOTE_SEQ,
          planilla_id: p.NRO_PLANILLA_FALTANTE,
          forma: p.FORMA,
          monto: p.MONTO_EFECTIVO,
          banco: p.BANCO,
          agencia: p.AGENCIA,
          fecha_recaudacion: p.FECHA_RECAUDACION.split('T')[0],
          asignaciones: mapState.data.asignaciones.map((a: any) => ({ partida: a.cod_partida, monto: a.monto }))
        };

        await axios.post(`/api/orquestador/planillas/conciliar`, payload, {
          signal: abortControllerRef.current.signal,
          timeout: 45000
        });

        setAuthStates(prev => ({ ...prev, [id]: { isAuthorizing: false, status: 'success' } }));
        setSuccessStates(prev => ({ ...prev, [id]: true }));
        successes++;
        setSelectedPlanillas(prev => { const n = new Set(prev); n.delete(id); return n; });
      } catch (err: any) {
        if (axios.isCancel(err) || stopProcessRef.current) {
          setAuthStates(prev => ({ ...prev, [id]: { isAuthorizing: false } }));
          setStoppedByUser(true);
          break;
        }
        const errMsg = err.response?.data?.message || err.message;
        setAuthStates(prev => ({ ...prev, [id]: { isAuthorizing: false, status: 'error', message: errMsg } }));
        failures++;
      }
      setMassProgress({ total: seleccionadas.length, current: i + 1, successes, failures });
    }
    setIsMassAuthorizing(false);
  };

  const clearFilters = () => { setSelectedForma(null); setSelectedExp(null); setFilterOnlyErrors(false); };

  // --- Splash Loader Inicial ---
  if (showSplash) {
    return <SplashLoader onComplete={() => setShowSplash(false)} />;
  }

  // --- Auth Guards ---
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-0)' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={36} className="spinner" color="var(--brand)" />
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Cargando entorno SIRONT...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // --- Render Principal ---
  return (
    <div className="app-layout">
      {/* Sidebar de Navegación Lateral */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Área Principal de Contenido */}
      <main className="main-viewport">
        {activeTab === 'transcriptores' && <TranscriptoresView />}
        {activeTab === 'expedientes' && <ExpedientesExplorerView />}
        {activeTab === 'auditoria' && <AuditoriaLogsView />}
        {activeTab === 'catalogo_formas' && <CatalogoFormasView />}
        {activeTab === 'depuracion' && <DepuracionView />}
        {activeTab === 'usuarios' && <UsuariosView />}
        {activeTab === 'configuracion' && <ConfiguracionView />}

        {activeTab === 'conciliacion' && (
          <div className="container" style={{ maxWidth: '100%', padding: 0 }}>
            {/* ── Topbar ── */}
            <header className="app-topbar">
              <div className="app-topbar-left">
                <div className="app-logo-mark">
                  <Layers size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="app-title">Orquestador de Conciliación</h1>
                  <p className="app-subtitle">Motor Financiero · ONT</p>
                </div>
              </div>
              <img src="/Logo_basado_en_banner.png" alt="Datax" className="app-partner-logo" />
            </header>

            {/* ── Search ── */}
            <section className="search-panel">
              <form onSubmit={handleSearch} className="search-grid">
          <div className="field">
            <label className="field-label">Fecha Recaudación</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required className="input-field" />
          </div>
          <div className="field">
            <label className="field-label">Banco</label>
            <input type="text" value={banco} onChange={e => setBanco(e.target.value)} required placeholder="Ej: 105" className="input-field mono" />
          </div>
          <div className="field">
            <label className="field-label">Estado de Lote</label>
            <select value={estado} onChange={e => setEstado(e.target.value)} className="input-field">
              <option value="HUERFANAS">Huérfanas</option>
              <option value="ASIGNADAS">Asignadas a Workflow</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">Límite</label>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="input-field">
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500 (Por defecto)</option>
              <option value={1000}>1 000</option>
              <option value={5000}>5 000</option>
              <option value={10000}>10 000</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary search-btn" disabled={loading}>
            {loading ? (
              <><span className="spinner" aria-hidden="true" /> Buscando…</>
            ) : (
              <><Search size={16} /> Buscar Lote</>
            )}
          </button>
        </form>
      </section>

      {/* ── Banner de Alerta de Depuración Detectada ── */}
      {depuracionAlert && depuracionAlert.total_detectadas > 0 && (
        <div style={{
          margin: '0 0 20px',
          padding: '16px 20px',
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e11d48', color: '#ffffff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: 800, color: '#9f1239' }}>
                ¡Atención: Se han detectado {depuracionAlert.total_detectadas} planillas con formas a depurar!
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#be123c' }}>
                Formas no procesables encontradas: <strong>{depuracionAlert.formas_detectadas?.join(', ')}</strong> (Monto total: Bs. {depuracionAlert.monto_total?.toLocaleString('es-VE', { minimumFractionDigits: 2 })}). Estas formas deben ser depuradas bajo autorización.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('depuracion')}
            className="btn"
            style={{
              background: '#e11d48',
              color: '#ffffff',
              height: '38px',
              padding: '0 16px',
              fontSize: '12.5px',
              fontWeight: 800,
              boxShadow: '0 2px 8px rgba(225, 29, 72, 0.25)',
              whiteSpace: 'nowrap'
            }}
          >
            Ir a Depuración →
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {planillas.length > 0 && (
        <div className="results-area">

          {/* KPI strip */}
          <div className="kpi-strip">
            <div className="kpi-item">
              <span className="kpi-number">{planillasFiltradas.length}</span>
              <span className="kpi-label">Planillas</span>
            </div>
            <div className="kpi-divider" />
            <div className="kpi-item">
              <span className="kpi-number">{expedientesUnicos.length}</span>
              <span className="kpi-label">Expedientes</span>
            </div>
            <div className="kpi-divider" />
            <div className="kpi-item">
              <span className="kpi-number">{Object.keys(formasCount).length}</span>
              <span className="kpi-label">Formas</span>
            </div>
            <div className="kpi-divider" />
            <div className="kpi-item">
              <span className="kpi-number kpi-money">Bs {totalMonto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
              <span className="kpi-label">Monto Total</span>
            </div>
          </div>

          <div className="filter-bar">
            <div className="filter-group">
              <span className="filter-group-label"><Filter size={13} /> Forma</span>
              {Object.entries(formasCount).map(([forma, cant]) => (
                <button
                  key={forma}
                  onClick={() => setSelectedForma(selectedForma === forma ? null : forma)}
                  className={`chip ${selectedForma === forma ? 'chip-active' : ''}`}
                >
                  {forma} <span className="chip-count">{String(cant)}</span>
                </button>
              ))}
              {selectedForma && (
                <button onClick={() => setSelectedForma(null)} className="chip chip-clear">
                  <X size={12} /> Limpiar Forma
                </button>
              )}
              {filterOnlyErrors && (
                <button onClick={() => setFilterOnlyErrors(false)} className="chip chip-active" style={{ background: '#e11d48', borderColor: '#be123c', color: '#ffffff' }}>
                  <AlertTriangle size={12} /> Filtrando Errores <X size={12} style={{ marginLeft: 4 }} />
                </button>
              )}
            </div>
            {expedientesUnicos.length > 0 && (
              <div className="exp-info">
                <span className="exp-info-label">EXPEDIENTE</span>
                <span className="exp-info-value">
                  {expedientesUnicos.join(' · ')}
                </span>
              </div>
            )}
          </div>

          {/* ── Aviso de Proceso Detenido por el Usuario ── */}
          {stoppedByUser && !isMassAuthorizing && !isMappingAll && (
            <div style={{
              padding: '12px 18px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              color: '#92400e',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              animation: 'fadeIn 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Square size={14} fill="#d97706" color="#d97706" />
                <span><strong>Proceso detenido por el operador.</strong> Se completaron las operaciones hasta el punto de pausa.</span>
              </div>
              <button
                type="button"
                onClick={() => setStoppedByUser(false)}
                className="btn btn-ghost"
                style={{ padding: '3px 8px', fontSize: '11.5px', color: '#92400e' }}
              >
                Descartar aviso
              </button>
            </div>
          )}

          {/* ── Barra de Progreso 1: Mapeo de Catálogos (Azul/Violeta) ── */}
          {isMappingAll && (
            <div className="progress-bar-container progress-mapping">
              <div className="progress-bar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="progress-title">
                    <ServerCog size={14} className="spin-slow" /> Mapeando Catálogos y Partidas
                  </span>
                  <span className="progress-stats">
                    {mappingProgress.current} de {mappingProgress.total} ({mappingProgress.total > 0 ? Math.round((mappingProgress.current / mappingProgress.total) * 100) : 0}%)
                  </span>
                </div>

                {/* Botón Detener */}
                <button
                  type="button"
                  onClick={detenerProceso}
                  className="btn"
                  style={{
                    background: '#fff1f2',
                    color: '#e11d48',
                    border: '1px solid #fecdd3',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Square size={11} fill="#e11d48" />
                  Detener Mapeo
                </button>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill fill-blue"
                  style={{ width: `${mappingProgress.total > 0 ? (mappingProgress.current / mappingProgress.total) * 100 : 0}%` }}
                />
              </div>
              {mappingProgress.failures > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span className="progress-bar-sublabel text-danger">
                    ⚠️ {mappingProgress.failures} formas no pudieron resolverse en el catálogo
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilterOnlyErrors(!filterOnlyErrors)}
                    style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {filterOnlyErrors ? 'Ver todas las planillas' : '🔍 Filtrar y ver formas con error'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Barra de Progreso 2: Conciliación en Base de Datos (Verde Esmeralda) ── */}
          {isMassAuthorizing && (
            <div className="progress-bar-container progress-auth">
              <div className="progress-bar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="progress-title">
                    <CheckCircle size={14} /> Conciliando en Base de Datos (SIGECOF)
                  </span>
                  <span className="progress-stats">
                    {massProgress.current} de {massProgress.total} ({massProgress.total > 0 ? Math.round((massProgress.current / massProgress.total) * 100) : 0}%)
                  </span>
                </div>

                {/* Botón Detener Conciliación */}
                <button
                  type="button"
                  onClick={detenerProceso}
                  className="btn"
                  style={{
                    background: '#fff1f2',
                    color: '#e11d48',
                    border: '1px solid #fecdd3',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Square size={11} fill="#e11d48" />
                  Detener Conciliación
                </button>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill fill-emerald"
                  style={{ width: `${massProgress.total > 0 ? (massProgress.current / massProgress.total) * 100 : 0}%` }}
                />
              </div>
              <div className="progress-bar-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="text-success">✓ {massProgress.successes} conciliadas exitosamente</span>
                  {massProgress.failures > 0 && (
                    <span className="text-danger"> · ⚠️ {massProgress.failures} con error</span>
                  )}
                </div>

                {massProgress.failures > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterOnlyErrors(!filterOnlyErrors)}
                    style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {filterOnlyErrors ? 'Ver todas las planillas' : '🔍 Filtrar y ver errores'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Table card */}
          <section className="card">
            <div className="card-head">
              <div className="card-head-left">
                <h2 className="card-title">
                  <span className="ico"><Layers size={15} /></span>
                  Planillas
                  <span className="card-count">{planillasFiltradas.length}</span>
                </h2>
                {selectedPlanillas.size > 0 && (
                  <span className="selection-badge">
                    {selectedPlanillas.size} seleccionadas
                  </span>
                )}
              </div>
              <div className="card-head-actions">
                {selectedPlanillas.size > 0 && (
                  <button onClick={autorizarMasivo} disabled={isMassAuthorizing} className="btn btn-primary btn-sm">
                    {isMassAuthorizing ? (
                      <><span className="spinner spinner-white" /> {massProgress.current}/{massProgress.total}</>
                    ) : (
                      <>Autorizar ({selectedPlanillas.size})</>
                    )}
                  </button>
                )}
                <button onClick={resolverTodas} disabled={isMappingAll || isMassAuthorizing} className="btn btn-ghost btn-sm">
                  <ServerCog size={14} />
                  {isMappingAll ? 'Mapeando…' : 'Mapear Todas'}
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th className="th-check">
                      <input
                        type="checkbox"
                        onChange={toggleSelectAll}
                        checked={selectedPlanillas.size === planillasFiltradas.length && planillasFiltradas.length > 0}
                        disabled={isMassAuthorizing}
                      />
                    </th>
                    <th>Planilla</th>
                    <th>Forma</th>
                    <th className="th-num">Monto (Bs)</th>
                    <th>Resolución</th>
                    <th className="th-status">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {planillasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <p className="empty-title">Sin resultados</p>
                          <p className="empty-text">No hay planillas que coincidan con los filtros.</p>
                        </div>
                      </td>
                    </tr>
                  ) : planillasFiltradas.map((p) => {
                    const id = p.NRO_PLANILLA_FALTANTE;
                    const mapState = mappingStates[id];
                    const isSuccess = successStates[id];
                    const authState = authStates[id];
                    const isAuth = authState?.isAuthorizing;
                    const isDone = isSuccess || (authState && authState.status === 'success');

                    return (
                      <tr key={id} className={`row-link ${isDone ? 'row-done' : ''}`}>
                        <td className="td-check">
                          <input
                            type="checkbox"
                            checked={selectedPlanillas.has(id)}
                            onChange={() => toggleSelect(id)}
                            disabled={isMassAuthorizing || isDone}
                          />
                        </td>
                        <td>
                          <div className="cell-planilla">
                            <span className="cell-id">{id}</span>
                            <span className="cell-sub">RIF {p.RIF}</span>
                            <span className="cell-sub">Exp {p.EXPEDIENTE || '—'} · Lote {p.LOTE_ID}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-info">{p.FORMA}</span>
                        </td>
                        <td className="cell-money">
                          {p.MONTO_EFECTIVO.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          {!mapState ? (
                            <button onClick={() => resolverCatalogo(p)} className="btn btn-ghost btn-sm">
                              Resolver
                            </button>
                          ) : mapState.status === 'loading' ? (
                            <div className="loading" style={{ padding: 0, justifyContent: 'flex-start' }}>
                              <span className="spinner" /> Mapeando…
                            </div>
                          ) : mapState.status === 'error' ? (
                            <span className="cell-error">
                              <AlertCircle size={13} /> {mapState.error}
                            </span>
                          ) : (
                            <div className="cell-resolved">
                              <span className="cell-resolved-label">{mapState.data?.tipo_resolucion}</span>
                              <div className="cell-resolved-chips">
                                {mapState.data?.asignaciones?.map((asig: any, i: number) => (
                                  <span key={i} className="badge badge-success">{asig.cod_partida} ({asig.monto})</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="td-status">
                          {isDone ? (
                            <span className="status-pill status-success"><CheckCircle size={13} /> Conciliada</span>
                          ) : authState && authState.status === 'error' ? (
                            <span className="status-pill status-error" title={authState.message} style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px' }}>
                              <AlertCircle size={12} style={{ flexShrink: 0 }} /> {authState.message || 'Error en conciliación'}
                            </span>
                          ) : isAuth ? (
                            <span className="status-pill status-loading"><span className="spinner spinner-sm" /> Procesando</span>
                          ) : (
                            <span className="status-pill status-pending">Pendiente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="table-footer">
              <span className="table-footer-info">
                Mostrando {planillasFiltradas.length} de {planillas.length} planillas
                {hasActiveFilter && ' (filtradas)'}
              </span>
            </div>
          </section>
        </div>
      )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function OrquestadorPage() {
  return (
    <AuthProvider>
      <OrquestadorPageInner />
    </AuthProvider>
  );
}
