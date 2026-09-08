"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BookOpen, 
  Search, 
  Layers, 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Loader2, 
  RefreshCw, 
  ArrowRight, 
  Percent, 
  DollarSign, 
  Database, 
  Sparkles, 
  Tag, 
  ListOrdered,
  HelpCircle,
  ExternalLink,
  Plus,
  Sliders,
  History,
  Trash2,
  X,
  FileText,
  Shield,
  Clock,
  UserCheck,
  Check,
  Edit,
  SlidersHorizontal,
  ChevronRight,
  Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface FormaData {
  COD_FORMA: string;
  COD_FORMA_ORIGEN: string;
  NOMBRE_FORMA: string;
  ES_MULTIFORMA: number;
  CANT_PARTIDAS: number;
  COD_PARTIDA?: string | null;
  DESIGNACION_PARTIDA?: string | null;
  TIPO_RESOLUCION: string;
  VERSION: number;
  FECHA_DESDE: string;
  PARTIDAS_PRORRATEO?: Array<{
    COD_PARTIDA: string;
    DESIGNACION_PARTIDA: string;
    PORCENTAJE: number;
    VIGENTE?: number;
  }>;
  OPCIONES_RIF?: Array<{
    TIPO_REGLA: string;
    LETRA_RIF: string;
    COD_PARTIDA: string;
    DESIGNACION_PARTIDA: string;
  }>;
}

interface PartidaData {
  COD_PARTIDA: string;
  DESIGNACION_PARTIDA: string;
  TOTAL_FORMAS?: number;
}

interface AsignacionResolucion {
  cod_partida: string;
  designacion: string;
  porcentaje: number;
  monto: number;
}

interface ResolucionResult {
  cod_forma: string;
  nombre_forma: string;
  tipo_resolucion: string;
  discriminante?: string | null;
  monto_declarado: number;
  asignaciones: AsignacionResolucion[];
  total_asignado: number;
  version: number;
}

interface VersionHistorial {
  VERSION: number;
  NOMBRE_FORMA: string;
  TIPO_RESOLUCION: string;
  COD_PARTIDA?: string | null;
  DESIGNACION_PARTIDA?: string | null;
  FECHA_DESDE: string;
  FECHA_HASTA?: string | null;
  USUARIO_CARGA?: string | null;
  FECHA_CARGA?: string | null;
}

