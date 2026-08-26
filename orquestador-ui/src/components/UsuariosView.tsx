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
    <div className="container" style={{ maxWidth: '100%', padding: 0 }}>
      {/* ── Topbar ── */}
      <header className="app-topbar">
        <div className="app-topbar-left">
          <div className="app-logo-mark" style={{ background: '#7c3aed' }}>
            <Users size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="app-title">Gestión de Usuarios</h1>
            <p className="app-subtitle">Control de Cuentas, Roles y Permisos en PostgreSQL (`motor_app`)</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={loadUsuarios} 
            className="btn btn-ghost" 
            title="Refrescar Lista"
          >
            <RefreshCw size={16} className={loading ? 'spinner' : ''} />
            Refrescar
          </button>

          <button 
            type="button" 
            onClick={handleOpenCreate} 
            className="btn btn-primary"
            style={{ background: '#7c3aed' }}
          >
            <UserPlus size={16} />
            Nuevo Usuario
          </button>
        </div>
      </header>

      {/* ── Notificaciones ── */}
      {notification && (
        <div style={{ 
          padding: '14px 18px', 
          background: notification.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)', 
          border: `1px solid ${notification.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`, 
          borderRadius: 'var(--r-md)', 
          color: notification.type === 'success' ? 'var(--success)' : 'var(--danger)', 
          marginBottom: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px' 
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{notification.message}</span>
        </div>
      )}

      {/* ── KPIs Strip ── */}
      <div className="kpi-strip">
        <div className="kpi-item">
          <div className="kpi-label">Total Usuarios</div>
          <div className="kpi-number">{totalUsers}</div>
          <div className="kpi-hint">Esquema motor_app</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Administradores</div>
          <div className="kpi-number" style={{ color: '#7c3aed' }}>{adminCount}</div>
          <div className="kpi-hint">Acceso total al sistema</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Analistas y Operadores</div>
          <div className="kpi-number" style={{ color: 'var(--brand)' }}>{analistasCount}</div>
          <div className="kpi-hint">Conciliación y consulta</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Cuentas Activas</div>
          <div className="kpi-number" style={{ color: 'var(--success)' }}>{activeCount}</div>
          <div className="kpi-hint">Habilitadas para ingresar</div>
        </div>
      </div>

      {/* ── Filtros y Búsqueda ── */}
      <div className="search-panel" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, apellido o correo..."
              className="input-field"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ width: '180px' }}>
            <select 
              value={rolFilter} 
              onChange={(e) => setRolFilter(e.target.value)}
              className="input-field"
            >
              <option value="">Todos los Roles</option>
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
              className="input-field"
            >
              <option value="">Todos los Estados</option>
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            <Search size={16} />
            Filtrar
          </button>
        </form>
      </div>

      {/* ── Tabla de Usuarios ── */}
      <div className="table-section">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Usuario / Funcionario</th>
                <th>Correo Electrónico</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último Acceso</th>
                <th>Fecha Creación</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                      <Loader2 className="spinner" size={20} />
                      <span>Cargando catálogo de usuarios desde PostgreSQL...</span>
                    </div>
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No se encontraron usuarios registrados con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => {
                  const initials = `${u.nombre?.[0] || ''}${u.apellido?.[0] || ''}`.toUpperCase();
                  return (
                    <tr key={u.id}>
                      <td className="mono" style={{ color: 'var(--text-muted)' }}>#{u.id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: u.rol === 'ADMIN' ? '#f3e8ff' : '#e0f2fe',
                            color: u.rol === 'ADMIN' ? '#7c3aed' : '#0369a1',
                            fontWeight: 700,
                            fontSize: '12px',
                            display: 'grid',
                            placeItems: 'center'
                          }}>
                            {initials || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.nombre} {u.apellido}</div>
                          </div>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: '12px' }}>{u.email}</td>
                      <td>
                        <span className={`badge ${
                          u.rol === 'ADMIN' ? 'badge-danger' :
                          u.rol === 'SUPERVISOR' ? 'badge-warning' :
                          u.rol === 'TRANSCRIPTOR' ? 'badge-info' : 'badge-success'
                        }`}>
                          {u.rol}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.estado === 'ACTIVO' ? 'badge-success' : 'badge-danger'}`}>
                          <span className="status-dot" style={{ background: u.estado === 'ACTIVO' ? '#10b981' : '#ef4444', marginRight: 4 }}></span>
                          {u.estado}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-VE') : 'Nunca'}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString('es-VE')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="btn btn-ghost"
                            style={{ padding: '6px 8px', height: 'auto' }}
                            title="Editar Usuario"
                          >
                            <Edit size={15} color="var(--brand)" />
                          </button>
                          {u.email !== 'admin@sirumatek.com' && (
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(u)}
                              className="btn btn-ghost"
                              style={{ padding: '6px 8px', height: 'auto' }}
                              title="Eliminar Usuario"
                            >
                              <Trash2 size={15} color="var(--danger)" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
