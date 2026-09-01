"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldAlert, 
  Search, 
  Layers, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Plus, 
  FileText, 
  ShieldCheck, 
  Lock, 
  Calendar, 
  Building2, 
  History, 
  AlertTriangle,
  KeyRound,
  Check,
  X,
  Eye,
  Sliders,
  DollarSign,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface FormaDepuracionItem {
  id: number;
  cod_forma: string;
  descripcion: string;
  motivo: string;
  estado: string;
  created_at: string;
  updated_at: string;
}

interface PlanillaDetectada {
  planilla_id: string;
  forma: string;
  monto: number;
  banco: string;
  agencia: string;
  fecha_recaudacion: string;
  rif: string;
}

interface DesgloseForma {
  forma: string;
  cantidad: number;
  monto_total: number;
}

interface AuditDepuracionItem {
  id: number;
  fecha_depuracion: string;
  usuario_email: string;
  usuario_nombre: string;
  fecha_recaudacion: string;
  banco_codigo: string;
  total_registros_eliminados: number;
  monto_total_depurado: number;
  formas_afectadas: string;
  planillas_afectadas: any;
  motivo_autorizacion: string;
  ip_address: string;
}

export const DepuracionView: React.FC = () => {
  const { usuario } = useAuth();
  const [activeTab, setActiveTab] = useState<'escaner' | 'catalogo' | 'auditoria'>('escaner');

  // Parámetros de Escaneo
  const [fecha, setFecha] = useState('2024-04-15');
  const [banco, setBanco] = useState('105');
  const [expediente, setExpediente] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanExecuted, setScanExecuted] = useState(false);
  const [scanResult, setScanResult] = useState<{
    total_detectadas: number;
    monto_total: number;
    formas_detectadas: string[];
    desglose_por_forma: DesgloseForma[];
    planillas: PlanillaDetectada[];
  } | null>(null);

  // Selección de Planillas para Depurar
  const [selectedPlanillaIds, setSelectedPlanillaIds] = useState<Set<string>>(new Set());

  // Catálogo de Formas
  const [formasConfiguradas, setFormasConfiguradas] = useState<FormaDepuracionItem[]>([]);
  const [loadingFormas, setLoadingFormas] = useState(false);
  const [newCodForma, setNewCodForma] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');
  const [newMotivo, setNewMotivo] = useState('Forma no procesable en conciliación');
  const [isAddingForma, setIsAddingForma] = useState(false);

  // Auditoría
  const [auditList, setAuditList] = useState<AuditDepuracionItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [selectedAuditDetail, setSelectedAuditDetail] = useState<AuditDepuracionItem | null>(null);

  // Modal de Autorización de Seguridad
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authMotivo, setAuthMotivo] = useState('Depuración autorizada de formas no tributarias/no procesables');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

  const showToast = (message: string, type: 'success' | 'danger' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Cargar Catálogo de Formas
  const loadFormasConfiguradas = async () => {
    setLoadingFormas(true);
    try {
      const res = await axios.get('/api/orquestador/depuracion/formas');
      setFormasConfiguradas(res.data);
    } catch (err: any) {
      console.error('Error cargando formas de depuracion:', err);
    } finally {
      setLoadingFormas(false);
    }
  };

  // Cargar Auditoría
  const loadAuditHistory = async () => {
    setLoadingAudit(true);
    try {
      const res = await axios.get('/api/orquestador/depuracion/historial');
      setAuditList(res.data);
    } catch (err: any) {
      console.error('Error cargando historial de depuracion:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadFormasConfiguradas();
    loadAuditHistory();
  }, []);

  // Escanear Lote en Oracle
  const handleScanLote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setScanning(true);
    setSelectedPlanillaIds(new Set());
    setScanResult(null);
    try {
      const res = await axios.get('/api/orquestador/depuracion/scan', {
        params: {
          fecha,
          banco,
          expediente: expediente.trim() || undefined
        }
      });
      setScanResult(res.data);
      setScanExecuted(true);

      // Auto-seleccionar todas las detectadas por defecto
      if (res.data.planillas && res.data.planillas.length > 0) {
        setSelectedPlanillaIds(new Set(res.data.planillas.map((p: any) => p.planilla_id)));
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error al escanear lote', 'danger');
    } finally {
      setScanning(false);
    }
  };

  // Toggle Selección de Planilla
  const toggleSelectPlanilla = (id: string) => {
    const next = new Set(selectedPlanillaIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPlanillaIds(next);
  };

  // Toggle Seleccionar Todas
  const toggleSelectAll = () => {
    if (!scanResult || scanResult.planillas.length === 0) return;
    if (selectedPlanillaIds.size === scanResult.planillas.length) {
      setSelectedPlanillaIds(new Set());
    } else {
      setSelectedPlanillaIds(new Set(scanResult.planillas.map(p => p.planilla_id)));
    }
  };

  // Agregar Forma al Catálogo
  const handleAddForma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodForma) return;
    setIsAddingForma(true);
    try {
      await axios.post('/api/orquestador/depuracion/formas', {
        cod_forma: newCodForma.trim(),
        descripcion: newDescripcion.trim() || `Forma ${newCodForma} - Marcada para depuración`,
        motivo: newMotivo.trim()
      });
      showToast(`Forma ${newCodForma} agregada al control de depuración`, 'success');
      setNewCodForma('');
      setNewDescripcion('');
      loadFormasConfiguradas();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error al agregar forma', 'danger');
    } finally {
      setIsAddingForma(false);
    }
  };

  // Toggle Estado de Forma
  const handleToggleEstado = async (forma: FormaDepuracionItem) => {
    const nuevoEstado = forma.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      await axios.patch(`/api/orquestador/depuracion/formas/${forma.id}/estado`, {
        estado: nuevoEstado
      });
      showToast(`Forma ${forma.cod_forma} marcada como ${nuevoEstado}`, 'success');
      loadFormasConfiguradas();
    } catch (err: any) {
      showToast('Error actualizando estado', 'danger');
    }
  };

  // Eliminar Forma del Catálogo
  const handleDeleteForma = async (id: number, cod: string) => {
    if (!confirm(`¿Eliminar la forma ${cod} del catálogo de depuración?`)) return;
    try {
      await axios.delete(`/api/orquestador/depuracion/formas/${id}`);
      showToast(`Forma ${cod} eliminada del control de depuración`, 'success');
      loadFormasConfiguradas();
    } catch (err: any) {
      showToast('Error al eliminar forma', 'danger');
    }
  };

  // Abrir Modal de Autorización
  const handleOpenAuthModal = () => {
    if (selectedPlanillaIds.size === 0) {
      alert('Debe seleccionar al menos una planilla para depurar.');
      return;
    }
    setAuthError(null);
    setAuthPassword('');
    setIsAuthModalOpen(true);
  };

  // Ejecutar Depuración Definitiva
  const handleEjecutarDepuracion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPassword) {
      setAuthError('Debe ingresar su contraseña de autorización.');
      return;
    }

    setAuthSubmitting(true);
    setAuthError(null);

    try {
      const res = await axios.post('/api/orquestador/depuracion/ejecutar', {
        fecha,
        banco,
        planillas_ids: Array.from(selectedPlanillaIds),
        motivo: authMotivo,
        password_autorizacion: authPassword,
        usuario_email: usuario?.email || 'operador@ont.gob.ve'
      });

      showToast(`✅ ${res.data.mensaje}`, 'success');
      setIsAuthModalOpen(false);
      
      // Re-escanear lote para verificar que se limpiaron
      handleScanLote();
      loadAuditHistory();
    } catch (err: any) {
      const msg = err.response?.data?.message
        ? (Array.isArray(err.response.data.message) ? err.response.data.message.join(', ') : err.response.data.message)
        : err.message || 'Error al ejecutar depuración';
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Cálculo de montos seleccionados
  const selectedMonto = scanResult?.planillas
    .filter(p => selectedPlanillaIds.has(p.planilla_id))
    .reduce((acc, p) => acc + p.monto, 0) || 0;

  return (
    <div className="container" style={{ maxWidth: '100%', padding: 0 }}>
      {/* ── Topbar ── */}
      <header className="app-topbar">
        <div className="app-topbar-left">
          <div className="app-logo-mark" style={{ background: '#e11d48' }}>
            <ShieldAlert size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="app-title">Módulo de Depuración Controlada de Formas</h1>
            <p className="app-subtitle">Detección, Control y Eliminación Autorizada de Registros No Procesables (79984, 99008, 00084, 79084, 99001)</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--r-full)',
            fontSize: 'var(--fs-xs)',
            fontWeight: 600
          }}>
            <span className="status-dot" style={{ background: '#e11d48', boxShadow: '0 0 6px #e11d48' }}></span>
            <span>Control de Seguridad Activo</span>
            <span className="badge badge-danger">{formasConfiguradas.filter(f => f.estado === 'ACTIVO').length} Formas en Control</span>
          </div>

          <button 
            type="button" 
            onClick={() => { loadFormasConfiguradas(); loadAuditHistory(); }} 
            className="btn btn-ghost" 
            title="Refrescar"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ 
          padding: '12px 18px', 
          background: toast.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)', 
          border: `1px solid ${toast.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`, 
          borderRadius: 'var(--r-md)', 
          color: toast.type === 'success' ? 'var(--success)' : 'var(--danger)', 
          marginBottom: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px' 
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{toast.message}</span>
        </div>
      )}

      {/* ── Sub-Navigation Tabs ── */}
      <div className="tab-nav" style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('escaner')}
          className={`tab-nav-btn ${activeTab === 'escaner' ? 'active' : ''}`}
        >
          <Search size={16} />
          <span>Escáner y Depuración de Lotes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalogo')}
          className={`tab-nav-btn ${activeTab === 'catalogo' ? 'active' : ''}`}
        >
          <Sliders size={16} />
          <span>Catálogo de Formas a Depurar ({formasConfiguradas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('auditoria')}
          className={`tab-nav-btn ${activeTab === 'auditoria' ? 'active' : ''}`}
        >
          <History size={16} />
          <span>Bitácora de Depuraciones ({auditList.length})</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: ESCÁNER Y DEPURACIÓN DE LOTES
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'escaner' && (
        <div className="stack" style={{ gap: '20px' }}>
          {/* Panel de Parámetros de Búsqueda */}
          <div className="search-panel">
            <form onSubmit={handleScanLote} style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end', width: '100%' }}>
              <div className="field" style={{ minWidth: '150px' }}>
                <label className="field-label">Fecha de Recaudación</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="input-field mono"
                  required
                />
              </div>

              <div className="field" style={{ minWidth: '150px' }}>
                <label className="field-label">Banco Recaudador</label>
                <select
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  className="input-field mono"
                  required
                >
                  <option value="105">105 — BANCO MERCANTIL</option>
                  <option value="102">102 — BANCO DE VENEZUELA</option>
                  <option value="104">104 — BANCO VENEZOLANO DE CRÉDITO</option>
                  <option value="108">108 — BANCO PROVINCIAL</option>
                  <option value="114">114 — BANCARIBE</option>
                  <option value="115">115 — BANCO EXTERIOR</option>
                  <option value="116">116 — BANCO OCCIDENTAL DE DESCUENTO</option>
                  <option value="128">128 — BANCO CARONÍ</option>
                  <option value="134">134 — BANESCO</option>
                  <option value="163">163 — BANCO DEL TESORO</option>
                  <option value="175">175 — BANCO BICENTENARIO</option>
                </select>
              </div>

              <div className="field" style={{ minWidth: '130px' }}>
                <label className="field-label">Expediente (Opcional)</label>
                <input
                  type="text"
                  value={expediente}
                  onChange={(e) => setExpediente(e.target.value)}
                  placeholder="Ej. 14389"
                  className="input-field mono"
                />
              </div>

              <button
                type="submit"
                disabled={scanning}
                className="btn btn-primary"
                style={{ height: '42px', background: '#e11d48' }}
              >
                {scanning ? <Loader2 size={16} className="spinner" /> : <Search size={16} />}
                Escanear Lote para Depuración
              </button>
            </form>
          </div>

          {/* Resultados del Escaneo */}
          {scanExecuted && scanResult && (
            <div className="stack" style={{ gap: '18px' }}>
              {/* Banner de Estado */}
              {scanResult.total_detectadas > 0 ? (
                <div style={{
                  padding: '16px 20px',
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e11d48', color: '#ffffff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <AlertTriangle size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#9f1239' }}>
                        ¡Se han detectado {scanResult.total_detectadas} planillas con formas a depurar!
                      </h3>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#881337' }}>Formas detectadas:</span>
                        {scanResult.desglose_por_forma.map(d => (
                          <span key={d.forma} className="badge badge-danger" style={{ fontWeight: 700 }}>
                            Forma {d.forma}: {d.cantidad} regs (Bs. {d.monto_total.toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenAuthModal}
                    disabled={selectedPlanillaIds.size === 0}
                    className="btn"
                    style={{
                      background: '#e11d48',
                      color: '#ffffff',
                      height: '44px',
                      padding: '0 20px',
                      fontWeight: 800,
                      boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <ShieldAlert size={18} style={{ marginRight: 6 }} />
                    Iniciar Proceso de Depuración ({selectedPlanillaIds.size})
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: '20px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                  <CheckCircle2 size={24} color="#16a34a" />
                  <div>
                    <h3 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                      Lote Limpio de Formas en Depuración
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#15803d' }}>
                      No se encontraron registros pendientes con formas marcadas para depuración (79984, 99008, 00084, 79084, 99001) para la fecha {fecha} y banco {banco}.
                    </p>
                  </div>
                </div>
              )}

              {/* Tabla de Planillas Detectadas */}
              {scanResult.total_detectadas > 0 && (
                <div className="table-section">
                  <div style={{ padding: '14px 18px', background: 'var(--surface-0)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={selectedPlanillaIds.size === scanResult.planillas.length}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>
                        Seleccionar Todas ({selectedPlanillaIds.size} de {scanResult.planillas.length})
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Monto Seleccionado a Depurar: <strong className="mono" style={{ color: '#e11d48' }}>Bs. {selectedMonto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}></th>
                          <th>Nro. Planilla</th>
                          <th style={{ width: '120px' }}>Forma</th>
                          <th style={{ textAlign: 'right', width: '140px' }}>Monto (Bs.)</th>
                          <th>RIF Contribuyente</th>
                          <th>Banco / Agencia</th>
                          <th>Fecha Recaudación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanResult.planillas.map((p) => (
                          <tr key={p.planilla_id} style={{ background: selectedPlanillaIds.has(p.planilla_id) ? '#fff1f2' : undefined }}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedPlanillaIds.has(p.planilla_id)}
                                onChange={() => toggleSelectPlanilla(p.planilla_id)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                            <td>
                              <span className="mono" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                                {p.planilla_id}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-danger" style={{ fontWeight: 800 }}>
                                FORMA {p.forma}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span className="mono" style={{ fontWeight: 750, color: '#e11d48' }}>
                                Bs. {p.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="mono" style={{ fontSize: '12px' }}>
                              {p.rif || 'N/A'}
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              Banco {p.banco} · Ag. {p.agencia}
                            </td>
                            <td className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {p.fecha_recaudacion}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: CATÁLOGO DE FORMAS A DEPURAR
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'catalogo' && (
        <div className="stack" style={{ gap: '20px' }}>
          {/* Panel Agregar Nueva Forma */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Plus size={18} color="var(--brand)" />
                <span>Agregar Código de Forma a Control de Depuración</span>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddForma} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr auto', gap: '12px', alignItems: 'flex-end' }}>
                <div className="field">
                  <label className="field-label">Código de Forma</label>
                  <input
                    type="text"
                    value={newCodForma}
                    onChange={(e) => setNewCodForma(e.target.value)}
                    placeholder="Ej. 79984"
                    className="input-field mono"
                    required
                  />
                </div>

                <div className="field">
                  <label className="field-label">Descripción</label>
                  <input
                    type="text"
                    value={newDescripcion}
                    onChange={(e) => setNewDescripcion(e.target.value)}
                    placeholder="Ej. Forma 79984 - No procesable en conciliación"
                    className="input-field"
                  />
                </div>

                <div className="field">
                  <label className="field-label">Motivo de Depuración</label>
                  <input
                    type="text"
                    value={newMotivo}
                    onChange={(e) => setNewMotivo(e.target.value)}
                    placeholder="Ej. Instrucción directiva ONT"
                    className="input-field"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAddingForma || !newCodForma}
                  className="btn btn-primary"
                  style={{ height: '42px', background: '#0284c7' }}
                >
                  {isAddingForma ? <Loader2 size={16} className="spinner" /> : <Plus size={16} />}
                  Agregar
                </button>
              </form>
            </div>
          </div>

          {/* Tabla de Formas en Control */}
          <div className="table-section">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>Cód. Forma</th>
                    <th>Descripción / Identificación</th>
                    <th>Motivo de Depuración</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Estado</th>
                    <th style={{ width: '140px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingFormas ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>
                        <Loader2 className="spinner" size={20} style={{ margin: '0 auto 8px' }} />
                        <span>Cargando catálogo de depuración...</span>
                      </td>
                    </tr>
                  ) : formasConfiguradas.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No hay formas registradas en el catálogo de depuración.
                      </td>
                    </tr>
                  ) : (
                    formasConfiguradas.map((f) => (
                      <tr key={f.id}>
                        <td>
                          <span className="mono" style={{ fontWeight: 800, color: '#e11d48', fontSize: '13px' }}>
                            {f.cod_forma}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {f.descripcion}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {f.motivo}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${f.estado === 'ACTIVO' ? 'badge-danger' : 'badge-neutral'}`} style={{ fontWeight: 700 }}>
                            {f.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleEstado(f)}
                              className="btn btn-ghost"
                              style={{ padding: '5px 8px', height: 'auto', fontSize: '11px' }}
                              title={f.estado === 'ACTIVO' ? 'Desactivar forma' : 'Activar forma'}
                            >
                              {f.estado === 'ACTIVO' ? 'Pausar' : 'Activar'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteForma(f.id, f.cod_forma)}
                              className="btn btn-ghost"
                              style={{ padding: '5px 8px', height: 'auto', color: 'var(--danger)' }}
                              title="Eliminar de catálogo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: BITÁCORA DE DEPURACIONES (AUDITORÍA LEGAL)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'auditoria' && (
        <div className="table-section">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID Audit</th>
                  <th>Fecha Depuración</th>
                  <th>Usuario Autorizador</th>
                  <th>Fecha Recaudación / Banco</th>
                  <th style={{ textAlign: 'center', width: '110px' }}>Registros</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Monto Depurado</th>
                  <th>Formas Afectadas</th>
                  <th>Motivo de Autorización</th>
                  <th style={{ textAlign: 'right', width: '90px' }}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {loadingAudit ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px' }}>
                      <Loader2 className="spinner" size={20} style={{ margin: '0 auto 8px' }} />
                      <span>Cargando bitácora de auditoría...</span>
                    </td>
                  </tr>
                ) : auditList.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No se han registrado procesos de depuración todavía.
                    </td>
                  </tr>
                ) : (
                  auditList.map((a) => (
                    <tr key={a.id}>
                      <td className="mono" style={{ color: 'var(--text-muted)' }}>#{a.id}</td>
                      <td style={{ fontSize: '12px' }}>
                        {new Date(a.fecha_depuracion).toLocaleString('es-VE')}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12.5px' }}>
                          {a.usuario_nombre || a.usuario_email}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.usuario_email}</div>
                      </td>
                      <td className="mono" style={{ fontSize: '12px' }}>
                        {a.fecha_recaudacion} · Bco {a.banco_codigo}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-danger" style={{ fontWeight: 800 }}>
                          {a.total_registros_eliminados} eliminadas
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="mono" style={{ fontWeight: 750, color: '#e11d48' }}>
                          Bs. {Number(a.monto_total_depurado || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                          {a.formas_afectadas}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {a.motivo_autorizacion}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedAuditDetail(a)}
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--brand)' }}
                        >
                          <Eye size={13} style={{ marginRight: 3 }} /> Ver
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: AUTORIZACIÓN DE SEGURIDAD PARA DEPURACIÓN
      ══════════════════════════════════════════════════════════════════════ */}
      {isAuthModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '580px' }}>
            {/* Header */}
            <div className="modal-header" style={{ background: '#fff1f2', borderBottom: '1px solid #fecdd3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="modal-icon-badge" style={{ background: '#e11d48', color: '#ffffff' }}>
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#9f1239', margin: '0 0 2px' }}>
                    Autorización de Depuración Definitiva
                  </h2>
                  <p style={{ fontSize: '12px', color: '#be123c', margin: 0 }}>
                    Confirmación de seguridad requerida para eliminar registros en TXT_SENIAT
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setIsAuthModalOpen(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {authError && (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--danger-soft)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--r-md)',
                  color: 'var(--danger)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{authError}</span>
                </div>
              )}

              {/* Advertencia Legal */}
              <div style={{
                padding: '12px 16px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                color: '#92400e',
                fontSize: '12px',
                lineHeight: 1.5,
                marginBottom: '16px'
              }}>
                <strong>⚠️ Advertencia Transaccional:</strong> Esta acción eliminará permanentemente <strong>{selectedPlanillaIds.size} planillas</strong> del extracto bancario (<code className="mono">ORG_LIQ.TXT_SENIAT</code>) para permitir la conciliación limpia del lote. Esta operación es irreversible y quedará registrada en la bitácora legal de auditoría con su usuario.
              </div>

              {/* Resumen de Depuración */}
              <div style={{
                padding: '12px 16px',
                background: 'var(--surface-0)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '16px',
                fontSize: '12px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Planillas a Eliminar:</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#e11d48' }}>{selectedPlanillaIds.size} registros</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Monto Total a Depurar:</span>
                  <div className="mono" style={{ fontSize: '15px', fontWeight: 800, color: '#e11d48' }}>
                    Bs. {selectedMonto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Fecha Recaudación:</span>
                  <div className="mono" style={{ fontWeight: 700 }}>{fecha} (Banco {banco})</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Usuario Autorizador:</span>
                  <div style={{ fontWeight: 700 }}>{usuario?.email || 'operador@ont.gob.ve'}</div>
                </div>
              </div>

              <form id="auth-depuracion-form" onSubmit={handleEjecutarDepuracion} className="stack" style={{ gap: '14px' }}>
                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                    Motivo / Justificación Formal de la Depuración
                  </label>
                  <input
                    type="text"
                    value={authMotivo}
                    onChange={(e) => setAuthMotivo(e.target.value)}
                    placeholder="Ej. Eliminación de formas no procesables según instrucción..."
                    className="input-field"
                    required
                  />
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                    Contraseña de Autorización de Seguridad
                  </label>
                  <div className="input-icon-wrap">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Ingrese su clave de acceso para autorizar"
                      className="input-field mono"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="auth-depuracion-form"
                disabled={authSubmitting || !authPassword}
                className="btn"
                style={{
                  background: '#e11d48',
                  color: '#ffffff',
                  minWidth: '180px',
                  fontWeight: 800
                }}
              >
                {authSubmitting ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Ejecutando Depuración...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Confirmar y Eliminar Registros
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: DETALLE DE AUDITORÍA
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedAuditDetail && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="modal-icon-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                    Detalle de Auditoría #{selectedAuditDetail.id}
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    {new Date(selectedAuditDetail.fecha_depuracion).toLocaleString('es-VE')}
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setSelectedAuditDetail(null)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="stack" style={{ gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Usuario Autorizador:</span>
                    <div style={{ fontWeight: 700 }}>{selectedAuditDetail.usuario_nombre} ({selectedAuditDetail.usuario_email})</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Fecha / Banco:</span>
                    <div className="mono" style={{ fontWeight: 700 }}>{selectedAuditDetail.fecha_recaudacion} · Banco {selectedAuditDetail.banco_codigo}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Total Registros Eliminados:</span>
                    <div style={{ fontWeight: 800, color: '#e11d48' }}>{selectedAuditDetail.total_registros_eliminados} planillas</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Monto Total Depurado:</span>
                    <div className="mono" style={{ fontWeight: 800, color: '#e11d48' }}>
                      Bs. {Number(selectedAuditDetail.monto_total_depurado || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Motivo de Autorización</label>
                  <div style={{ padding: '10px 14px', background: 'var(--surface-0)', borderRadius: '8px', fontSize: '12px' }}>
                    {selectedAuditDetail.motivo_autorizacion}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Planillas Depuradas</label>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: '8px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Planilla</th>
                          <th>Forma</th>
                          <th style={{ textAlign: 'right' }}>Monto Bs.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(selectedAuditDetail.planillas_afectadas) && selectedAuditDetail.planillas_afectadas.map((p: any, idx: number) => (
                          <tr key={idx}>
                            <td className="mono">{p.planilla_id}</td>
                            <td><span className="badge badge-danger">FORMA {p.forma}</span></td>
                            <td className="mono" style={{ textAlign: 'right' }}>Bs. {Number(p.monto || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setSelectedAuditDetail(null)}
                className="btn btn-ghost"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
