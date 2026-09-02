"use client";

import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  ShieldCheck, 
  Key, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  ExternalLink, 
  Terminal, 
  FileText, 
  Clock, 
  Zap,
  Sparkles,
  HelpCircle,
  Database
} from 'lucide-react';

interface BotConfigData {
  telegram: {
    connected: boolean;
    username: string;
    firstName: string;
    allowedUsers: number[];
    tokenConfigured: boolean;
    maskedToken: string;
    rawAllowedUsers: string;
  };
  ia: {
    activeProvider: 'deepseek' | 'anthropic' | 'google';
    providers: {
      deepseek: {
        hasKey: boolean;
        maskedKey: string;
        baseUrl: string;
        model: string;
      };
      anthropic: {
        hasKey: boolean;
        maskedKey: string;
        baseUrl: string;
        model: string;
      };
      google: {
        hasKey: boolean;
        maskedKey: string;
        baseUrl: string;
        model: string;
      };
    };
  };
}

export const BotConfigView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BotConfigData | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'deepseek' | 'anthropic' | 'google'>('deepseek');
  const [feedback, setFeedback] = useState<{ tipo: 'exito' | 'error' | 'info'; texto: string } | null>(null);

  // Form states
  const [telegramToken, setTelegramToken] = useState('');
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [allowedUsers, setAllowedUsers] = useState('');
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<any>(null);

  // IA form states
  const [activeProvider, setActiveProvider] = useState<'deepseek' | 'anthropic' | 'google'>('deepseek');
  const [providerForms, setProviderForms] = useState({
    deepseek: { apiKey: '', baseUrl: '', model: '' },
    anthropic: { apiKey: '', baseUrl: '', model: '' },
    google: { apiKey: '', baseUrl: '', model: '' }
  });
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({
    deepseek: false,
    anthropic: false,
    google: false
  });

  // Playground states
  const [testPrompt, setTestPrompt] = useState('Por favor concilia el banco 105 desde 2024-04-15 hasta 2024-04-18');
  const [testingIa, setTestingIa] = useState(false);
  const [iaTestResult, setIaTestResult] = useState<any>(null);

  // Active tab in documentation
  const [docTab, setDocTab] = useState<'comandos' | 'flujo' | 'ejemplos'>('comandos');

  const cargarConfig = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/orquestador/bot-config');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BotConfigData = await res.json();
      setConfig(data);
      
      setTelegramToken(data.telegram.maskedToken || '');
      setAllowedUsers(data.telegram.rawAllowedUsers || '');
      setActiveProvider(data.ia.activeProvider || 'deepseek');
      setSelectedProvider(data.ia.activeProvider || 'deepseek');

      setProviderForms({
        deepseek: {
          apiKey: data.ia.providers.deepseek.maskedKey || '',
          baseUrl: data.ia.providers.deepseek.baseUrl || 'https://api.deepseek.com/v1',
          model: data.ia.providers.deepseek.model || 'deepseek-chat'
        },
        anthropic: {
          apiKey: data.ia.providers.anthropic.maskedKey || '',
          baseUrl: data.ia.providers.anthropic.baseUrl || 'https://api.anthropic.com/v1',
          model: data.ia.providers.anthropic.model || 'claude-3-5-haiku-latest'
        },
        google: {
          apiKey: data.ia.providers.google.maskedKey || '',
          baseUrl: data.ia.providers.google.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
          model: data.ia.providers.google.model || 'gemini-1.5-flash'
        }
      });
    } catch (e: any) {
      setFeedback({ tipo: 'error', texto: `Error cargando configuración: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarConfig();
  }, []);

  const handleProbarTelegram = async () => {
    setTestingTelegram(true);
    setTelegramTestResult(null);
    try {
      const res = await fetch('/api/orquestador/bot-config/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: telegramToken })
      });
      const data = await res.json();
      setTelegramTestResult(data);
      if (data.success) {
        setFeedback({ tipo: 'exito', texto: `Bot verificado exitosamente: @${data.bot.username}` });
      } else {
        setFeedback({ tipo: 'error', texto: `Fallo de verificación de Telegram: ${data.error}` });
      }
    } catch (err: any) {
      setFeedback({ tipo: 'error', texto: `Error probando Telegram: ${err.message}` });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleProbarIa = async () => {
    setTestingIa(true);
    setIaTestResult(null);
    try {
      const formActual = providerForms[selectedProvider];
      const res = await fetch('/api/orquestador/bot-config/test-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: formActual.apiKey,
          baseUrl: formActual.baseUrl,
          model: formActual.model,
          prompt: testPrompt
        })
      });
      const data = await res.json();
      setIaTestResult(data);
      if (data.success) {
        setFeedback({ tipo: 'exito', texto: `Prueba de IA completada en ${data.latencyMs} ms.` });
      } else {
        setFeedback({ tipo: 'error', texto: `Error al probar IA: ${data.error}` });
      }
    } catch (err: any) {
      setFeedback({ tipo: 'error', texto: `Fallo probando IA: ${err.message}` });
    } finally {
      setTestingIa(false);
    }
  };

  const handleGuardarTodo = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        telegramToken,
        telegramAllowedUsers: allowedUsers,
        iaActiveProvider: activeProvider,
        providers: providerForms
      };

      const res = await fetch('/api/orquestador/bot-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar');

      setFeedback({ tipo: 'exito', texto: 'Configuración de Bot e IA guardada y aplicada con éxito.' });
      await cargarConfig();
    } catch (err: any) {
      setFeedback({ tipo: 'error', texto: `Error al guardar: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Principal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '7px', borderRadius: '8px' }}>
              <Bot style={{ width: '22px', height: '22px', color: '#059669' }} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0, fontFamily: 'var(--font-manrope)' }}>
              Orquestador de Bot & Inteligencia Artificial
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', color: '#64748B', fontSize: '13px' }}>
            Control centralizado del Bot de Telegram, selección multi-proveedor de IA (DeepSeek, Anthropic, Google) y documentación del motor bajo demanda.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={cargarConfig}
            disabled={loading || saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <RefreshCw style={{ width: '15px', height: '15px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Recargar
          </button>

          <button
            onClick={handleGuardarTodo}
            disabled={saving || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              background: '#2E7D4F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(46, 125, 79, 0.2)'
            }}
          >
            <Save style={{ width: '15px', height: '15px' }} />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Banner de Feedback */}
      {feedback && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: feedback.tipo === 'exito' ? '#ECFDF5' : feedback.tipo === 'error' ? '#FEF2F2' : '#EFF6FF',
          border: `1px solid ${feedback.tipo === 'exito' ? '#A7F3D0' : feedback.tipo === 'error' ? '#FECACA' : '#BFDBFE'}`,
          color: feedback.tipo === 'exito' ? '#065F46' : feedback.tipo === 'error' ? '#991B1B' : '#1E40AF'
        }}>
          {feedback.tipo === 'exito' && <CheckCircle2 style={{ width: '17px', height: '17px', color: '#059669' }} />}
          {feedback.tipo === 'error' && <AlertTriangle style={{ width: '17px', height: '17px', color: '#DC2626' }} />}
          {feedback.tipo === 'info' && <HelpCircle style={{ width: '17px', height: '17px', color: '#2563EB' }} />}
          <span>{feedback.texto}</span>
        </div>
      )}

      {/* Grid de 2 Columnas Superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* TARJETA 1: BOT TELEGRAM */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send style={{ width: '18px', height: '18px', color: '#0284C7' }} />
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                Bot de Telegram (Canal de Comunicación)
              </h2>
            </div>

            {config?.telegram.connected ? (
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                background: '#ECFDF5',
                color: '#059669',
                padding: '3px 9px',
                borderRadius: '12px',
                border: '1px solid #A7F3D0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }}></span>
                Activo: @{config.telegram.username}
              </span>
            ) : (
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                background: '#FFF1F2',
                color: '#E11D48',
                padding: '3px 9px',
                borderRadius: '12px',
                border: '1px solid #FECDD3'
              }}>
                Sin Conexión
              </span>
            )}
          </div>

          <p style={{ fontSize: '12px', color: '#64748B', marginTop: 0, marginBottom: '16px' }}>
            El bot escucha en tiempo real tus comandos de conciliación, ejecuta la no-concurrencia día a día y te envía los 3 reportes estructurados.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Telegram Bot Token (BotFather)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showTelegramToken ? 'text' : 'password'}
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="Ej: 8981791125:AAEoDUv..."
                  style={{
                    width: '100%',
                    padding: '9px 40px 9px 12px',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono, monospace)',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowTelegramToken(!showTelegramToken)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748B'
                  }}
                >
                  {showTelegramToken ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Usuarios Autorizados (IDs de Telegram separados por coma)
              </label>
              <input
                type="text"
                value={allowedUsers}
                onChange={(e) => setAllowedUsers(e.target.value)}
                placeholder="Ej: 5827228110, 123456789"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono, monospace)',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                Si se deja vacío, se aceptan órdenes de cualquier usuario. Tu ID detectado: <code>5827228110</code>.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={handleProbarTelegram}
                disabled={testingTelegram}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#1E293B',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw style={{ width: '14px', height: '14px', animation: testingTelegram ? 'spin 1s linear infinite' : 'none' }} />
                {testingTelegram ? 'Verificando con Telegram...' : 'Probar Token Telegram'}
              </button>

              {config?.telegram.username && (
                <a
                  href={`https://t.me/${config.telegram.username}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12px',
                    color: '#0284C7',
                    fontWeight: '600',
                    textDecoration: 'none'
                  }}
                >
                  Abrir Bot en Telegram
                  <ExternalLink style={{ width: '13px', height: '13px' }} />
                </a>
              )}
            </div>

            {telegramTestResult && (
              <div style={{
                padding: '10px',
                borderRadius: '6px',
                fontSize: '12px',
                background: telegramTestResult.success ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${telegramTestResult.success ? '#BBF7D0' : '#FECACA'}`,
                color: telegramTestResult.success ? '#166534' : '#991B1B'
              }}>
                {telegramTestResult.success ? (
                  <div>
                    ✅ <strong>Bot Válido:</strong> {telegramTestResult.bot.firstName} (<code>@{telegramTestResult.bot.username}</code>) - ID: {telegramTestResult.bot.id}
                  </div>
                ) : (
                  <div>❌ {telegramTestResult.error}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* TARJETA 2: PROVEEDORES DE IA */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu style={{ width: '18px', height: '18px', color: '#7C3AED' }} />
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                Proveedores de Inteligencia Artificial (NLU)
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
              <span>Activo en Motor:</span>
              <strong style={{
                color: activeProvider === 'deepseek' ? '#0284C7' : activeProvider === 'anthropic' ? '#D97706' : '#059669',
                textTransform: 'uppercase'
              }}>
                {activeProvider}
              </strong>
            </div>
          </div>

          {/* Selector de Pestañas de Proveedores */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', marginBottom: '16px' }}>
            {(['deepseek', 'anthropic', 'google'] as const).map((prov) => {
              const isSelected = selectedProvider === prov;
              const isActive = activeProvider === prov;
              const provLabel = prov === 'deepseek' ? 'DeepSeek API' : prov === 'anthropic' ? 'Anthropic (Claude)' : 'Google (Gemini)';
              return (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setSelectedProvider(prov)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid #7C3AED' : '1px solid #E2E8F0',
                    background: isSelected ? '#F5F3FF' : '#FFFFFF',
                    color: isSelected ? '#6D28D9' : '#475569',
                    fontSize: '12px',
                    fontWeight: isSelected ? '700' : '500',
                    cursor: 'pointer'
                  }}
                >
                  {provLabel}
                  {isActive && (
                    <span style={{ fontSize: '10px', background: '#2E7D4F', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>
                      ACTIVO
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Formulario del Proveedor Seleccionado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#475569' }}>
                Configuración para <strong>{selectedProvider.toUpperCase()}</strong>:
              </span>

              {activeProvider !== selectedProvider ? (
                <button
                  type="button"
                  onClick={() => setActiveProvider(selectedProvider)}
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#7C3AED',
                    background: '#F5F3FF',
                    border: '1px solid #DDD6FE',
                    padding: '4px 8px',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Establecer como Proveedor Activo
                </button>
              ) : (
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#2E7D4F' }}>
                  ✓ Proveedor Activo para el Bot
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                API Endpoint Base URL
              </label>
              <input
                type="text"
                value={providerForms[selectedProvider].baseUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setProviderForms(prev => ({ ...prev, [selectedProvider]: { ...prev[selectedProvider], baseUrl: val } }));
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono, monospace)',
                  border: '1px solid #CBD5E1',
                  borderRadius: '5px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Modelo
                </label>
                <input
                  type="text"
                  value={providerForms[selectedProvider].model}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProviderForms(prev => ({ ...prev, [selectedProvider]: { ...prev[selectedProvider], model: val } }));
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono, monospace)',
                    border: '1px solid #CBD5E1',
                    borderRadius: '5px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  API Key / Token
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showApiKey[selectedProvider] ? 'text' : 'password'}
                    value={providerForms[selectedProvider].apiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProviderForms(prev => ({ ...prev, [selectedProvider]: { ...prev[selectedProvider], apiKey: val } }));
                    }}
                    placeholder="sk-..."
                    style={{
                      width: '100%',
                      padding: '8px 34px 8px 10px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono, monospace)',
                      border: '1px solid #CBD5E1',
                      borderRadius: '5px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(prev => ({ ...prev, [selectedProvider]: !prev[selectedProvider] }))}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748B'
                    }}
                  >
                    {showApiKey[selectedProvider] ? <EyeOff style={{ width: '14px', height: '14px' }} /> : <Eye style={{ width: '14px', height: '14px' }} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN INTERACTIVA: BANCO DE PRUEBAS DE IA & CONSOLA */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles style={{ width: '18px', height: '18px', color: '#D97706' }} />
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
              Banco de Pruebas en Vivo (NLU Playground)
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            Evaluando proveedor: <strong style={{ color: '#0F172A' }}>{selectedProvider.toUpperCase()}</strong> ({providerForms[selectedProvider].model})
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <input
            type="text"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="Escribe una orden en lenguaje natural (ej. conciliar banco 105 del 15 al 18 de abril)..."
            style={{
              flex: 1,
              padding: '9px 12px',
              fontSize: '13px',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={handleProbarIa}
            disabled={testingIa || !providerForms[selectedProvider].apiKey}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: testingIa ? 'not-allowed' : 'pointer'
            }}
          >
            <Zap style={{ width: '14px', height: '14px', color: '#F59E0B' }} />
            {testingIa ? 'Ejecutando NLU...' : 'Probar Extracción'}
          </button>
        </div>

        {iaTestResult && (
          <div style={{
            background: '#0F172A',
            color: '#E2E8F0',
            borderRadius: '6px',
            padding: '14px 16px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '12px',
            border: '1px solid #1E293B'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal style={{ width: '14px', height: '14px', color: '#10B981' }} />
                <span style={{ color: '#10B981', fontWeight: '700' }}>
                  {iaTestResult.success ? 'PARSEO EXITOSO' : 'FALLO EN LLAMADA'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94A3B8' }}>
                <span>Proveedor: <strong>{iaTestResult.provider}</strong></span>
                <span>Modelo: <strong>{iaTestResult.model}</strong></span>
                <span style={{ color: '#F59E0B' }}>⏱️ {iaTestResult.latencyMs} ms</span>
              </div>
            </div>

            {iaTestResult.success ? (
              <div>
                <div style={{ color: '#38BDF8', marginBottom: '6px' }}>// Parámetros JSON extraídos por el modelo:</div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(iaTestResult.resultado, null, 2)}
                </pre>
              </div>
            ) : (
              <div style={{ color: '#F87171' }}>
                Error: {iaTestResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECCIÓN DOCUMENTACIÓN OPERATIVA */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText style={{ width: '18px', height: '18px', color: '#2563EB' }} />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
              Documentación y Guía Operativa del Bot
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'comandos', label: 'Comandos Telegram' },
              { id: 'flujo', label: 'Ciclo de 3 Mensajes' },
              { id: 'ejemplos', label: 'Reglas de Negocio' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setDocTab(t.id as any)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '5px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: docTab === t.id ? '1px solid #CBD5E1' : '1px solid transparent',
                  background: docTab === t.id ? '#F1F5F9' : 'transparent',
                  color: docTab === t.id ? '#0F172A' : '#64748B',
                  cursor: 'pointer'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {docTab === 'comandos' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', background: '#F8FAFC' }}>
              <div style={{ color: '#0284C7', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>
                /conciliar
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>
                Inicia conciliación por rango de fechas consecutivo.
              </div>
              <code style={{ fontSize: '11px', background: '#FFFFFF', padding: '4px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', display: 'block' }}>
                /conciliar 105 2024-04-15 2024-04-18
              </code>
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', background: '#F8FAFC' }}>
              <div style={{ color: '#059669', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>
                /conciliar_dia
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>
                Procesa un único día de recaudación de forma atómica.
              </div>
              <code style={{ fontSize: '11px', background: '#FFFFFF', padding: '4px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', display: 'block' }}>
                /conciliar_dia 105 2024-04-15
              </code>
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', background: '#F8FAFC' }}>
              <div style={{ color: '#D97706', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>
                /estado
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>
                Consulta si hay un lote en ejecución en la BD.
              </div>
              <code style={{ fontSize: '11px', background: '#FFFFFF', padding: '4px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', display: 'block' }}>
                /estado
              </code>
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', background: '#F8FAFC' }}>
              <div style={{ color: '#DC2626', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>
                /detener
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>
                Pausa segura al culminar la planilla en curso.
              </div>
              <code style={{ fontSize: '11px', background: '#FFFFFF', padding: '4px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', display: 'block' }}>
                /detener
              </code>
            </div>
          </div>
        )}

        {docTab === 'flujo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#334155' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', background: '#F8FAFC', borderRadius: '6px' }}>
              <span style={{ background: '#0284C7', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>Msg 1</span>
              <div>
                <strong>Búsqueda de Expediente y Balance Inicial:</strong> Cuenta planillas asignadas a workflow + huérfanas, total pendientes por depurar y monto total en Bolívares del día.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', background: '#F8FAFC', borderRadius: '6px' }}>
              <span style={{ background: '#D97706', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>Msg 2</span>
              <div>
                <strong>Mapeo de Formas con Exclusión de Fallos:</strong> Resuelve partidas en el microservicio de catálogo (:3000). Si una forma no tiene regla asignada, emite alerta de exclusión y continúa conciliando las formas válidas.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', background: '#F8FAFC', borderRadius: '6px' }}>
              <span style={{ background: '#059669', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>Msg 3</span>
              <div>
                <strong>Finalización y Barrido Consolidado:</strong> Reporta exactamente cuántas formas se depuraron, cuántas se mapearon, cuántas se conciliaron con éxito en Oracle y cuáles quedaron pendientes/excluidas.
              </div>
            </div>
          </div>
        )}

        {docTab === 'ejemplos' && (
          <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              🔒 <strong>Garantía de No-Concurrencia (Mutex de BD):</strong> El motor procesa rigurosamente un día a la vez. El día 2 no iniciará hasta que el día 1 haya culminado su conciliación, confirmado transacciones en Oracle y emitido su reporte.
            </p>
            <p style={{ margin: 0 }}>
              🧠 <strong>Procesamiento NLU con IA:</strong> Puedes escribirle al bot en lenguaje coloquial (ej. <em>"por favor concilia banco 105 del 15 al 18 de abril"</em>). El modelo activo de IA extraerá el banco y fechas en formato ISO y ejecutará la orden de forma transparente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
