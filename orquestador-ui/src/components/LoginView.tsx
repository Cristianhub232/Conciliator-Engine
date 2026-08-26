"use client";

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Database, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Layers
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor ingrese su correo y contraseña.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await login(email, password);
    if (!res.success) {
      setError(res.message || 'Error al iniciar sesión.');
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('admin@sirumatek.com');
    setPassword('venezuela1');
    setError(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}>
        {/* Encabezado Institucional */}
        <div style={{
          padding: '32px 28px 24px',
          textAlign: 'center',
          borderBottom: '1px solid #f1f5f9',
          background: '#ffffff'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #1d70b8, #2563eb)',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 14px rgba(29, 112, 184, 0.3)'
          }}>
            <Database size={28} />
          </div>

          <h1 style={{
            fontSize: '20px',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 4px',
            letterSpacing: '-0.02em'
          }}>
            ONT · SIGECOF
          </h1>
          <p style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#1d70b8',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: 0
          }}>
            Motor Financiero y Control de Acceso
          </p>
        </div>

        {/* Formulario */}
        <div style={{ padding: '28px' }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Correo */}
            <div className="field">
              <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                Correo Electrónico
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={17} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sirumatek.com"
                  className="input-field mono"
                  style={{ paddingLeft: '38px', height: '42px' }}
                  required
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="field">
              <label className="field-label" style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field mono"
                  style={{ paddingLeft: '38px', paddingRight: '40px', height: '42px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '10px',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botón de Ingreso */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '44px',
                fontSize: '14px',
                fontWeight: 700,
                marginTop: '6px',
                boxShadow: '0 4px 12px rgba(29, 112, 184, 0.25)'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  Autenticando...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Tarjeta de Acceso Rápido de Prueba */}
          <div style={{
            marginTop: '24px',
            padding: '14px 16px',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>
                👤 Usuario de Prueba:
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>
                admin@sirumatek.com / venezuela1
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#1d70b8',
                background: '#e0f2fe',
                border: '1px solid #bae6fd',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Zap size={13} />
              Rellenar
            </button>
          </div>
        </div>

        {/* Pie */}
        <div style={{
          padding: '12px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #f1f5f9',
          textAlign: 'center',
          fontSize: '11px',
          color: '#94a3b8',
          fontWeight: 600
        }}>
          Oficina Nacional del Tesoro · Esquema de Seguridad PostgreSQL `motor_app`
        </div>
      </div>
    </div>
  );
};
