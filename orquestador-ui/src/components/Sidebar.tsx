"use client";

import React from 'react';
import { 
  Zap, 
  Users, 
  FolderGit2, 
  FileCheck, 
  Database, 
  ChevronLeft, 
  ChevronRight,
  Server,
  Settings,
  UserCheck,
  LogOut,
  User,
  BookOpen,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'conciliacion' | 'transcriptores' | 'expedientes' | 'auditoria' | 'catalogo_formas' | 'depuracion' | 'usuarios' | 'configuracion';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse
}) => {
  const { usuario, logout } = useAuth();

  const navItems = [
    {
      id: 'conciliacion' as NavTab,
      label: 'Conciliación Masiva',
      icon: Zap,
      badge: 'Motor'
    },
    {
      id: 'transcriptores' as NavTab,
      label: 'Auditoría Transcriptores',
      icon: Users,
      badge: 'WF_USERS'
    },
    {
      id: 'expedientes' as NavTab,
      label: 'Explorador Expedientes',
      icon: FolderGit2,
      badge: 'Lotes'
    },
    {
      id: 'auditoria' as NavTab,
      label: 'Trazabilidad y Logs',
      icon: FileCheck,
      badge: 'JSON'
    },
    {
      id: 'catalogo_formas' as NavTab,
      label: 'Catálogo de Formas',
      icon: BookOpen,
      badge: '96 Formas'
    },
    {
      id: 'depuracion' as NavTab,
      label: 'Depuración de Formas',
      icon: ShieldAlert,
      badge: 'Control'
    },
    {
      id: 'usuarios' as NavTab,
      label: 'Gestión Usuarios',
      icon: UserCheck,
      badge: 'PostgreSQL'
    },
    {
      id: 'configuracion' as NavTab,
      label: 'Configuración (.env)',
      icon: Settings,
      badge: 'Entornos'
    }
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Encabezado Logo */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo" style={{ background: 'transparent', boxShadow: 'none', width: '38px', height: '38px', overflow: 'hidden' }}>
            <img 
              src="/logo-tech-x.png" 
              alt="Logo ONT" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
          {!isCollapsed && (
            <div className="sidebar-title">
              <span className="sidebar-title-main">ONT • SIGECOF</span>
              <span className="sidebar-title-sub">Motor Financiero v2.0</span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="sidebar-toggle-btn"
          title={isCollapsed ? "Expandir Menú" : "Colapsar Menú"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navegación Principal */}
      <div className="sidebar-nav">
        <div className="sidebar-section-label">
          {!isCollapsed ? 'Módulos Operativos' : 'Mód'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`sidebar-btn ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="sidebar-icon" />
              
              {!isCollapsed && (
                <>
                  <span className="sidebar-label">{item.label}</span>
                  <span className="sidebar-tag">{item.badge}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Pie del Sidebar: Usuario y Estado */}
      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Usuario Logueado */}
        {usuario && !isCollapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            background: '#ffffff',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--r-md)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#e0f2fe',
                color: '#0369a1',
                fontWeight: 700,
                fontSize: '11px',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                {usuario.nombre?.[0] || 'U'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {usuario.nombre}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--brand)', fontWeight: 600 }}>
                  {usuario.rol}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="btn btn-ghost"
              style={{ padding: '5px 7px', height: 'auto', color: 'var(--danger)' }}
              title="Cerrar Sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}

        {/* Estado del Sistema */}
        {!isCollapsed ? (
          <div className="sidebar-status-box">
            <div className="sidebar-status-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <Server size={14} color="#10b981" />
                Backend API
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 700 }}>
                <span className="status-dot"></span>
                :3010 OK
              </span>
            </div>
            <div className="sidebar-status-row" style={{ paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
              <span>Oracle 19c</span>
              <span style={{ color: '#1d70b8', fontWeight: 600 }}>cert_rep (Pool 20)</span>
            </div>
            <div className="sidebar-status-row" style={{ paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
              <span>PostgreSQL</span>
              <span style={{ color: '#7c3aed', fontWeight: 600 }}>motor_app</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span className="status-dot" title="Backend Conectado (:3010 / Oracle / PostgreSQL)"></span>
            {usuario && (
              <button
                type="button"
                onClick={logout}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}
                title="Cerrar Sesión"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
