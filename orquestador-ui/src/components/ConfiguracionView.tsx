"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings, 
  Database, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save, 
  Activity, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Cpu, 
  HardDrive
} from 'lucide-react';

export const ConfiguracionView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [host, setHost] = useState('');
  const [port, setPort] = useState(1521);
  const [sid, setSid] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<'desarrollo' | 'produccion' | 'personalizado'>('desarrollo');
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success?: boolean;
    message?: string;
    version?: string;
    latency?: number;
  } | null>(null);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Cargar configuración actual
  const loadEnv = async () => {
    setLoading(true);
    setNotification(null);
    try {
      const res = await axios.get('/api/orquestador/configuracion/env');
      if (res.data.status === 200) {
        const cfg = res.data.config;
        setCurrentConfig(cfg);
        setHost(cfg.host || '');
        setPort(cfg.port || 1521);
        setSid(cfg.sid || '');
        setServiceName(cfg.service_name || '');
        setUser(cfg.user || '');
        setPassword(cfg.password || '');
        setPerfilSeleccionado(res.data.perfilActivo || 'personalizado');
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Error al cargar .env'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnv();
  }, []);

  // Seleccionar preset
  const handleSelectPreset = (presetId: 'desarrollo' | 'produccion') => {
    setPerfilSeleccionado(presetId);
    setTestResult(null);
    if (presetId === 'desarrollo') {
      setHost('172.21.65.90');
      setPort(1521);
      setSid('cert_rep');
      setServiceName('estatal');
      setUser('ONT_SIR_BOT');
      setPassword('ONT_SIR_BOT123456');
    } else if (presetId === 'produccion') {
      setHost('10.79.6.247');
      setPort(1521);
      setSid('sige1');
      setServiceName('sige1');
      setUser('consulta');
      setPassword('pumyra1584');
    }
  };

  // Probar Conexión (Ping Test)
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setNotification(null);
    try {
      const res = await axios.post('/api/orquestador/configuracion/test', {
        host,
        port: Number(port),
        sid,
        service_name: serviceName,
        user,
        password
      });
      setTestResult({
        tested: true,
        success: res.data.success,
        message: res.data.message,
        version: res.data.version,
        latency: res.data.latency
      });
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.response?.data?.message || err.message || 'Error al conectar'
      });
    } finally {
      setTesting(false);
    }
  };

  // Guardar en .env y Reconectar Pool
  const handleSaveAndReconnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);
    try {
      const res = await axios.post('/api/orquestador/configuracion/save', {
        host,
        port: Number(port),
        sid,
        service_name: serviceName,
        user,
        password
      });
      if (res.data.success) {
        setNotification({
          type: 'success',
          message: '¡Configuración guardada en .env y Pool de Oracle reconectado exitosamente en caliente!'
        });
        setCurrentConfig({
          host,
          port,
          sid,
          service_name: serviceName,
          user,
          password
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Error al guardar configuración'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '100%', padding: 0 }}>
      {/* ── Topbar / Page Head ── */}
      <header className="app-topbar">
        <div className="app-topbar-left">
          <div className="app-logo-mark" style={{ background: '#0284c7' }}>
            <Settings size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="app-title">Configuración de Entorno (.env)</h1>
            <p className="app-subtitle">Gestión de Ambientes y Parámetros de Conexión Oracle SIGECOF</p>
          </div>
        </div>

        {/* Estado activo actual */}
        {currentConfig && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-full)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
            <span className="status-dot"></span>
            <span>Host Activo:</span>
            <span style={{ color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>{currentConfig.host}:{currentConfig.port}</span>
            <span className="badge badge-info">{currentConfig.sid || currentConfig.service_name}</span>
          </div>
        )}
      </header>

      {/* ── Notificaciones ── */}
      {notification && (
        <div style={{ 
          padding: '16px 20px', 
          background: notification.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)', 
          border: `1px solid ${notification.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`, 
          borderRadius: 'var(--r-md)', 
          color: notification.type === 'success' ? 'var(--success)' : 'var(--danger)', 
          marginBottom: '24px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px' 
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{notification.message}</span>
        </div>
      )}

      {/* ── Selector de Presets de Ambiente ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Preset Desarrollo */}
        <div 
          onClick={() => handleSelectPreset('desarrollo')}
          className="card"
          style={{ 
            cursor: 'pointer', 
            padding: '18px 20px', 
            border: perfilSeleccionado === 'desarrollo' ? '2px solid var(--brand)' : '1px solid var(--border-default)',
            background: perfilSeleccionado === 'desarrollo' ? 'var(--brand-soft)' : 'var(--surface-1)',
            transition: 'all var(--dur-fast) var(--ease)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <Cpu size={18} color="var(--brand)" />
              <span>Desarrollo / Certificación</span>
            </div>
            {perfilSeleccionado === 'desarrollo' && <span className="badge badge-info">Seleccionado</span>}
          </div>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Servidor Oracle 19c `cert_rep` para pruebas funcionales y QA.
          </p>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            172.21.65.90:1521 (Usuario: ONT_SIR_BOT)
          </div>
        </div>

        {/* Preset Producción */}
        <div 
          onClick={() => handleSelectPreset('produccion')}
          className="card"
          style={{ 
            cursor: 'pointer', 
            padding: '18px 20px', 
            border: perfilSeleccionado === 'produccion' ? '2px solid var(--warning)' : '1px solid var(--border-default)',
            background: perfilSeleccionado === 'produccion' ? 'var(--warning-soft)' : 'var(--surface-1)',
            transition: 'all var(--dur-fast) var(--ease)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <HardDrive size={18} color="var(--warning)" />
              <span>Producción SIGECOF</span>
            </div>
            {perfilSeleccionado === 'produccion' && <span className="badge badge-warning">Seleccionado</span>}
          </div>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Servidor central SIGECOF Oracle 12c/19c (Instancia productiva).
          </p>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            10.79.6.247:1521 (Usuario: consulta)
          </div>
        </div>
      </div>

      {/* ── Formulario de Configuración ── */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-head">
          <div className="card-title">
            <Server size={18} color="var(--brand)" />
            <span>Parámetros de Conexión Oracle (.env)</span>
          </div>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            Los cambios se guardan directamente en <code style={{ fontFamily: 'var(--font-mono)' }}>api_obtencion/.env</code>
          </span>
        </div>

        <div className="card-body">
          <form onSubmit={handleSaveAndReconnect} className="stack" style={{ gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {/* Host */}
              <div className="field">
                <label className="field-label">Host / Dirección IP</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => { setHost(e.target.value); setPerfilSeleccionado('personalizado'); }}
                  placeholder="Ej. 172.21.65.90 o 10.79.6.247"
                  className="input-field mono"
                  required
                />
              </div>

              {/* Puerto */}
              <div className="field">
                <label className="field-label">Puerto TCP</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => { setPort(Number(e.target.value)); setPerfilSeleccionado('personalizado'); }}
                  placeholder="1521"
                  className="input-field mono"
                  required
                />
              </div>

              {/* SID */}
              <div className="field">
                <label className="field-label">Oracle SID</label>
                <input
                  type="text"
                  value={sid}
                  onChange={(e) => { setSid(e.target.value); setPerfilSeleccionado('personalizado'); }}
                  placeholder="cert_rep o sige1"
                  className="input-field mono"
                />
              </div>

              {/* Service Name */}
              <div className="field">
                <label className="field-label">Service Name (Opcional)</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => { setServiceName(e.target.value); setPerfilSeleccionado('personalizado'); }}
                  placeholder="estatal o sige1"
                  className="input-field mono"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Usuario */}
              <div className="field">
                <label className="field-label">Usuario de Base de Datos</label>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => { setUser(e.target.value); setPerfilSeleccionado('personalizado'); }}
                  placeholder="Ej. ONT_SIR_BOT o consulta"
                  className="input-field mono"
                  required
                />
              </div>

              {/* Contraseña */}
              <div className="field">
                <label className="field-label">Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPerfilSeleccionado('personalizado'); }}
                    placeholder="Contraseña de BD"
                    className="input-field mono"
                    style={{ paddingRight: '40px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    title={showPassword ? "Ocultar" : "Mostrar"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Resultado del Test de Conexión ── */}
            {testResult && (
              <div style={{ 
                padding: '14px 18px', 
                background: testResult.success ? 'var(--success-soft)' : 'var(--danger-soft)', 
                border: `1px solid ${testResult.success ? 'var(--success-border)' : 'var(--danger-border)'}`, 
                borderRadius: 'var(--r-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                {testResult.success ? <CheckCircle2 size={18} color="var(--success)" style={{ marginTop: 2, flexShrink: 0 }} /> : <AlertCircle size={18} color="var(--danger)" style={{ marginTop: 2, flexShrink: 0 }} />}
                <div>
                  <div style={{ fontWeight: 700, color: testResult.success ? 'var(--success)' : 'var(--danger)', fontSize: 'var(--fs-sm)' }}>
                    {testResult.message}
                  </div>
                  {testResult.version && (
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                      Versión detectada: {testResult.version}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Botones de Acción ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || saving || !host || !user || !password}
                className="btn btn-ghost"
                style={{ height: '44px' }}
              >
                {testing ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Probando Conexión...
                  </>
                ) : (
                  <>
                    <Activity size={16} color="var(--brand)" />
                    Probar Conexión (Ping)
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={saving || testing || !host || !user || !password}
                className="btn btn-primary"
                style={{ height: '44px' }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Aplicando Cambios...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Guardar y Reconectar (.env)
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
