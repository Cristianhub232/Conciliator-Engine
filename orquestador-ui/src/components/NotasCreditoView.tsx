"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Landmark, 
  Search, 
  RefreshCw, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  Banknote, 
  Calendar,
  Building2,
  PieChart,
  ArrowRightLeft,
  X,
  ShieldCheck,
  TrendingDown
} from 'lucide-react';
import { DuplicadosTxtModal, DuplicadoTxtItem } from './DuplicadosTxtModal';

export const BANCOS_CATALOGO: Record<string, string> = {
  '102': 'BANCO DE VENEZUELA',
  '104': 'BANCO VENEZOLANO DE CRÉDITO',
  '105': 'BANCO MERCANTIL',
  '108': 'BANCO PROVINCIAL',
  '114': 'BANCARIBE',
  '115': 'BANCO EXTERIOR',
  '116': 'BANCO OCCIDENTAL DE DESCUENTO',
  '128': 'BANCO CARONÍ',
  '134': 'BANESCO',
  '163': 'BANCO DEL TESORO',
  '172': 'BANCAMIGA',
  '174': 'BANPLUS',
  '175': 'BANCO DIGITAL DE LOS TRABAJADORES (BICENTENARIO)',
  '177': 'BANFANB',
};

export const NotasCreditoView: React.FC = () => {
  // Filtros
  const [fecha, setFecha] = useState('2024-04-23');
  const [banco, setBanco] = useState('102');
  const [expediente, setExpediente] = useState('');

  // Estado de datos
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [formasSeniat, setFormasSeniat] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ncs' | 'formas'>('ncs');
  const [selectedNc, setSelectedNc] = useState<any | null>(null);
  const [modalData, setModalData] = useState<any | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [copiedNc, setCopiedNc] = useState<string | null>(null);
  const [isDuplicadosModalOpen, setIsDuplicadosModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clipboard feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchNotasCredito = async () => {
    if (!fecha) {
      setError('Por favor selecciona una fecha válida.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('fecha', fecha);
      if (banco && banco !== 'TODOS') params.append('banco', banco);
      if (expediente && expediente.trim() !== '') params.append('expediente', expediente.trim());

      const res = await axios.get(`/api/orquestador/notas-credito?${params.toString()}`);
      if (res.data?.success) {
        setData(res.data);
      } else {
        setError(res.data?.message || 'Error al obtener Notas de Crédito');
      }
    } catch (err: any) {
      console.error('Error fetching notas credito:', err);
      setError(err.response?.data?.message || err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotasCredito();
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenDetail = async (nc: any) => {
    setSelectedNc(nc);
    setLoadingModal(true);
    try {
      const res = await axios.get(`/api/orquestador/notas-credito/${nc.nocr_codigo}`);
      if (res.data?.success) {
        setModalData(res.data);
      } else {
        setModalData({ nota_credito: nc, lotes_asociados: [] });
      }
    } catch (e) {
      setModalData({ nota_credito: nc, lotes_asociados: [] });
    } finally {
      setLoadingModal(false);
    }
  };

  const formatBs = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0,00';
    return Number(num).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const totalesNc = data?.totales_nc || { cantidad: 0, monto_total: 0, monto_efectivo: 0, monto_cheque: 0, monto_otros: 0 };
  const totalesSeniat = data?.totales_seniat || { total_planillas: 0, total_monto: 0, monto_conciliado: 0, monto_pendiente: 0, planillas_conciliadas: 0, planillas_pendientes: 0 };
  const brecha = data?.brecha || { diferencia_nc_vs_txt_pendiente: 0, diferencia_nc_vs_txt_total: 0, alerta_discrepancia: false, observacion: '' };
  const ncsList = data?.notas_credito || [];
  const formasList = data?.formas_seniat || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#F8FAFC' }}>
      {/* ── Topbar / Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', background: '#ffffff', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '12px', background: '#EFF6FF', color: '#2563EB', boxShadow: '0 2px 6px rgba(37, 99, 235, 0.15)' }}>
            <Landmark size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A' }}>
                Auditoría de Notas de Crédito Bancarias
              </h1>
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#E0E7FF', color: '#4338CA', letterSpacing: '0.05em' }}>
                SIGECOF / SENIAT
              </span>
            </div>
            <div style={{ marginTop: '3px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              Consulta directa de <code style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#0369A1' }}>ORG_LIQ.NOTA_CREDITO_PLN</code> y conciliación analítica con <code style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#0369A1' }}>TXT_SENIAT</code>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchNotasCredito}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#1E293B',
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </header>

      {/* ── Barra de Filtros ── */}
      <div style={{ padding: '16px 32px', background: '#ffffff', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          {/* Fecha Recaudación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={13} color="#2563EB" /> FECHA RECAUDACIÓN
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={{
                height: '38px',
                padding: '0 12px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#0F172A',
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                outline: 'none',
                minWidth: '150px'
              }}
            />
          </div>

          {/* Banco Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Building2 size={13} color="#2563EB" /> BANCO RECAUDADOR
            </label>
            <select
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              style={{
                height: '38px',
                padding: '0 12px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#0F172A',
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                outline: 'none',
                minWidth: '280px',
                cursor: 'pointer'
              }}
            >
              <option value="TODOS">TODOS LOS BANCOS</option>
              <option value="102">102 — BANCO DE VENEZUELA</option>
              <option value="105">105 — BANCO MERCANTIL</option>
              <option value="134">134 — BANESCO</option>
              <option value="108">108 — BANCO PROVINCIAL</option>
              <option value="104">104 — BANCO VENEZOLANO DE CRÉDITO</option>
              <option value="114">114 — BANCARIBE</option>
              <option value="115">115 — BANCO EXTERIOR</option>
              <option value="128">128 — BANCO CARONÍ</option>
              <option value="163">163 — BANCO DEL TESORO</option>
              <option value="175">175 — BANCO DIGITAL TRABAJADORES (BICENTENARIO)</option>
              <option value="172">172 — BANCAMIGA</option>
              <option value="174">174 — BANPLUS</option>
              <option value="177">177 — BANFANB</option>
            </select>
          </div>

          {/* Expediente (Opcional) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FileText size={13} color="#2563EB" /> EXPEDIENTE (OPCIONAL)
            </label>
            <input
              type="text"
              value={expediente}
              onChange={(e) => setExpediente(e.target.value)}
              placeholder="Ej. 1527 o 1531"
              style={{
                height: '38px',
                padding: '0 12px',
                fontSize: '13.5px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600,
                color: '#0F172A',
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                outline: 'none',
                width: '180px'
              }}
            />
          </div>

          {/* Botón Buscar */}
          <button
            onClick={fetchNotasCredito}
            disabled={loading}
            style={{
              height: '38px',
              padding: '0 20px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: '#ffffff',
              background: '#2563EB',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
              transition: 'background 0.15s ease'
            }}
          >
            <Search size={16} />
            {loading ? 'Consultando...' : 'Consultar Notas'}
          </button>
        </div>
      </div>

      {/* ── Contenido Principal ── */}
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', color: '#991B1B', fontSize: '13.5px', fontWeight: 600 }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* ── TARJETAS KPI RESUMEN ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Card 1: Total Acreditado Físico (NC) */}
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#64748B', textTransform: 'uppercase' }}>
                Total Enterado (NCs)
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#EFF6FF', color: '#2563EB' }}>
                {totalesNc.cantidad} Notas de Crédito
              </span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', fontFamily: "'IBM Plex Mono', monospace" }}>
              Bs. {formatBs(totalesNc.monto_total)}
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#64748B', fontWeight: 600, borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
              <span>Efectivo: <strong style={{ color: '#0F172A' }}>Bs. {formatBs(totalesNc.monto_efectivo)}</strong></span>
              <span>•</span>
              <span>Cheques: <strong style={{ color: '#0F172A' }}>Bs. {formatBs(totalesNc.monto_cheque)}</strong></span>
            </div>
          </div>

          {/* Card 2: Monto Pendiente en SENIAT */}
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#64748B', textTransform: 'uppercase' }}>
                SENIAT Pendiente (TXT)
              </span>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 800, 
                padding: '2px 9px', 
                borderRadius: '20px', 
                background: totalesSeniat.planillas_duplicadas_count ? '#DCFCE7' : '#FEF3C7', 
                color: totalesSeniat.planillas_duplicadas_count ? '#166534' : '#D97706' 
              }}>
                {totalesSeniat.planillas_pendientes_unicas || totalesSeniat.planillas_pendientes} Planillas Únicas
              </span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', fontFamily: "'IBM Plex Mono', monospace" }}>
              Bs. {formatBs(totalesSeniat.monto_pendiente_unico || totalesSeniat.monto_pendiente)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: '#64748B', fontWeight: 600, borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Total TXT Bruto: <strong>{totalesSeniat.planillas_pendientes} plns</strong> (Bs. {formatBs(totalesSeniat.monto_pendiente)})</span>
              </div>
              {totalesSeniat.planillas_duplicadas_count > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  marginTop: '2px'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} color="#D97706" />
                    <strong>{totalesSeniat.planillas_duplicadas_count} duplicadas</strong> (+Bs. {formatBs(totalesSeniat.monto_duplicadas)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDuplicadosModalOpen(true)}
                    style={{
                      border: 'none',
                      background: '#D97706',
                      color: '#ffffff',
                      borderRadius: '4px',
                      padding: '2px 7px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Ver detalle →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Brecha Neta */}
          <div style={{ 
            background: brecha.alerta_discrepancia ? '#FFFBEB' : '#F0FDF4', 
            border: `1px solid ${brecha.alerta_discrepancia ? '#FDE68A' : '#BBF7D0'}`, 
            borderRadius: '12px', 
            padding: '18px 20px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: brecha.alerta_discrepancia ? '#B45309' : '#15803D', textTransform: 'uppercase' }}>
                Brecha Neta (NC vs Pendiente)
              </span>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                padding: '2px 8px', 
                borderRadius: '20px', 
                background: brecha.alerta_discrepancia ? '#FEF2F2' : '#DCFCE7', 
                color: brecha.alerta_discrepancia ? '#DC2626' : '#16A34A',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {brecha.alerta_discrepancia ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                {brecha.alerta_discrepancia ? 'Desfase Detectado' : 'Cuadrado'}
              </span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: brecha.alerta_discrepancia ? '#DC2626' : '#15803D', fontFamily: "'IBM Plex Mono', monospace" }}>
              Bs. {formatBs(Math.abs(brecha.diferencia_nc_vs_txt_pendiente))}
            </div>
            <div style={{ fontSize: '11px', color: brecha.alerta_discrepancia ? '#B45309' : '#166534', fontWeight: 600, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px' }}>
              {brecha.diferencia_nc_vs_txt_pendiente < 0 ? 'Faltante en NCs físicas vs TXT SENIAT' : brecha.diferencia_nc_vs_txt_pendiente > 0 ? 'Superávit en NCs físicas' : 'Conciliación exacta al céntimo'}
            </div>
          </div>
        </div>

        {/* ── Banner de Explicación Forense ── */}
        {brecha.observacion && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 18px',
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: '10px',
            color: '#0369A1'
          }}>
            <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#0284C7' }} />
            <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
              <strong style={{ color: '#0369A1' }}>Análisis Forense del Día ({fecha}): </strong>
              {brecha.observacion}
            </div>
          </div>
        )}

        {/* ── Pestañas de Vista (NCs vs Formas) ── */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #E2E8F0', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('ncs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: activeTab === 'ncs' ? '#2563EB' : '#64748B',
              borderBottom: activeTab === 'ncs' ? '2px solid #2563EB' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Banknote size={16} />
            Notas de Crédito Físicas
            <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '10px', background: activeTab === 'ncs' ? '#EFF6FF' : '#F1F5F9', color: activeTab === 'ncs' ? '#2563EB' : '#64748B' }}>
              {ncsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('formas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: activeTab === 'formas' ? '#2563EB' : '#64748B',
              borderBottom: activeTab === 'formas' ? '2px solid #2563EB' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <PieChart size={16} />
            Desglose por Formas SENIAT
            <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '10px', background: activeTab === 'formas' ? '#EFF6FF' : '#F1F5F9', color: activeTab === 'formas' ? '#2563EB' : '#64748B' }}>
              {formasList.length}
            </span>
          </button>
        </div>

        {/* ── TABLA 1: NOTAS DE CRÉDITO ── */}
        {activeTab === 'ncs' && (
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em' }}>
                    <th style={{ padding: '12px 18px' }}>N° NOTA CRÉDITO</th>
                    <th style={{ padding: '12px 18px' }}>BANCO</th>
                    <th style={{ padding: '12px 18px' }}>EXPEDIENTE / WORKITEM</th>
                    <th style={{ padding: '12px 18px' }}>CUENTA BANCARIA (CTAT_ID)</th>
                    <th style={{ padding: '12px 18px' }}>FECHA ENTERAR BCV</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>EFECTIVO (BS)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>CHEQUE (BS)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>MONTO TOTAL (BS)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {ncsList.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
                        {loading ? 'Consultando notas de crédito...' : 'No se encontraron Notas de Crédito registradas para la fecha y filtros seleccionados.'}
                      </td>
                    </tr>
                  ) : (
                    ncsList.map((nc: any, idx: number) => {
                      const bankName = BANCOS_CATALOGO[nc.infn_codigo] || `Banco ${nc.infn_codigo}`;
                      return (
                        <tr 
                          key={nc.nocr_codigo || idx}
                          style={{ 
                            borderBottom: '1px solid #F1F5F9',
                            background: idx % 2 === 0 ? '#ffffff' : '#FBFDFF',
                            transition: 'background 0.1s ease'
                          }}
                        >
                          {/* Código NC con Copiar */}
                          <td style={{ padding: '14px 18px', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: '#0F172A' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{nc.nocr_codigo}</span>
                              <button
                                onClick={() => handleCopy(nc.nocr_codigo)}
                                title="Copiar código de NC"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '3px',
                                  color: copiedCode === nc.nocr_codigo ? '#16A34A' : '#94A3B8',
                                  borderRadius: '4px'
                                }}
                              >
                                {copiedCode === nc.nocr_codigo ? <Check size={13} /> : <Copy size={13} />}
                              </button>
                            </div>
                          </td>

                          {/* Banco */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#F1F5F9', color: '#334155' }}>
                                {nc.infn_codigo}
                              </span>
                              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1E293B' }}>
                                {bankName}
                              </span>
                            </div>
                          </td>

                          {/* Expediente / Workitem */}
                          <td style={{ padding: '14px 18px', fontFamily: "'IBM Plex Mono', monospace" }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: '#2563EB' }}>
                                Exp. {nc.expediente}
                              </span>
                              {nc.workitem > 0 && (
                                <span style={{ fontSize: '11px', color: '#64748B' }}>
                                  (WI #{nc.workitem})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Cuenta Bancaria */}
                          <td style={{ padding: '14px 18px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#475569' }}>
                            {nc.ctat_id || '—'}
                          </td>

                          {/* Fechas */}
                          <td style={{ padding: '14px 18px', fontSize: '12.5px', color: '#334155' }}>
                            <div>{nc.fecha_enterar_bcv || nc.fecha_bcv || '—'}</div>
                            <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Reg: {nc.fecha_registro?.split(' ')[0] || '—'}</div>
                          </td>

                          {/* Montos */}
                          <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: nc.monto_efectivo > 0 ? '#0F172A' : '#94A3B8' }}>
                            {formatBs(nc.monto_efectivo)}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: nc.monto_cheque > 0 ? '#0F172A' : '#94A3B8' }}>
                            {formatBs(nc.monto_cheque)}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 800, color: '#0F172A', fontSize: '13.5px' }}>
                            Bs. {formatBs(nc.monto)}
                          </td>

                          {/* Acciones */}
                          <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleOpenDetail(nc)}
                              style={{
                                padding: '5px 12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#2563EB',
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <ExternalLink size={12} /> Detalle
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {ncsList.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0', fontWeight: 800, fontSize: '13.5px' }}>
                      <td colSpan={5} style={{ padding: '14px 18px', color: '#1E293B' }}>
                        TOTAL ENTERADO FÍSICAMENTE ({totalesNc.cantidad} NOTAS DE CRÉDITO)
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: '#0F172A' }}>
                        Bs. {formatBs(totalesNc.monto_efectivo)}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: '#0F172A' }}>
                        Bs. {formatBs(totalesNc.monto_cheque)}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: '#2563EB', fontSize: '14px' }}>
                        Bs. {formatBs(totalesNc.monto_total)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ── TABLA 2: DESGLOSE DE FORMAS SENIAT ── */}
        {activeTab === 'formas' && (
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  Concentración de Recaudación en TXT SENIAT por Forma Tributaria
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Distribución de las {totalesSeniat.total_planillas} planillas recibidas para la fecha {fecha}
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em' }}>
                    <th style={{ padding: '12px 18px' }}>CÓDIGO DE FORMA</th>
                    <th style={{ padding: '12px 18px' }}>TIPO / DESIGNACIÓN</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>CANTIDAD DE PLANILLAS</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>MONTO TOTAL (BS)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>MONTO CONCILIADO (BS)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>MONTO PENDIENTE (BS)</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>% DEL PENDIENTE</th>
                  </tr>
                </thead>
                <tbody>
                  {formasList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
                        {loading ? 'Consultando formas en SENIAT...' : 'No hay planillas de SENIAT reportadas para este corte.'}
                      </td>
                    </tr>
                  ) : (
                    formasList.map((f: any, idx: number) => {
                      const pct = totalesSeniat.monto_pendiente > 0 
                        ? ((f.monto_pendiente / totalesSeniat.monto_pendiente) * 100).toFixed(1) 
                        : '0.0';
                      
                      const isAduana = f.forma_codigo === '99044';
                      const isIvaRet = f.forma_codigo === '00060';
                      const isIslr = f.forma_codigo === '99035';

                      return (
                        <tr 
                          key={f.forma_codigo || idx}
                          style={{ 
                            borderBottom: '1px solid #F1F5F9',
                            background: isAduana ? '#FAF5FF' : idx % 2 === 0 ? '#ffffff' : '#FBFDFF'
                          }}
                        >
                          <td style={{ padding: '14px 18px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 800, color: isAduana ? '#7C3AED' : '#0F172A' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>Forma {f.forma_codigo}</span>
                              {isAduana && (
                                <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#EDE9FE', color: '#7C3AED' }}>
                                  ADUANA
                                </span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px', fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
                            {isIslr ? 'Declaración ISLR Personas Jurídicas/Naturales' :
                             isAduana ? 'ISLR Retenciones Aduaneras (Agencia 0800)' :
                             isIvaRet ? 'Retenciones de IVA / Proveedores' :
                             f.forma_codigo === '99086' ? 'Declaración Aduanera DUA / Arancelaria' :
                             f.forma_codigo === '99020' ? 'Impuesto a Grandes Patrimonios' :
                             f.forma_codigo === '99021' ? 'IVA Régimen Ordinario' :
                             'Declaración Tributaria Especial'}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                            {Number(f.cantidad).toLocaleString('es-VE')}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: '#475569' }}>
                            Bs. {formatBs(f.monto_total)}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: '#16A34A', fontWeight: 600 }}>
                            Bs. {formatBs(f.monto_conciliado)}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 800, color: isAduana ? '#7C3AED' : '#D97706' }}>
                            Bs. {formatBs(f.monto_pendiente)}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
                            <span style={{ 
                              padding: '2px 7px', 
                              borderRadius: '6px', 
                              background: Number(pct) > 20 ? '#FEF3C7' : '#F1F5F9',
                              color: Number(pct) > 20 ? '#B45309' : '#475569'
                            }}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {formasList.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0', fontWeight: 800, fontSize: '13.5px' }}>
                      <td colSpan={2} style={{ padding: '14px 18px', color: '#1E293B' }}>
                        TOTALES TXT SENIAT ({totalesSeniat.total_planillas} PLANILLAS)
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace" }}>
                        {Number(totalesSeniat.total_planillas).toLocaleString('es-VE')}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace" }}>
                        Bs. {formatBs(totalesSeniat.total_monto)}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: '#16A34A' }}>
                        Bs. {formatBs(totalesSeniat.monto_conciliado)}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: '#D97706', fontSize: '14px' }}>
                        Bs. {formatBs(totalesSeniat.monto_pendiente)}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace" }}>
                        100.0%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL DETALLE DE NOTA DE CRÉDITO ── */}
      {selectedNc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: '#EFF6FF', color: '#2563EB', borderRadius: '10px' }}>
                  <Landmark size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                    Nota de Crédito {selectedNc.nocr_codigo}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Expediente {selectedNc.expediente} • Banco {selectedNc.infn_codigo}
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setSelectedNc(null); setModalData(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Grid de Atributos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>MONTO TOTAL ENTERADO</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', fontFamily: "'IBM Plex Mono', monospace", marginTop: '4px' }}>
                    Bs. {formatBs(selectedNc.monto)}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>BANCO EMISOR</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>
                    {selectedNc.infn_codigo} — {BANCOS_CATALOGO[selectedNc.infn_codigo] || 'BANCO'}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>DESGLOSE DE MEDIOS DE PAGO</div>
                  <div style={{ fontSize: '12.5px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    <div>Efectivo: <strong>Bs. {formatBs(selectedNc.monto_efectivo)}</strong></div>
                    <div>Cheque: <strong>Bs. {formatBs(selectedNc.monto_cheque)}</strong></div>
                    {(selectedNc.monto_bono > 0 || selectedNc.monto_divisas > 0) && (
                      <div>Otros/Divisas: <strong>Bs. {formatBs(selectedNc.monto_bono + selectedNc.monto_divisas)}</strong></div>
                    )}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>CUENTA BANCARIA Y WORKFLOW</div>
                  <div style={{ fontSize: '12.5px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    <div>Cuenta: <strong style={{ color: '#0284C7' }}>{selectedNc.ctat_id || '—'}</strong></div>
                    <div>Workitem: <strong>#{selectedNc.workitem || 'N/A'}</strong></div>
                    <div>Año: <strong>{selectedNc.anho || '—'}</strong></div>
                  </div>
                </div>
              </div>

              {/* Trazabilidad de Fechas */}
              <div style={{ background: '#F1F5F9', borderRadius: '8px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Tiempos de Registro y Tránsito Bancario
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Fecha Recaudación:</span>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{selectedNc.fecha_recaudacion}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Fecha Enterar BCV:</span>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{selectedNc.fecha_enterar_bcv || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Fecha Registro SIGECOF:</span>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{selectedNc.fecha_registro || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Lotes vinculados en ORG_LIQ.LOTE */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={15} color="#2563EB" />
                  Lotes en Expediente {selectedNc.expediente} (ORG_LIQ.LOTE)
                </h4>
                {loadingModal ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                    Consultando lotes asociados...
                  </div>
                ) : modalData?.lotes_asociados?.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontWeight: 700, color: '#475569' }}>
                        <th style={{ padding: '8px 12px' }}>LOTE ID</th>
                        <th style={{ padding: '8px 12px' }}>LOTE SEQ</th>
                        <th style={{ padding: '8px 12px' }}>AGENCIA</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>PLANILLAS</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>ESTADO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.lotes_asociados.map((lote: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{lote.LOTE_ID}</td>
                          <td style={{ padding: '8px 12px', fontFamily: "'IBM Plex Mono', monospace" }}>{lote.LOTE_SEQ}</td>
                          <td style={{ padding: '8px 12px' }}>Agencia {lote.AGENCIA_CODIGO}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace" }}>{lote.TOTAL_PLN}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: lote.ESTADO === 1 ? '#DCFCE7' : '#FEF3C7', color: lote.ESTADO === 1 ? '#16A34A' : '#D97706' }}>
                              {lote.ESTADO === 1 ? 'CONCILIADO' : 'PENDIENTE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>
                    No se encontraron lotes adicionales registrados para este expediente.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
              <button
                onClick={() => { setSelectedNc(null); setModalData(null); }}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1E293B',
                  background: '#ffffff',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Planillas Duplicadas en TXT */}
      <DuplicadosTxtModal
        isOpen={isDuplicadosModalOpen}
        onClose={() => setIsDuplicadosModalOpen(false)}
        duplicados={totalesSeniat.duplicados || []}
        totalDuplicadas={totalesSeniat.planillas_duplicadas_count || 0}
        montoTotalDuplicadas={totalesSeniat.monto_duplicadas || 0}
        fecha={fecha}
        banco={banco}
        totalBrutoTxt={totalesSeniat.planillas_pendientes}
        totalUnico={totalesSeniat.planillas_pendientes_unicas}
      />
    </div>
  );
};
