"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Cargar sesión inicial desde localStorage
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('siront_auth_token');
      const savedUser = localStorage.getItem('siront_auth_user');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUsuario(JSON.parse(savedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      }
    } catch (err) {
      console.error('Error cargando sesión guardada:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const logout = async () => {
    try {
      if (usuario) {
        await axios.post('/api/orquestador/auth/logout', { usuario_id: usuario.id });
      }
    } catch (err) {
      console.warn('Error notificando logout al backend:', err);
    } finally {
      setToken(null);
      setUsuario(null);
      localStorage.removeItem('siront_auth_token');
      localStorage.removeItem('siront_auth_user');
      delete axios.defaults.headers.common['Authorization'];
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
