"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  estado: string;
  ultimo_acceso?: string;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

function parseJwt(token: string): { exp?: number; [key: string]: any } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;
  // exp está en segundos, Date.now() en ms. Margen de seguridad de 5 segundos.
  return Date.now() >= (payload.exp * 1000 - 5000);
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSessionData = useCallback(() => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('siront_auth_token');
    localStorage.removeItem('siront_auth_user');
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const logout = useCallback(async () => {
    try {
      const currentToken = localStorage.getItem('siront_auth_token');
      const currentUserStr = localStorage.getItem('siront_auth_user');
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

      if (currentUser?.id && currentToken) {
        await axios.post('/api/orquestador/auth/logout', { usuario_id: currentUser.id }, {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
      }
    } catch (err) {
      console.warn('Error notificando logout al backend:', err);
    } finally {
      clearSessionData();
    }
  }, [clearSessionData]);

  // Interceptor global de Axios para capturar 401 y forzar login si el token expira durante el uso
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          const url = error.config?.url || '';
          if (!url.includes('/auth/login')) {
            console.warn('Petición retornó 401 Unauthorized. Sesión expirada.');
            clearSessionData();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [clearSessionData]);

  // Temporizador y chequeo periódico para expiración activa
  useEffect(() => {
    if (!token) return;

    // Verificar periódicamente cada 30 segundos
    const interval = setInterval(() => {
      if (isTokenExpired(token)) {
        console.warn('Sesión expirada (límite de 4 horas alcanzado).');
        clearSessionData();
      }
    }, 30000);

    // Temporizador exacto hasta expiración
    const payload = parseJwt(token);
    let timer: NodeJS.Timeout | null = null;
    if (payload?.exp) {
      const msUntilExpiry = (payload.exp * 1000) - Date.now();
      if (msUntilExpiry > 0) {
        timer = setTimeout(() => {
          console.warn('Token expirado (4 horas). Cerrando sesión...');
          clearSessionData();
        }, msUntilExpiry);
      } else {
        clearSessionData();
      }
    }

    return () => {
      clearInterval(interval);
      if (timer) clearTimeout(timer);
    };
  }, [token, clearSessionData]);

  // Cargar y validar sesión inicial desde localStorage al abrir la aplicación
  useEffect(() => {
    const initSession = async () => {
      try {
        const savedToken = localStorage.getItem('siront_auth_token');
        const savedUser = localStorage.getItem('siront_auth_user');

        if (savedToken && savedUser) {
          // 1. Verificación local inmediata: ¿Ya transcurrieron las 4 horas?
          if (isTokenExpired(savedToken)) {
            console.warn('El token de sesión ha expirado (> 4 horas). Solicitando credenciales nuevamente...');
            clearSessionData();
            setLoading(false);
            return;
          }

          // 2. Token localmente válido
          setToken(savedToken);
          setUsuario(JSON.parse(savedUser));
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;

          // 3. Verificación asíncrona con el backend (por si el usuario fue bloqueado en BD)
          try {
            const verifyRes = await axios.get('/api/orquestador/auth/me', {
              headers: { Authorization: `Bearer ${savedToken}` },
              timeout: 5000,
            });
            if (verifyRes.data?.usuario) {
              setUsuario(verifyRes.data.usuario);
              localStorage.setItem('siront_auth_user', JSON.stringify(verifyRes.data.usuario));
            }
          } catch (err: any) {
            if (err.response?.status === 401) {
              console.warn('Servidor rechazó el token con 401. Limpiando sesión...');
              clearSessionData();
            }
          }
        }
      } catch (err) {
        console.error('Error cargando sesión guardada:', err);
        clearSessionData();
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [clearSessionData]);

  const login = async (email: string, password: string) => {
    try {
      const res = await axios.post('/api/orquestador/auth/login', { email, password });
      if (res.data.status === 200 && res.data.token) {
        const receivedToken = res.data.token;
        const receivedUser = res.data.usuario;

        setToken(receivedToken);
        setUsuario(receivedUser);
        localStorage.setItem('siront_auth_token', receivedToken);
        localStorage.setItem('siront_auth_user', JSON.stringify(receivedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;

        return { success: true };
      }
      return { success: false, message: 'Respuesta inválida del servidor' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al iniciar sesión';
      return { success: false, message: msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        isAuthenticated: !!usuario && !!token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