export const CatalogoFormasView: React.FC = () => {
  const { usuario } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'formas' | 'simulador' | 'partidas'>('formas');
  
  // Catálogos Generales
  const [formas, setFormas] = useState<FormaData[]>([]);
  const [partidas, setPartidas] = useState<PartidaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  // Filtros de Formas y Partidas
  const [searchForma, setSearchForma] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('TODAS');
  const [searchPartida, setSearchPartida] = useState('');

  // Auditoría de Formas (PostgreSQL motor_app.formas_auditoria)
  const [formasAuditoria, setFormasAuditoria] = useState<Record<string, any>>({});
  const [auditFilter, setAuditFilter] = useState<'TODAS' | 'AUDITADAS' | 'PENDIENTES'>('TODAS');
  const [auditLoading, setAuditLoading] = useState<string | null>(null);

  const handleToggleAuditoria = async (codForma: string, nuevoEstado: boolean) => {
    setAuditLoading(codForma);
    try {
      const userNombre = usuario ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.email : 'Supervisor ONT';
      const formaActual = formas.find(f => f.COD_FORMA === codForma);
      const res = await axios.post(`/api/orquestador/formas-auditoria/${codForma}`, {
        auditada: nuevoEstado,
        usuario_auditor: userNombre,
        observaciones: nuevoEstado ? 'Forma certificada por supervisor en catálogo' : 'Auditoría revocada',
        version_auditada: formaActual?.VERSION || 1
      });
      if (res.data?.success) {
        setFormasAuditoria(prev => ({
          ...prev,
          [codForma]: res.data.data
        }));
        showToast(nuevoEstado ? `Forma ${codForma} certificada como auditada` : `Auditoría revocada para forma ${codForma}`, 'success');
      }
    } catch (err: any) {
      showToast('Error actualizando auditoría de forma: ' + (err.response?.data?.message || err.message), 'danger');
    } finally {
      setAuditLoading(null);
    }
  };

  // Estado del Simulador
  const [simForma, setSimForma] = useState('99086');
  const [simMonto, setSimMonto] = useState<number>(1000.0);
  const [simRif, setSimRif] = useState('J401045375');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<ResolucionResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // --- MODAL: EDITAR REGLAS (PUT) ---
  const [isEditRulesModalOpen, setIsEditRulesModalOpen] = useState(false);
  const [selectedFormaForEdit, setSelectedFormaForEdit] = useState<FormaData | null>(null);
  const [editTipoResolucion, setEditTipoResolucion] = useState<string>('DIRECTA');
  const [editCodPartida, setEditCodPartida] = useState<string>('');
  const [editDesignacion, setEditDesignacion] = useState<string>('');
  const [editProrrateoList, setEditProrrateoList] = useState<Array<{ cod_partida: string; designacion: string; porcentaje: number }>>([]);
  const [editRifList, setEditRifList] = useState<Array<{ letra: string; cod_partida: string; designacion: string }>>([
    { letra: 'V', cod_partida: '301010200', designacion: 'Impuesto Sobre La Renta a Personas Naturales' },
    { letra: 'E', cod_partida: '301010200', designacion: 'Impuesto Sobre La Renta a Personas Naturales' },
    { letra: 'J', cod_partida: '301010111', designacion: 'Impuesto Sobre La Renta a Otras Personas Jurídicas' },
    { letra: 'G', cod_partida: '301010111', designacion: 'Impuesto Sobre La Renta a Otras Personas Jurídicas' },
    { letra: 'P', cod_partida: '301010200', designacion: 'Impuesto Sobre La Renta a Personas Naturales' }
  ]);
  const [editMotivo, setEditMotivo] = useState<string>('Actualización de reglas operativas ONT');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // --- MODAL: CREAR FORMA (POST) ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCodForma, setCreateCodForma] = useState('');
  const [createNombreForma, setCreateNombreForma] = useState('');
  const [createTipoResolucion, setCreateTipoResolucion] = useState('DIRECTA');
  const [createCodPartida, setCreateCodPartida] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // --- MODAL: HISTORIAL DE VERSIONES (GET) ---
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyForma, setHistoryForma] = useState<FormaData | null>(null);
  const [historyVersions, setHistoryVersions] = useState<VersionHistorial[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- MODAL: FORMAS DE UNA PARTIDA (GET) ---
  const [isPartidaFormasModalOpen, setIsPartidaFormasModalOpen] = useState(false);
  const [selectedPartida, setSelectedPartida] = useState<PartidaData | null>(null);
  const [partidaLinkedFormas, setPartidaLinkedFormas] = useState<any[]>([]);
  const [partidaFormasLoading, setPartidaFormasLoading] = useState(false);

  // Helper para mostrar notificaciones temporales
  const showToast = (text: string, type: 'success' | 'danger' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Cargar Catálogos
  const loadCatalogos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [formasRes, partidasRes, auditRes] = await Promise.all([
        axios.get('/api/catalogo/formas'),
        axios.get('/api/catalogo/partidas'),
        axios.get('/api/orquestador/formas-auditoria').catch(() => ({ data: { formas: {} } }))
      ]);

      const formasList = formasRes.data.formas || [];
      const partidasList = partidasRes.data.partidas || [];
      setFormas(formasList);
      setPartidas(partidasList);
      if (auditRes.data?.formas) {
        setFormasAuditoria(auditRes.data.formas);
      }

      if (partidasList.length > 0 && !editCodPartida) {
        setEditCodPartida(partidasList[0].COD_PARTIDA);
        setEditDesignacion(partidasList[0].DESIGNACION_PARTIDA);
      }
    } catch (err: any) {
      setError('Error al conectar con la API de Catálogos (10.46.0.189:3000): ' + (err.message || 'Servicio no disponible'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogos();
  }, []);

  // Abrir Modal de Editar Reglas
  const handleOpenEditRules = async (forma: FormaData) => {
    setSelectedFormaForEdit(forma);
    setEditError(null);
    setEditTipoResolucion(forma.TIPO_RESOLUCION || 'DIRECTA');
    setEditMotivo('Ajuste normativo de imputación presupuestaria');
    
    // Cargar detalle completo de la forma para tener prorrateos o reglas RIF
    try {
      const detailRes = await axios.get(`/api/catalogo/formas/${forma.COD_FORMA}`);
      const detail = detailRes.data;
      
      if (detail.COD_PARTIDA) {
        setEditCodPartida(detail.COD_PARTIDA);
        setEditDesignacion(detail.DESIGNACION_PARTIDA || '');
      } else if (partidas.length > 0) {
        setEditCodPartida(partidas[0].COD_PARTIDA);
        setEditDesignacion(partidas[0].DESIGNACION_PARTIDA);
      }

      if (detail.PARTIDAS_PRORRATEO && detail.PARTIDAS_PRORRATEO.length > 0) {
        setEditProrrateoList(detail.PARTIDAS_PRORRATEO.map((p: any) => ({
          cod_partida: p.COD_PARTIDA,
          designacion: p.DESIGNACION_PARTIDA,
          porcentaje: Number(p.PORCENTAJE)
        })));
      } else {
        // Inicializar prorrateo estándar con 2 o 3 partidas
        setEditProrrateoList([
          { cod_partida: '301020101', designacion: 'Impuesto de Importación Ordinario', porcentaje: 52 },
          { cod_partida: '301020320', designacion: 'Impuesto al valor agregado sobre la importación de bienes y servicios', porcentaje: 42 },
          { cod_partida: '301032500', designacion: 'Servicios de Aduana', porcentaje: 6 }
        ]);
      }

      if (detail.OPCIONES_RIF && detail.OPCIONES_RIF.length > 0) {
        setEditRifList(detail.OPCIONES_RIF.map((r: any) => ({
          letra: r.LETRA_RIF || r.valor || 'V',
          cod_partida: r.COD_PARTIDA || r.cod_partida,
          designacion: r.DESIGNACION_PARTIDA || r.designacion || ''
        })));
      } else {
        // Inicializar reglas RIF estándar si la forma no tiene reglas previas
        setEditRifList([
          { letra: 'V', cod_partida: '301010200', designacion: 'Impuesto Sobre La Renta a Personas Naturales' },
          { letra: 'E', cod_partida: '301010200', designacion: 'Impuesto Sobre La Renta a Personas Naturales' },
          { letra: 'J', cod_partida: '301010111', designacion: 'Impuesto Sobre La Renta a Otras Personas Jurídicas' },
          { letra: 'G', cod_partida: '301010111', designacion: 'Impuesto Sobre La Renta a Otras Personas Jurídicas' },
          { letra: 'P', cod_partida: '301010200', designacion: 'Impuesto Sobre La Renta a Personas Naturales' }
        ]);
      }
    } catch (err) {
      console.warn('No se pudo obtener el detalle profundo de la forma, usando datos básicos:', err);
    }

    setIsEditRulesModalOpen(true);
  };

  // Guardar Cambios de Reglas (PUT)
  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFormaForEdit) return;

    // Validación de porcentaje en Prorrateo
    if (editTipoResolucion === 'PRORRATEO') {
      const totalPct = editProrrateoList.reduce((acc, curr) => acc + Number(curr.porcentaje || 0), 0);
      if (Math.round(totalPct) !== 100) {
        setEditError(`La sumatoria de porcentajes de prorrateo debe ser exactamente 100%. Actualmente suma: ${totalPct}%`);
        return;
      }
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      let bodyPayload: any = {
        tipo_resolucion: editTipoResolucion,
        motivo: editMotivo,
        usuario: usuario ? `${usuario.nombre} ${usuario.apellido} (${usuario.email})` : 'ONT_SIR_BOT_AUDIT'
      };

      if (editTipoResolucion === 'DIRECTA' || editTipoResolucion === 'BIYECTIVA' || editTipoResolucion === 'ANCLADA') {
        const foundPartida = partidas.find(p => p.COD_PARTIDA === editCodPartida);
        bodyPayload.cod_partida = editCodPartida;
        bodyPayload.designacion_partida = foundPartida?.DESIGNACION_PARTIDA || editDesignacion;
      } else if (editTipoResolucion === 'PRORRATEO') {
        bodyPayload.partidas_prorrateo = editProrrateoList.map(p => ({
          cod_partida: p.cod_partida,
          designacion: p.designacion,
          porcentaje: Number(p.porcentaje)
        }));
      } else if (editTipoResolucion === 'RIF') {
        bodyPayload.opciones_rif = editRifList.map(r => ({
          valor: r.letra,
          cod_partida: r.cod_partida,
          designacion: r.designacion
        }));
      }

      await axios.put(`/api/catalogo/formas/${selectedFormaForEdit.COD_FORMA}/reglas`, bodyPayload);

      showToast(`Reglas de la forma ${selectedFormaForEdit.COD_FORMA} actualizadas exitosamente`, 'success');
      setIsEditRulesModalOpen(false);
      loadCatalogos();
    } catch (err: any) {
      setEditError(err.response?.data?.message || err.message || 'Error al actualizar reglas');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Abrir Modal de Historial (GET)
  const handleOpenHistory = async (forma: FormaData) => {
    setHistoryForma(forma);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await axios.get(`/api/catalogo/formas/${forma.COD_FORMA}/historial`);
      setHistoryVersions(res.data.versiones || []);
    } catch (err: any) {
      setHistoryVersions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Abrir Modal de Formas de una Partida (GET)
  const handleOpenPartidaFormas = async (partida: PartidaData) => {
    setSelectedPartida(partida);
    setIsPartidaFormasModalOpen(true);
    setPartidaFormasLoading(true);
    try {
      const res = await axios.get(`/api/catalogo/partidas/${partida.COD_PARTIDA}/formas`);
      setPartidaLinkedFormas(res.data.formas || []);
    } catch (err: any) {
      setPartidaLinkedFormas([]);
    } finally {
      setPartidaFormasLoading(false);
    }
  };

  // Crear Nueva Forma (POST)
  const handleCreateForma = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const foundPartida = partidas.find(p => p.COD_PARTIDA === createCodPartida);
      await axios.post('/api/catalogo/formas', {
        cod_forma: createCodForma.trim(),
        nombre_forma: createNombreForma.trim(),
        tipo_resolucion: createTipoResolucion,
        cod_partida: createCodPartida,
        designacion_partida: foundPartida?.DESIGNACION_PARTIDA || 'Designación Oficial'
      });

      showToast(`Forma ${createCodForma} creada exitosamente en el catálogo`, 'success');
      setIsCreateModalOpen(false);
      setCreateCodForma('');
      setCreateNombreForma('');
      loadCatalogos();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.message || 'Error al crear forma');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Ejecutar Simulación
  const handleResolverSimulacion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!simForma || !simMonto) return;

    setSimLoading(true);
    setSimError(null);
    try {
      const res = await axios.post(`/api/catalogo/formas/${simForma}/resolver`, {
        monto: Number(simMonto),
        rif_contribuyente: simRif.trim() || undefined
      });
      setSimResult(res.data);
    } catch (err: any) {
      setSimError(err.response?.data?.message || err.message || 'Error al resolver forma');
    } finally {
      setSimLoading(false);
    }
  };

  // Abrir simulador con forma preseleccionada
  const handleSimularForma = (forma: FormaData) => {
    setSimForma(forma.COD_FORMA);
    setActiveSubTab('simulador');
    setSimResult(null);
    setTimeout(() => {
      handleResolverSimulacion();
    }, 100);
  };

  // Filtrado de Formas
  const formasFiltradas = formas.filter(f => {
    const matchesSearch = 
      f.COD_FORMA.toLowerCase().includes(searchForma.toLowerCase()) ||
      f.NOMBRE_FORMA.toLowerCase().includes(searchForma.toLowerCase()) ||
      (f.COD_PARTIDA && f.COD_PARTIDA.includes(searchForma)) ||
      (f.DESIGNACION_PARTIDA && f.DESIGNACION_PARTIDA.toLowerCase().includes(searchForma.toLowerCase()));

    const matchesTipo = selectedTipo === 'TODAS' || f.TIPO_RESOLUCION === selectedTipo;

    const matchesAuditoria = auditFilter === 'TODAS'
      ? true
      : auditFilter === 'AUDITADAS'
        ? Boolean(formasAuditoria[f.COD_FORMA]?.auditada)
        : !formasAuditoria[f.COD_FORMA]?.auditada;

    return matchesSearch && matchesTipo && matchesAuditoria;
  });

  // Filtrado de Partidas
  const partidasFiltradas = partidas.filter((p) => {
    const q = searchPartida.trim().toLowerCase();
    if (!q) return true;
    return (
      p.COD_PARTIDA.toLowerCase().includes(q) ||
      (p.DESIGNACION_PARTIDA && p.DESIGNACION_PARTIDA.toLowerCase().includes(q))
    );
  });

  // Conteo por tipos
  const tiposCounts = {
    TODAS: formas.length,
    DIRECTA: formas.filter(f => f.TIPO_RESOLUCION === 'DIRECTA').length,
    BIYECTIVA: formas.filter(f => f.TIPO_RESOLUCION === 'BIYECTIVA').length,
    ANCLADA: formas.filter(f => f.TIPO_RESOLUCION === 'ANCLADA').length,
    PRORRATEO: formas.filter(f => f.TIPO_RESOLUCION === 'PRORRATEO').length,
    RIF: formas.filter(f => f.TIPO_RESOLUCION === 'RIF').length,
  };

  // Helper para añadir fila en prorrateo
  const handleAddProrrateoRow = () => {
    if (partidas.length > 0) {
      setEditProrrateoList([
        ...editProrrateoList,
        {
          cod_partida: partidas[0].COD_PARTIDA,
          designacion: partidas[0].DESIGNACION_PARTIDA,
          porcentaje: 0
        }
      ]);
    }
  };

  // Helper para eliminar fila en prorrateo
  const handleRemoveProrrateoRow = (index: number) => {
    setEditProrrateoList(editProrrateoList.filter((_, idx) => idx !== index));
  };

  // Sumatoria actual de prorrateo
  const currentTotalProrrateo = editProrrateoList.reduce((acc, curr) => acc + (Number(curr.porcentaje) || 0), 0);

  return (
    <div className="container" style={{ maxWidth: '100%', padding: 0 }}>
      {/* ── Topbar ── */}
      <header className="app-topbar">
        <div className="app-topbar-left">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', flex: 'none', borderRadius: '9px', background: '#EEF6E4', color: '#5FA83C' }}>
            <BookOpen size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#14263C' }}>
              Catálogo y Reglas de Formas
            </h1>
            <div style={{ marginTop: '2px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#8797A8', textTransform: 'uppercase' }}>
              MAPEO PRESUPUESTARIO, PRORRATEOS Y RESOLUCIÓN ONT
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '36px',
            padding: '0 12px',
            background: '#ffffff',
            border: '1px solid #E1E7EE',
            borderRadius: '8px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11.5px',
            color: '#6B7C90'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34A853', display: 'inline-block' }}></span>
            <span>10.46.0.189:3000</span>
          </div>

          <button 
            type="button" 
            onClick={loadCatalogos} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', border: '1px solid #E1E7EE', borderRadius: '8px', background: '#ffffff', cursor: 'pointer', color: '#6B7C90' }}
            title="Recargar Catálogo"
          >
            <RefreshCw size={15} className={loading ? 'spinner' : ''} />
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              if (partidas.length > 0) setCreateCodPartida(partidas[0].COD_PARTIDA);
              setIsCreateModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              height: '36px',
              padding: '0 14px',
              border: 0,
              borderRadius: '8px',
              background: '#1E5C99',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Plus size={15} strokeWidth={2.2} />
            Nueva forma
          </button>
        </div>
      </header>

      {/* ── Sub-Navigation Tabs con borde inferior plano ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '22px', padding: '0 28px', background: '#ffffff', borderBottom: '1px solid #E6EBF1', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('formas')}
          style={{
            padding: '12px 2px',
            border: 0,
            borderBottom: activeSubTab === 'formas' ? '2px solid #1E5C99' : '2px solid transparent',
            background: 'transparent',
            fontSize: '13px',
            fontWeight: activeSubTab === 'formas' ? 800 : 600,
            color: activeSubTab === 'formas' ? '#14263C' : '#8797A8',
            cursor: 'pointer'
          }}
        >
          Formas tributarias ({formas.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('simulador')}
          style={{
            padding: '12px 2px',
            border: 0,
            borderBottom: activeSubTab === 'simulador' ? '2px solid #1E5C99' : '2px solid transparent',
            background: 'transparent',
            fontSize: '13px',
            fontWeight: activeSubTab === 'simulador' ? 800 : 600,
            color: activeSubTab === 'simulador' ? '#14263C' : '#8797A8',
            cursor: 'pointer'
          }}
        >
          Simulador de imputación
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('partidas')}
          style={{
            padding: '12px 2px',
            border: 0,
            borderBottom: activeSubTab === 'partidas' ? '2px solid #1E5C99' : '2px solid transparent',
            background: 'transparent',
            fontSize: '13px',
            fontWeight: activeSubTab === 'partidas' ? 800 : 600,
            color: activeSubTab === 'partidas' ? '#14263C' : '#8797A8',
            cursor: 'pointer'
          }}
        >
          Catálogo de partidas ({partidas.length})
        </button>
      </div>

      {/* ── Toast de Notificación ── */}
      {toastMessage && (
        <div style={{ 
          margin: '0 28px 16px',
          padding: '12px 18px', 
          background: toastMessage.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)', 
          border: `1px solid ${toastMessage.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`, 
          borderRadius: '10px', 
          color: toastMessage.type === 'success' ? 'var(--success)' : 'var(--danger)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontWeight: 600, fontSize: '13px' }}>{toastMessage.text}</span>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div style={{ 
          margin: '0 28px 20px',
          padding: '14px 18px', 
          background: '#FBEDEA', 
          border: '1px solid #F3C4BA', 
          borderRadius: '10px', 
          color: '#C0492F', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px' 
        }}>
          <AlertCircle size={18} />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: EXPLORADOR Y GESTIÓN DE FORMAS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'formas' && (
        <div style={{ padding: '0 28px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* ── Barra de Distribución Multi-segmento ── */}
          <div style={{ background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#14263C' }}>Distribución por tipo de resolución</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11.5px', color: '#8797A8' }}>{formas.length} formas activas</div>
            </div>
            
            <div style={{ display: 'flex', height: '22px', marginTop: '14px', borderRadius: '4px', overflow: 'hidden', gap: '2px' }}>
              <div style={{ width: `${(tiposCounts.DIRECTA / (formas.length || 1)) * 100}%`, background: '#1E5C99' }} title={`Directa (${tiposCounts.DIRECTA})`} />
              <div style={{ width: `${(tiposCounts.BIYECTIVA / (formas.length || 1)) * 100}%`, background: '#3FB4A8' }} title={`Biyectiva (${tiposCounts.BIYECTIVA})`} />
              <div style={{ width: `${(tiposCounts.ANCLADA / (formas.length || 1)) * 100}%`, background: '#8CC63F' }} title={`Anclada (${tiposCounts.ANCLADA})`} />
              <div style={{ width: `${(tiposCounts.PRORRATEO / (formas.length || 1)) * 100}%`, background: '#E5A32B' }} title={`Prorrateo (${tiposCounts.PRORRATEO})`} />
              <div style={{ width: `${(tiposCounts.RIF / (formas.length || 1)) * 100}%`, background: '#7A5AA8' }} title={`Por RIF (${tiposCounts.RIF})`} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '14px', marginTop: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }} onClick={() => setSelectedTipo('DIRECTA')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#1E5C99' }}></span>DIRECTA
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '20px', fontWeight: 600, color: '#14263C' }}>{tiposCounts.DIRECTA}</span>
                <span style={{ fontSize: '11.5px', color: '#8797A8' }}>1 forma → 1 partida fija</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }} onClick={() => setSelectedTipo('BIYECTIVA')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#3FB4A8' }}></span>BIYECTIVA
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '20px', fontWeight: 600, color: '#14263C' }}>{tiposCounts.BIYECTIVA}</span>
                <span style={{ fontSize: '11.5px', color: '#8797A8' }}>Monopartida exclusiva</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }} onClick={() => setSelectedTipo('ANCLADA')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#8CC63F' }}></span>ANCLADA
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '20px', fontWeight: 600, color: '#14263C' }}>{tiposCounts.ANCLADA}</span>
                <span style={{ fontSize: '11.5px', color: '#8797A8' }}>Partida oficial fijada ONT</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }} onClick={() => setSelectedTipo('PRORRATEO')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#E5A32B' }}></span>PRORRATEO
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '20px', fontWeight: 600, color: '#14263C' }}>{tiposCounts.PRORRATEO}</span>
                <span style={{ fontSize: '11.5px', color: '#8797A8' }}>Aduanas 52 / 42 / 6 %</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }} onClick={() => setSelectedTipo('RIF')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#6B7C90' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#7A5AA8' }}></span>POR RIF
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '20px', fontWeight: 600, color: '#14263C' }}>{tiposCounts.RIF}</span>
                <span style={{ fontSize: '11.5px', color: '#8797A8' }}>Natural vs jurídico</span>
              </div>
            </div>
          </div>

          {/* Buscador y Filtros por Píldoras */}
          <div className="search-panel">
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
              <div style={{ position: 'relative', flex: '1 1 300px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  value={searchForma}
                  onChange={(e) => setSearchForma(e.target.value)}
                  placeholder="Buscar por código de forma (ej. 99225, 99086) o nombre tributario..."
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                />
              </div>

              {/* Botones de Filtro por Tipo */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['TODAS', 'DIRECTA', 'BIYECTIVA', 'ANCLADA', 'PRORRATEO', 'RIF'].map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setSelectedTipo(tipo)}
                    className="btn btn-ghost"
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: selectedTipo === tipo ? 'var(--brand)' : 'transparent',
                      color: selectedTipo === tipo ? '#ffffff' : 'var(--text-secondary)',
                      borderColor: selectedTipo === tipo ? 'var(--brand)' : 'var(--border-default)'
                    }}
                  >
                    {tipo} ({(tiposCounts as any)[tipo]})
                  </button>
                ))}
              </div>

              {/* Filtro por Auditoría */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', borderLeft: '1px solid var(--border-default)', paddingLeft: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Auditoría:</span>
                <button
                  type="button"
                  onClick={() => setAuditFilter(auditFilter === 'AUDITADAS' ? 'TODAS' : 'AUDITADAS')}
                  className="btn btn-ghost"
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: auditFilter === 'AUDITADAS' ? '#ecfdf5' : 'transparent',
                    color: auditFilter === 'AUDITADAS' ? '#047857' : 'var(--text-secondary)',
                    borderColor: auditFilter === 'AUDITADAS' ? '#10b981' : 'var(--border-default)'
                  }}
                  title="Mostrar solo formas certificadas/auditadas"
                >
                  <CheckCircle2 size={12} style={{ color: '#10b981', marginRight: 4 }} />
                  Auditadas ({formas.filter(f => formasAuditoria[f.COD_FORMA]?.auditada).length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter(auditFilter === 'PENDIENTES' ? 'TODAS' : 'PENDIENTES')}
                  className="btn btn-ghost"
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: auditFilter === 'PENDIENTES' ? '#fffbeb' : 'transparent',
                    color: auditFilter === 'PENDIENTES' ? '#b45309' : 'var(--text-secondary)',
                    borderColor: auditFilter === 'PENDIENTES' ? '#f59e0b' : 'var(--border-default)'
                  }}
                  title="Mostrar solo formas con contrato pendiente de auditar"
                >
                  <AlertTriangle size={12} style={{ color: '#f59e0b', marginRight: 4 }} />
                  Por Auditar ({formas.filter(f => !formasAuditoria[f.COD_FORMA]?.auditada).length})
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de Formas */}
          <div className="table-section">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>Cód. Forma</th>
                    <th>Denominación Tributaria</th>
                    <th style={{ width: '130px' }}>Tipo Resolución</th>
                    <th style={{ width: '120px' }}>Partida Asignada</th>
                    <th>Designación de la Partida</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Versión</th>
                    <th style={{ width: '135px', textAlign: 'center' }}>Estado Auditoría</th>
                    <th style={{ width: '180px', textAlign: 'right' }}>Acciones y Reglas</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                          <Loader2 className="spinner" size={20} />
                          <span>Cargando catálogo maestro desde 10.46.0.189:3000...</span>
                        </div>
                      </td>
                    </tr>
                  ) : formasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No se encontraron formas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    formasFiltradas.map((f) => (
                      <tr key={f.COD_FORMA}>
                        <td>
                          <span className="mono" style={{ fontWeight: 800, color: 'var(--brand)', fontSize: '13px' }}>
                            {f.COD_FORMA}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                            {f.NOMBRE_FORMA}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${
                            f.TIPO_RESOLUCION === 'DIRECTA' ? 'badge-info' :
                            f.TIPO_RESOLUCION === 'BIYECTIVA' ? 'badge-success' :
                            f.TIPO_RESOLUCION === 'PRORRATEO' ? 'badge-danger' :
                            f.TIPO_RESOLUCION === 'RIF' ? 'badge-warning' : 'badge-neutral'
                          }`}>
                            {f.TIPO_RESOLUCION}
                          </span>
                        </td>
                        <td>
                          {f.COD_PARTIDA ? (
                            <span className="mono" style={{ fontWeight: 600, fontSize: '12px' }}>
                              {f.COD_PARTIDA}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>
                              {f.TIPO_RESOLUCION === 'PRORRATEO' ? 'Prorrateo Múltiple' : 'Regla RIF'}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {f.DESIGNACION_PARTIDA || (f.TIPO_RESOLUCION === 'PRORRATEO' ? 'Desglose porcentual (Aduana 52% / 42% / 6%)' : 'Según condición de contribuyente')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                            v{f.VERSION || 1}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {formasAuditoria[f.COD_FORMA]?.auditada ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleAuditoria(f.COD_FORMA, false)}
                                disabled={auditLoading === f.COD_FORMA}
                                className="btn-audit-toggle btn-audit-toggle-ok"
                                title={`Auditada por ${formasAuditoria[f.COD_FORMA]?.usuario_auditor || 'Especialista'} (${new Date(formasAuditoria[f.COD_FORMA]?.fecha_auditoria || '').toLocaleDateString('es-VE')}). Clic para revocar.`}
                              >
                                {auditLoading === f.COD_FORMA ? (
                                  <Loader2 size={12} className="spinner" />
                                ) : (
                                  <CheckCircle2 size={12} />
                                )}
                                Certificada
                              </button>
                              <span style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}>
                                v{formasAuditoria[f.COD_FORMA]?.version_auditada ?? f.VERSION ?? 1}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleAuditoria(f.COD_FORMA, true)}
                              disabled={auditLoading === f.COD_FORMA}
                              className="btn-audit-toggle btn-audit-toggle-warn"
                              title="Contrato forma-presupuesto no auditado. Clic para certificar."
                            >
                              {auditLoading === f.COD_FORMA ? (
                                <Loader2 size={12} className="spinner" />
                              ) : (
                                <AlertTriangle size={12} style={{ color: '#d97706' }} />
                              )}
                              Por Auditar
                            </button>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                            {/* Botón Editar Reglas */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditRules(f)}
                              className="btn btn-ghost"
                              style={{ padding: '5px 8px', height: 'auto', fontSize: '11px', color: '#0284c7' }}
                              title="Configurar Reglas y Partidas"
                            >
                              <SlidersHorizontal size={13} style={{ marginRight: 3 }} />
                              Reglas
                            </button>

                            {/* Botón Historial */}
                            <button
                              type="button"
                              onClick={() => handleOpenHistory(f)}
                              className="btn btn-ghost"
                              style={{ padding: '5px 7px', height: 'auto', fontSize: '11px', color: 'var(--text-secondary)' }}
                              title="Ver Historial de Versiones"
                            >
                              <History size={13} />
                            </button>

                            {/* Botón Simular */}
                            <button
                              type="button"
                              onClick={() => handleSimularForma(f)}
                              className="btn btn-ghost"
                              style={{ padding: '5px 7px', height: 'auto', fontSize: '11px', color: 'var(--success)' }}
                              title="Simular Imputación"
                            >
                              <Calculator size={13} />
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
          TAB 2: SIMULADOR DE IMPUTACIÓN
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'simulador' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Panel Izquierdo: Formulario de Parámetros de Entrada */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Calculator size={18} color="var(--brand)" />
                <span>Simulador de Imputación Presupuestaria</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Endpoint: <code className="mono">POST /api/v1/formas/:id/resolver</code>
              </span>
            </div>

            <div className="card-body">
              <form onSubmit={handleResolverSimulacion} className="stack" style={{ gap: '18px' }}>
                {/* Selector de Forma */}
                <div className="field">
                  <label className="field-label">Forma Tributaria SENIAT</label>
                  <select
                    value={simForma}
                    onChange={(e) => setSimForma(e.target.value)}
                    className="input-field mono"
                    required
                  >
                    {formas.map((f) => (
                      <option key={f.COD_FORMA} value={f.COD_FORMA}>
                        {f.COD_FORMA} — {f.NOMBRE_FORMA} ({f.TIPO_RESOLUCION})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Monto en Bolívares */}
                <div className="field">
                  <label className="field-label">Monto de la Planilla (Bs.)</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={simMonto}
                      onChange={(e) => setSimMonto(parseFloat(e.target.value) || 0)}
                      placeholder="1000.00"
                      className="input-field mono"
                      style={{ paddingLeft: '36px' }}
                      required
                    />
                  </div>
                </div>

                {/* RIF del Contribuyente */}
                <div className="field">
                  <label className="field-label">RIF del Contribuyente (Opcional / Requerido para RIF)</label>
                  <input
                    type="text"
                    value={simRif}
                    onChange={(e) => setSimRif(e.target.value)}
                    placeholder="Ej. J401045375 o V160887008"
                    className="input-field mono"
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button 
                      type="button" 
                      onClick={() => setSimRif('J401045375')} 
                      className="btn btn-ghost"
                      style={{ padding: '2px 8px', fontSize: '10px', height: 'auto' }}
                    >
                      Jurídico (J)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setSimRif('V160887008')} 
                      className="btn btn-ghost"
                      style={{ padding: '2px 8px', fontSize: '10px', height: 'auto' }}
                    >
                      Natural (V)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setSimRif('G200001234')} 
                      className="btn btn-ghost"
                      style={{ padding: '2px 8px', fontSize: '10px', height: 'auto' }}
                    >
                      Gobierno (G)
                    </button>
                  </div>
                </div>

                {/* Botón Resolver */}
                <button
                  type="submit"
                  disabled={simLoading || !simForma || !simMonto}
                  className="btn btn-primary"
                  style={{ height: '44px', marginTop: '6px' }}
                >
                  {simLoading ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      Calculando Imputación...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Resolver Imputación Presupuestaria
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Panel Derecho: Resultado del Desglose */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <CheckCircle2 size={18} color="var(--success)" />
                <span>Desglose de Partidas Resultante</span>
              </div>
              {simResult && (
                <span className={`badge ${
                  simResult.tipo_resolucion === 'PRORRATEO' ? 'badge-danger' :
                  simResult.tipo_resolucion === 'BIYECTIVA' ? 'badge-success' : 'badge-info'
                }`}>
                  {simResult.tipo_resolucion}
                </span>
              )}
            </div>

            <div className="card-body">
              {simError && (
                <div style={{ padding: '14px', background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '8px', color: 'var(--danger)', fontSize: '13px' }}>
                  {simError}
                </div>
              )}

              {simResult ? (
                <div className="stack" style={{ gap: '16px' }}>
                  {/* Resumen de Montos */}
                  <div style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: 'var(--surface-0)',
                    border: '1px solid var(--border-default)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '12px',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Monto Declarado</div>
                      <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                        Bs. {simResult.monto_declarado.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Asignado</div>
                      <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--brand)', marginTop: 2 }}>
                        Bs. {simResult.total_asignado.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Cuadre Contable</div>
                      <div style={{ marginTop: 2 }}>
                        <span className="badge badge-success" style={{ fontWeight: 700 }}>
                          Dif = 0.00 Bs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Partidas Asignadas */}
                  <div className="table-container" style={{ border: '1px solid var(--border-default)', borderRadius: '8px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Partida</th>
                          <th>Designación</th>
                          <th style={{ textAlign: 'center', width: '70px' }}>%</th>
                          <th style={{ textAlign: 'right', width: '130px' }}>Monto Bs.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simResult.asignaciones.map((asig, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className="mono" style={{ fontWeight: 700, color: 'var(--brand)' }}>
                                {asig.cod_partida}
                              </span>
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                              {asig.designacion}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge badge-info" style={{ fontWeight: 700 }}>
                                {asig.porcentaje}%
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span className="mono" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                                Bs. {asig.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} color="var(--success)" />
                    <span>Resolución calculada por el microservicio oficial de catálogos v{simResult.version || 1}.</span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                  <Calculator size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                  <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Seleccione los parámetros y presione "Resolver"</p>
                  <p style={{ margin: 0, fontSize: '12px' }}>Visualice el desglose porcentual exacto al céntimo en tiempo real.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: CATÁLOGO DE PARTIDAS (39)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'partidas' && (
        <div style={{ padding: '0 28px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Buscador de Partidas Presupuestarias */}
          <div className="search-panel">
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
              <div style={{ position: 'relative', flex: '1 1 340px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  value={searchPartida}
                  onChange={(e) => setSearchPartida(e.target.value)}
                  placeholder="Buscar por código de partida (ej. 301010200) o designación..."
                  className="input-field"
                  style={{ paddingLeft: '38px', paddingRight: searchPartida ? '36px' : '12px' }}
                />
                {searchPartida && (
                  <button
                    type="button"
                    onClick={() => setSearchPartida('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Limpiar búsqueda"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {searchPartida ? (
                  <span>Mostrando <strong>{partidasFiltradas.length}</strong> de {partidas.length} partidas</span>
                ) : (
                  <span>Total partidas en catálogo: <strong>{partidas.length}</strong></span>
                )}
              </div>
            </div>
          </div>

          <div className="table-section">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '160px' }}>Código de Partida</th>
                    <th>Designación Presupuestaria Oficial (Ingreso Fiscal)</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>Formas Vinculadas</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {partidasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No se encontraron partidas presupuestarias que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    partidasFiltradas.map((p) => (
                      <tr key={p.COD_PARTIDA}>
                        <td>
                          <span className="mono" style={{ fontWeight: 750, color: 'var(--brand)', fontSize: '13px' }}>
                            {p.COD_PARTIDA}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                          {p.DESIGNACION_PARTIDA}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-info" style={{ fontWeight: 700 }}>
                            {p.TOTAL_FORMAS || 1} Formas
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenPartidaFormas(p)}
                            className="btn btn-ghost"
                            style={{ padding: '5px 10px', height: 'auto', fontSize: '11px', color: 'var(--brand)' }}
                          >
                            <Eye size={13} style={{ marginRight: 4 }} />
                            Ver Formas
                          </button>
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
          MODAL 1: ACTUALIZAR REGLAS DE IMPUTACIÓN (PUT /formas/:id/reglas)
      ══════════════════════════════════════════════════════════════════════ */}
      {isEditRulesModalOpen && selectedFormaForEdit && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '640px' }}>
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="modal-icon-badge" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                  <SlidersHorizontal size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                    Configurar Reglas: Forma {selectedFormaForEdit.COD_FORMA}
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    {selectedFormaForEdit.NOMBRE_FORMA}
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setIsEditRulesModalOpen(false)}
                className="modal-close-btn"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {editError && (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--danger-soft)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--r-md)',
                  color: 'var(--danger)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{editError}</span>
                </div>
              )}

              <form id="edit-rules-form" onSubmit={handleSaveRules} className="stack" style={{ gap: '18px' }}>
                {/* Tipo de Resolución */}
                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                    Tipo de Resolución Presupuestaria
                  </label>
                  <select
                    value={editTipoResolucion}
                    onChange={(e) => setEditTipoResolucion(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="DIRECTA">DIRECTA — Asignación 1 a 1 a Partida Fija</option>
                    <option value="BIYECTIVA">BIYECTIVA — Monopartida Exclusiva</option>
                    <option value="ANCLADA">ANCLADA — Partida Oficial Fijada por ONT</option>
                    <option value="PRORRATEO">PRORRATEO — División Porcentual Múltiple (ej. Aduanas)</option>
                    <option value="RIF">RIF — Dependiente de la Condición del Contribuyente</option>
                  </select>
                </div>

                {/* CASO A: ASIGNACIÓN DIRECTA / ANCLADA / BIYECTIVA */}
                {(editTipoResolucion === 'DIRECTA' || editTipoResolucion === 'BIYECTIVA' || editTipoResolucion === 'ANCLADA') && (
                  <div className="field">
                    <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                      Partida Presupuestaria Asignada
                    </label>
                    <select
                      value={editCodPartida}
                      onChange={(e) => {
                        setEditCodPartida(e.target.value);
                        const f = partidas.find(p => p.COD_PARTIDA === e.target.value);
                        if (f) setEditDesignacion(f.DESIGNACION_PARTIDA);
                      }}
                      className="input-field mono"
                      required
                    >
                      {partidas.map((p) => (
                        <option key={p.COD_PARTIDA} value={p.COD_PARTIDA}>
                          {p.COD_PARTIDA} — {p.DESIGNACION_PARTIDA}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* CASO B: PRORRATEO (MÚLTIPLES PARTIDAS Y PORCENTAJES) */}
                {editTipoResolucion === 'PRORRATEO' && (
                  <div className="stack" style={{ gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, margin: 0 }}>
                        Partidas y Porcentajes de Prorrateo
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${Math.round(currentTotalProrrateo) === 100 ? 'badge-success' : 'badge-danger'}`} style={{ fontWeight: 700 }}>
                          Total: {currentTotalProrrateo}% {Math.round(currentTotalProrrateo) === 100 ? '✓ Cuadrado' : '≠ 100%'}
                        </span>
                        <button
                          type="button"
                          onClick={handleAddProrrateoRow}
                          className="btn btn-ghost"
                          style={{ padding: '3px 8px', fontSize: '11px', height: 'auto' }}
                        >
                          <Plus size={12} style={{ marginRight: 3 }} /> Añadir Partida
                        </button>
                      </div>
                    </div>

                    <div className="table-container" style={{ border: '1px solid var(--border-default)', borderRadius: '8px' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Partida Presupuestaria</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>% Porcentaje</th>
                            <th style={{ width: '40px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editProrrateoList.map((row, idx) => (
                            <tr key={idx}>
                              <td>
                                <select
                                  value={row.cod_partida}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const found = partidas.find(p => p.COD_PARTIDA === val);
                                    const updated = [...editProrrateoList];
                                    updated[idx].cod_partida = val;
                                    updated[idx].designacion = found?.DESIGNACION_PARTIDA || '';
                                    setEditProrrateoList(updated);
                                  }}
                                  className="input-field mono"
                                  style={{ fontSize: '12px', padding: '6px 10px' }}
                                >
                                  {partidas.map(p => (
                                    <option key={p.COD_PARTIDA} value={p.COD_PARTIDA}>
                                      {p.COD_PARTIDA} — {p.DESIGNACION_PARTIDA}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={row.porcentaje}
                                  onChange={(e) => {
                                    const updated = [...editProrrateoList];
                                    updated[idx].porcentaje = parseFloat(e.target.value) || 0;
                                    setEditProrrateoList(updated);
                                  }}
                                  className="input-field mono"
                                  style={{ textAlign: 'center', fontWeight: 700, padding: '6px' }}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {editProrrateoList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveProrrateoRow(idx)}
                                    className="btn btn-ghost"
                                    style={{ padding: '4px', color: 'var(--danger)' }}
                                    title="Quitar"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* CASO C: REGLAS POR RIF */}
                {editTipoResolucion === 'RIF' && (
                  <div className="stack" style={{ gap: '10px' }}>
                    <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                      Mapeo por Letra de RIF Contribuyente
                    </label>
                    <div className="table-container" style={{ border: '1px solid var(--border-default)', borderRadius: '8px' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th style={{ width: '80px' }}>Tipo RIF</th>
                            <th>Partida Presupuestaria Asignada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editRifList.map((rifRule, idx) => (
                            <tr key={idx}>
                              <td>
                                <span className="badge badge-info" style={{ fontWeight: 800 }}>
                                  RIF {rifRule.letra}
                                </span>
                              </td>
                              <td>
                                <select
                                  value={rifRule.cod_partida}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const found = partidas.find(p => p.COD_PARTIDA === val);
                                    const updated = [...editRifList];
                                    updated[idx].cod_partida = val;
                                    updated[idx].designacion = found?.DESIGNACION_PARTIDA || '';
                                    setEditRifList(updated);
                                  }}
                                  className="input-field mono"
                                  style={{ fontSize: '12px', padding: '6px 10px' }}
                                >
                                  {partidas.map(p => (
                                    <option key={p.COD_PARTIDA} value={p.COD_PARTIDA}>
                                      {p.COD_PARTIDA} — {p.DESIGNACION_PARTIDA}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Motivo del Cambio */}
                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                    Motivo / Justificación del Cambio (Auditoría)
                  </label>
                  <input
                    type="text"
                    value={editMotivo}
                    onChange={(e) => setEditMotivo(e.target.value)}
                    placeholder="Ej. Ajuste según resolución ministerial..."
                    className="input-field"
                    required
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsEditRulesModalOpen(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-rules-form"
                disabled={editSubmitting}
                className="btn btn-primary"
                style={{ minWidth: '150px' }}
              >
                {editSubmitting ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Guardar Reglas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: CREAR NUEVA FORMA TRIBUTARIA (POST /formas)
      ══════════════════════════════════════════════════════════════════════ */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="modal-icon-badge" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                  <Plus size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                    Registrar Nueva Forma Tributaria
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    Añade un nuevo código tributario al microservicio de catálogos
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setIsCreateModalOpen(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {createError && (
                <div style={{ padding: '12px', background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '8px', color: 'var(--danger)', fontSize: '12.5px', marginBottom: '16px' }}>
                  {createError}
                </div>
              )}

              <form id="create-forma-form" onSubmit={handleCreateForma} className="stack" style={{ gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                  <div className="field">
                    <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Código de Forma</label>
                    <input
                      type="text"
                      value={createCodForma}
                      onChange={(e) => setCreateCodForma(e.target.value)}
                      placeholder="Ej. 00999"
                      className="input-field mono"
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Tipo de Resolución</label>
                    <select
                      value={createTipoResolucion}
                      onChange={(e) => setCreateTipoResolucion(e.target.value)}
                      className="input-field"
                    >
                      <option value="DIRECTA">DIRECTA</option>
                      <option value="BIYECTIVA">BIYECTIVA</option>
                      <option value="ANCLADA">ANCLADA</option>
                      <option value="PRORRATEO">PRORRATEO</option>
                      <option value="RIF">RIF</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Denominación Tributaria Oficial</label>
                  <input
                    type="text"
                    value={createNombreForma}
                    onChange={(e) => setCreateNombreForma(e.target.value)}
                    placeholder="Ej. Declaración y Pago de Contribución Especial..."
                    className="input-field"
                    required
                  />
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Partida Presupuestaria Inicial</label>
                  <select
                    value={createCodPartida}
                    onChange={(e) => setCreateCodPartida(e.target.value)}
                    className="input-field mono"
                    required
                  >
                    {partidas.map(p => (
                      <option key={p.COD_PARTIDA} value={p.COD_PARTIDA}>
                        {p.COD_PARTIDA} — {p.DESIGNACION_PARTIDA}
                      </option>
                    ))}
                  </select>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="create-forma-form"
                disabled={createSubmitting || !createCodForma || !createNombreForma}
                className="btn btn-primary"
                style={{ background: '#0284c7', minWidth: '140px' }}
              >
                {createSubmitting ? <Loader2 size={16} className="spinner" /> : <Plus size={16} />}
                Crear Forma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: HISTORIAL DE VERSIONES (GET /formas/:id/historial)
      ══════════════════════════════════════════════════════════════════════ */}
      {isHistoryModalOpen && historyForma && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="modal-icon-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                  <History size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                    Historial de Versiones: Forma {historyForma.COD_FORMA}
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    Registro histórico y trazabilidad de cambios de reglas ONT
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setIsHistoryModalOpen(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <Loader2 size={24} className="spinner" style={{ margin: '0 auto 8px' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Cargando bitácora histórica...</p>
                </div>
              ) : historyVersions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No hay versiones anteriores registradas.
                </div>
              ) : (
                <div className="stack" style={{ gap: '14px' }}>
                  {historyVersions.map((ver, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '10px',
                        background: idx === 0 ? '#f0fdf4' : 'var(--surface-0)',
                        border: `1px solid ${idx === 0 ? '#bbf7d0' : 'var(--border-default)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge ${idx === 0 ? 'badge-success' : 'badge-neutral'}`} style={{ fontWeight: 800 }}>
                            Versión {ver.VERSION} {idx === 0 ? '(Vigente)' : ''}
                          </span>
                          <span className="badge badge-info">{ver.TIPO_RESOLUCION}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(ver.FECHA_DESDE).toLocaleDateString('es-VE')}
                        </span>
                      </div>

                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {ver.COD_PARTIDA ? `${ver.COD_PARTIDA} — ${ver.DESIGNACION_PARTIDA}` : 'Regla de Prorrateo / RIF'}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>👤 Cargado por: <strong>{ver.USUARIO_CARGA || 'ONT_SIR_BOT_AUDIT'}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="btn btn-ghost"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 4: FORMAS VINCULADAS A UNA PARTIDA (GET /partidas/:id/formas)
      ══════════════════════════════════════════════════════════════════════ */}
      {isPartidaFormasModalOpen && selectedPartida && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="modal-icon-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <ListOrdered size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                    Formas Vinculadas a Partida {selectedPartida.COD_PARTIDA}
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    {selectedPartida.DESIGNACION_PARTIDA}
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setIsPartidaFormasModalOpen(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {partidaFormasLoading ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <Loader2 size={24} className="spinner" style={{ margin: '0 auto 8px' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Consultando formas asociadas...</p>
                </div>
              ) : partidaLinkedFormas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No se encontraron formas tributarias vinculadas a esta partida.
                </div>
              ) : (
                <div className="table-container" style={{ border: '1px solid var(--border-default)', borderRadius: '8px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '90px' }}>Cód. Forma</th>
                        <th>Denominación Tributaria</th>
                        <th style={{ width: '120px' }}>Tipo Resolución</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partidaLinkedFormas.map((pf, idx) => (
                        <tr key={idx}>
                          <td>
                            <span className="mono" style={{ fontWeight: 800, color: 'var(--brand)' }}>
                              {pf.COD_FORMA}
                            </span>
                          </td>
                          <td style={{ fontSize: '12.5px', fontWeight: 600 }}>
                            {pf.NOMBRE_FORMA}
                          </td>
                          <td>
                            <span className={`badge ${
                              pf.TIPO_RESOLUCION === 'DIRECTA' ? 'badge-info' :
                              pf.TIPO_RESOLUCION === 'BIYECTIVA' ? 'badge-success' :
                              pf.TIPO_RESOLUCION === 'PRORRATEO' ? 'badge-danger' : 'badge-warning'
                            }`}>
                              {pf.TIPO_RESOLUCION}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsPartidaFormasModalOpen(false)}
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
