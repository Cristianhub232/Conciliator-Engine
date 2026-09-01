"use client";

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingrese su correo institucional y contraseña.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await login(email.trim(), password);
    if (!res.success) {
      setError(res.message || 'Credenciales inválidas. Por favor verifique sus datos.');
      setLoading(false);
    }
  };

  return (
    <div className="login-split-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

        .login-split-container {
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr);
          min-height: 100vh;
          width: 100vw;
          background: #ffffff;
          font-family: 'Manrope', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        .login-hero-pane {
          position: relative;
          overflow: hidden;
          background: linear-gradient(158deg, #0B2544 0%, #123A69 52%, #0E2C51 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 56px 64px 48px;
        }

        .login-grid-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.5;
          background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 56px 56px;
          pointer-events: none;
        }

        .login-form-pane {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 56px 48px;
          background: #FBFCFD;
        }

        .login-input-field {
          width: 100%;
          height: 54px;
          padding: 0 16px 0 46px;
          font-size: 15px;
          color: #16283F;
          background: #ffffff;
          border: 1px solid #DCE3EC;
          border-radius: 12px;
          outline: none;
          font-family: 'Manrope', system-ui, sans-serif;
          transition: border-color 140ms ease, box-shadow 140ms ease;
        }

        .login-input-field:hover {
          border-color: #C3CEDC;
        }

        .login-input-field:focus {
          border-color: #1E5C99;
          box-shadow: 0 0 0 4px rgba(30, 92, 153, 0.12);
        }

        .login-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 54px;
          margin-top: 4px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(180deg, #22689F, #1A4E80);
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.01em;
          cursor: pointer;
          font-family: 'Manrope', system-ui, sans-serif;
          box-shadow: 0 8px 20px -8px rgba(18, 58, 105, 0.55);
          transition: transform 120ms ease, box-shadow 160ms ease, filter 160ms ease;
        }

        .login-submit-btn:hover:not(:disabled) {
          filter: brightness(1.08);
          box-shadow: 0 12px 26px -8px rgba(18, 58, 105, 0.6);
        }

        .login-submit-btn:active:not(:disabled) {
          transform: translateY(1px);
        }

        .login-submit-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .login-link {
          color: #1E5C99;
          text-decoration: none;
          font-weight: 700;
          font-size: 13.5px;
          transition: color 140ms;
        }

        .login-link:hover {
          color: #123A69;
          text-decoration: underline;
        }

        @media (max-width: 960px) {
          .login-split-container {
            grid-template-columns: 1fr;
          }
          .login-hero-pane {
            display: none;
          }
          .login-form-pane {
            padding: 36px 24px;
          }
        }
      `}</style>

      {/* ── COLUMNA IZQUIERDA: HERO INSTITUCIONAL DATAX ── */}
      <div className="login-hero-pane">
        {/* Textura de rejilla */}
        <div className="login-grid-overlay" />

        {/* Marca de agua poligonal Datax */}
        <div style={{ position: 'absolute', width: '720px', height: '720px', right: '-210px', bottom: '-240px', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(0% 0%, 30% 0%, 56% 45%, 26% 45%)', background: 'linear-gradient(150deg, #3FB4A8, #2E8F9C)', opacity: 0.5 }} />
          <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(100% 0%, 70% 0%, 44% 45%, 74% 45%)', background: 'linear-gradient(210deg, #4FC3B4, #2C7BC0)', opacity: 0.42 }} />
          <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(26% 55%, 56% 55%, 30% 100%, 0% 100%)', background: 'linear-gradient(30deg, #8CC63F, #5FA83C)', opacity: 0.5 }} />
          <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(74% 55%, 44% 55%, 70% 100%, 100% 100%)', background: 'linear-gradient(330deg, #9BD24A, #57A03E)', opacity: 0.42 }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: '132px', height: '132px', margin: '-66px 0 0 -66px', transform: 'rotate(45deg)', background: '#1E5C99', opacity: 0.55 }} />
        </div>

        {/* Líneas de circuito decorativas */}
        <div style={{ position: 'absolute', left: '-40px', top: '22%', display: 'flex', flexDirection: 'column', gap: '26px', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#8CC63F' }} />
            <div style={{ width: '168px', height: '2px', background: 'linear-gradient(90deg, #8CC63F, rgba(140,198,63,0))' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3FB4A8' }} />
            <div style={{ width: '232px', height: '2px', background: 'linear-gradient(90deg, #3FB4A8, rgba(63,180,168,0))' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2C7BC0' }} />
            <div style={{ width: '120px', height: '2px', background: 'linear-gradient(90deg, #2C7BC0, rgba(44,123,192,0))' }} />
          </div>
        </div>

        {/* Gráfico de barras de datos decorativo */}
        <div style={{ position: 'absolute', right: '96px', top: '15%', display: 'flex', alignItems: 'flex-end', gap: '10px', height: '96px', opacity: 0.85, pointerEvents: 'none' }}>
          <div style={{ width: '16px', height: '38%', background: '#2C7BC0' }} />
          <div style={{ width: '16px', height: '62%', background: '#3FB4A8' }} />
          <div style={{ width: '16px', height: '100%', background: '#8CC63F' }} />
          <div style={{ width: '16px', height: '54%', background: '#1E5C99' }} />
        </div>

        {/* Anillo de luz decorativo */}
        <div style={{ position: 'absolute', left: '58%', top: '9%', width: '72px', height: '72px', border: '3px solid rgba(63,180,168,0.55)', borderRadius: '50%', pointerEvents: 'none' }} />

        {/* Encabezado de Marca Superior */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '34px', height: '34px', position: 'relative', flex: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(0% 0%, 30% 0%, 56% 45%, 26% 45%)', background: '#3FB4A8' }} />
            <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(100% 0%, 70% 0%, 44% 45%, 74% 45%)', background: '#4FC3B4' }} />
            <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(26% 55%, 56% 55%, 30% 100%, 0% 100%)', background: '#8CC63F' }} />
            <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(74% 55%, 44% 55%, 70% 100%, 100% 100%)', background: '#9BD24A' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>Datax</div>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.28)' }} />
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.62)' }}>SOLUCIONES BASADAS EN DATOS</div>
        </div>

        {/* Contenido Central: Título y Descripción */}
        <div style={{ position: 'relative', maxWidth: '520px', margin: '48px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 14px', border: '1px solid rgba(140,198,63,0.45)', borderRadius: '999px', marginBottom: '28px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#8CC63F' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#A9DB6C' }}>ACCESO RESTRINGIDO</span>
          </div>
          <h1 style={{ margin: '0 0 18px', fontSize: '46px', lineHeight: 1.06, fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff' }}>
            Motor de Conciliación Fiscal
          </h1>
          <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.6, color: 'rgba(255,255,255,0.66)' }}>
            Soluciones basadas en datos para la conciliación de operaciones del Tesoro conforme a la normativa fiscal vigente.
          </p>
        </div>

        {/* Pie de Página del Hero */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.38)' }}>
          <span>ONT · SIGECOF</span>
          <span>•</span>
          <span>PostgreSQL</span>
          <span>•</span>
          <span>v2.4</span>
        </div>
      </div>

      {/* ── COLUMNA DERECHA: FORMULARIO DE ACCESO ── */}
      <div className="login-form-pane">
        <div style={{ width: '100%', maxWidth: '404px' }}>
          
          {/* Logo Principal Banner */}
          <img 
            src="/Logo_basado_en_banner.png" 
            alt="Datax" 
            style={{ height: '44px', width: 'auto', display: 'block', marginBottom: '40px', objectFit: 'contain' }} 
          />

          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', color: '#1E5C99', marginBottom: '10px' }}>
            MOTOR FINANCIERO Y CONTROL DE ACCESO
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '34px', fontWeight: 800, letterSpacing: '-0.03em', color: '#16283F' }}>
            ONT · SIGECOF
          </h2>
          <p style={{ margin: '0 0 34px', fontSize: '15px', lineHeight: 1.55, color: '#6B7C93' }}>
            Ingrese sus credenciales institucionales para continuar.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Campo: Correo Electrónico */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="login-email" style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', color: '#4A5C74' }}>
                CORREO ELECTRÓNICO
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#8A99AC" strokeWidth="1.8" style={{ position: 'absolute', left: '15px', width: '18px', height: '18px', pointerEvents: 'none' }}>
                  <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  placeholder="usuario@ont.gob.ve"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  className="login-input-field"
                  required
                />
              </div>
            </div>

            {/* Campo: Contraseña */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="login-pw" style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', color: '#4A5C74' }}>
                CONTRASEÑA
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#8A99AC" strokeWidth="1.8" style={{ position: 'absolute', left: '15px', width: '18px', height: '18px', pointerEvents: 'none' }}>
                  <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
                  <path d="M8 10.5V7.5a4 4 0 018 0v3" />
                </svg>
                <input
                  id="login-pw"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  className="login-input-field"
                  style={{ paddingRight: '50px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Mostrar contraseña"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    border: 0,
                    borderRadius: '9px',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#8A99AC',
                    transition: 'color 140ms, background 140ms'
                  }}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: '19px', height: '19px' }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: '19px', height: '19px' }}>
                      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
                      <circle cx="12" cy="12" r="2.8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Opciones: Recordar sesión y Recuperar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <button
                type="button"
                onClick={() => setRemember(!remember)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}
              >
                {remember ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', width: '19px', height: '19px', borderRadius: '5px', background: '#1E5C99', border: '1px solid #1E5C99' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" style={{ width: '12px', height: '12px' }}>
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                  </span>
                ) : (
                  <span style={{ display: 'block', width: '19px', height: '19px', borderRadius: '5px', background: '#ffffff', border: '1px solid #C3CEDC' }} />
                )}
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#4A5C74' }}>Mantener sesión activa</span>
              </button>
              <a href="#contacto-admin" onClick={(e) => { e.preventDefault(); alert('Para restablecer su contraseña, contacte a la Dirección de Tecnología de la ONT.'); }} className="login-link">
                ¿Olvidó su contraseña?
              </a>
            </div>

            {/* Banner de Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: '1px solid #F2C9C2', borderRadius: '10px', background: '#FDF3F1' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#C0492F" strokeWidth="1.9" style={{ width: '17px', height: '17px', flex: 'none' }}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5v6M12 16.4v.2" />
                </svg>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#A33E27' }}>{error}</span>
              </div>
            )}

            {/* Botón de Envío */}
            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ width: '18px', height: '18px', flex: 'none' }}>
                    <circle cx="12" cy="12" r="9" opacity="0.3" />
                    <path d="M21 12a9 9 0 00-9-9">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                    </path>
                  </svg>
                  <span>Verificando credenciales…</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ width: '18px', height: '18px', flex: 'none' }}>
                    <path d="M12 3l8 3.5v5c0 4.6-3.2 8.4-8 9.5-4.8-1.1-8-4.9-8-9.5v-5L12 3z" />
                    <path d="M9 12.2l2.2 2.2L15.4 10" />
                  </svg>
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>

          {/* Pie de Página Institucional */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '36px', paddingTop: '22px', borderTop: '1px solid #EDF1F6' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#9BA9BB" strokeWidth="1.8" style={{ width: '14px', height: '14px', flex: 'none' }}>
              <path d="M12 3l8 3.5v5c0 4.6-3.2 8.4-8 9.5-4.8-1.1-8-4.9-8-9.5v-5L12 3z" />
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.5, color: '#9BA9BB' }}>
              Oficina Nacional del Tesoro · Esquema de seguridad PostgreSQL <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', color: '#64748b' }}>motor_app</code>
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
