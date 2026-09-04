"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save, 
  Activity, 
  Eye, 
  EyeOff, 
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

  // Test de Conexión en Caliente
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setNotification(null);

    try {
      const res = await axios.post('/api/orquestador/configuracion/test-connection', {
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
        message: res.data.message || (res.data.success ? 'Conexión exitosa' : 'Fallo de conexión'),
        version: res.data.version
      });
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.response?.data?.message || err.message || 'Error al conectar con Oracle'
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('oracle-env-updated'));
        }
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', background: '#F6F8FA' }}>
      {/* ── Topbar ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '18px 28px', background: '#ffffff', borderBottom: '1px solid #E6EBF1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', flex: 'none', borderRadius: '9px', background: '#EDF4FB', color: '#1E5C99' }}>
            <Settings size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#14263C' }}>
              Configuración de Entorno (.env)
            </h1>
            <div style={{ marginTop: '2px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#8797A8', textTransform: 'uppercase' }}>
              GESTIÓN DE AMBIENTES Y PARÁMETROS DE CONEXIÓN ORACLE SIGECOF
            </div>
          </div>
        </div>

        {/* Estado activo actual */}
        {currentConfig && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 14px', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11.5px', color: '#3D4F66' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34A853', display: 'inline-block' }}></span>
            <span>Host activo:</span>
            <span style={{ color: '#1E5C99', fontWeight: 700 }}>{currentConfig.host}:{currentConfig.port}</span>
            <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#EDF4FB', color: '#1E5C99', fontWeight: 700 }}>{currentConfig.sid || currentConfig.service_name}</span>
          </div>
        )}
      </header>

      {/* ── Main View Area ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Notificaciones ── */}
        {notification && (
          <div style={{ 
            padding: '14px 18px', 
            background: notification.type === 'success' ? '#E9F6EE' : '#FBEDEA', 
            border: `1px solid ${notification.type === 'success' ? '#C8E6D3' : '#F3C4BA'}`, 
            borderRadius: '10px', 
            color: notification.type === 'success' ? '#2E7D4F' : '#C0492F', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px' 
          }}>
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{notification.message}</span>
          </div>
        )}

        {/* ── Selector de Presets de Ambiente ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          {/* Preset Desarrollo */}
          <div 
            onClick={() => handleSelectPreset('desarrollo')}
            style={{ 
              cursor: 'pointer', 
              padding: '16px 18px', 
              border: '1px solid',
              borderColor: perfilSeleccionado === 'desarrollo' ? '#1E5C99' : '#E6EBF1',
              borderRadius: '10px',
              background: perfilSeleccionado === 'desarrollo' ? '#EDF4FB' : '#ffffff',
              transition: 'all 120ms ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#14263C', fontSize: '14px' }}>
                <Cpu size={18} color="#1E5C99" />
                <span>Desarrollo / Certificación</span>
              </div>
              {perfilSeleccionado === 'desarrollo' && <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: '#1E5C99', color: '#ffffff' }}>Seleccionado</span>}
            </div>
            <p style={{ fontSize: '12.5px', color: '#6B7C90', margin: '0 0 6px' }}>
              Servidor Oracle 19c `cert_rep` para pruebas funcionales y QA.
            </p>
            <div style={{ fontSize: '11.5px', fontFamily: "'IBM Plex Mono', monospace", color: '#8797A8' }}>
              172.21.65.90:1521 (Usuario: ONT_SIR_BOT)
            </div>
          </div>

          {/* Preset Producción */}
          <div 
            onClick={() => handleSelectPreset('produccion')}
            style={{ 
              cursor: 'pointer', 
              padding: '16px 18px', 
              border: '1px solid',
              borderColor: perfilSeleccionado === 'produccion' ? '#1E5C99' : '#E6EBF1',
              borderRadius: '10px',
              background: perfilSeleccionado === 'produccion' ? '#EDF4FB' : '#ffffff',
              transition: 'all 120ms ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#14263C', fontSize: '14px' }}>
                <HardDrive size={18} color="#1E5C99" />
                <span>Producción SIGECOF</span>
              </div>
              {perfilSeleccionado === 'produccion' && <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: '#1E5C99', color: '#ffffff' }}>Seleccionado</span>}
            </div>
            <p style={{ fontSize: '12.5px', color: '#6B7C90', margin: '0 0 6px' }}>
              Servidor central SIGECOF Oracle 12c/19c (Instancia productiva).
            </p>
            <div style={{ fontSize: '11.5px', fontFamily: "'IBM Plex Mono', monospace", color: '#8797A8' }}>
              10.79.6.247:1521 (Usuario: consulta)
            </div>
          </div>
        </div>

        {/* ── Formulario de Configuración ── */}
        <div style={{ background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #EDF1F5', paddingBottom: '14px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 800, color: '#14263C' }}>
              <Server size={18} color="#1E5C99" />
              <span>Parámetros de Conexión Oracle (.env)</span>
            </div>
            <span style={{ fontSize: '12px', color: '#8797A8' }}>
              Guardado en <code style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#1E5C99' }}>api_obtencion/.env</code>
            </span>
          </div>

          <form onSubmit={handleSaveAndReconnect} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px' }}>
              {/* Host */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#6B7C90' }}>HOST / DIRECCIÓN IP</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => { setHost(e.target.value); setPerfilSeleccionado('personalizado'); }}
                  placeholder="Ej. 172.21.65.90 o 10.79.6.247"
                  style={{ height: '38px', padding: '0 11px', fontSize: '13.5px', fontFamily: "'IBM Plex Mono', monospace", color: '#14263C', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '8px', outline: 'none' }}
                  required
                />
              </div>

              {/* Puerto */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#6B7C90' }}>PUERTO TCP</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => { setPort(Number(e.target.value)); setPerfilSeleccionado('personalizado'); }}
                  placeholder="1521"
                  style={{ height: '38px', padding: '0 11px', fontSize: '13.5px', fontFamily: "'IBM Plex Mono', monospace", color: '#14263C', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '8px', outline: 'none' }}
                  required
                />
              </div>

              {/* SID */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#6B7C90' }}>ORACLE SID</label>
                <input
                  type="text"
                  value={sid}
                  onChange={(e) => { setSid(e.target.value); setPerfilSeleccionado('personalizado'); }}
                  placeholder="cert_rep o sige1"
                  style={{ height: '38px', padding: '0 11px', fontSize: '13.5px', fontFamily: "'IBM Plex Mono', monospace", color: '#14263C', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              {/* Service Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#6B7C90' }}>SERVICE NAME (OPCIONAL)</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => { setServiceName(e.target.value); setPerfilSeleccionado('personalizado'); }}
                  placeholder="estatal o sige1"
                  style={{ height: '38px', padding: '0 11px', fontSize: '13.5px', fontFamily: "'IBM Plex Mono', monospace", color: '#14263C', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '8px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              {/* Usuario */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#6B7C90' }}>USUARIO DE BASE DE DATOS</label>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => { setUser(e.target.value); setPerfilSeleccionado('personalizado'); }}
                  placeholder="Ej. ONT_SIR_BOT o consulta"
                  style={{ height: '38px', padding: '0 11px', fontSize: '13.5px', fontFamily: "'IBM Plex Mono', monospace", color: '#14263C', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '8px', outline: 'none' }}
                  required
                />
              </div>

              {/* Contraseña */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#6B7C90' }}>CONTRASEÑA</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPerfilSeleccionado('personalizado'); }}
                    placeholder="Contraseña de BD"
                    style={{ width: '100%', height: '38px', padding: '0 40px 0 11px', fontSize: '13.5px', fontFamily: "'IBM Plex Mono', monospace", color: '#14263C', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '8px', outline: 'none' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '9px', background: 'none', border: 'none', color: '#8797A8', cursor: 'pointer' }}
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
                background: testResult.success ? '#E9F6EE' : '#FBEDEA', 
                border: `1px solid ${testResult.success ? '#C8E6D3' : '#F3C4BA'}`, 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                {testResult.success ? <CheckCircle2 size={18} color="#2E7D4F" style={{ marginTop: 2, flexShrink: 0 }} /> : <AlertCircle size={18} color="#C0492F" style={{ marginTop: 2, flexShrink: 0 }} />}
                <div>
                  <div style={{ fontWeight: 700, color: testResult.success ? '#2E7D4F' : '#C0492F', fontSize: '13px' }}>
                    {testResult.message}
                  </div>
                  {testResult.version && (
                    <div style={{ fontSize: '11.5px', color: '#6B7C90', marginTop: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>
                      Versión detectada: {testResult.version}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Botones de Acción ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', paddingTop: '14px', borderTop: '1px solid #EDF1F5' }}>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || saving || !host || !user || !password}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  height: '38px',
                  padding: '0 16px',
                  border: '1px solid #E1E7EE',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: '#1E5C99',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {testing ? <Loader2 size={15} className="spinner" /> : <Activity size={15} color="#1E5C99" />}
                {testing ? 'Probando conexión…' : 'Probar conexión (Ping)'}
              </button>

              <button
                type="submit"
                disabled={saving || testing || !host || !user || !password}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  height: '38px',
                  padding: '0 18px',
                  border: 0,
                  borderRadius: '8px',
                  background: '#1E5C99',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {saving ? <Loader2 size={15} className="spinner" /> : <Save size={15} />}
                {saving ? 'Aplicando cambios…' : 'Guardar y reconectar (.env)'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
