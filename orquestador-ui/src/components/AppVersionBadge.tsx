'use client';

import React, { useState, useEffect } from 'react';
import { GitCommit, Check, Copy, Sparkles } from 'lucide-react';

interface VersionInfo {
  commit: string;
  version: string;
  branch: string;
  date: string;
  message: string;
  buildNumber: string;
}

interface AppVersionBadgeProps {
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const AppVersionBadge: React.FC<AppVersionBadgeProps> = ({
  compact = false,
  className = '',
  style = {}
}) => {
  const [versionData, setVersionData] = useState<VersionInfo>({
    commit: '6df1905',
    version: 'v2.0',
    branch: 'main',
    date: '',
    message: '',
    buildNumber: ''
  });
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const fetchVersion = async () => {
    try {
      const res = await fetch('/api/app-version', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setVersionData({
            commit: data.commit || 'dev',
            version: data.version || 'v2.0',
            branch: data.branch || 'main',
            date: data.date || '',
            message: data.message || '',
            buildNumber: data.buildNumber || ''
          });
        }
      }
    } catch (e) {
      // Ignorar fallo de red silenciosamente
    }
  };

  useEffect(() => {
    fetchVersion();
    // Refrescar automáticamente al volver a enfocar la pestaña del navegador
    const handleFocus = () => fetchVersion();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(versionData.commit);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 9px',
          borderRadius: '7px',
          background: '#F4F7FA',
          border: '1px solid #E2E8F0',
          fontSize: '11px',
          fontFamily: "'IBM Plex Mono', monospace",
          color: '#475569',
          ...style
        }}
        title={`Git: ${versionData.commit} (${versionData.branch}) - ${versionData.date}`}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
        <span style={{ fontWeight: 600 }}>{versionData.version}</span>
        <span style={{ color: '#94A3B8' }}>•</span>
        <span style={{ color: '#0284C7', fontWeight: 700 }}>{versionData.commit}</span>
      </div>
    );
  }

  return (
    <div 
      className={`app-version-badge-container ${className}`}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={handleCopy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          height: '32px',
          padding: '0 11px',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
          border: '1px solid #CBD5E1',
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
          cursor: 'pointer',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          userSelect: 'none'
        }}
        className="app-version-btn"
        title="Clic para copiar hash del commit actual"
      >
        {/* Pulsing Git Sync Indicator */}
        <span style={{ position: 'relative', display: 'flex', width: '7px', height: '7px' }}>
          <span style={{
            position: 'absolute',
            display: 'inline-flex',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: '#10B981',
            opacity: 0.75,
            animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
          }} />
          <span style={{
            position: 'relative',
            display: 'inline-flex',
            borderRadius: '50%',
            width: '7px',
            height: '7px',
            background: '#059669'
          }} />
        </span>

        {/* Versión y Commit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', lineHeight: 1 }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: '#1E293B',
            textTransform: 'uppercase'
          }}>
            {versionData.version}
          </span>
          <span style={{ color: '#CBD5E1', fontSize: '10px' }}>|</span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            fontWeight: 700,
            color: '#0284C7'
          }}>
            <GitCommit size={12} strokeWidth={2.5} />
            <span>{versionData.commit}</span>
          </div>
        </div>

        {/* Botón copiar feedback */}
        <span style={{ color: copied ? '#10B981' : '#94A3B8', display: 'flex', alignItems: 'center', marginLeft: '2px' }}>
          {copied ? <Check size={12} strokeWidth={2.8} /> : <Copy size={11} strokeWidth={2} />}
        </span>
      </button>

      {/* Popover con detalles completos del Commit al pasar el mouse */}
      {showTooltip && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '290px',
          background: '#0F172A',
          color: '#F8FAFC',
          borderRadius: '10px',
          padding: '12px 14px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          zIndex: 9999,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          pointerEvents: 'none',
          animation: 'fadeIn 120ms ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} color="#38BDF8" />
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#94A3B8', textTransform: 'uppercase' }}>
                Versión en Producción
              </span>
            </div>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38BDF8',
              fontFamily: "'IBM Plex Mono', monospace"
            }}>
              Rama: {versionData.branch}
            </span>
          </div>

          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 700, color: '#38BDF8', marginBottom: '5px' }}>
            Commit: {versionData.commit} {versionData.buildNumber ? `(Build #${versionData.buildNumber})` : ''}
          </div>

          {versionData.message && (
            <div style={{ fontSize: '11.5px', color: '#E2E8F0', lineHeight: 1.4, marginBottom: '8px', wordBreak: 'break-word' }}>
              "{versionData.message}"
            </div>
          )}

          {versionData.date && (
            <div style={{ fontSize: '10px', color: '#64748B', display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span>Fecha del cambio:</span>
              <span style={{ color: '#94A3B8' }}>{versionData.date}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
