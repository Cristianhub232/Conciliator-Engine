"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  ArrowRightLeft, 
  Search, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Layers, 
  Filter, 
  CheckSquare, 
  Square, 
  Clock, 
  FileSpreadsheet, 
  AlertTriangle,
  Building2,
  Calendar,
  X,
  Send,
  User,
  ExternalLink
} from 'lucide-react';
import { ExpedienteDetailModal } from './ExpedienteDetailModal';

interface ExpedienteItem {
  expediente: number;
  anho: number;
  workitem: number;
  usuario_asignado: string;
  estado_wi: string;
  wi_nombre: string;
  wi_descripcion: string;
  fecha_asignacion: string;
  banco: string;
  fecha_recaudacion: string;
  total_lotes: number;
  lotes_pendientes: number;
  lotes_conciliados: number;
  total_planillas: number;
  planillas_pendientes: number;
  monto_total: number;
}

interface TranscriptorItem {
  users_id: string;
  nombre_corto: string;
  nombre_largo: string;
  nombre_completo: string;
  orga_id: string;
  expedientes_asignados: number;
}

interface ReasignacionKpis {
  total_expedientes_abierta: number;
  total_gilliams_abierta: number;
  planillas_pendientes_en_vista: number;
  lotes_pendientes_en_vista: number;
}

