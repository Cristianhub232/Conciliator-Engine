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
import { BotConfigView } from '../components/BotConfigView';

function OrquestadorPageInner() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('conciliacion');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [fecha, setFecha] = useState('2024-04-15');
  const [banco, setBanco] = useState('105');
  const [estado, setEstado] = useState('ASIGNADAS');
  const [limit, setLimit] = useState(500);

  const [planillas, setPlanillas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depuracionAlert, setDepuracionAlert] = useState<any>(null);
  const [depuracionError, setDepuracionError] = useState<string | null>(null);
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
    setDepuracionError(null);
    setStoppedByUser(false);
    try {
      const [res, depScanRes] = await Promise.all([
        axios.get(`/api/orquestador/planillas/pendientes`, {
          params: { fecha, banco, estado_asignacion: estado, limit }
        }),
        axios.get(`/api/orquestador/depuracion/scan`, {
          params: { fecha, banco }
        }).catch((err: any) => {
          const msg = err.response?.data?.message || err.message || 'Error al conectar con Oracle';
          return { error: msg, data: { total_detectadas: 0 } };
        })
      ]);

      setPlanillas(res.data.data || []);
      if ((depScanRes as any).error) {
        setDepuracionError((depScanRes as any).error);
      } else if (depScanRes.data && depScanRes.data.total_detectadas > 0) {
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
    const seleccionadas = selectedPlanillas.size > 0
      ? planillasFiltradas.filter(p => selectedPlanillas.has(p.NRO_PLANILLA_FALTANTE) && !successStates[p.NRO_PLANILLA_FALTANTE])
      : planillasFiltradas.filter(p => !successStates[p.NRO_PLANILLA_FALTANTE]);

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
          asignaciones: (mapState.data?.asignaciones || []).map((a: any) => ({ partida: a.cod_partida || a.partida, monto: Number(a.monto) || 0 }))
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
        {activeTab === 'bot-config' && <BotConfigView />}
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
              <option value="ASIGNADAS">Asignadas a Workflow</option>
              <option value="HUERFANAS">Huérfanas</option>
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

      {/* ── Banner de Advertencia si falla el escáner de depuración ── */}
      {depuracionError && (
        <div style={{
          margin: '0 0 20px',
          padding: '14px 18px',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#d97706', color: '#ffffff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 800, color: '#92400e' }}>
                Advertencia: No se pudo verificar el catálogo de depuración en Oracle
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#b45309' }}>
                {depuracionError}. Verifique la conexión con la base de datos o consulte la pestaña de Depuración.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('depuracion')}
            className="btn"
            style={{
              background: '#d97706',
              color: '#ffffff',
              height: '34px',
              padding: '0 14px',
              fontSize: '12px',
              fontWeight: 700,
              whiteSpace: 'nowrap'
            }}
          >
            Revisar Depuración →
          </button>
        </div>
      )}

      {/* ── Empty State cuando no hay lote cargado ── */}
      {planillas.length === 0 && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', marginTop: '16px', padding: '84px 24px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
          <img
            src="/logo-tech-x.png"
            alt="ONT"
            style={{ width: '84px', height: '84px', objectFit: 'contain', opacity: 0.85 }}
          />
          <div style={{ textAlign: 'center', maxWidth: '420px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#14263C' }}>Sin lote cargado</div>
            <p style={{ margin: '7px 0 0', fontSize: '13.5px', lineHeight: 1.6, color: '#6B7C90' }}>
              Defina la fecha de recaudación, el banco y el estado del lote, luego ejecute la búsqueda para traer las planillas del expediente.
            </p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {planillas.length > 0 && (
        <div className="results-area">

          {/* ── 4 KPI Metric Cards Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>PLANILLAS</div>
              <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, letterSpacing: '-0.02em', color: '#14263C' }}>
                {planillasFiltradas.length}
              </div>
              <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>
                {planillasFiltradas.filter(p => !successStates[p.NRO_PLANILLA_FALTANTE]).length} pendientes de resolución
              </div>
            </div>

            <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>EXPEDIENTES</div>
              <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, letterSpacing: '-0.02em', color: '#14263C' }}>
                {expedientesUnicos[0] || planillas[0]?.EXPEDIENTE || '1'}
              </div>
              <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>
                Lote {planillas[0]?.LOTE_ID || '1'} · Banco {banco}
              </div>
            </div>

            <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>FORMAS DISTINTAS</div>
              <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, letterSpacing: '-0.02em', color: '#14263C' }}>
                {Object.keys(formasCount).length}
              </div>
              <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>
                Reglas activas del catálogo
              </div>
            </div>

            <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>MONTO TOTAL</div>
              <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, letterSpacing: '-0.02em', color: '#14263C' }}>
                {totalMonto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>
                Bolívares · sin ajustes
              </div>
            </div>
          </div>

          {/* ── Analytics & Charts Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', gap: '12px', marginBottom: '14px' }}>
            {/* Gráfico Barras: Monto por Forma */}
            <div style={{ background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #EDF1F5' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#14263C' }}>Monto por forma tributaria</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#8797A8' }}>Bs · Lote activo</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '18px 16px' }}>
                {Object.entries(formasCount).slice(0, 4).map(([formaCode, count], idx) => {
                  const formaMonto = planillas.filter(p => p.FORMA === formaCode).reduce((acc, p) => acc + (p.MONTO_EFECTIVO || 0), 0);
                  const pct = totalMonto > 0 ? Math.min(100, Math.round((formaMonto / totalMonto) * 100)) : 25;
                  const barColors = ['#1E5C99', '#2C7BC0', '#3FB4A8', '#8CC63F'];
                  return (
                    <div key={formaCode} style={{ display: 'grid', gridTemplateColumns: '62px minmax(0, 1fr) 110px', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: '#3D4F66' }}>
                        {formaCode}
                      </span>
                      <span style={{ display: 'block', height: '20px', borderRadius: '3px', background: '#F1F5F9', overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', borderRadius: '3px', width: `${pct}%`, background: barColors[idx % barColors.length], transition: 'width 0.4s ease' }} />
                      </span>
                      <span style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', fontWeight: 500, color: '#14263C' }}>
                        {formaMonto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gráfico Circular: Estado de Resolución */}
            <div style={{ background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #EDF1F5', fontSize: '13.5px', fontWeight: 800, color: '#14263C' }}>
                Estado de resolución
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '18px 16px' }}>
                <div style={{ position: 'relative', width: '108px', height: '108px', flex: 'none', borderRadius: '50%', background: 'conic-gradient(#E5A32B 0deg 240deg, #3FB4A8 240deg 320deg, #2E7D4F 320deg 360deg)' }}>
                  <div style={{ position: 'absolute', inset: '20px', borderRadius: '50%', background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '18px', fontWeight: 700, color: '#14263C' }}>
                      {planillasFiltradas.length}
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>TOTAL</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#E5A32B', flex: 'none' }} />
                    <span style={{ flex: 1, fontSize: '12.5px', fontWeight: 600, color: '#3D4F66' }}>Pendiente</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: '#14263C' }}>
                      {planillasFiltradas.filter(p => !mappingStates[p.NRO_PLANILLA_FALTANTE] && !successStates[p.NRO_PLANILLA_FALTANTE]).length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#3FB4A8', flex: 'none' }} />
                    <span style={{ flex: 1, fontSize: '12.5px', fontWeight: 600, color: '#3D4F66' }}>Mapeada</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: '#14263C' }}>
                      {planillasFiltradas.filter(p => mappingStates[p.NRO_PLANILLA_FALTANTE]?.status === 'success' && !successStates[p.NRO_PLANILLA_FALTANTE]).length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#2E7D4F', flex: 'none' }} />
                    <span style={{ flex: 1, fontSize: '12.5px', fontWeight: 600, color: '#3D4F66' }}>Conciliada</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: '#14263C' }}>
                      {planillasFiltradas.filter(p => successStates[p.NRO_PLANILLA_FALTANTE]).length}
                    </span>
                  </div>
                </div>
              </div>
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
              <div className="card-head-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={autorizarMasivo}
                  disabled={isMassAuthorizing || isMappingAll || planillasFiltradas.filter(p => !successStates[p.NRO_PLANILLA_FALTANTE]).length === 0}
                  className="btn btn-primary btn-sm"
                  style={{
                    background: '#2E7D4F',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    boxShadow: '0 1px 3px rgba(46, 125, 79, 0.25)'
                  }}
                >
                  <CheckCircle size={14} />
                  {isMassAuthorizing ? (
                    <><span className="spinner spinner-white" /> Conciliando ({massProgress.current}/{massProgress.total})</>
                  ) : selectedPlanillas.size > 0 ? (
                    <>Conciliar ({selectedPlanillas.size})</>
                  ) : (
                    <>Conciliar Lote ({planillasFiltradas.filter(p => !successStates[p.NRO_PLANILLA_FALTANTE]).length})</>
                  )}
                </button>

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
