"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, 
  Search, 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  Layers, 
  Filter, 
  CheckSquare, 
  Square, 
  FileCheck, 
  AlertTriangle,
  Building2,
  Calendar,
  X,
  User,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ExpedienteDetailModal } from './ExpedienteDetailModal';

interface ExpedienteCierreItem {
  expediente: number;
  anho: number;
  workitem: number;
  usuario_asignado: string;
  estado_wi: string;
  wi_nombre: string;
  wi_descripcion: string;
  fecha_asignacion: string;
  banco: string;
  nombre_banco: string;
  fecha_recaudacion: string;
  total_lotes: number;
  lotes_conciliados: number;
  lotes_pendientes: number;
  total_planillas: number;
  planillas_pendientes: number;
  estado_conciliacion: string;
}

interface CierreKpis {
  total_expedientes: number;
  total_planillas_conciliadas: number;
  total_lotes: number;
  total_bancos: number;
}

export const CierreExpedientesView: React.FC = () => {
  const { usuario } = useAuth();

  // Filtros
  const [anho, setAnho] = useState<string>('2024');
  const [banco, setBanco] = useState<string>('TODOS');
  const [usuarioAsignado, setUsuarioAsignado] = useState<string>('TODOS');
  const [mes, setMes] = useState<string>('TODOS');
  const [searchExp, setSearchExp] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);

  // Datos
  const [expedientes, setExpedientes] = useState<ExpedienteCierreItem[]>([]);
  const [kpis, setKpis] = useState<CierreKpis>({
    total_expedientes: 0,
    total_planillas_conciliadas: 0,
    total_lotes: 0,
    total_bancos: 0,
  });

  // Estados de carga y feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selección múltiple
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Modal de confirmación y ejecución
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [observacion, setObservacion] = useState<string>('Cierre formal de expedientes 100% conciliados');
  const [executing, setExecuting] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any | null>(null);

  // Expediente para cierre individual directo
  const [singleExpToClose, setSingleExpToClose] = useState<ExpedienteCierreItem | null>(null);

  // Modal detalle de expediente
  const [selectedModalExpId, setSelectedModalExpId] = useState<number | null>(null);
  const [selectedModalAnho, setSelectedModalAnho] = useState<number>(2024);

  // Consultar expedientes listos para cierre
  const fetchExpedientes = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSelectedKeys(new Set());

    try {
      const params: any = {
        anho: anho !== 'TODOS' ? anho : undefined,
        limit,
      };
      if (banco && banco !== 'TODOS') params.banco = banco;
      if (usuarioAsignado && usuarioAsignado !== 'TODOS') params.usuario_asignado = usuarioAsignado;
      if (mes && mes !== 'TODOS') params.mes = mes;
      if (searchExp.trim()) params.search = searchExp.trim();

      const res = await axios.get('/api/orquestador/planillas/cierre/pendientes', { params });

      if (res.data?.success) {
        setExpedientes(res.data.data || []);
        if (res.data.kpis) {
          setKpis(res.data.kpis);
        }
      } else {
        setError(res.data?.message || 'Error al obtener expedientes para cierre.');
      }
    } catch (err: any) {
      console.error('Error fetching expedientes para cierre:', err);
      setError(err.response?.data?.message || err.message || 'Error al conectar con la API de cierre.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpedientes();
  }, [anho, banco, mes, limit]);

  // Selección de elementos
  const toggleSelect = (expediente: number, anhoItem: number) => {
    const key = `${expediente}-${anhoItem}`;
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedKeys(next);
  };

  const selectAll = () => {
    if (selectedKeys.size === expedientes.length && expedientes.length > 0) {
      setSelectedKeys(new Set());
    } else {
      const all = new Set(expedientes.map((e) => `${e.expediente}-${e.anho}`));
      setSelectedKeys(all);
    }
  };

  const selectFirstN = (n: number) => {
    const firstN = expedientes.slice(0, n);
    const setN = new Set(firstN.map((e) => `${e.expediente}-${e.anho}`));
    setSelectedKeys(setN);
  };

  // Filtrado local en caso de escribir en el buscador
  const expedientesFiltrados = useMemo(() => {
    if (!searchExp.trim()) return expedientes;
    const q = searchExp.trim().toLowerCase();
    return expedientes.filter(
      (e) =>
        String(e.expediente).includes(q) ||
        e.nombre_banco.toLowerCase().includes(q) ||
        e.banco.includes(q) ||
        e.usuario_asignado.toLowerCase().includes(q) ||
        e.fecha_recaudacion.includes(q)
    );
  }, [expedientes, searchExp]);

  // Expedientes actualmente seleccionados como objetos
  const selectedItems = useMemo(() => {
    return expedientes.filter((e) => selectedKeys.has(`${e.expediente}-${e.anho}`));
  }, [expedientes, selectedKeys]);

  // Estadísticas de los seleccionados
  const selectedSummary = useMemo(() => {
    const totalPlanillas = selectedItems.reduce((acc, curr) => acc + curr.total_planillas, 0);
    const bancosDistintos = new Set(selectedItems.map((e) => e.banco)).size;
    return {
      count: selectedItems.length,
      totalPlanillas,
      bancosDistintos,
    };
  }, [selectedItems]);

  // Abrir modal de confirmación individual
  const handleOpenSingleClose = (item: ExpedienteCierreItem) => {
    setSingleExpToClose(item);
    setObservacion(`Cierre formal de expediente ${item.expediente} 100% conciliado`);
    setIsConfirmModalOpen(true);
  };

  // Abrir modal de confirmación masivo
  const handleOpenMassClose = () => {
    if (selectedKeys.size === 0) return;
    setSingleExpToClose(null);
    setObservacion(`Cierre masivo de ${selectedKeys.size} expedientes con planillas 100% conciliadas`);
    setIsConfirmModalOpen(true);
  };

  // Ejecutar cierre formal
  const handleExecuteCierre = async () => {
    setExecuting(true);
    setError(null);
    setLastResult(null);

    const itemsToProcess = singleExpToClose
      ? [
          {
            expediente: singleExpToClose.expediente,
            anho: singleExpToClose.anho,
            workitem: singleExpToClose.workitem,
            banco: singleExpToClose.banco,
            fecha_recaudacion: singleExpToClose.fecha_recaudacion,
          },
        ]
      : selectedItems.map((e) => ({
          expediente: e.expediente,
          anho: e.anho,
          workitem: e.workitem,
          banco: e.banco,
          fecha_recaudacion: e.fecha_recaudacion,
        }));

    try {
      const payload = {
        expedientes: itemsToProcess,
        observacion: observacion.trim() || 'Cierre formal de expedientes 100% conciliados',
        usuario_operador: usuario?.email || usuario?.nombre || 'ONT_SIR_BOT',
      };

      const res = await axios.post('/api/orquestador/planillas/cierre/ejecutar-masivo', payload);

      if (res.data?.success) {
        setLastResult(res.data);
        setSuccessMessage(res.data.mensaje || 'Expedientes cerrados exitosamente.');
        // Refrescar listado
        fetchExpedientes();
      } else {
        setError(res.data?.message || 'Error al ejecutar el cierre de expedientes.');
      }
    } catch (err: any) {
      console.error('Error al ejecutar cierre:', err);
      setError(err.response?.data?.message || err.message || 'Error de comunicación al cerrar expedientes.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '100%', padding: '24px 32px' }}>
      {/* ── Encabezado Principal ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}>
              <CheckCircle2 size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Cierre Operativo de Expedientes
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#059669',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  padding: '2px 8px',
                  borderRadius: '20px'
                }}>
                  100% Conciliados
                </span>
              </h1>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0' }}>
                Expedientes sin planillas pendientes en SIGECOF listos para finalización y archivo formal en Workflow
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchExpedientes}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar Datos
          </button>
        </div>
      </header>

      {/* ── KPIs Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1: Total Expedientes Listos */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#ECFDF5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Expedientes Listos
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', lineHeight: '1.2' }}>
              {kpis.total_expedientes.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <ShieldCheck size={13} /> 0 planillas pendientes
            </div>
          </div>
        </div>

        {/* Card 2: Planillas Conciliadas */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Planillas Conciliadas
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', lineHeight: '1.2' }}>
              {kpis.total_planillas_conciliadas.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: '600', marginTop: '2px' }}>
              100% procesadas en lote
            </div>
          </div>
        </div>

        {/* Card 3: Lotes Procesados */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#F5F3FF',
            color: '#7C3AED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Lotes Involucrados
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', lineHeight: '1.2' }}>
              {kpis.total_lotes.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#7C3AED', fontWeight: '600', marginTop: '2px' }}>
              En estado 'C' o 'V'
            </div>
          </div>
        </div>

        {/* Card 4: Bancos Involucrados */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#FFFBEB',
            color: '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Bancos Afectados
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', lineHeight: '1.2' }}>
              {kpis.total_bancos}
            </div>
            <div style={{ fontSize: '11px', color: '#D97706', fontWeight: '600', marginTop: '2px' }}>
              Entidades recaudadoras
            </div>
          </div>
        </div>
      </div>

      {/* ── Alertas de Estado ── */}
      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#991B1B',
          fontSize: '13px'
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{error}</div>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#065F46',
          fontSize: '13px'
        }}>
          <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065F46' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Barra de Filtros ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: '700', color: '#374151' }}>
          <SlidersHorizontal size={16} color="#059669" />
          Filtros de Búsqueda
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
          {/* Año */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4B5563', marginBottom: '4px' }}>
              Año
            </label>
            <select
              value={anho}
              onChange={(e) => setAnho(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', background: '#FFFFFF' }}
            >
              <option value="2024">2024 (121 listos)</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2023">2023</option>
              <option value="2018">2018</option>
              <option value="2017">2017</option>
              <option value="TODOS">Todos los años</option>
            </select>
          </div>

          {/* Banco */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4B5563', marginBottom: '4px' }}>
              Banco
            </label>
            <select
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', background: '#FFFFFF' }}
            >
              <option value="TODOS">Todos los bancos</option>
              <option value="114">114 - BANCARIBE</option>
              <option value="105">105 - MERCANTIL</option>
              <option value="102">102 - VENEZUELA</option>
              <option value="134">134 - BANESCO</option>
              <option value="108">108 - PROVINCIAL</option>
              <option value="104">104 - VENEZOLANO DE CREDITO</option>
              <option value="115">115 - EXTERIOR</option>
              <option value="151">151 - BFC</option>
              <option value="163">163 - TESORO</option>
              <option value="175">175 - BICENTENARIO</option>
            </select>
          </div>

          {/* Usuario Asignado */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4B5563', marginBottom: '4px' }}>
              Usuario Asignado
            </label>
            <select
              value={usuarioAsignado}
              onChange={(e) => setUsuarioAsignado(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', background: '#FFFFFF' }}
            >
              <option value="TODOS">Todos los usuarios</option>
              <option value="GILLIAMS_0028">GILLIAMS_0028</option>
              <option value="CCONTRERAS_18">CCONTRERAS_18</option>
              <option value="DMEDINA_14">DMEDINA_14</option>
              <option value="KLOPEZ_0019">KLOPEZ_0019</option>
              <option value="JPARRA_0021">JPARRA_0021</option>
              <option value="YAGREDA_0022">YAGREDA_0022</option>
            </select>
          </div>

          {/* Mes */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4B5563', marginBottom: '4px' }}>
              Mes Recaudación
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', background: '#FFFFFF' }}
            >
              <option value="TODOS">Todos los meses</option>
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

          {/* Buscar Expediente */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4B5563', marginBottom: '4px' }}>
              Buscar Expediente
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Ej. 8379"
                value={searchExp}
                onChange={(e) => setSearchExp(e.target.value)}
                style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px' }}
              />
              {searchExp && (
                <button
                  onClick={() => setSearchExp('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Límite */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4B5563', marginBottom: '4px' }}>
              Registros en Vista
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', background: '#FFFFFF' }}
            >
              <option value={50}>50 expedientes</option>
              <option value={100}>100 expedientes</option>
              <option value={200}>200 expedientes</option>
              <option value={500}>500 expedientes</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Toolbar de Selección Rápida y Acción de Cierre ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        padding: '14px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        {/* Atajos de Selección */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#4B5563', marginRight: '4px' }}>
            Selección Rápida:
          </span>
          <button
            onClick={() => selectFirstN(10)}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '6px', fontWeight: '600' }}
          >
            Primeros 10
          </button>
          <button
            onClick={() => selectFirstN(25)}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '6px', fontWeight: '600' }}
          >
            Primeros 25
          </button>
          <button
            onClick={() => selectFirstN(50)}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '6px', fontWeight: '600' }}
          >
            Primeros 50
          </button>
          <button
            onClick={selectAll}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '6px', fontWeight: '600' }}
          >
            {selectedKeys.size === expedientesFiltrados.length && expedientesFiltrados.length > 0 ? 'Desmarcar Todo' : `Todos en Vista (${expedientesFiltrados.length})`}
          </button>

          {selectedKeys.size > 0 && (
            <span style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#059669',
              background: '#ECFDF5',
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid #A7F3D0'
            }}>
              {selectedKeys.size} seleccionado(s) ({selectedSummary.totalPlanillas} planillas)
            </span>
          )}
        </div>

        {/* Botón Principal de Cierre Masivo */}
        <div>
          <button
            onClick={handleOpenMassClose}
            disabled={selectedKeys.size === 0 || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#FFFFFF',
              background: selectedKeys.size > 0 ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)' : '#D1D5DB',
              border: 'none',
              cursor: selectedKeys.size > 0 ? 'pointer' : 'not-allowed',
              boxShadow: selectedKeys.size > 0 ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle2 size={17} strokeWidth={2.5} />
            Cerrar Seleccionados {selectedKeys.size > 0 ? `(${selectedKeys.size})` : ''}
          </button>
        </div>
      </div>

      {/* ── Tabla de Expedientes Listos para Cierre ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 12px', color: '#059669' }} />
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Consultando expedientes listos para cierre en SIGECOF...</div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Filtrando por expedientes sin planillas pendientes en ORG_LIQ.LOTE</div>
          </div>
        ) : expedientesFiltrados.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
            <CheckCircle2 size={42} style={{ margin: '0 auto 12px', color: '#10B981' }} />
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>No hay expedientes pendientes de cierre</div>
            <div style={{ fontSize: '13px', color: '#6B7280', maxWidth: '450px', margin: '4px auto 0' }}>
              No se encontraron expedientes con los criterios seleccionados, o todos los expedientes con 100% de planillas conciliadas ya han sido formalmente cerrados en el Workflow.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: '600', fontSize: '12px' }}>
                  <th style={{ padding: '12px 16px', width: '40px' }}>
                    <button
                      onClick={selectAll}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      {selectedKeys.size === expedientesFiltrados.length && expedientesFiltrados.length > 0 ? (
                        <CheckSquare size={18} color="#059669" />
                      ) : (
                        <Square size={18} color="#9CA3AF" />
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '12px 16px' }}>Expediente</th>
                  <th style={{ padding: '12px 16px' }}>Año</th>
                  <th style={{ padding: '12px 16px' }}>Banco Recaudador</th>
                  <th style={{ padding: '12px 16px' }}>Fecha Recaudación</th>
                  <th style={{ padding: '12px 16px' }}>Usuario Asignado</th>
                  <th style={{ padding: '12px 16px' }}>Lotes</th>
                  <th style={{ padding: '12px 16px' }}>Planillas</th>
                  <th style={{ padding: '12px 16px' }}>Estado Conciliación</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {expedientesFiltrados.map((item) => {
                  const key = `${item.expediente}-${item.anho}`;
                  const isSelected = selectedKeys.has(key);

                  return (
                    <tr
                      key={key}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        background: isSelected ? '#F0FDF4' : 'transparent',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => toggleSelect(item.expediente, item.anho)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                        >
                          {isSelected ? (
                            <CheckSquare size={18} color="#059669" />
                          ) : (
                            <Square size={18} color="#D1D5DB" />
                          )}
                        </button>
                      </td>

                      {/* Expediente */}
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => {
                            setSelectedModalExpId(item.expediente);
                            setSelectedModalAnho(item.anho);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '700',
                            color: '#1D4ED8',
                            fontSize: '13px'
                          }}
                          title="Click para ver detalle completo de lotes y planillas"
                        >
                          #{item.expediente}
                          <ExternalLink size={13} color="#93C5FD" />
                        </button>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>WorkItem #{item.workitem}</div>
                      </td>

                      {/* Año */}
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>
                        {item.anho}
                      </td>

                      {/* Banco */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#F3F4F6',
                          color: '#1F2937'
                        }}>
                          <Building2 size={13} color="#6B7280" />
                          {item.banco} - {item.nombre_banco}
                        </span>
                      </td>

                      {/* Fecha Recaudación */}
                      <td style={{ padding: '12px 16px', color: '#4B5563', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} color="#9CA3AF" />
                          {item.fecha_recaudacion || 'N/A'}
                        </div>
                      </td>

                      {/* Usuario Asignado */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#E0E7FF',
                          color: '#3730A3'
                        }}>
                          <User size={12} />
                          {item.usuario_asignado}
                        </span>
                      </td>

                      {/* Lotes */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#111827' }}>
                          {item.total_lotes} lote(s)
                        </div>
                        <div style={{ fontSize: '11px', color: '#059669' }}>
                          {item.lotes_conciliados} conciliados
                        </div>
                      </td>

                      {/* Planillas */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#059669' }}>
                          {item.total_planillas} planillas
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                          0 pendientes
                        </div>
                      </td>

                      {/* Estado Conciliación */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: '#ECFDF5',
                          color: '#047857',
                          border: '1px solid #A7F3D0'
                        }}>
                          <CheckCircle2 size={12} />
                          100% CONCILIADO
                        </span>
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setSelectedModalExpId(item.expediente);
                              setSelectedModalAnho(item.anho);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px' }}
                            title="Ver detalle de planillas y lotes"
                          >
                            Detalle
                          </button>
                          <button
                            onClick={() => handleOpenSingleClose(item)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              fontWeight: '700',
                              borderRadius: '6px',
                              background: '#059669',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Cerrar este expediente formalmente en Workflow"
                          >
                            <Check size={13} strokeWidth={3} />
                            Cerrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de Confirmación y Cierre Operativo ── */}
      {isConfirmModalOpen && (
        <div className="modal-overlay" onClick={() => !executing && setIsConfirmModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '620px', borderRadius: '16px', overflow: 'hidden' }}
          >
            {/* Header Modal */}
            <div style={{
              background: 'linear-gradient(135deg, #065F46 0%, #059669 100%)',
              padding: '20px 24px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>
                    Confirmar Cierre Formal de Expedientes
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.9 }}>
                    Finalización formal en SIGECOF / Workflow
                  </p>
                </div>
              </div>
              {!executing && (
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Contenido Modal */}
            <div style={{ padding: '24px' }}>
              {/* Resumen de la Operación */}
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Resumen de Expedientes a Cerrar
                </div>

                {singleExpToClose ? (
                  <div style={{ fontSize: '13px', color: '#15803D' }}>
                    Se procederá a cerrar el expediente <strong>#{singleExpToClose.expediente}</strong> (Año {singleExpToClose.anho}) del banco <strong>{singleExpToClose.nombre_banco}</strong> ({singleExpToClose.total_planillas} planillas 100% conciliadas).
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
                    <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #DCFCE7' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600' }}>Expedientes</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>{selectedSummary.count}</div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #DCFCE7' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600' }}>Planillas Conciliadas</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#2563EB' }}>{selectedSummary.totalPlanillas}</div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #DCFCE7' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600' }}>Bancos</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#7C3AED' }}>{selectedSummary.bancosDistintos}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Nota Informativa del Procedimiento */}
              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '20px',
                fontSize: '12px',
                color: '#1E40AF',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Acciones realizadas por el sistema:</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: '16px', lineHeight: '1.4' }}>
                    <li>Actualización del WorkItem activo a estado <code>CERRADA</code> con <code>WI_FECHA_CIERRE = SYSDATE</code>.</li>
                    <li>Finalización de lotes pendientes en <code>ORG_LIQ.LOTE</code> a estado <code>'V'</code> (Verificado).</li>
                    <li>Registro de auditoría institucional en <code>WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES</code>.</li>
                  </ul>
                </div>
              </div>

              {/* Observación Institucional */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Observación Institucional
                </label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  rows={2}
                  disabled={executing}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '13px',
                    resize: 'none'
                  }}
                  placeholder="Justificación del cierre operativo..."
                />
              </div>

              {/* Resultados de la Ejecución si ya terminó */}
              {lastResult && (
                <div style={{
                  background: lastResult.total_fallidos > 0 ? '#FFFBEB' : '#ECFDF5',
                  border: `1px solid ${lastResult.total_fallidos > 0 ? '#FDE68A' : '#A7F3D0'}`,
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: lastResult.total_fallidos > 0 ? '#92400E' : '#065F46' }}>
                    {lastResult.mensaje}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', color: '#4B5563' }}>
                    Procesados: {lastResult.total_procesados} | Exitosos: {lastResult.total_exitosos} | Fallidos: {lastResult.total_fallidos}
                  </div>
                </div>
              )}

              {/* Footer Modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={executing}
                  className="btn btn-secondary"
                  style={{ padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
                >
                  {lastResult ? 'Cerrar Ventana' : 'Cancelar'}
                </button>

                {!lastResult && (
                  <button
                    type="button"
                    onClick={handleExecuteCierre}
                    disabled={executing}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 20px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#FFFFFF',
                      background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                      border: 'none',
                      cursor: executing ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    {executing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Cerrando Expedientes...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Confirmar y Ejecutar Cierre
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Detalle del Expediente ── */}
      {selectedModalExpId && (
        <ExpedienteDetailModal
          expedienteId={selectedModalExpId}
          anho={selectedModalAnho}
          onClose={() => setSelectedModalExpId(null)}
        />
      )}
    </div>
  );
};
