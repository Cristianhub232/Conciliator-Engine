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
  Database,
  Lock,
  Unlock,
  Power,
  Sliders,
  MessageSquare
} from 'lucide-react';

const ICHI_HARDCODED_KEY = '#O0bmszru4';

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
  // Pestaña Principal: Bot Telegram vs Agente Flotante ICHI
  const [mainTab, setMainTab] = useState<'telegram_bot' | 'ichi_agent'>('telegram_bot');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BotConfigData | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'deepseek' | 'anthropic' | 'google'>('deepseek');
  const [feedback, setFeedback] = useState<{ tipo: 'exito' | 'error' | 'info'; texto: string } | null>(null);

  // Form states Bot Telegram
  const [telegramToken, setTelegramToken] = useState('');
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [allowedUsers, setAllowedUsers] = useState('');
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<any>(null);

  // IA form states Bot Telegram
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

  // Playground states Telegram Bot
  const [testPrompt, setTestPrompt] = useState('Por favor concilia el banco 105 desde 2024-04-15 hasta 2024-04-18');
  const [testingIa, setTestingIa] = useState(false);
  const [iaTestResult, setIaTestResult] = useState<any>(null);
  const [docTab, setDocTab] = useState<'comandos' | 'flujo' | 'ejemplos'>('comandos');

  // ==========================================
  // ESTADOS DEL AGENTE FLOTANTE ICHI
  // ==========================================
  const [isIchiActive, setIsIchiActive] = useState<boolean>(true);
  const [securityKeyInput, setSecurityKeyInput] = useState('');
  const [showSecurityKey, setShowSecurityKey] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Configuración del modelo LLM para ICHI
  const [ichiProvider, setIchiProvider] = useState<'deepseek' | 'anthropic' | 'google' | 'custom'>('deepseek');
  const [ichiModel, setIchiModel] = useState('deepseek-chat');
  const [ichiBaseUrl, setIchiBaseUrl] = useState('https://api.deepseek.com/v1');
  const [ichiApiKey, setIchiApiKey] = useState('');
  const [showIchiApiKey, setShowIchiApiKey] = useState(false);
  const [ichiGreeting, setIchiGreeting] = useState('¡Hola! Soy ICHI, tu asistente de IA para el orquestador ONT. Tengo el contexto de esta pantalla cargado. ¿Qué necesitas consultar?');
  const [ichiTemperature, setIchiTemperature] = useState('0.3');
  const [ichiSystemPrompt, setIchiSystemPrompt] = useState(
    'Eres ICHI, el asistente de inteligencia artificial oficial de la Oficina Nacional del Tesoro (ONT) y SENIAT. Tu especialidad es la conciliación bancaria masiva, análisis de lotes presupuestarios en Oracle SIGE1, depuración de formas tributarias (Forma 99044) y control de expedientes de recaudación.'
  );

  // Herramientas y Políticas de Consulta para ICHI
  const [ichiTools, setIchiTools] = useState<string[]>([
    'consultar_resumen_banco',
    'consultar_planillas_pendientes',
    'consultar_estado_motor',
    'consultar_expediente',
    'consultar_formas_excluidas'
  ]);
  const [ichiFormatTabular, setIchiFormatTabular] = useState<boolean>(true);
  const [ichiFormatCurrency, setIchiFormatCurrency] = useState<boolean>(true);
  const [ichiFormatExecutive, setIchiFormatExecutive] = useState<boolean>(false);
  const [ichiMaxRecords, setIchiMaxRecords] = useState<number>(10);

  // Playground para ICHI
  const [ichiTestQuery, setIchiTestQuery] = useState('¿Cuántas planillas quedan pendientes en el banco 105?');
  const [testingIchi, setTestingIchi] = useState(false);
  const [ichiTestResponse, setIchiTestResponse] = useState<any>(null);

  const cargarConfig = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/orquestador/bot-config');
      if (!res.ok) throw new Error('Error al conectar con el backend');
      const data: BotConfigData = await res.json();
      setConfig(data);

      if (data.ia) {
        setActiveProvider(data.ia.activeProvider);
        setSelectedProvider(data.ia.activeProvider);
        setProviderForms({
          deepseek: {
            apiKey: '',
            baseUrl: data.ia.providers.deepseek.baseUrl || 'https://api.deepseek.com/v1',
            model: data.ia.providers.deepseek.model || 'deepseek-chat'
          },
          anthropic: {
            apiKey: '',
            baseUrl: data.ia.providers.anthropic.baseUrl || 'https://api.anthropic.com/v1',
            model: data.ia.providers.anthropic.model || 'claude-3-5-sonnet-20241022'
          },
          google: {
            apiKey: '',
            baseUrl: data.ia.providers.google.baseUrl || 'https://generativelanguage.googleapis.com',
            model: data.ia.providers.google.model || 'gemini-1.5-pro'
          }
        });
      }

      if (data.telegram) {
        setAllowedUsers(data.telegram.rawAllowedUsers || '');
      }
    } catch (err: any) {
      console.warn('Error cargando bot config:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar configuración local de ICHI
  useEffect(() => {
    cargarConfig();

    if (typeof window !== 'undefined') {
      try {
        const savedIchiEnabled = localStorage.getItem('ichi_enabled');
        setIsIchiActive(savedIchiEnabled !== 'false');

        const savedIchiModel = localStorage.getItem('ichi_model_name');
        if (savedIchiModel) setIchiModel(savedIchiModel);

        const savedIchiProvider = localStorage.getItem('ichi_llm_provider');
        if (savedIchiProvider) setIchiProvider(savedIchiProvider as any);

        const savedIchiUrl = localStorage.getItem('ichi_api_url');
        if (savedIchiUrl) setIchiBaseUrl(savedIchiUrl);

        const savedIchiGreeting = localStorage.getItem('ichi_greeting');
        if (savedIchiGreeting) setIchiGreeting(savedIchiGreeting);

        const savedIchiTemp = localStorage.getItem('ichi_temperature');
        if (savedIchiTemp) setIchiTemperature(savedIchiTemp);

        const savedIchiPrompt = localStorage.getItem('ichi_system_prompt');
        if (savedIchiPrompt) setIchiSystemPrompt(savedIchiPrompt);

        const savedTools = localStorage.getItem('ichi_tools');
        if (savedTools) setIchiTools(JSON.parse(savedTools));

        const savedTabular = localStorage.getItem('ichi_format_tabular');
        if (savedTabular !== null) setIchiFormatTabular(savedTabular !== 'false');

        const savedCurrency = localStorage.getItem('ichi_format_currency');
        if (savedCurrency !== null) setIchiFormatCurrency(savedCurrency !== 'false');

        const savedExec = localStorage.getItem('ichi_format_executive');
        if (savedExec !== null) setIchiFormatExecutive(savedExec === 'true');

        const savedMax = localStorage.getItem('ichi_max_records');
        if (savedMax) setIchiMaxRecords(Number(savedMax) || 10);
      } catch (e) {
        console.warn('Error cargando settings locales de Ichi:', e);
      }
    }
  }, []);

  // Manejar activación / inactivación con clave hardcodeada #O0bmszru4
  const handleToggleIchiWithKey = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityFeedback(null);

    const enteredKey = securityKeyInput.trim();

    if (enteredKey !== ICHI_HARDCODED_KEY) {
      setSecurityFeedback({
        tipo: 'error',
        texto: 'Error de Autorización: La clave ingresada no es válida. Debe proporcionar la clave de seguridad autorizada para activar o inactivar al agente ICHI.'
      });
      return;
    }

    const nuevoEstado = !isIchiActive;
    setIsIchiActive(nuevoEstado);

    try {
      localStorage.setItem('ichi_enabled', nuevoEstado ? 'true' : 'false');
      window.dispatchEvent(new Event('ichi_status_changed'));
    } catch (e) {}

    setSecurityKeyInput('');
    setSecurityFeedback({
      tipo: 'exito',
      texto: `✓ Estado de ICHI modificado con éxito. El agente ha sido ${nuevoEstado ? 'ACTIVADO y será visible en la plataforma' : 'INACTIVADO y ha sido ocultado de todos los módulos'}.`
    });
  };

  // Guardar configuración del modelo de ICHI
  const handleGuardarConfigIchi = () => {
    try {
      localStorage.setItem('ichi_enabled', isIchiActive ? 'true' : 'false');
      localStorage.setItem('ichi_model_name', ichiModel);
      localStorage.setItem('ichi_llm_provider', ichiProvider);
      localStorage.setItem('ichi_api_url', ichiBaseUrl);
      localStorage.setItem('ichi_greeting', ichiGreeting);
      localStorage.setItem('ichi_temperature', ichiTemperature);
      localStorage.setItem('ichi_system_prompt', ichiSystemPrompt);

      // Guardar herramientas y opciones de formato
      localStorage.setItem('ichi_tools', JSON.stringify(ichiTools));
      localStorage.setItem('ichi_format_tabular', ichiFormatTabular ? 'true' : 'false');
      localStorage.setItem('ichi_format_currency', ichiFormatCurrency ? 'true' : 'false');
      localStorage.setItem('ichi_format_executive', ichiFormatExecutive ? 'true' : 'false');
      localStorage.setItem('ichi_max_records', String(ichiMaxRecords));

      window.dispatchEvent(new Event('ichi_status_changed'));

      setFeedback({
        tipo: 'exito',
        texto: `Configuración y Habilidades de ICHI guardadas exitosamente. Modelo: ${ichiModel} (${ichiProvider.toUpperCase()}) con ${ichiTools.length} consultas predefinidas habilitadas.`
      });
    } catch (e: any) {
      setFeedback({
        tipo: 'error',
        texto: `Error guardando configuración de ICHI: ${e.message}`
      });
    }
  };

  // Toggle para habilitar/deshabilitar herramientas individuales
  const toggleIchiTool = (toolId: string) => {
    setIchiTools(prev => 
      prev.includes(toolId) ? prev.filter(t => t !== toolId) : [...prev, toolId]
    );
  };

  // Prueba en vivo de ICHI Playground conectado al Gateway de herramientas
  const handleTestIchiPlayground = async () => {
    if (!ichiTestQuery.trim()) return;
    setTestingIchi(true);
    setIchiTestResponse(null);

    try {
      const res = await fetch('/api/orquestador/ichi/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregunta: ichiTestQuery,
          context: 'Banco de Pruebas · Orquestador de Bot & IA',
          enabledTools: ichiTools,
          formatOptions: {
            tabular: ichiFormatTabular,
            currency: ichiFormatCurrency,
            executive: ichiFormatExecutive,
            maxRecords: ichiMaxRecords
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setIchiTestResponse({
          text: data.text,
          note: data.note || 'Gateway ONT · Consulta Predefinida',
          toolUsed: data.toolUsed,
          timestamp: new Date().toLocaleTimeString()
        });
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      // Fallback si la API no está disponible
      setIchiTestResponse({
        text: `Error conectando con el Gateway de ICHI: ${err.message}. Verifique que el servicio backend se encuentre operativo.`,
        note: 'Fallo de conexión o tiempo de espera agotado',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setTestingIchi(false);
    }
  };

  // Guardar configuración general de Bot Telegram
  const handleGuardarTodo = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        telegramToken: telegramToken || undefined,
        allowedUsers: allowedUsers || undefined,
        activeProvider: activeProvider,
        providers: {
          deepseek: {
            apiKey: providerForms.deepseek.apiKey || undefined,
            baseUrl: providerForms.deepseek.baseUrl,
            model: providerForms.deepseek.model
          },
          anthropic: {
            apiKey: providerForms.anthropic.apiKey || undefined,
            baseUrl: providerForms.anthropic.baseUrl,
            model: providerForms.anthropic.model
          },
          google: {
            apiKey: providerForms.google.apiKey || undefined,
            baseUrl: providerForms.google.baseUrl,
            model: providerForms.google.model
          }
        }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
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
            Control centralizado del Bot de Telegram, selección multi-proveedor de IA y configuración del Agente Flotante ICHI.
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
            onClick={mainTab === 'telegram_bot' ? handleGuardarTodo : handleGuardarConfigIchi}
            disabled={saving || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              background: mainTab === 'telegram_bot' ? '#2E7D4F' : '#0A1733',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(10, 23, 51, 0.2)'
            }}
          >
            <Save style={{ width: '15px', height: '15px' }} />
            {saving ? 'Guardando...' : mainTab === 'telegram_bot' ? 'Guardar Cambios' : 'Guardar Configuración ICHI'}
          </button>
        </div>
      </div>

      {/* Selector de Pestañas Principales */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', marginBottom: '24px' }}>
        <button
          onClick={() => setMainTab('telegram_bot')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 20px',
            background: mainTab === 'telegram_bot' ? '#FFFFFF' : 'transparent',
            border: 'none',
            borderBottom: mainTab === 'telegram_bot' ? '3px solid #059669' : '3px solid transparent',
            color: mainTab === 'telegram_bot' ? '#0F172A' : '#64748B',
            fontWeight: mainTab === 'telegram_bot' ? '700' : '500',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Bot style={{ width: '18px', height: '18px', color: mainTab === 'telegram_bot' ? '#059669' : '#94A3B8' }} />
          Bot de Telegram (Canal & Motor NLU)
        </button>

        <button
          onClick={() => setMainTab('ichi_agent')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '11px 20px',
            background: mainTab === 'ichi_agent' ? '#FFFFFF' : 'transparent',
            border: 'none',
            borderBottom: mainTab === 'ichi_agent' ? '3px solid #0284C7' : '3px solid transparent',
            color: mainTab === 'ichi_agent' ? '#0F172A' : '#64748B',
            fontWeight: mainTab === 'ichi_agent' ? '700' : '500',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Sparkles style={{ width: '18px', height: '18px', color: mainTab === 'ichi_agent' ? '#0284C7' : '#94A3B8' }} />
          Agente Flotante ICHI (Asistente IA)
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            background: isIchiActive ? '#ECFDF5' : '#FEF2F2',
            color: isIchiActive ? '#059669' : '#DC2626',
            padding: '2px 8px',
            borderRadius: '10px',
            border: `1px solid ${isIchiActive ? '#A7F3D0' : '#FECACA'}`,
            letterSpacing: '0.05em'
          }}>
            {isIchiActive ? 'ACTIVO' : 'INACTIVO'}
          </span>
        </button>
      </div>

      {/* Banner de Feedback Global */}
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

      {/* ========================================================================================= */}
      {/* PESTAÑA 2: AGENTE FLOTANTE ICHI (CONFIGURACIÓN DE MODELO LLM & SEGURIDAD)                */}
      {/* ========================================================================================= */}
      {mainTab === 'ichi_agent' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* BANNER INSTITUCIONAL DE ICHI */}
          <div style={{
            background: 'linear-gradient(135deg, #0A1733 0%, #143063 60%, #0C1E44 100%)',
            borderRadius: '12px',
            padding: '24px 28px',
            color: '#FFFFFF',
            boxShadow: '0 10px 25px -5px rgba(10, 23, 51, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid #1E3A8A'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Avatar ICHI SVG */}
              <div style={{ width: '64px', height: '64px', flexShrink: 0 }}>
                <svg viewBox="0 0 88 88" style={{ width: '100%', height: '100%' }}>
                  <circle cx="44" cy="44" r="39" fill="#0A1733"></circle>
                  <g className="ring">
                    <path d="M44 5 A39 39 0 1 1 16.4 16.4" fill="none" stroke="#7FC8EE" strokeWidth="3.5" strokeLinecap="round"></path>
                    <circle cx="44" cy="5" r="4.5" fill="#ffffff"></circle>
                  </g>
                  <g transform="translate(27.5 28) scale(0.665)" fill="#7FC8EE">
                    <rect x="0" y="0" width="7" height="18"></rect>
                    <rect x="0" y="30" width="7" height="18"></rect>
                    <polygon points="39,0 47,0 18,23.5 50,48 40,48 15,29 3,28 7,23.5 3,20 15,19"></polygon>
                    <polygon points="20,0 29,0 8,19 7,10"></polygon>
                    <polygon points="20,48 29,48 8,29 7,38"></polygon>
                  </g>
                </svg>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '0.12em', color: '#FFFFFF', fontFamily: 'var(--font-chakra)' }}>
                    AGENTE CONVERSACIONAL <span style={{ color: '#7FC8EE' }}>ICHI</span>
                  </h2>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: 'rgba(127, 200, 238, 0.18)',
                    color: '#7FC8EE',
                    padding: '3px 9px',
                    borderRadius: '999px',
                    border: '1px solid rgba(127, 200, 238, 0.4)',
                    letterSpacing: '0.05em'
                  }}>
                    Asistente Oficial ONT · Identidad Única
                  </span>
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#CBD5E1', maxWidth: '850px', lineHeight: '1.5' }}>
                  <strong>El agente de la plataforma siempre será ICHI</strong> (no habrá otro agente). ICHI asiste a los analistas y operadores con respuestas inmediatas sobre reglas de formas tributarias (ISLR Forma 99044), estado de lotes presupuestarios en Oracle SIGECOF y protocolos de depuración.
                </p>
              </div>
            </div>

            {/* Badge de Estado Activo/Inactivo */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                Disponibilidad en UI
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: isIchiActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${isIchiActive ? '#10B981' : '#EF4444'}`,
                color: isIchiActive ? '#34D399' : '#FCA5A5',
                fontWeight: '700',
                fontSize: '13px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isIchiActive ? '#10B981' : '#EF4444' }}></span>
                {isIchiActive ? 'ACTIVO (Post-Login)' : 'INACTIVO (Oculto)'}
              </div>
            </div>
          </div>

          {/* GRID DE CONTROL DE SEGURIDAD & MODELO LLM */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px' }}>
            
            {/* TARJETA 1: SEGURIDAD Y ACTIVACIÓN/INACTIVACIÓN CON CLAVE */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ background: '#EFF6FF', padding: '8px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                  <ShieldCheck style={{ width: '20px', height: '20px', color: '#1D4ED8' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                    Seguridad y Control de Activación
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Autorización con clave fija requerida para modificar la visibilidad de ICHI.
                  </span>
                </div>
              </div>

              {/* Banner Informativo */}
              <div style={{
                background: isIchiActive ? '#F0FDF4' : '#FFF1F2',
                border: `1px solid ${isIchiActive ? '#BBF7D0' : '#FECDD3'}`,
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '18px',
                fontSize: '12.5px',
                color: isIchiActive ? '#166534' : '#9F1239',
                lineHeight: '1.5'
              }}>
                {isIchiActive ? (
                  <div>
                    <strong>● ICHI está actualmente ACTIVADO:</strong> El botón flotante aparecerá en la esquina inferior derecha únicamente cuando el usuario inicie sesión satisfactoriamente en la plataforma.
                  </div>
                ) : (
                  <div>
                    <strong>● ICHI está actualmente INACTIVADO:</strong> El botón flotante y el panel de chat están completamente ocultos para todos los operadores de la plataforma.
                  </div>
                )}
              </div>

              {/* Formulario de Seguridad */}
              <form onSubmit={handleToggleIchiWithKey}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Clave de Seguridad de Autorización:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSecurityKey ? 'text' : 'password'}
                      value={securityKeyInput}
                      onChange={(e) => setSecurityKeyInput(e.target.value)}
                      placeholder="Ingrese la clave autorizada (#O0bmszru4)"
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 40px 0 12px',
                        fontSize: '13px',
                        borderRadius: '7px',
                        border: '1px solid #CBD5E1',
                        fontFamily: 'monospace',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecurityKey(!showSecurityKey)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748B'
                      }}
                    >
                      {showSecurityKey ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                    Esta acción requiere autorización mediante la clave fija de control operacional.
                  </span>
                </div>

                {securityFeedback && (
                  <div style={{
                    marginBottom: '16px',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: securityFeedback.tipo === 'exito' ? '#ECFDF5' : '#FEF2F2',
                    border: `1px solid ${securityFeedback.tipo === 'exito' ? '#A7F3D0' : '#FECACA'}`,
                    color: securityFeedback.tipo === 'exito' ? '#065F46' : '#DC2626'
                  }}>
                    {securityFeedback.texto}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    borderRadius: '7px',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    background: isIchiActive ? '#DC2626' : '#059669',
                    color: '#FFFFFF',
                    boxShadow: isIchiActive ? '0 2px 4px rgba(220, 38, 38, 0.2)' : '0 2px 4px rgba(5, 150, 105, 0.2)'
                  }}
                >
                  <Power style={{ width: '16px', height: '16px' }} />
                  {isIchiActive ? 'Inactivar Agente ICHI en la Plataforma' : 'Activar Agente ICHI en la Plataforma'}
                </button>
              </form>
            </div>

            {/* TARJETA 2: CONFIGURACIÓN DEL MODELO LLM DE ICHI */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#F0FDF4', padding: '8px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                    <Cpu style={{ width: '20px', height: '20px', color: '#16A34A' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                      Modelo LLM Asignado a ICHI
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      Especificación del motor de lenguaje natural que procesa las consultas de ICHI.
                    </span>
                  </div>
                </div>

                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#0284C7',
                  background: '#F0F9FF',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: '1px solid #BAE6FD'
                }}>
                  Motor Activo: {ichiProvider.toUpperCase()}
                </span>
              </div>

              {/* Selector de Proveedor de LLM */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                {[
                  { id: 'deepseek', label: 'DeepSeek NLU', modelDef: 'deepseek-chat', urlDef: 'https://api.deepseek.com/v1' },
                  { id: 'anthropic', label: 'Anthropic Claude', modelDef: 'claude-3-5-sonnet-20241022', urlDef: 'https://api.anthropic.com/v1' },
                  { id: 'google', label: 'Google Gemini', modelDef: 'gemini-1.5-pro', urlDef: 'https://generativelanguage.googleapis.com' },
                  { id: 'custom', label: 'Local / Ollama', modelDef: 'qwen2.5:14b', urlDef: 'http://localhost:11434/v1' }
                ].map((prov) => (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => {
                      setIchiProvider(prov.id as any);
                      setIchiModel(prov.modelDef);
                      setIchiBaseUrl(prov.urlDef);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: ichiProvider === prov.id ? '2px solid #0284C7' : '1px solid #CBD5E1',
                      background: ichiProvider === prov.id ? '#F0F9FF' : '#FFFFFF',
                      color: ichiProvider === prov.id ? '#0369A1' : '#475569',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {prov.label}
                  </button>
                ))}
              </div>

              {/* Campos de Configuración del Modelo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Nombre del Modelo LLM:
                  </label>
                  <input
                    type="text"
                    value={ichiModel}
                    onChange={(e) => setIchiModel(e.target.value)}
                    placeholder="Ej: deepseek-chat"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      fontSize: '12.5px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Temperatura (Creatividad):
                  </label>
                  <select
                    value={ichiTemperature}
                    onChange={(e) => setIchiTemperature(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      fontSize: '12.5px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="0.1">0.1 — Precisión Máxima (Recomendada ONT)</option>
                    <option value="0.3">0.3 — Balanceado Presupuestario</option>
                    <option value="0.7">0.7 — Conversacional Abierto</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  API Endpoint Base URL:
                </label>
                <input
                  type="text"
                  value={ichiBaseUrl}
                  onChange={(e) => setIchiBaseUrl(e.target.value)}
                  placeholder="https://api.deepseek.com/v1"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    fontSize: '12.5px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  API Key / Token del Proveedor ({ichiProvider.toUpperCase()}):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showIchiApiKey ? 'text' : 'password'}
                    value={ichiApiKey}
                    onChange={(e) => setIchiApiKey(e.target.value)}
                    placeholder="sk-..."
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 38px 0 10px',
                      fontSize: '12.5px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowIchiApiKey(!showIchiApiKey)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748B'
                    }}
                  >
                    {showIchiApiKey ? <EyeOff style={{ width: '15px', height: '15px' }} /> : <Eye style={{ width: '15px', height: '15px' }} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Mensaje Inicial de Saludo de ICHI:
                </label>
                <input
                  type="text"
                  value={ichiGreeting}
                  onChange={(e) => setIchiGreeting(e.target.value)}
                  placeholder="¡Hola! Soy ICHI..."
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    fontSize: '12.5px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleGuardarConfigIchi}
                style={{
                  width: '100%',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Save style={{ width: '15px', height: '15px' }} />
                Guardar Especificación de Modelo para ICHI
              </button>
            </div>
          </div>

          {/* GRID DE MATRIZ DE HABILIDADES Y FORMATO DE SALIDA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>

            {/* TARJETA 3: MATRIZ DE CONSULTAS PREDEFINIDAS Y HABILIDADES SIGECOF */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#EFF6FF', padding: '8px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                    <Database style={{ width: '20px', height: '20px', color: '#0284C7' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                      Matriz de Habilidades y Consultas Predefinidas (Tools SIGECOF)
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      Control de acceso seguro a consultas predefinidas de solo lectura. ICHI nunca ejecuta SQL directo ni libre.
                    </span>
                  </div>
                </div>

                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#059669',
                  background: '#ECFDF5',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: '1px solid #A7F3D0'
                }}>
                  {ichiTools.length} de 5 Habilitadas
                </span>
              </div>

              {/* Lista de Herramientas Predefinidas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                {[
                  {
                    id: 'consultar_resumen_banco',
                    nombre: 'Balance de Recaudación por Banco',
                    fuente: 'ORACLE SIGECOF',
                    fuenteBg: '#EFF6FF',
                    fuenteColor: '#0284C7',
                    fuenteBorder: '#BFDBFE',
                    desc: 'Totales de lotes, planillas y montos recaudados en el año actual (ORG_LIQ.LOTE).'
                  },
                  {
                    id: 'consultar_planillas_pendientes',
                    nombre: 'Lotes y Planillas Pendientes',
                    fuente: 'ORACLE SIGECOF',
                    fuenteBg: '#EFF6FF',
                    fuenteColor: '#0284C7',
                    fuenteBorder: '#BFDBFE',
                    desc: 'Identificación de expedientes y planillas pendientes de conciliar con límite parametrizado.'
                  },
                  {
                    id: 'consultar_estado_motor',
                    nombre: 'Diagnóstico en Vivo del Motor de Conciliación',
                    fuente: 'POSTGRES / LOCAL',
                    fuenteBg: '#F5F3FF',
                    fuenteColor: '#7C3AED',
                    fuenteBorder: '#DDD6FE',
                    desc: 'Estado del proceso en tiempo real, mutex de base de datos y garantía de no-concurrencia.'
                  },
                  {
                    id: 'consultar_expediente',
                    nombre: 'Búsqueda Específica de Expediente / Planilla',
                    fuente: 'ORACLE SIGECOF',
                    fuenteBg: '#EFF6FF',
                    fuenteColor: '#0284C7',
                    fuenteBorder: '#BFDBFE',
                    desc: 'Detalle individual de número de expediente o planilla en ORG_LIQ.PLANILLA.'
                  },
                  {
                    id: 'consultar_formas_excluidas',
                    nombre: 'Auditoría de Formas Excluidas / Sin Mapeo',
                    fuente: 'CATÁLOGO :3000',
                    fuenteBg: '#ECFDF5',
                    fuenteColor: '#059669',
                    fuenteBorder: '#A7F3D0',
                    desc: 'Verificación de formas sin reglas contables en el catálogo centralizado de partidas.'
                  }
                ].map((tool) => {
                  const isEnabled = ichiTools.includes(tool.id);
                  return (
                    <div
                      key={tool.id}
                      onClick={() => toggleIchiTool(tool.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isEnabled ? '#CBD5E1' : '#E2E8F0'}`,
                        background: isEnabled ? '#FFFFFF' : '#F8FAFC',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ flex: 1, paddingRight: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: isEnabled ? '#0F172A' : '#94A3B8' }}>
                            {tool.nombre}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            background: tool.fuenteBg,
                            color: tool.fuenteColor,
                            border: `1px solid ${tool.fuenteBorder}`,
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {tool.fuente}
                          </span>
                        </div>
                        <span style={{ fontSize: '11.5px', color: isEnabled ? '#64748B' : '#94A3B8', display: 'block' }}>
                          {tool.desc}
                        </span>
                      </div>

                      {/* Switch Visual */}
                      <div style={{
                        width: '40px',
                        height: '22px',
                        borderRadius: '12px',
                        background: isEnabled ? '#0284C7' : '#CBD5E1',
                        position: 'relative',
                        transition: 'background 0.2s ease',
                        flexShrink: 0
                      }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          position: 'absolute',
                          top: '3px',
                          left: isEnabled ? '21px' : '3px',
                          transition: 'left 0.2s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: '11.5px', color: '#64748B', background: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                🔒 <strong>Aislamiento de Producción:</strong> Cada consulta está precompilada con timeout de 3.5s y límite forzado. ICHI no puede ejecutar INSERT, UPDATE, DELETE ni sentencias DDL.
              </div>
            </div>

            {/* TARJETA 4: DIRECTRICES Y FORMATO DE RESPUESTAS FINANCIERAS */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#F5F3FF', padding: '8px', borderRadius: '8px', border: '1px solid #DDD6FE' }}>
                  <Sliders style={{ width: '20px', height: '20px', color: '#7C3AED' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                    Directrices y Formato de Salida
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Reglas estrictas para que ICHI responda de forma limpia y ordenada.
                  </span>
                </div>
              </div>

              {/* Opciones de Formato */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
                
                {/* Switch Formato Tabular */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <strong style={{ fontSize: '12.5px', color: '#1E293B', display: 'block' }}>Formato Tabular Forzado</strong>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Estructurar métricas financieras en tablas Markdown.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={ichiFormatTabular}
                    onChange={(e) => setIchiFormatTabular(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0284C7' }}
                  />
                </div>

                {/* Switch Formato Moneda Bs. */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <strong style={{ fontSize: '12.5px', color: '#1E293B', display: 'block' }}>Moneda Oficial en Bolívares</strong>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Representación estándar (ej. Bs. 1.234.567,89).</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={ichiFormatCurrency}
                    onChange={(e) => setIchiFormatCurrency(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0284C7' }}
                  />
                </div>

                {/* Switch Modo Resumen Ejecutivo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <strong style={{ fontSize: '12.5px', color: '#1E293B', display: 'block' }}>Modo Resumen Ejecutivo</strong>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Respuestas concisas sin preámbulos conversacionales.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={ichiFormatExecutive}
                    onChange={(e) => setIchiFormatExecutive(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0284C7' }}
                  />
                </div>

                {/* Selector Límite de Registros */}
                <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Límite Máximo de Registros por Consulta:
                  </label>
                  <select
                    value={ichiMaxRecords}
                    onChange={(e) => setIchiMaxRecords(Number(e.target.value))}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '12.5px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF'
                    }}
                  >
                    <option value={5}>5 Registros (Ultra rápido)</option>
                    <option value={10}>10 Registros (Recomendado)</option>
                    <option value={25}>25 Registros (Detallado)</option>
                    <option value={50}>50 Registros (Máximo permitido)</option>
                  </select>
                </div>

              </div>

              <button
                type="button"
                onClick={handleGuardarConfigIchi}
                style={{
                  width: '100%',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
                }}
              >
                <Save style={{ width: '15px', height: '15px' }} />
                Guardar Habilidades y Directrices de ICHI
              </button>
            </div>

          </div>

          {/* BANCO DE PRUEBAS EN VIVO DE ICHI (PLAYGROUND) */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles style={{ width: '18px', height: '18px', color: '#0284C7' }} />
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                  Banco de Pruebas en Vivo de ICHI (Inference Playground)
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                Prueba interactiva del agente ICHI con las reglas cargadas
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <input
                type="text"
                value={ichiTestQuery}
                onChange={(e) => setIchiTestQuery(e.target.value)}
                placeholder="Escribe una pregunta para ICHI (ej. ¿Cómo imputa la forma 99044?)"
                style={{
                  flex: 1,
                  height: '44px',
                  padding: '0 14px',
                  fontSize: '13.5px',
                  borderRadius: '7px',
                  border: '1px solid #CBD5E1',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleTestIchiPlayground}
                disabled={testingIchi || !ichiTestQuery.trim()}
                style={{
                  padding: '0 20px',
                  height: '44px',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: testingIchi ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {testingIchi ? (
                  <>
                    <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} />
                    Consultando ICHI...
                  </>
                ) : (
                  <>
                    <Send style={{ width: '15px', height: '15px' }} />
                    Consultar ICHI
                  </>
                )}
              </button>
            </div>

            {/* Resultado de la Inferencia de ICHI */}
            {ichiTestResponse && (
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '16px',
                animation: 'fadeIn 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284C7' }}></span>
                    <strong style={{ fontSize: '13px', color: '#0F172A' }}>Respuesta de ICHI:</strong>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>{ichiTestResponse.timestamp}</span>
                </div>
                <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.6', margin: '0 0 10px 0' }}>
                  {ichiTestResponse.text}
                </p>
                {ichiTestResponse.note && (
                  <div style={{
                    paddingTop: '8px',
                    borderTop: '1px solid #E2E8F0',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#0284C7'
                  }}>
                    🔍 Trazabilidad: {ichiTestResponse.note}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* PESTAÑA 1: BOT DE TELEGRAM & MOTOR NLU (VISTA ORIGINAL)                                   */}
      {/* ========================================================================================= */}
      {mainTab === 'telegram_bot' && (
        <>
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

              {/* Input Token */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Telegram Bot Token (BotFather)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showTelegramToken ? 'text' : 'password'}
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder={config?.telegram.tokenConfigured ? config.telegram.maskedToken : 'Ej: 8981791125:AAEoDUv...'}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 38px 0 10px',
                      fontSize: '12.5px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
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
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748B'
                    }}
                  >
                    {showTelegramToken ? <EyeOff style={{ width: '15px', height: '15px' }} /> : <Eye style={{ width: '15px', height: '15px' }} />}
                  </button>
                </div>
              </div>

              {/* Input Allowed Users */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Usuarios Autorizados (IDs de Telegram separados por coma)
                </label>
                <input
                  type="text"
                  value={allowedUsers}
                  onChange={(e) => setAllowedUsers(e.target.value)}
                  placeholder="Ej: 5827228110, 123456789"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    fontSize: '12.5px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                  Si se deja vacío, se aceptan órdenes de cualquier usuario. Tu ID detectado: 5827228110.
                </span>
              </div>

              {/* Botón Probar Telegram */}
              <button
                type="button"
                onClick={async () => {
                  setTestingTelegram(true);
                  setTelegramTestResult(null);
                  try {
                    const res = await fetch('/api/orquestador/bot-config/test-telegram', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ token: telegramToken || undefined })
                    });
                    const data = await res.json();
                    setTelegramTestResult(data);
                  } catch (e: any) {
                    setTelegramTestResult({ success: false, message: e.message });
                  } finally {
                    setTestingTelegram(false);
                  }
                }}
                disabled={testingTelegram}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#334155',
                  cursor: testingTelegram ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw style={{ width: '13px', height: '13px', animation: testingTelegram ? 'spin 1s linear infinite' : 'none' }} />
                Probar Token Telegram
              </button>

              {telegramTestResult && (
                <div style={{
                  marginTop: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  background: telegramTestResult.success ? '#ECFDF5' : '#FEF2F2',
                  color: telegramTestResult.success ? '#065F46' : '#991B1B',
                  border: `1px solid ${telegramTestResult.success ? '#A7F3D0' : '#FECACA'}`
                }}>
                  {telegramTestResult.success ? `Conexión exitosa: @${telegramTestResult.bot?.username}` : `Fallo: ${telegramTestResult.message}`}
                </div>
              )}
            </div>

            {/* TARJETA 2: PROVEEDORES DE IA (NLU) */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu style={{ width: '18px', height: '18px', color: '#7C3AED' }} />
                  <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                    Proveedores de Inteligencia Artificial (NLU)
                  </h2>
                </div>

                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6D28D9' }}>
                  Activo en Motor: {activeProvider.toUpperCase()}
                </span>
              </div>

              {/* Botones de Selección de Proveedor */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                {(['deepseek', 'anthropic', 'google'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedProvider(p)}
                    style={{
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: '700',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: selectedProvider === p ? '2px solid #7C3AED' : '1px solid #CBD5E1',
                      background: selectedProvider === p ? '#F5F3FF' : '#FFFFFF',
                      color: selectedProvider === p ? '#6D28D9' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {p === 'deepseek' && 'DeepSeek API'}
                    {p === 'anthropic' && 'Anthropic (Claude)'}
                    {p === 'google' && 'Google (Gemini)'}
                    {activeProvider === p && (
                      <span style={{ background: '#10B981', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '4px' }}>
                        ACTIVO
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Formulario del Proveedor Seleccionado */}
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                    Configuración para {selectedProvider.toUpperCase()}:
                  </span>

                  {activeProvider !== selectedProvider ? (
                    <button
                      type="button"
                      onClick={() => setActiveProvider(selectedProvider)}
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#2563EB',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Establecer como Activo para el Bot
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669' }}>
                      ✓ Proveedor Activo para el Bot
                    </span>
                  )}
                </div>

                {/* API Endpoint */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>
                    API Endpoint Base URL
                  </label>
                  <input
                    type="text"
                    value={providerForms[selectedProvider].baseUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProviderForms(prev => ({
                        ...prev,
                        [selectedProvider]: { ...prev[selectedProvider], baseUrl: val }
                      }));
                    }}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 8px',
                      fontSize: '12px',
                      borderRadius: '5px',
                      border: '1px solid #CBD5E1',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Grid Modelo y Key */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={providerForms[selectedProvider].model}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProviderForms(prev => ({
                          ...prev,
                          [selectedProvider]: { ...prev[selectedProvider], model: val }
                        }));
                      }}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 8px',
                        fontSize: '12px',
                        borderRadius: '5px',
                        border: '1px solid #CBD5E1',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>
                      API Key / Token
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showApiKey[selectedProvider] ? 'text' : 'password'}
                        value={providerForms[selectedProvider].apiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProviderForms(prev => ({
                            ...prev,
                            [selectedProvider]: { ...prev[selectedProvider], apiKey: val }
                          }));
                        }}
                        placeholder={config?.ia.providers[selectedProvider]?.hasKey ? config.ia.providers[selectedProvider].maskedKey : 'sk-...'}
                        style={{
                          width: '100%',
                          height: '34px',
                          padding: '0 32px 0 8px',
                          fontSize: '12px',
                          borderRadius: '5px',
                          border: '1px solid #CBD5E1',
                          fontFamily: 'monospace',
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
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748B'
                        }}
                      >
                        {showApiKey[selectedProvider] ? <EyeOff style={{ width: '13px', height: '13px' }} /> : <Eye style={{ width: '13px', height: '13px' }} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TARJETA 3: PLAYGROUND NLU */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '22px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles style={{ width: '18px', height: '18px', color: '#D97706' }} />
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                  Banco de Pruebas en Vivo (NLU Playground)
                </h2>
              </div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                Evaluando proveedor: <strong>{selectedProvider.toUpperCase()}</strong> ({providerForms[selectedProvider].model})
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Escribe una orden en lenguaje natural para probar la extracción..."
                style={{
                  flex: 1,
                  height: '42px',
                  padding: '0 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={async () => {
                  setTestingIa(true);
                  setIaTestResult(null);
                  try {
                    const res = await fetch('/api/orquestador/bot-config/test-ia', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        provider: selectedProvider,
                        apiKey: providerForms[selectedProvider].apiKey || undefined,
                        baseUrl: providerForms[selectedProvider].baseUrl,
                        model: providerForms[selectedProvider].model,
                        prompt: testPrompt
                      })
                    });
                    const data = await res.json();
                    setIaTestResult(data);
                  } catch (e: any) {
                    setIaTestResult({ success: false, message: e.message });
                  } finally {
                    setTestingIa(false);
                  }
                }}
                disabled={testingIa || !testPrompt.trim()}
                style={{
                  padding: '0 18px',
                  height: '42px',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: testingIa ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {testingIa ? (
                  <>
                    <RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                    Extrayendo...
                  </>
                ) : (
                  <>
                    <Zap style={{ width: '14px', height: '14px' }} />
                    Probar Extracción
                  </>
                )}
              </button>
            </div>

            {iaTestResult && (
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                {iaTestResult.success ? (
                  <pre style={{ margin: 0, color: '#0F172A', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(iaTestResult, null, 2)}
                  </pre>
                ) : (
                  <div style={{ color: '#DC2626' }}>
                    Error al procesar NLU: {iaTestResult.message || 'Respuesta inválida'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TARJETA 4: DOCUMENTACIÓN Y GUÍA OPERATIVA */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText style={{ width: '18px', height: '18px', color: '#2563EB' }} />
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                  Documentación y Guía Operativa del Bot
                </h2>
              </div>

              <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '3px', borderRadius: '6px' }}>
                {[
                  { id: 'comandos', label: 'Comandos Telegram' },
                  { id: 'flujo', label: 'Ciclo de 3 Mensajes' },
                  { id: 'ejemplos', label: 'Reglas de Negocio' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDocTab(t.id as any)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: '600',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: docTab === t.id ? '#FFFFFF' : 'transparent',
                      color: docTab === t.id ? '#0F172A' : '#64748B',
                      boxShadow: docTab === t.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {docTab === 'comandos' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
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
        </>
      )}
    </div>
  );
};