export const ReasignacionExpedientesView: React.FC = () => {
  // Filtros
  const [usuarioOrigen, setUsuarioOrigen] = useState<string>('GILLIAMS_0028');
  const [estadoWi, setEstadoWi] = useState<string>('ABIERTA');
  const [anho, setAnho] = useState<string>('2024');
  const [mes, setMes] = useState<string>('TODOS');
  const [banco, setBanco] = useState<string>('');
  const [searchExp, setSearchExp] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);

  // Datos
  const [expedientes, setExpedientes] = useState<ExpedienteItem[]>([]);
  const [transcriptores, setTranscriptores] = useState<TranscriptorItem[]>([]);
  const [kpis, setKpis] = useState<ReasignacionKpis>({
    total_expedientes_abierta: 0,
    total_gilliams_abierta: 0,
    planillas_pendientes_en_vista: 0,
    lotes_pendientes_en_vista: 0,
  });

  // Estados de carga y feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingTranscriptores, setLoadingTranscriptores] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selección múltiple
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Ejecución de Reasignación
  const [selectedTranscriptor, setSelectedTranscriptor] = useState<string>('');
  const [observacion, setObservacion] = useState<string>('Reasignación de expedientes para balanceo de carga operativa');
  const [executing, setExecuting] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any | null>(null);

  // Modal de detalle del expediente
  const [selectedModalExpId, setSelectedModalExpId] = useState<string | number | null>(null);

  // Cargar lista de transcriptores al montar
  const fetchTranscriptores = async () => {
    setLoadingTranscriptores(true);
    try {
      const res = await axios.get('/api/orquestador/planillas/reasignacion/transcriptores');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setTranscriptores(res.data.data);
      }
    } catch (err: any) {
      console.warn('Error al obtener transcriptores:', err);
    } finally {
      setLoadingTranscriptores(false);
    }
  };

  // Cargar expedientes pendientes
  const fetchExpedientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (usuarioOrigen) params.append('usuario_origen', usuarioOrigen);
      if (estadoWi) params.append('estado_wi', estadoWi);
      if (anho) params.append('anho', anho);
      if (mes && mes !== 'TODOS') params.append('mes', mes);
      if (banco) params.append('banco', banco);
      if (searchExp) params.append('search', searchExp.trim());
      params.append('limit', String(limit));

      const res = await axios.get(`/api/orquestador/planillas/reasignacion/pendientes?${params.toString()}`);
      if (res.data?.success) {
        setExpedientes(res.data.data || []);
        if (res.data.kpis) {
          setKpis(res.data.kpis);
        }
      } else {
        setError(res.data?.message || 'Error al consultar expedientes');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTranscriptores();
    fetchExpedientes();
  }, []);

  // Clave única por expediente
  const getItemKey = (item: ExpedienteItem) => `${item.expediente}-${item.anho}`;

  // Manejo de selección
  const toggleSelect = (item: ExpedienteItem) => {
    const key = getItemKey(item);
    const newSet = new Set(selectedKeys);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedKeys(newSet);
  };

  const selectCount = (count: number) => {
    const subset = expedientes.slice(0, count);
    const newSet = new Set<string>();
    subset.forEach(item => newSet.add(getItemKey(item)));
    setSelectedKeys(newSet);
  };

  const selectAll = () => {
    const newSet = new Set<string>();
    expedientes.forEach(item => newSet.add(getItemKey(item)));
    setSelectedKeys(newSet);
  };

  const clearSelection = () => {
    setSelectedKeys(new Set());
  };

  // Expedientes actualmente seleccionados
  const selectedExpedientesList = useMemo(() => {
    return expedientes.filter(item => selectedKeys.has(getItemKey(item)));
  }, [expedientes, selectedKeys]);

  const totalPlanillasSeleccionadas = useMemo(() => {
    return selectedExpedientesList.reduce((sum, item) => sum + item.planillas_pendientes, 0);
  }, [selectedExpedientesList]);

  // Ejecutar Reasignación
  const handleEjecutarReasignacion = async () => {
    if (!selectedTranscriptor) {
      alert('Por favor seleccione el transcriptor destino.');
      return;
    }
    if (selectedExpedientesList.length === 0) {
      alert('Debe seleccionar al menos un expediente.');
      return;
    }

    setExecuting(true);
    setError(null);
    setSuccessMessage(null);
    setLastResult(null);

    try {
      const payload = {
        nuevo_transcriptor: selectedTranscriptor,
        observacion: observacion.trim(),
        expedientes: selectedExpedientesList.map(item => ({
          expediente: item.expediente,
          anho: item.anho,
          workitem: item.workitem,
          banco: item.banco,
          fecha_recaudacion: item.fecha_recaudacion,
        })),
      };

      const res = await axios.post('/api/orquestador/planillas/reasignacion/ejecutar', payload);
      if (res.data?.success || res.data?.total_exitosos > 0) {
        setSuccessMessage(res.data.mensaje);
        setLastResult(res.data);
        setIsConfirmModalOpen(false);
        // Limpiar selección y refrescar datos
        setSelectedKeys(new Set());
        fetchExpedientes();
        fetchTranscriptores();
      } else {
        setError(res.data?.message || 'Error durante la reasignación');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al ejecutar reasignación masiva');
    } finally {
      setExecuting(false);
    }
  };

  const targetTranscriptorObj = transcriptores.find(t => t.users_id === selectedTranscriptor);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', background: '#F6F8FA' }}>
      {/* ── Topbar / Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', background: '#ffffff', borderBottom: '1px solid #E6EBF1', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '9px', background: '#EDF4FB', color: '#1E5C99' }}>
            <ArrowRightLeft size={18} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#14263C', letterSpacing: '-0.02em' }}>
                Reasignación de Carga Operativa
              </h1>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#EDF4FB', color: '#1E5C99', border: '1px solid #D6E4F0' }}>
                ABIERTA ➔ PENDIENTE
              </span>
            </div>
            <div style={{ marginTop: '2px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: '#8797A8', textTransform: 'uppercase' }}>
              BALANCEO DE BANDEJAS Y REDISTRIBUCIÓN DE EXPEDIENTES · SIGECOF
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchExpedientes}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              border: '1px solid #E1E7EE',
              background: '#ffffff',
              color: '#3D4F66',
              fontSize: '13px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </header>

      {/* ── Scrollable Body ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── 4 KPI Cards Grid (Estilo idéntico a UsuariosView y AuditoriaLogsView) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
          {/* Card 1: Total Gilliams */}
          <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>
              EN GILLIAMS_0028 (ABIERTA)
            </div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#14263C' }}>
              {kpis.total_gilliams_abierta.toLocaleString('es-VE')}
            </div>
            <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>
              Expedientes concentrados en abierta
            </div>
          </div>

          {/* Card 2: Total General Abierta */}
          <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>
              TOTAL SISTEMA EN ABIERTA
            </div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#14263C' }}>
              {kpis.total_expedientes_abierta.toLocaleString('es-VE')}
            </div>
            <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>
              Tarea 2061 (Conciliación Automática)
            </div>
          </div>

          {/* Card 3: Planillas pendientes en vista */}
          <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>
              PLANILLAS PENDIENTES (VISTA)
            </div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#1E5C99' }}>
              {kpis.planillas_pendientes_en_vista.toLocaleString('es-VE')}
            </div>
            <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>
              En los {expedientes.length} expedientes listados
            </div>
          </div>

          {/* Card 4: Transcriptores disponibles */}
          <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>
              TRANSCRIPTORES ONT
            </div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#14263C' }}>
              {transcriptores.length}
            </div>
            <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>
              Usuarios activos para recepción de carga
            </div>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E6EBF1', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' }}>
          {/* Usuario Origen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '170px' }}>
            <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90', textTransform: 'uppercase' }}>
              Usuario Origen
            </label>
            <select
              value={usuarioOrigen}
              onChange={(e) => setUsuarioOrigen(e.target.value)}
              style={{
                height: '36px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #E1E7EE',
                fontSize: '13px',
                color: '#14263C',
                background: '#ffffff',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="GILLIAMS_0028">GILLIAMS_0028 (Francisconi)</option>
              <option value="TODOS">TODOS LOS USUARIOS</option>
              {transcriptores
                .filter(t => t.expedientes_asignados > 0 && t.users_id !== 'GILLIAMS_0028')
                .map(t => (
                  <option key={t.users_id} value={t.users_id}>
                    {t.users_id} ({t.expedientes_asignados} exp)
                  </option>
                ))}
            </select>
          </div>

          {/* Estado WI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '130px' }}>
            <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90', textTransform: 'uppercase' }}>
              Estado Actual
            </label>
            <select
              value={estadoWi}
              onChange={(e) => setEstadoWi(e.target.value)}
              style={{
                height: '36px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #E1E7EE',
                fontSize: '13px',
                color: '#14263C',
                background: '#ffffff',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ABIERTA">ABIERTA</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="TODOS">TODOS</option>
            </select>
          </div>

          {/* Banco */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '120px' }}>
            <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90', textTransform: 'uppercase' }}>
              Banco
            </label>
            <input
              type="text"
              placeholder="Ej: 105, 134"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              style={{
                height: '36px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #E1E7EE',
                fontSize: '13px',
                color: '#14263C',
                background: '#ffffff',
                outline: 'none'
              }}
            />
          </div>

          {/* Año */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '85px' }}>
            <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90', textTransform: 'uppercase' }}>
              Año
            </label>
            <input
              type="number"
              value={anho}
              onChange={(e) => setAnho(e.target.value)}
              style={{
                height: '36px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #E1E7EE',
                fontSize: '13px',
                color: '#14263C',
                background: '#ffffff',
                outline: 'none'
              }}
            />
          </div>

          {/* Mes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '135px' }}>
            <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90', textTransform: 'uppercase' }}>
              Mes
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              style={{
                height: '36px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #E1E7EE',
                fontSize: '13px',
                color: '#14263C',
                background: '#ffffff',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="TODOS">TODOS LOS MESES</option>
              <option value="01">01 - Enero</option>
              <option value="02">02 - Febrero</option>
              <option value="03">03 - Marzo</option>
              <option value="04">04 - Abril</option>
              <option value="05">05 - Mayo</option>
              <option value="06">06 - Junio</option>
              <option value="07">07 - Julio</option>
              <option value="08">08 - Agosto</option>
              <option value="09">09 - Septiembre</option>
              <option value="10">10 - Octubre</option>
              <option value="11">11 - Noviembre</option>
              <option value="12">12 - Diciembre</option>
            </select>
          </div>

          {/* Búsqueda por número */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90', textTransform: 'uppercase' }}>
              Buscar Expediente
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Número de expediente (ej. 8196, 7590)..."
                value={searchExp}
                onChange={(e) => setSearchExp(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchExpedientes(); }}
                style={{
                  height: '36px',
                  width: '100%',
                  padding: '0 10px 0 32px',
                  borderRadius: '8px',
                  border: '1px solid #E1E7EE',
                  fontSize: '13px',
                  color: '#14263C',
                  background: '#ffffff',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Límite */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '95px' }}>
            <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90', textTransform: 'uppercase' }}>
              Límite
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{
                height: '36px',
                padding: '0 8px',
                borderRadius: '8px',
                border: '1px solid #E1E7EE',
                fontSize: '13px',
                color: '#14263C',
                background: '#ffffff',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>

          {/* Botón Filtrar */}
          <button
            onClick={fetchExpedientes}
            disabled={loading}
            style={{
              height: '36px',
              padding: '0 18px',
              borderRadius: '8px',
              background: '#1E5C99',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.15s ease'
            }}
          >
            <Filter size={14} />
            Filtrar
          </button>
        </div>

        {/* ── Feedback Messages ── */}
        {error && (
          <div style={{ padding: '14px 16px', background: '#FBEDEA', border: '1px solid #F3C4BA', borderRadius: '10px', color: '#C0492F', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <AlertCircle size={18} style={{ flex: 'none' }} />
            <span style={{ flex: 1, fontWeight: 600 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0492F' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {successMessage && (
          <div style={{ padding: '14px 16px', background: '#E9F6EE', border: '1px solid #B7E4C7', borderRadius: '10px', color: '#2E7D4F', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <CheckCircle2 size={18} style={{ flex: 'none' }} />
            <span style={{ flex: 1, fontWeight: 600 }}>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2E7D4F' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── Selection Control Bar & In-View Reassignment Action Bar ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '14px 16px',
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #E6EBF1'
        }}>
          {/* Row 1: Botones de selección rápida y conteo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#8797A8' }}>
                SELECCIÓN RÁPIDA:
              </span>
              <button
                onClick={() => selectCount(10)}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #E1E7EE', background: '#ffffff', fontSize: '12px', fontWeight: 600, color: '#3D4F66', cursor: 'pointer' }}
              >
                Primeros 10
              </button>
              <button
                onClick={() => selectCount(25)}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #E1E7EE', background: '#ffffff', fontSize: '12px', fontWeight: 600, color: '#3D4F66', cursor: 'pointer' }}
              >
                Primeros 25
              </button>
              <button
                onClick={() => selectCount(50)}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #E1E7EE', background: '#ffffff', fontSize: '12px', fontWeight: 600, color: '#3D4F66', cursor: 'pointer' }}
              >
                Primeros 50
              </button>
              <button
                onClick={selectAll}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #D6E4F0', background: '#EDF4FB', fontSize: '12px', fontWeight: 700, color: '#1E5C99', cursor: 'pointer' }}
              >
                Todos en vista ({expedientes.length})
              </button>
              {selectedKeys.size > 0 && (
                <button
                  onClick={clearSelection}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #E1E7EE', background: '#ffffff', fontSize: '12px', fontWeight: 600, color: '#8797A8', cursor: 'pointer' }}
                >
                  Limpiar selección
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: selectedKeys.size > 0 ? '#1E5C99' : '#8797A8' }}>
                {selectedKeys.size} expediente(s) seleccionado(s)
              </span>
              {selectedKeys.size > 0 && (
                <span style={{ fontSize: '11.5px', padding: '2px 8px', borderRadius: '6px', background: '#EDF4FB', color: '#1E5C99', border: '1px solid #D6E4F0', fontWeight: 700 }}>
                  {totalPlanillasSeleccionadas.toLocaleString('es-VE')} planillas pendientes
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Barra de Acción de Reasignación DIRECTA (Visible e Inmediata) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #EDF1F5'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={16} color="#1E5C99" />
                Asignar a:
              </span>
              <select
                value={selectedTranscriptor}
                onChange={(e) => setSelectedTranscriptor(e.target.value)}
                disabled={loadingTranscriptores}
                style={{
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #E1E7EE',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#14263C',
                  background: '#FFFFFF',
                  flex: 1,
                  maxWidth: '420px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">-- Seleccionar Transcriptor ONT --</option>
                {transcriptores.map((t) => (
                  <option key={t.users_id} value={t.users_id}>
                    {t.nombre_completo} ({t.users_id}) — {t.expedientes_asignados} exp
                  </option>
                ))}
              </select>
            </div>

            {/* BOTÓN PROMINENTE INSTITUCIONAL */}
            <button
              id="btn-ejecutar-reasignacion-top"
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={selectedKeys.size === 0 || !selectedTranscriptor || executing}
              style={{
                height: '36px',
                padding: '0 20px',
                borderRadius: '8px',
                background: (selectedKeys.size === 0 || !selectedTranscriptor || executing)
                  ? '#EDF1F5'
                  : '#1E5C99',
                color: (selectedKeys.size === 0 || !selectedTranscriptor || executing) ? '#9CA9B8' : '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: (selectedKeys.size === 0 || !selectedTranscriptor || executing) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              {executing ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Reasignando en Oracle...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Reasignar {selectedKeys.size > 0 ? `(${selectedKeys.size})` : ''} a Pendiente
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Table Container ── */}
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #E6EBF1', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#1E5C99' }} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Consultando expedientes en Oracle SIGECOF...</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Verificando estados de WorkItem y lotes con planillas pendientes</div>
            </div>
          ) : expedientes.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 12px', color: '#2E7D4F' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#14263C' }}>
                No se encontraron expedientes pendientes con los filtros aplicados
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
                Pruebe ampliando el límite, cambiando el banco o seleccionando &quot;TODOS&quot; en los estados.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: '#FAFCFE', borderBottom: '1px solid #EDF1F5', color: '#8797A8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <th style={{ padding: '12px 14px', width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={expedientes.length > 0 && selectedKeys.size === expedientes.length}
                        onChange={(e) => { if (e.target.checked) selectAll(); else clearSelection(); }}
                        style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                      />
                    </th>
                    <th style={{ padding: '12px 14px' }}>Expediente / Año</th>
                    <th style={{ padding: '12px 14px' }}>WorkItem</th>
                    <th style={{ padding: '12px 14px' }}>Usuario Asignado</th>
                    <th style={{ padding: '12px 14px' }}>Estado WI</th>
                    <th style={{ padding: '12px 14px' }}>Banco & Recaudación</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Planillas Pendientes</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Lotes</th>
                    <th style={{ padding: '12px 14px' }}>Descripción / Tarea</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientes.map((item) => {
                    const isSelected = selectedKeys.has(getItemKey(item));
                    return (
                      <tr
                        key={getItemKey(item)}
                        onClick={() => toggleSelect(item)}
                        style={{
                          borderBottom: '1px solid #EDF1F5',
                          background: isSelected ? '#EDF4FB' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'background 0.1s ease'
                        }}
                      >
                        <td style={{ padding: '12px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item)}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: '#1E5C99', fontSize: '13px' }}>
                            #{item.expediente}
                          </span>
                          <span style={{ fontSize: '11px', color: '#8797A8', marginLeft: '6px' }}>
                            ({item.anho})
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: "'IBM Plex Mono', monospace", color: '#6B7C90', fontWeight: 600 }}>
                          WI #{item.workitem}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#1E5C99', fontWeight: 600 }}>
                            @{item.usuario_asignado}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            display: 'inline-flex',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: item.estado_wi === 'ABIERTA' ? '#FDF4E3' : '#EDF4FB',
                            color: item.estado_wi === 'ABIERTA' ? '#9A6A12' : '#1E5C99'
                          }}>
                            {item.estado_wi}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#14263C' }}>Banco {item.banco || 'N/A'}</div>
                          <div style={{ fontSize: '11px', color: '#8797A8' }}>{item.fecha_recaudacion || 'Sin fecha'}</div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: '#14263C'
                          }}>
                            {Number(item.planillas_pendientes).toLocaleString('es-VE')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#6B7C90', fontWeight: 500 }}>
                            <strong style={{ color: '#14263C', fontWeight: 700 }}>{item.lotes_pendientes}</strong> / {item.total_lotes}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', maxWidth: '240px' }}>
                          <div style={{ fontSize: '11.5px', color: '#3D4F66', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.wi_descripcion || item.wi_nombre}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#8797A8' }}>{item.fecha_asignacion}</div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedModalExpId(item.expediente)}
                            title="Ver detalle del expediente"
                            style={{
                              background: '#ffffff',
                              border: '1px solid #E1E7EE',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: '#1E5C99',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 600
                            }}
                          >
                            <ExternalLink size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Fixed Bottom Action Drawer (Always visible or highlighted when selection exists) ── */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#ffffff',
        borderTop: '1px solid #CBD5E1',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '9px',
            background: selectedKeys.size > 0 ? '#EFF6FF' : '#F1F5F9',
            color: selectedKeys.size > 0 ? '#2563EB' : '#94A3B8'
          }}>
            <ArrowRightLeft size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
              {selectedKeys.size > 0 ? (
                <span>
                  {selectedKeys.size} expediente(s) seleccionado(s) ({totalPlanillasSeleccionadas.toLocaleString()} planillas)
                </span>
              ) : (
                <span style={{ color: '#64748B' }}>Seleccione los expedientes a reasignar</span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Los expedientes seleccionados pasarán de <strong>ABIERTA</strong> a <strong>PENDIENTE</strong> para el nuevo transcriptor
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Selector de Transcriptor Destino */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
              Asignar a:
            </span>
            <select
              value={selectedTranscriptor}
              onChange={(e) => setSelectedTranscriptor(e.target.value)}
              disabled={loadingTranscriptores}
              style={{
                height: '36px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #E1E7EE',
                fontSize: '13px',
                fontWeight: 600,
                color: '#14263C',
                background: '#ffffff',
                minWidth: '260px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">-- Seleccionar Transcriptor ONT --</option>
              {transcriptores.map((t) => (
                <option key={t.users_id} value={t.users_id}>
                  {t.nombre_completo} ({t.users_id}) — {t.expedientes_asignados} exp
                </option>
              ))}
            </select>
          </div>

          {/* Botón Acción Principal */}
          <button
            onClick={() => setIsConfirmModalOpen(true)}
            disabled={selectedKeys.size === 0 || !selectedTranscriptor || executing}
            style={{
              height: '36px',
              padding: '0 20px',
              borderRadius: '8px',
              background: (selectedKeys.size === 0 || !selectedTranscriptor || executing)
                ? '#EDF1F5'
                : '#1E5C99',
              color: (selectedKeys.size === 0 || !selectedTranscriptor || executing) ? '#9CA9B8' : '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: (selectedKeys.size === 0 || !selectedTranscriptor || executing) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            {executing ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Reasignando en Oracle...
              </>
            ) : (
              <>
                <Send size={14} />
                Reasignar a Pendiente
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {isConfirmModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20, 38, 60, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '540px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)',
            border: '1px solid #E6EBF1'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '18px 22px', background: '#FAFCFE', borderBottom: '1px solid #EDF1F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#EDF4FB', color: '#1E5C99', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRightLeft size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#14263C' }}>
                    Confirmar Reasignación de Expedientes
                  </h3>
                  <div style={{ marginTop: '2px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#8797A8', textTransform: 'uppercase' }}>
                    TRANSICIÓN OPERATIVA · ABIERTA ➔ PENDIENTE
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={executing}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8797A8' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#EDF4FB', padding: '14px 16px', borderRadius: '8px', border: '1px solid #D6E4F0', fontSize: '12.5px', color: '#1E5C99', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontWeight: 800 }}>Resumen de la Transición:</div>
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#3D4F66' }}>
                  <li>Expedientes a transferir: <strong style={{ color: '#14263C' }}>{selectedKeys.size}</strong></li>
                  <li>Planillas estimadas: <strong style={{ color: '#14263C' }}>{totalPlanillasSeleccionadas.toLocaleString('es-VE')}</strong></li>
                  <li>Nuevo transcriptor destino: <strong style={{ color: '#14263C' }}>{targetTranscriptorObj?.nombre_completo || selectedTranscriptor}</strong> ({selectedTranscriptor})</li>
                  <li>WorkItem actual se marcará como <strong>CERRADA</strong> y se generará uno nuevo con <strong>WI_ESTADO = &apos;PENDIENTE&apos;</strong>.</li>
                </ul>
              </div>

              {/* Observación Institucional */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90', textTransform: 'uppercase' }}>
                  Observación Institucional (Auditoría SIGECOF / Workflow)
                </label>
                <textarea
                  rows={2}
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E1E7EE',
                    fontSize: '13px',
                    color: '#14263C',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Lista breve de expedientes a reasignar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90', textTransform: 'uppercase' }}>
                  Expedientes seleccionados:
                </label>
                <div style={{ maxHeight: '90px', overflowY: 'auto', background: '#FAFCFE', padding: '8px 12px', borderRadius: '8px', border: '1px solid #EDF1F5', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedExpedientesList.map(item => (
                    <span key={getItemKey(item)} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11.5px', padding: '2px 6px', borderRadius: '4px', background: '#ffffff', border: '1px solid #E1E7EE', color: '#1E5C99', fontWeight: 700 }}>
                      #{item.expediente}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 22px', background: '#FAFCFE', borderTop: '1px solid #EDF1F5', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={executing}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #E1E7EE',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: executing ? 'not-allowed' : 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEjecutarReasignacion}
                disabled={executing}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: executing ? '#EDF1F5' : '#1E5C99',
                  color: executing ? '#9CA9B8' : '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: executing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {executing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    Confirmar y Reasignar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detalle del Expediente Modal ── */}
      {selectedModalExpId && (
        <ExpedienteDetailModal
          expedienteId={selectedModalExpId}
          onClose={() => setSelectedModalExpId(null)}
        />
      )}
    </div>
  );
};
