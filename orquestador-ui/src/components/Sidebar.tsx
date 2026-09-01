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
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '18px 18px 16px', borderBottom: '1px solid #EDF1F5', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0, flex: 1 }}>
          <div style={{ width: '30px', height: '30px', position: 'relative', flex: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(0% 0%, 30% 0%, 56% 45%, 26% 45%)', background: '#3FB4A8' }} />
            <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(100% 0%, 70% 0%, 44% 45%, 74% 45%)', background: '#4FC3B4' }} />
            <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(26% 55%, 56% 55%, 30% 100%, 0% 100%)', background: '#8CC63F' }} />
            <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(74% 55%, 44% 55%, 70% 100%, 100% 100%)', background: '#9BD24A' }} />
          </div>
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <span style={{ fontSize: '13.5px', fontWeight: 800, letterSpacing: '-0.01em', color: '#14263C', whiteSpace: 'nowrap' }}>
                ONT · SIGECOF
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#8797A8', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                MOTOR FINANCIERO V2.0
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="sidebar-toggle-btn"
          style={{ background: 'transparent', border: 'none', color: '#8797A8', padding: '4px', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
          title={isCollapsed ? "Expandir Menú" : "Colapsar Menú"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navegación Principal */}
      <div className="sidebar-nav" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 12px', background: '#FFFFFF' }}>
        <div style={{ padding: '0 8px 10px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.14em', color: '#9CA9B8', textTransform: 'uppercase' }}>
          {!isCollapsed ? 'MÓDULOS OPERATIVOS' : 'MÓD'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '9px 10px',
                  border: 0,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'background 120ms ease, color 120ms ease',
                  background: isActive ? '#EDF4FB' : 'transparent',
                  color: isActive ? '#123A69' : '#3D4F66',
                  fontWeight: isActive ? 800 : 600
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', flex: 'none', color: isActive ? '#1E5C99' : '#98A6B6' }}>
                  <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                
                {!isCollapsed && (
                  <>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
                      {item.label}
                    </span>
                    <span style={{ flex: 'none', padding: '2px 6px', borderRadius: '5px', background: isActive ? '#DCE9F5' : '#F1F5F9', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9.5px', fontWeight: 500, color: isActive ? '#1E5C99' : '#8797A8' }}>
                      {item.badge}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pie del Sidebar: Usuario y Estado */}
      <div style={{ padding: '12px', borderTop: '1px solid #EDF1F5', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Usuario Logueado */}
        {usuario && !isCollapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '9px',
            background: '#F8FAFC',
            border: '1px solid #EDF1F5'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              flex: 'none',
              borderRadius: '50%',
              background: '#123A69',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800
            }}>
              {(usuario.nombre?.[0] || 'U') + (usuario.apellido?.[0] || '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#14263C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {usuario.nombre} {usuario.apellido}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#8797A8', textTransform: 'uppercase' }}>
                {usuario.rol} · MOTOR_APP
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Salir"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                flex: 'none',
                border: '1px solid #E6EBF1',
                borderRadius: '7px',
                background: '#ffffff',
                cursor: 'pointer',
                color: '#8797A8',
                transition: 'border-color 140ms, color 140ms'
              }}
              title="Cerrar Sesión"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {/* Estado del Sistema */}
        {!isCollapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', padding: '10px', border: '1px solid #EDF1F5', borderRadius: '9px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#5C6C80' }}>Backend API</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', fontWeight: 600, color: '#2E7D4F' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34A853', display: 'inline-block' }}></span>
                :3010 OK
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '4px', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#5C6C80' }}>Oracle 19c</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', color: '#8797A8' }}>cert_rep · pool 20</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '4px', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#5C6C80' }}>PostgreSQL</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', color: '#8797A8' }}>motor_app</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34A853', display: 'inline-block' }} title="Backend Conectado (:3010 / Oracle / PostgreSQL)"></span>
            {usuario && (
              <button
                type="button"
                onClick={logout}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0492F', padding: 4 }}
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
