"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  KeyRound, 
  RefreshCw
} from 'lucide-react';

interface UsuarioData {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  estado: string;
  ultimo_acceso?: string;
  created_at: string;
}

export const UsuariosView: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<UsuarioData | null>(null);

  // Form states
  const [formEmail, setFormEmail] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formApellido, setFormApellido] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRol, setFormRol] = useState('ANALISTA');
  const [formEstado, setFormEstado] = useState('ACTIVO');
  
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cargar usuarios
  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/orquestador/usuarios', {
        params: {
          search: search || undefined,
          rol: rolFilter || undefined,
          estado: estadoFilter || undefined,
        }
      });
      if (res.data.status === 200) {
        setUsuarios(res.data.usuarios || []);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Error al cargar usuarios'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarios();
  }, [rolFilter, estadoFilter]);

  // Manejo de Búsqueda
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsuarios();
  };

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setFormEmail('');
    setFormNombre('');
    setFormApellido('');
    setFormPassword('');
    setFormRol('ANALISTA');
    setFormEstado('ACTIVO');
    setModalError(null);
    setIsCreateModalOpen(true);
  };

  // Guardar Nuevo Usuario
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await axios.post('/api/orquestador/usuarios', {
        email: formEmail,
        nombre: formNombre,
        apellido: formApellido,
        password: formPassword,
        rol: formRol,
        estado: formEstado,
      });
      if (res.data.status === 201) {
        setIsCreateModalOpen(false);
        setNotification({
          type: 'success',
          message: `Usuario ${formEmail} creado exitosamente.`
        });
        loadUsuarios();
      }
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.message || 'Error al crear usuario');
    } finally {
      setModalLoading(false);
    }
  };

  // Abrir Modal Editar
  const handleOpenEdit = (u: UsuarioData) => {
    setSelectedUser(u);
    setFormEmail(u.email);
    setFormNombre(u.nombre);
    setFormApellido(u.apellido);
    setFormPassword(''); // Opcional
    setFormRol(u.rol);
    setFormEstado(u.estado);
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // Guardar Edición
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setModalLoading(true);
    setModalError(null);
    try {
      const payload: any = {
        email: formEmail,
        nombre: formNombre,
        apellido: formApellido,
        rol: formRol,
        estado: formEstado,
      };
      if (formPassword.trim()) {
        payload.password = formPassword.trim();
      }

      const res = await axios.put(`/api/orquestador/usuarios/${selectedUser.id}`, payload);
      if (res.data.status === 200) {
        setIsEditModalOpen(false);
        setNotification({
          type: 'success',
          message: `Usuario ${formEmail} actualizado correctamente.`
        });
        loadUsuarios();
      }
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.message || 'Error al actualizar usuario');
    } finally {
      setModalLoading(false);
    }
  };

  // Abrir Modal Eliminar
  const handleOpenDelete = (u: UsuarioData) => {
    setSelectedUser(u);
    setModalError(null);
    setIsDeleteModalOpen(true);
  };

  // Confirmar Eliminación
  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    setModalLoading(true);
    try {
      const res = await axios.delete(`/api/orquestador/usuarios/${selectedUser.id}`);
      if (res.data.status === 200) {
        setIsDeleteModalOpen(false);
        setNotification({
          type: 'success',
          message: res.data.message || 'Usuario eliminado.'
        });
        loadUsuarios();
      }
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.message || 'Error al eliminar usuario');
    } finally {
      setModalLoading(false);
    }
  };

  // KPIs
  const totalUsers = usuarios.length;
  const adminCount = usuarios.filter(u => u.rol === 'ADMIN').length;
  const activeCount = usuarios.filter(u => u.estado === 'ACTIVO').length;
  const analistasCount = usuarios.filter(u => u.rol === 'ANALISTA' || u.rol === 'TRANSCRIPTOR').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', background: '#F6F8FA' }}>
      {/* ── Topbar ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '18px 28px', background: '#ffffff', borderBottom: '1px solid #E6EBF1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', flex: 'none', borderRadius: '9px', background: '#EDF4FB', color: '#1E5C99' }}>
            <Users size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#14263C' }}>
              Gestión de Usuarios
            </h1>
            <div style={{ marginTop: '2px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#8797A8', textTransform: 'uppercase' }}>
              CUENTAS, ROLES Y PERMISOS · ESQUEMA MOTOR_APP
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            type="button" 
            onClick={loadUsuarios} 
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              height: '36px',
              padding: '0 14px',
              border: '1px solid #E1E7EE',
              borderRadius: '8px',
              background: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              color: '#3D4F66',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            Refrescar
          </button>

          <button 
            type="button" 
            onClick={handleOpenCreate} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              height: '36px',
              padding: '0 14px',
              border: 0,
              borderRadius: '8px',
              background: '#1E5C99',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <UserPlus size={15} strokeWidth={2.2} />
            Nuevo usuario
          </button>
        </div>
      </header>

      {/* ── Main View Container ── */}
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

        {/* ── 4 KPI Cards Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
          <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>TOTAL USUARIOS</div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#14263C' }}>{totalUsers}</div>
            <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>Esquema motor_app</div>
          </div>

          <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>ADMINISTRADORES</div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#1E5C99' }}>{adminCount}</div>
            <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>Acceso total al motor</div>
          </div>

          <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>ANALISTAS Y OPERADORES</div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#3FB4A8' }}>{analistasCount}</div>
            <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>Conciliación y consulta</div>
          </div>

          <div style={{ padding: '15px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', color: '#8797A8' }}>CUENTAS ACTIVAS</div>
            <div style={{ marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '27px', fontWeight: 600, color: '#2E7D4F' }}>{activeCount}</div>
            <div style={{ marginTop: '5px', fontSize: '11.5px', fontWeight: 600, color: '#6B7C90' }}>Habilitadas para ingresar</div>
          </div>
        </div>

        {/* ── Filtros y Búsqueda ── */}
        <div style={{ display: 'flex', gap: '12px', padding: '14px 16px', background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px', alignItems: 'center' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="#9CA9B8" style={{ position: 'absolute', left: '12px', top: '11px', pointerEvents: 'none' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, apellido o correo…"
                style={{ width: '100%', height: '36px', padding: '0 12px 0 34px', fontSize: '13px', color: '#14263C', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '8px', outline: 'none' }}
              />
            </div>

            <div style={{ width: '180px' }}>
              <select 
                value={rolFilter} 
                onChange={(e) => setRolFilter(e.target.value)}
                style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', color: '#14263C', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Todos los roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="ANALISTA">ANALISTA</option>
                <option value="TRANSCRIPTOR">TRANSCRIPTOR</option>
              </select>
            </div>

            <div style={{ width: '160px' }}>
              <select 
                value={estadoFilter} 
                onChange={(e) => setEstadoFilter(e.target.value)}
                style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', color: '#14263C', background: '#ffffff', border: '1px solid #E1E7EE', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Todos los estados</option>
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>

            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                height: '36px',
                padding: '0 16px',
                border: 0,
                borderRadius: '8px',
                background: '#1E5C99',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Search size={14} />
              Filtrar
            </button>
          </form>
        </div>

        {/* ── Tabla de Usuarios ── */}
        <div style={{ background: '#ffffff', border: '1px solid #E6EBF1', borderRadius: '10px', overflow: 'hidden' }}>
          
          {/* Header de Columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: '50px minmax(0, 1.4fr) minmax(0, 1.4fr) 120px 110px 140px 110px 90px', alignItems: 'center', gap: '12px', padding: '10px 16px', background: '#FAFCFE', borderBottom: '1px solid #EDF1F5', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.09em', color: '#8797A8' }}>
            <span>ID</span>
            <span>FUNCIONARIO</span>
            <span>CORREO ELECTRÓNICO</span>
            <span>ROL</span>
            <span>ESTADO</span>
            <span>ÚLTIMO ACCESO</span>
            <span>CREACIÓN</span>
            <span style={{ textAlign: 'right' }}>ACCIONES</span>
          </div>

          {/* Filas */}
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#8797A8' }}>
              <Loader2 size={24} className="spinner" style={{ margin: '0 auto 12px', color: '#1E5C99' }} />
              <p style={{ fontSize: '13px', fontWeight: 600 }}>Cargando catálogo de usuarios desde PostgreSQL…</p>
            </div>
          ) : usuarios.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#8797A8', fontSize: '13px' }}>
              No se encontraron usuarios registrados con los filtros seleccionados.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {usuarios.map((u) => {
                const initials = `${u.nombre?.[0] || ''}${u.apellido?.[0] || ''}`.toUpperCase();
                return (
                  <div
                    key={u.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '50px minmax(0, 1.4fr) minmax(0, 1.4fr) 120px 110px 140px 110px 90px',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 16px',
                      borderBottom: '1px solid #F1F4F8',
                      transition: 'background 110ms'
                    }}
                  >
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#8797A8' }}>
                      #{u.id}
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: '#EDF4FB',
                        color: '#1E5C99',
                        fontWeight: 800,
                        fontSize: '11px',
                        display: 'grid',
                        placeItems: 'center',
                        flex: 'none'
                      }}>
                        {initials || 'U'}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#14263C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.nombre} {u.apellido}
                      </span>
                    </span>

                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', color: '#3D4F66', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </span>

                    <span>
                      <span style={{
                        display: 'inline-flex',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '11px',
                        fontWeight: 600,
                        background: u.rol === 'ADMIN' ? '#FBEDEA' : u.rol === 'SUPERVISOR' ? '#FDF4E3' : '#EDF4FB',
                        color: u.rol === 'ADMIN' ? '#C0492F' : u.rol === 'SUPERVISOR' ? '#9A6A12' : '#1E5C99'
                      }}>
                        {u.rol}
                      </span>
                    </span>

                    <span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        background: u.estado === 'ACTIVO' ? '#E9F6EE' : '#FBEDEA',
                        color: u.estado === 'ACTIVO' ? '#2E7D4F' : '#C0492F'
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: u.estado === 'ACTIVO' ? '#34A853' : '#C0492F' }} />
                        {u.estado}
                      </span>
                    </span>

                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#8797A8', whiteSpace: 'nowrap' }}>
                      {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-VE') : 'Nunca'}
                    </span>

                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#8797A8', whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('es-VE')}
                    </span>

                    <span style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          style={{ width: '28px', height: '28px', display: 'grid', placeItems: 'center', border: '1px solid #E1E7EE', borderRadius: '6px', background: '#ffffff', cursor: 'pointer' }}
                          title="Editar Usuario"
                        >
                          <Edit size={13} color="#1E5C99" />
                        </button>
                        {u.id !== 1 && (
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(u)}
                            style={{ width: '28px', height: '28px', display: 'grid', placeItems: 'center', border: '1px solid #F3C4BA', borderRadius: '6px', background: '#FBEDEA', cursor: 'pointer' }}
                            title="Eliminar Usuario"
                          >
                            <Trash2 size={13} color="#C0492F" />
                          </button>
                        )}
                      </div>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer de la Tabla */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #EDF1F5' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#8797A8' }}>
              Mostrando {usuarios.length} usuarios registrados
            </span>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: CREAR NUEVO USUARIO
      ══════════════════════════════════════════════════════════════════════ */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '560px' }}>
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="modal-icon-badge" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                  <UserPlus size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                    Crear Nuevo Usuario
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    Registre un nuevo funcionario en el esquema PostgreSQL (<code className="mono">motor_app</code>)
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setIsCreateModalOpen(false)}
                className="modal-close-btn"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {modalError && (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--danger-soft)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--r-md)',
                  color: 'var(--danger)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{modalError}</span>
                </div>
              )}

              <form id="create-user-form" onSubmit={handleCreateSubmit} className="stack" style={{ gap: '16px' }}>
                {/* Nombre y Apellido */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="field">
                    <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Nombre</label>
                    <div className="input-icon-wrap">
                      <User size={16} className="input-icon" />
                      <input
                        type="text"
                        value={formNombre}
                        onChange={(e) => setFormNombre(e.target.value)}
                        placeholder="Ej. Carlos"
                        className="input-field"
                        required
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Apellido</label>
                    <div className="input-icon-wrap">
                      <User size={16} className="input-icon" />
                      <input
                        type="text"
                        value={formApellido}
                        onChange={(e) => setFormApellido(e.target.value)}
                        placeholder="Ej. Mendoza"
                        className="input-field"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Correo Electrónico */}
                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Correo Electrónico Institucional</label>
                  <div className="input-icon-wrap">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="cmendoza@sirumatek.com"
                      className="input-field mono"
                      required
                    />
                  </div>
                </div>

                {/* Contraseña Inicial */}
                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Contraseña de Acceso</label>
                  <div className="input-icon-wrap">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="input-field mono"
                      required
                    />
                  </div>
                </div>

                {/* Rol y Estado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="field">
                    <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Rol del Sistema</label>
                    <div className="input-icon-wrap">
                      <ShieldCheck size={16} className="input-icon" />
                      <select
                        value={formRol}
                        onChange={(e) => setFormRol(e.target.value)}
                        className="input-field"
                      >
                        <option value="ADMIN">ADMIN — Acceso Total</option>
                        <option value="SUPERVISOR">SUPERVISOR — Control y Auditoría</option>
                        <option value="ANALISTA">ANALISTA — Conciliador</option>
                        <option value="TRANSCRIPTOR">TRANSCRIPTOR — Operador</option>
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Estado de la Cuenta</label>
                    <div className="input-icon-wrap">
                      <UserCheck size={16} className="input-icon" />
                      <select
                        value={formEstado}
                        onChange={(e) => setFormEstado(e.target.value)}
                        className="input-field"
                      >
                        <option value="ACTIVO">ACTIVO — Habilitado</option>
                        <option value="INACTIVO">INACTIVO — Bloqueado</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="create-user-form"
                disabled={modalLoading || !formEmail || !formNombre || !formPassword}
                className="btn btn-primary"
                style={{ background: '#7c3aed', minWidth: '150px' }}
              >
                {modalLoading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Registrar Usuario
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: EDITAR USUARIO
      ══════════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '560px' }}>
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="modal-icon-badge" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                  <Edit size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                    Editar Usuario #{selectedUser.id}
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    Actualice los datos, rol o contraseña de <strong style={{ color: 'var(--text-primary)' }}>{selectedUser.email}</strong>
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)}
                className="modal-close-btn"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {modalError && (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--danger-soft)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--r-md)',
                  color: 'var(--danger)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{modalError}</span>
                </div>
              )}

              <form id="edit-user-form" onSubmit={handleEditSubmit} className="stack" style={{ gap: '16px' }}>
                {/* Nombre y Apellido */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="field">
                    <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Nombre</label>
                    <div className="input-icon-wrap">
                      <User size={16} className="input-icon" />
                      <input
                        type="text"
                        value={formNombre}
                        onChange={(e) => setFormNombre(e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Apellido</label>
                    <div className="input-icon-wrap">
                      <User size={16} className="input-icon" />
                      <input
                        type="text"
                        value={formApellido}
                        onChange={(e) => setFormApellido(e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Correo Electrónico */}
                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Correo Electrónico</label>
                  <div className="input-icon-wrap">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="input-field mono"
                      required
                    />
                  </div>
                </div>

                {/* Nueva Contraseña (Opcional) */}
                <div className="field">
                  <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                    Nueva Contraseña <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Opcional — dejar en blanco para mantener)</span>
                  </label>
                  <div className="input-icon-wrap">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="•••••••• (sin cambios)"
                      className="input-field mono"
                    />
                  </div>
                </div>

                {/* Rol y Estado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="field">
                    <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Rol del Sistema</label>
                    <div className="input-icon-wrap">
                      <ShieldCheck size={16} className="input-icon" />
                      <select
                        value={formRol}
                        onChange={(e) => setFormRol(e.target.value)}
                        className="input-field"
                      >
                        <option value="ADMIN">ADMIN — Acceso Total</option>
                        <option value="SUPERVISOR">SUPERVISOR — Control y Auditoría</option>
                        <option value="ANALISTA">ANALISTA — Conciliador</option>
                        <option value="TRANSCRIPTOR">TRANSCRIPTOR — Operador</option>
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label" style={{ fontSize: '12px', fontWeight: 700 }}>Estado de la Cuenta</label>
                    <div className="input-icon-wrap">
                      <UserCheck size={16} className="input-icon" />
                      <select
                        value={formEstado}
                        onChange={(e) => setFormEstado(e.target.value)}
                        className="input-field"
                      >
                        <option value="ACTIVO">ACTIVO — Habilitado</option>
                        <option value="INACTIVO">INACTIVO — Bloqueado</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-user-form"
                disabled={modalLoading}
                className="btn btn-primary"
                style={{ minWidth: '150px' }}
              >
                {modalLoading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Edit size={16} />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: CONFIRMAR ELIMINACIÓN
      ══════════════════════════════════════════════════════════════════════ */}
      {isDeleteModalOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px 24px' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'var(--danger-soft)',
                color: 'var(--danger)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 12px rgba(224, 62, 45, 0.15)'
              }}>
                <Trash2 size={26} />
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-primary)' }}>
                ¿Eliminar Usuario?
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
                ¿Está seguro de que desea eliminar permanentemente la cuenta de <strong style={{ color: 'var(--text-primary)' }}>{selectedUser.nombre} {selectedUser.apellido}</strong> (<code className="mono">{selectedUser.email}</code>)? Esta acción no se puede deshacer.
              </p>

              {modalError && (
                <div style={{ padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '6px', color: 'var(--danger)', fontSize: '12px', marginBottom: '16px' }}>
                  {modalError}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center', padding: '16px 24px' }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={modalLoading}
                className="btn"
                style={{ background: 'var(--danger)', color: '#ffffff', minWidth: '130px' }}
              >
                {modalLoading ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16} />}
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
